const { firstLkMobileWhatsAppChatId } = require('./lkPhone');

function emptyMessageFlags() {
  return {
    message1Sent: false,
    message2Sent: false,
    message3Sent: false,
    message1SentAt: null,
    message2SentAt: null,
    message3SentAt: null,
    userReplyAfterMessage1At: null,
    userReplyAfterMessage2At: null,
  };
}

/** When `enrolledAtIso` is set (e.g. campaign `createdAt`), all three *SentAt fields start equal until a step is actually sent (then overwritten). */
function messageFlagsForNewContact(enrolledAtIso) {
  if (enrolledAtIso && typeof enrolledAtIso === 'string') {
    return {
      message1Sent: false,
      message2Sent: false,
      message3Sent: false,
      message1SentAt: enrolledAtIso,
      message2SentAt: enrolledAtIso,
      message3SentAt: enrolledAtIso,
      userReplyAfterMessage1At: null,
      userReplyAfterMessage2At: null,
    };
  }
  return emptyMessageFlags();
}

/**
 * Snapshot matching leads for campaigns.json. Dedupes by WhatsApp chatId (first wins).
 * @param {string} [enrolledAtIso] - e.g. campaign `createdAt`; sets message1/2/3SentAt initially.
 */
function buildCampaignContactsFromMatchingLeads(matchingLeads, enrolledAtIso) {
  const seenChat = new Set();
  const out = [];
  const list = Array.isArray(matchingLeads) ? matchingLeads : [];

  for (let i = 0; i < list.length; i += 1) {
    const l = list[i];
    const leadId = l.leadId != null ? String(l.leadId) : '';
    const contact = typeof l.contact === 'string' ? l.contact : '';
    const chatId = firstLkMobileWhatsAppChatId(contact);
    if (chatId) {
      if (seenChat.has(chatId)) continue;
      seenChat.add(chatId);
    }
    out.push({
      leadId,
      leadname: typeof l.leadname === 'string' ? l.leadname : '',
      contact,
      searchResult: typeof l.searchResult === 'string' ? l.searchResult : '',
      chatId: chatId || null,
      ...messageFlagsForNewContact(enrolledAtIso),
    });
  }
  return out;
}

/**
 * Rebuild contact list from leads; keep send progress when same leadId + same chatId.
 * @param {string} [newRowEnrolledAtIso] - ISO time stamped onto newly added contacts' *SentAt fields.
 */
function mergeCampaignContactsPreservingProgress(prevContacts, matchingLeads, newRowEnrolledAtIso) {
  const fresh = buildCampaignContactsFromMatchingLeads(matchingLeads, newRowEnrolledAtIso);
  const prevByLead = new Map();
  (Array.isArray(prevContacts) ? prevContacts : []).forEach((c) => {
    if (c && c.leadId != null) prevByLead.set(String(c.leadId), c);
  });

  return fresh.map((row) => {
    const old = prevByLead.get(row.leadId);
    if (!old) return row;
    if (String(old.chatId || '') !== String(row.chatId || '')) {
      return row;
    }
    return {
      ...row,
      message1Sent: !!old.message1Sent,
      message2Sent: !!old.message2Sent,
      message3Sent: !!old.message3Sent,
      message1SentAt: old.message1SentAt ?? null,
      message2SentAt: old.message2SentAt ?? null,
      message3SentAt: old.message3SentAt ?? null,
      userReplyAfterMessage1At: old.userReplyAfterMessage1At ?? null,
      userReplyAfterMessage2At: old.userReplyAfterMessage2At ?? null,
    };
  });
}

function isMessageAlreadySent(row, messageIndex) {
  if (messageIndex === 0) return !!row.message1Sent;
  if (messageIndex === 1) return !!row.message2Sent;
  if (messageIndex === 2) return !!row.message3Sent;
  return false;
}

/** Funnel done for first `min(templateMsgCount, 3)` steps (replies skip later sends). */
function contactFunnelComplete(c, templateMsgCount) {
  const n = Math.min(Math.max(0, Number(templateMsgCount) || 0), 3);
  if (!c || !c.chatId) return true;
  if (n === 0) return true;
  if (!c.message1Sent) return false;
  if (n === 1) return true;
  if (c.userReplyAfterMessage1At) return true;
  if (!c.message2Sent) return false;
  if (n === 2) return true;
  if (c.userReplyAfterMessage2At) return true;
  return !!c.message3Sent;
}

function allReachableFunnelComplete(contacts, templateMsgCount) {
  const reachable = (Array.isArray(contacts) ? contacts : []).filter((c) => c && c.chatId);
  if (!reachable.length) return true;
  return reachable.every((c) => contactFunnelComplete(c, templateMsgCount));
}

function markMessageSent(contacts, contactIndex, messageIndex) {
  if (!Array.isArray(contacts) || contactIndex < 0 || contactIndex >= contacts.length) return;
  const now = new Date().toISOString();
  const row = contacts[contactIndex];
  if (messageIndex === 0) {
    row.message1Sent = true;
    row.message1SentAt = now;
  } else if (messageIndex === 1) {
    row.message2Sent = true;
    row.message2SentAt = now;
  } else if (messageIndex === 2) {
    row.message3Sent = true;
    row.message3SentAt = now;
  }
}

module.exports = {
  buildCampaignContactsFromMatchingLeads,
  mergeCampaignContactsPreservingProgress,
  emptyMessageFlags,
  messageFlagsForNewContact,
  isMessageAlreadySent,
  markMessageSent,
  contactFunnelComplete,
  allReachableFunnelComplete,
};
