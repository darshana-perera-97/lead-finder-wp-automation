const fs = require('fs').promises;
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { initWhatsAppClient, waitForWhatsAppReady } = require('../whatsapp-client');
const { firstLkMobileWhatsAppChatId } = require('./lkPhone');
const { resolveImageAbsolutePath } = require('./templateMedia');
const { runCampaignFileExclusive, readCampaignsJson, writeCampaignsJson } = require('./campaignsFile');
const {
  buildCampaignContactsFromMatchingLeads,
  markMessageSent,
  allReachableFunnelComplete,
} = require('./campaignContacts');

const leadsPath = path.join(__dirname, '..', 'data', 'leads.json');
const messageTemplatesPath = path.join(__dirname, '..', 'data', 'messageTemplates.json');

/**
 * Campaign sequence (for each live run):
 * 1. Message 1 → every selected contact (unique chat), **1 minute between each** (default).
 * 2. Wait **1st template interval** (message #2’s `interval` field, HH:MM hours:minutes).
 * 3. Message 2 → whole list **except** chats that replied after message 1; same **1 min** between each.
 * 4. Wait **2nd template interval** (message #3’s `interval`).
 * 5. Message 3 → everyone who received message 2 and **did not** reply after it; same **1 min** between each.
 *
 * Spacing within a wave is fixed at **1 minute** between contacts (not configurable).
 */
const WAVE_CONTACT_DELAY_MS = 60_000;

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function parseDataUrl(dataUrl) {
  const s = String(dataUrl || '');
  const m = s.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimetype: m[1], data: m[2] };
}

function hhMmToDelayMs(hhmm) {
  const parts = String(hhmm || '00:00').split(':');
  const h = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
  const min = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  return (h * 60 + min) * 60 * 1000;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveChatId(row) {
  return row?.chatId || firstLkMobileWhatsAppChatId(row?.contact);
}

function findCampaignIndex(items, campaignId) {
  return items.findIndex((c) => String(c?.id) === String(campaignId));
}

function bumpAnalyticsDelivered(items, idx) {
  const prev = items[idx].analytics && typeof items[idx].analytics === 'object' ? items[idx].analytics : {};
  items[idx].analytics = {
    ...prev,
    messagesDelivered: (prev.messagesDelivered || 0) + 1,
    leadsInCampaign: Array.isArray(items[idx].contacts) ? items[idx].contacts.length : prev.leadsInCampaign,
    lastActivityAt: new Date().toISOString(),
  };
}

/** OR flags across duplicate lead rows that share the same WhatsApp chatId. */
function aggregateFlagsForChatId(contacts, chatId) {
  const out = { m1: false, m2: false, m3: false, r1: false, r2: false };
  for (let i = 0; i < contacts.length; i += 1) {
    const row = contacts[i];
    if (resolveChatId(row) !== chatId) continue;
    out.m1 = out.m1 || !!row.message1Sent;
    out.m2 = out.m2 || !!row.message2Sent;
    out.m3 = out.m3 || !!row.message3Sent;
    out.r1 = out.r1 || !!row.userReplyAfterMessage1At;
    out.r2 = out.r2 || !!row.userReplyAfterMessage2At;
  }
  return out;
}

function waveAllowsSend(messageIndex, agg) {
  if (messageIndex === 0) return !agg.m1;
  if (messageIndex === 1) return agg.m1 && !agg.m2 && !agg.r1;
  if (messageIndex === 2) return agg.m2 && !agg.m3 && !agg.r2;
  return false;
}

function markMessageSentForAllRowsWithChatId(contacts, chatId, messageIndex) {
  for (let i = 0; i < contacts.length; i += 1) {
    if (resolveChatId(contacts[i]) === chatId) {
      markMessageSent(contacts, i, messageIndex);
    }
  }
}

async function sendTemplateStep(waClient, chatId, step) {
  const text = typeof step?.text === 'string' ? step.text.trim() : '';
  const mediaRaw = typeof step?.media === 'string' ? step.media.trim() : '';

  const localPath = resolveImageAbsolutePath(mediaRaw);
  if (localPath) {
    const media = MessageMedia.fromFilePath(localPath);
    await waClient.sendMessage(chatId, media, { caption: text || undefined });
    return;
  }

  if (mediaRaw && mediaRaw.startsWith('data:')) {
    const parsed = parseDataUrl(mediaRaw);
    if (parsed) {
      const media = new MessageMedia(parsed.mimetype, parsed.data, 'file');
      await waClient.sendMessage(chatId, media, { caption: text || undefined });
      return;
    }
  }

  if (text) {
    await waClient.sendMessage(chatId, text);
  }
}

/**
 * One broadcast wave: one send per unique chatId. Eligibility uses aggregated flags so duplicate lead
 * rows for the same number do not block follow-up messages. Waits WAVE_CONTACT_DELAY_MS **before** each
 * send after the first (no wait after the last contact in the wave).
 */
async function sendWave(waClient, campaignId, msgs, messageIndex) {
  let deliveredInWave = 0;
  const step = msgs[messageIndex];
  if (!step) return deliveredInWave;

  let firstInWave = true;
  while (true) {
    const job = await runCampaignFileExclusive(async () => {
      const items = await readCampaignsJson();
      const idx = findCampaignIndex(items, campaignId);
      if (idx === -1) return { kind: 'abort' };
      const camp = items[idx];
      if (camp.status !== 'live') return { kind: 'abort' };
      const contacts = camp.contacts || [];
      const seen = new Set();
      const order = [];
      for (let ci = 0; ci < contacts.length; ci += 1) {
        const chatId = resolveChatId(contacts[ci]);
        if (!chatId || seen.has(chatId)) continue;
        seen.add(chatId);
        order.push(chatId);
      }
      for (let j = 0; j < order.length; j += 1) {
        const chatId = order[j];
        const agg = aggregateFlagsForChatId(contacts, chatId);
        if (!waveAllowsSend(messageIndex, agg)) continue;
        return { kind: 'send', chatId };
      }
      return { kind: 'done' };
    });

    if (job.kind === 'abort') break;
    if (job.kind === 'done') break;

    if (!firstInWave && WAVE_CONTACT_DELAY_MS > 0) {
      await sleep(WAVE_CONTACT_DELAY_MS);
    }
    firstInWave = false;

    await sendTemplateStep(waClient, job.chatId, step);
    deliveredInWave += 1;

    await runCampaignFileExclusive(async () => {
      const items = await readCampaignsJson();
      const idx = findCampaignIndex(items, campaignId);
      if (idx === -1) return;
      const contacts = items[idx].contacts || [];
      markMessageSentForAllRowsWithChatId(contacts, job.chatId, messageIndex);
      bumpAnalyticsDelivered(items, idx);
      await writeCampaignsJson(items);
    });
  }

  return deliveredInWave;
}

async function hydrateContactsIfEmpty(campaignId, matchingLeads, createdAtIso) {
  await runCampaignFileExclusive(async () => {
    const items = await readCampaignsJson();
    const idx = findCampaignIndex(items, campaignId);
    if (idx === -1) return;
    let contacts = items[idx].contacts;
    if (Array.isArray(contacts) && contacts.length) return;
    contacts = buildCampaignContactsFromMatchingLeads(matchingLeads, createdAtIso);
    items[idx] = {
      ...items[idx],
      contacts,
      analytics: {
        ...(items[idx].analytics && typeof items[idx].analytics === 'object' ? items[idx].analytics : {}),
        leadsInCampaign: contacts.length,
      },
    };
    await writeCampaignsJson(items);
  });
}

async function setCampaignSendError(campaignId, message) {
  await runCampaignFileExclusive(async () => {
    const items = await readCampaignsJson();
    const idx = findCampaignIndex(items, campaignId);
    if (idx === -1) return;
    const prev = items[idx].analytics && typeof items[idx].analytics === 'object' ? items[idx].analytics : {};
    items[idx] = {
      ...items[idx],
      lastSendError: message,
      analytics: {
        ...prev,
        lastActivityAt: new Date().toISOString(),
      },
    };
    await writeCampaignsJson(items);
  });
}

async function finalizeCampaignSuccess(campaignId, extra) {
  await runCampaignFileExclusive(async () => {
    const items = await readCampaignsJson();
    const idx = findCampaignIndex(items, campaignId);
    if (idx === -1) return;
    const camp = items[idx];
    const prev = camp.analytics && typeof camp.analytics === 'object' ? camp.analytics : {};
    const msgs = extra.msgs || [];
    const next = {
      ...camp,
      lastSendError: null,
      analytics: {
        ...prev,
        leadsInCampaign: Array.isArray(camp.contacts) ? camp.contacts.length : prev.leadsInCampaign,
        lastActivityAt: new Date().toISOString(),
      },
      lastSendSummary: {
        at: new Date().toISOString(),
        delivered: extra.delivered,
        skippedNoMobile: extra.skippedNoMobile,
        leadsAttempted: extra.leadsAttempted,
      },
    };
    if (allReachableFunnelComplete(next.contacts, msgs.length)) {
      next.status = 'completed';
    }
    items[idx] = next;
    await writeCampaignsJson(items);
  });
}

async function runCampaignSend(campaignId) {
  const snapshot = await runCampaignFileExclusive(async () => {
    const items = await readCampaignsJson();
    const idx = findCampaignIndex(items, campaignId);
    if (idx === -1) return null;
    return { campaign: { ...items[idx] }, idx };
  });
  if (!snapshot) return;
  const { campaign } = snapshot;
  if (campaign.status !== 'live') return;

  const phrases = Array.isArray(campaign.searchPhrases) ? campaign.searchPhrases.map((p) => String(p).trim()) : [];
  const templateId = Number(campaign.messageTemplateId);

  const [leads, templates] = await Promise.all([readJsonArray(leadsPath), readJsonArray(messageTemplatesPath)]);

  const template = templates.find((t) => Number(t.id) === templateId);
  if (!template || !Array.isArray(template.messages) || template.messages.length === 0) {
    await setCampaignSendError(campaignId, 'Message template missing or invalid');
    return;
  }

  const matchingLeads = leads.filter((l) => phrases.includes(String(l.searchResult || '').trim()));
  const msgs = template.messages;

  let delivered = 0;
  let skippedNoMobile = 0;
  let seenChat = new Set();

  try {
    await initWhatsAppClient();
    const waClient = await waitForWhatsAppReady(120000);

    await hydrateContactsIfEmpty(
      campaignId,
      matchingLeads,
      campaign.createdAt || new Date().toISOString()
    );

    seenChat = new Set();
    skippedNoMobile = 0;
    await runCampaignFileExclusive(async () => {
      const items = await readCampaignsJson();
      const idx = findCampaignIndex(items, campaignId);
      if (idx === -1) return;
      const contacts = items[idx].contacts || [];
      for (let i = 0; i < contacts.length; i += 1) {
        const ch = resolveChatId(contacts[i]);
        if (!ch) skippedNoMobile += 1;
        else seenChat.add(ch);
      }
    });

    // --- Wave 1: first template message to every contact (sequential delay between contacts) ---
    const d1 = await sendWave(waClient, campaignId, msgs, 0);
    delivered += d1;

    // --- Wait template interval before message 2; then only chats with no reply after message 1 ---
    if (msgs.length >= 2) {
      const waitMs = hhMmToDelayMs(msgs[1].interval);
      if (waitMs > 0) {
        console.log(
          `[campaignSend] ${campaignId} 1st template interval: waiting ${waitMs}ms before message-2 wave (message[1].interval HH:MM=${JSON.stringify(msgs[1].interval)})`
        );
        await sleep(waitMs);
      }

      const d2 = await sendWave(waClient, campaignId, msgs, 1);
      delivered += d2;
    }

    // --- Wait before message 3; only chats that got message 2 and no reply after message 2 ---
    if (msgs.length >= 3) {
      const waitMs = hhMmToDelayMs(msgs[2].interval);
      if (waitMs > 0) {
        console.log(
          `[campaignSend] ${campaignId} 2nd template interval: waiting ${waitMs}ms before message-3 wave (message[2].interval HH:MM=${JSON.stringify(msgs[2].interval)})`
        );
        await sleep(waitMs);
      }

      const d3 = await sendWave(waClient, campaignId, msgs, 2);
      delivered += d3;
    }

    await finalizeCampaignSuccess(campaignId, {
      msgs,
      delivered,
      skippedNoMobile,
      leadsAttempted: seenChat.size,
    });
  } catch (err) {
    const msg = err?.message || 'Campaign send failed';
    await setCampaignSendError(campaignId, msg);
    console.error('[campaignSend]', campaignId, msg);
  }
}

module.exports = { runCampaignSend };
