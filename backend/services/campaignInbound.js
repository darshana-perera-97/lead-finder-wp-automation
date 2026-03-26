const { runCampaignFileExclusive, readCampaignsJson, writeCampaignsJson } = require('./campaignsFile');

function isoFromJsMs(atMs) {
  return new Date(atMs).toISOString();
}

function applyInboundToContact(row, from, atMs) {
  if (!row || row.chatId !== from) return false;
  if (!row.message1Sent) return false;

  const t1 = row.message1SentAt ? new Date(row.message1SentAt).getTime() : null;
  if (t1 == null || Number.isNaN(t1) || atMs <= t1) return false;

  if (row.message2Sent) {
    const t2 = row.message2SentAt ? new Date(row.message2SentAt).getTime() : null;
    if (t2 != null && !Number.isNaN(t2) && atMs > t2 && !row.userReplyAfterMessage2At) {
      row.userReplyAfterMessage2At = isoFromJsMs(atMs);
      return true;
    }
    return false;
  }

  if (!row.userReplyAfterMessage1At) {
    row.userReplyAfterMessage1At = isoFromJsMs(atMs);
    return true;
  }

  return false;
}

function onInboundMessageRaw(message) {
  try {
    if (!message || message.fromMe) return;
    const from = message.from;
    if (typeof from !== 'string' || !from.endsWith('@c.us')) return;
    const ts = message.timestamp;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return;
    const atMs = ts * 1000;

    runCampaignFileExclusive(async () => {
      const campaigns = await readCampaignsJson();
      let changed = false;
      for (let c = 0; c < campaigns.length; c += 1) {
        const camp = campaigns[c];
        if (!camp || camp.status !== 'live') continue;
        const contacts = camp.contacts;
        if (!Array.isArray(contacts)) continue;
        for (let i = 0; i < contacts.length; i += 1) {
          if (applyInboundToContact(contacts[i], from, atMs)) {
            changed = true;
          }
        }
      }
      if (changed) {
        await writeCampaignsJson(campaigns);
      }
    }).catch((e) => console.error('[campaignInbound]', e?.message || e));
  } catch (e) {
    console.error('[campaignInbound]', e?.message || e);
  }
}

function registerCampaignInboundListener(client) {
  if (!client || client.__campaignInboundRegistered) return;
  client.__campaignInboundRegistered = true;
  client.on('message', (msg) => onInboundMessageRaw(msg));
}

module.exports = {
  registerCampaignInboundListener,
  applyInboundToContact,
};
