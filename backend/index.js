const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '50mb';
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// For local development, allow requests from any origin (frontend dev server may run on 3000/3001).
// This also resolves preflight failures caused by strict `Access-Control-Allow-Origin` mismatches.
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const PORT = Number(process.env.PORT || 5000);

const LOGIN_USERNAME = process.env.LOGIN_USERNAME;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

const { searchPlacesUntilEmpty, storeRecentSearch, storeDashboardData } = require('./services/serperPlaces');
const { extractAllPhonesFromPlace, formatPhonesForStorage, firstLkMobileWhatsAppChatId } = require('./services/lkPhone');
const { runCampaignSend } = require('./services/campaignSend');
const { persistMessageMediaFields, deleteTemplateStoredMedia } = require('./services/templateMedia');
const {
  buildCampaignContactsFromMatchingLeads,
  mergeCampaignContactsPreservingProgress,
} = require('./services/campaignContacts');
const { initWhatsAppClient } = require('./whatsapp-client');
const messageTemplatesPath = path.join(__dirname, 'data', 'messageTemplates.json');
const recentSearchPath = path.join(__dirname, 'data', 'recentSearch.json');
const leadsPath = path.join(__dirname, 'data', 'leads.json');
const legacyLeadsPath = path.join(__dirname, 'data', 'leads.son');
const campaignsPath = path.join(__dirname, 'data', 'campaigns.json');
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');

function contactDedupeKeyFromContactString(contactStr) {
  const wa = firstLkMobileWhatsAppChatId(contactStr);
  if (wa) return `m:${wa.replace('@c.us', '')}`;
  const compact = String(contactStr || '').replace(/\s+/g, '').toLowerCase();
  if (compact) return `c:${compact}`;
  return '';
}

function contactDedupeKeyFromLead(lead) {
  return contactDedupeKeyFromContactString(lead?.contact);
}

function stableSyntheticLeadId(place) {
  const title = String(place?.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const extracted = extractAllPhonesFromPlace(place);
  const contactStr = formatPhonesForStorage(extracted) || String(place?.phoneNumber || place?.phone || '').trim();
  const ck = contactDedupeKeyFromContactString(contactStr);
  const basis = `${title}|${ck}`;
  if (!title && !ck) return null;
  return `gen-${crypto.createHash('sha256').update(basis).digest('hex').slice(0, 22)}`;
}

function stableCustomLeadId(contactName, contactNumber) {
  const name = String(contactName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const contact = String(contactNumber || '').trim();
  const ck = contactDedupeKeyFromContactString(contact);
  const basis = `${name}|${ck || contact}`;
  return `custom-${crypto.createHash('sha256').update(basis).digest('hex').slice(0, 22)}`;
}

function missingEnv() {
  return !LOGIN_USERNAME || !LOGIN_PASSWORD || !JWT_SECRET;
}

async function readMessageTemplates() {
  try {
    const raw = await fs.readFile(messageTemplatesPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMessageTemplates(items) {
  const payload = Array.isArray(items) ? items : [];
  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  await fs.writeFile(messageTemplatesPath, JSON.stringify(payload, null, 2), 'utf8');
}

function normalizeMessageTemplateInput(body) {
  const payload = body || {};
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!name) {
    throw new Error('Message name is required');
  }
  if (messages.length !== 3) {
    throw new Error('Exactly 3 messages are required');
  }

  const hhmm = /^\d{2}:\d{2}$/;
  return {
    name,
    messages: messages.map((m, idx) => {
      const text = typeof m?.text === 'string' ? m.text.trim() : '';
      const media = typeof m?.media === 'string' ? m.media.trim() : '';
      const interval = typeof m?.interval === 'string' ? m.interval.trim() : '00:00';
      if (idx > 0 && !hhmm.test(interval)) {
        throw new Error(`Invalid interval format for message ${idx + 1}. Use hh:mm`);
      }
      return { text, media, interval: idx === 0 ? '00:00' : interval };
    }),
  };
}

async function readRecentSearchItems() {
  try {
    const raw = await fs.readFile(recentSearchPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readSavedLeads() {
  try {
    const raw = await fs.readFile(leadsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const rawLegacy = await fs.readFile(legacyLeadsPath, 'utf8');
      const parsedLegacy = JSON.parse(rawLegacy);
      return Array.isArray(parsedLegacy) ? parsedLegacy : [];
    } catch {
      return [];
    }
  }
}

async function writeSavedLeads(items) {
  const payload = Array.isArray(items) ? items : [];
  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  await fs.writeFile(leadsPath, JSON.stringify(payload, null, 2), 'utf8');
}

async function readCampaigns() {
  try {
    const raw = await fs.readFile(campaignsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCampaigns(items) {
  const payload = Array.isArray(items) ? items : [];
  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  await fs.writeFile(campaignsPath, JSON.stringify(payload, null, 2), 'utf8');
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  if (missingEnv()) {
    return res
      .status(500)
      .json({ message: 'Server not configured (missing env vars)' });
  }

  const { username, password } = req.body || {};
  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    const accessToken = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ accessToken });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    user: {
      username: req.user.sub,
    },
  });
});

app.post('/api/search', requireAuth, async (req, res) => {
  const { searchPhrase, country } = req.body || {};
  const q = typeof searchPhrase === 'string' ? searchPhrase.trim() : '';
  const gl = typeof country === 'string' ? country.trim().toLowerCase() : '';

  if (!q) return res.status(400).json({ message: 'Missing searchPhrase' });
  if (!gl) return res.status(400).json({ message: 'Missing country' });

  try {
    const startPage = 1;
    const results = await searchPlacesUntilEmpty({ q, gl, startPage });
    const stored = await storeRecentSearch({ results });
    const dashboardStored = await storeDashboardData({ q, gl, startPage, results });
    return res.json({
      ok: true,
      stored,
      dashboardStored,
      pagesFetched: results.length,
    });
  } catch (err) {
    const message = err?.message || 'Search failed';
    const status = err?.statusCode ? err.statusCode : 500;
    return res.status(status).json({ message });
  }
});

app.get('/api/recent-search', requireAuth, async (req, res) => {
  try {
    const items = await readRecentSearchItems();
    return res.json({ ok: true, items });
  } catch {
    return res.json({ ok: true, items: [] });
  }
});

app.post('/api/leads/save-recent', requireAuth, async (req, res) => {
  try {
    const items = await readRecentSearchItems();
    const existingLeads = await readSavedLeads();

    const freshLeadsRaw = [];
    items.forEach((pageItem) => {
      const page = Number(pageItem?.page || 0);
      const searchResult = pageItem?.data?.searchParameters?.q || '';
      const places = Array.isArray(pageItem?.places)
        ? pageItem.places
        : Array.isArray(pageItem?.data?.places)
          ? pageItem.data.places
          : [];

      places.forEach((place, idx) => {
        const cid = place?.cid;
        const hasCid = cid != null && String(cid).trim() !== '';
        const leadId = hasCid
          ? String(cid)
          : stableSyntheticLeadId(place) || `fallback-${page}-${idx + 1}-${Date.now()}`;
        const leadname = place?.title || 'Untitled';
        const extracted = extractAllPhonesFromPlace(place);
        const contact = formatPhonesForStorage(extracted) || (place?.phoneNumber || place?.phone || '');
        freshLeadsRaw.push({
          leadId,
          leadname,
          contact,
          searchResult,
          time: new Date().toISOString(),
        });
      });
    });

    const byLeadId = new Map();
    freshLeadsRaw.forEach((lead) => {
      const key = String(lead?.leadId || '');
      if (!key) return;
      byLeadId.set(key, lead);
    });
    let freshLeads = Array.from(byLeadId.values());

    const seenContactInBatch = new Set();
    freshLeads = freshLeads.filter((lead) => {
      const ck = contactDedupeKeyFromLead(lead);
      if (!ck) return true;
      if (seenContactInBatch.has(ck)) return false;
      seenContactInBatch.add(ck);
      return true;
    });

    const contactOwnerId = new Map();
    existingLeads.forEach((l) => {
      const ck = contactDedupeKeyFromLead(l);
      if (ck) contactOwnerId.set(ck, String(l.leadId));
    });

    const filteredFresh = freshLeads.filter((lead) => {
      const ck = contactDedupeKeyFromLead(lead);
      if (!ck) return true;
      const owner = contactOwnerId.get(ck);
      if (owner && owner !== String(lead.leadId)) return false;
      return true;
    });

    const uniqueMap = new Map();
    existingLeads.forEach((lead) => {
      const key = String(lead?.leadId || '');
      if (key) uniqueMap.set(key, lead);
    });
    filteredFresh.forEach((lead) => {
      const key = String(lead?.leadId || '');
      if (key) uniqueMap.set(key, lead);
    });
    const mergedLeads = Array.from(uniqueMap.values());

    const skippedDuplicates = freshLeadsRaw.length - filteredFresh.length;
    await writeSavedLeads(mergedLeads);

    return res.json({
      ok: true,
      savedNow: filteredFresh.length,
      skippedDuplicates,
      totalSaved: mergedLeads.length,
      filePath: './backend/data/leads.json',
    });
  } catch (err) {
    const message = err?.message || 'Failed to save recent leads';
    return res.status(500).json({ ok: false, message });
  }
});

app.post('/api/leads/import-custom', requireAuth, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) {
    return res.status(400).json({ ok: false, message: 'No rows provided' });
  }

  try {
    const existingLeads = await readSavedLeads();
    const nowIso = new Date().toISOString();

    const freshLeadsRaw = rows
      .map((row) => {
        const contactName = typeof row?.contactName === 'string' ? row.contactName.trim() : '';
        const contactNumber = typeof row?.contactNumber === 'string' ? row.contactNumber.trim() : '';
        if (!contactName || !contactNumber) return null;
        return {
          leadId: stableCustomLeadId(contactName, contactNumber),
          leadname: contactName,
          contact: contactNumber,
          searchResult: 'Custom Input',
          time: nowIso,
        };
      })
      .filter(Boolean);

    if (!freshLeadsRaw.length) {
      return res.status(400).json({
        ok: false,
        message: 'No valid rows found. Each row must have contactName and contactNumber.',
      });
    }

    const byLeadId = new Map();
    freshLeadsRaw.forEach((lead) => {
      const key = String(lead?.leadId || '');
      if (!key) return;
      byLeadId.set(key, lead);
    });
    let freshLeads = Array.from(byLeadId.values());

    const seenContactInBatch = new Set();
    freshLeads = freshLeads.filter((lead) => {
      const ck = contactDedupeKeyFromLead(lead);
      if (!ck) return true;
      if (seenContactInBatch.has(ck)) return false;
      seenContactInBatch.add(ck);
      return true;
    });

    const contactOwnerId = new Map();
    existingLeads.forEach((l) => {
      const ck = contactDedupeKeyFromLead(l);
      if (ck) contactOwnerId.set(ck, String(l.leadId));
    });

    const filteredFresh = freshLeads.filter((lead) => {
      const ck = contactDedupeKeyFromLead(lead);
      if (!ck) return true;
      const owner = contactOwnerId.get(ck);
      if (owner && owner !== String(lead.leadId)) return false;
      return true;
    });

    const uniqueMap = new Map();
    existingLeads.forEach((lead) => {
      const key = String(lead?.leadId || '');
      if (key) uniqueMap.set(key, lead);
    });
    filteredFresh.forEach((lead) => {
      const key = String(lead?.leadId || '');
      if (key) uniqueMap.set(key, lead);
    });
    const mergedLeads = Array.from(uniqueMap.values());

    const skippedDuplicates = freshLeadsRaw.length - filteredFresh.length;
    await writeSavedLeads(mergedLeads);

    return res.json({
      ok: true,
      savedNow: filteredFresh.length,
      skippedDuplicates,
      totalSaved: mergedLeads.length,
      filePath: './backend/data/leads.json',
    });
  } catch (err) {
    const message = err?.message || 'Failed to import custom leads';
    return res.status(500).json({ ok: false, message });
  }
});

app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const items = await readSavedLeads();
    return res.json({ ok: true, items });
  } catch (err) {
    const message = err?.message || 'Failed to load leads';
    return res.status(500).json({ ok: false, message });
  }
});

app.get('/api/campaigns', requireAuth, async (req, res) => {
  try {
    const items = await readCampaigns();
    return res.json({ ok: true, items });
  } catch (err) {
    const message = err?.message || 'Failed to load campaigns';
    return res.status(500).json({ ok: false, message });
  }
});

app.post('/api/campaigns', requireAuth, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const rawPhrases = Array.isArray(req.body?.searchPhrases) ? req.body.searchPhrases : [];
  const messageTemplateIdRaw = req.body?.messageTemplateId;

  if (!name) {
    return res.status(400).json({ ok: false, message: 'Campaign name is required' });
  }

  const phrases = [...new Set(rawPhrases.map((p) => String(p).trim()).filter(Boolean))];
  if (!phrases.length) {
    return res.status(400).json({ ok: false, message: 'Select at least one search phrase from saved leads' });
  }

  const templateIdNum = Number(messageTemplateIdRaw);
  if (!Number.isFinite(templateIdNum)) {
    return res.status(400).json({ ok: false, message: 'Select a message template' });
  }

  try {
    const leads = await readSavedLeads();
    const knownPhrases = new Set(
      leads
        .map((l) => (typeof l.searchResult === 'string' ? l.searchResult.trim() : ''))
        .filter(Boolean)
    );
    const unknown = phrases.filter((p) => !knownPhrases.has(p));
    if (unknown.length) {
      return res.status(400).json({
        ok: false,
        message: `Search phrase not found in saved leads: ${unknown.join(', ')}`,
      });
    }

    const templates = await readMessageTemplates();
    const template = templates.find((t) => Number(t.id) === templateIdNum);
    if (!template) {
      return res.status(400).json({ ok: false, message: 'Message template not found' });
    }

    const matchingLeads = leads.filter((l) => phrases.includes(String(l.searchResult || '').trim()));
    const leadsInCampaign = matchingLeads.length;
    const createdAt = new Date().toISOString();
    const contacts = buildCampaignContactsFromMatchingLeads(matchingLeads, createdAt);

    const newCampaign = {
      id: `camp-${Date.now()}`,
      name,
      status: 'live',
      createdAt,
      searchPhrases: phrases,
      messageTemplateId: template.id,
      messageTemplateName: template.name,
      contacts,
      analytics: {
        messagesDelivered: 0,
        leadsInCampaign,
        lastActivityAt: new Date().toISOString(),
      },
    };

    const items = await readCampaigns();
    items.unshift(newCampaign);
    await writeCampaigns(items);
    setImmediate(() => {
      runCampaignSend(newCampaign.id).catch((e) => console.error('[campaigns] background send failed:', e?.message || e));
    });
    return res.status(201).json({ ok: true, item: newCampaign, items });
  } catch (err) {
    const message = err?.message || 'Failed to create campaign';
    return res.status(500).json({ ok: false, message });
  }
});

app.patch('/api/campaigns/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');
  const hasMeta =
    Object.prototype.hasOwnProperty.call(body, 'name') ||
    Object.prototype.hasOwnProperty.call(body, 'searchPhrases') ||
    Object.prototype.hasOwnProperty.call(body, 'messageTemplateId');

  if (!hasStatus && !hasMeta) {
    return res.status(400).json({ ok: false, message: 'Nothing to update.' });
  }

  try {
    const items = await readCampaigns();
    const idx = items.findIndex((c) => String(c?.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ ok: false, message: 'Campaign not found' });
    }
    const current = items[idx];
    let merged = { ...current };

    if (hasMeta) {
      let name;
      if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
          return res.status(400).json({ ok: false, message: 'Campaign name is required' });
        }
      } else {
        name = typeof current.name === 'string' ? current.name.trim() : '';
        if (!name) {
          return res.status(400).json({ ok: false, message: 'Campaign name is required' });
        }
      }

      let phrases;
      if (Object.prototype.hasOwnProperty.call(body, 'searchPhrases')) {
        const rawPhrases = Array.isArray(body.searchPhrases) ? body.searchPhrases : [];
        phrases = [...new Set(rawPhrases.map((p) => String(p).trim()).filter(Boolean))];
        if (!phrases.length) {
          return res.status(400).json({ ok: false, message: 'Select at least one search phrase from saved leads' });
        }
      } else {
        phrases = Array.isArray(current.searchPhrases)
          ? [...new Set(current.searchPhrases.map((p) => String(p).trim()).filter(Boolean))]
          : [];
        if (!phrases.length) {
          return res.status(400).json({ ok: false, message: 'Campaign has no search phrases' });
        }
      }

      let templateIdNum;
      if (Object.prototype.hasOwnProperty.call(body, 'messageTemplateId')) {
        templateIdNum = Number(body.messageTemplateId);
        if (!Number.isFinite(templateIdNum)) {
          return res.status(400).json({ ok: false, message: 'Select a message template' });
        }
      } else {
        templateIdNum = Number(current.messageTemplateId);
        if (!Number.isFinite(templateIdNum)) {
          return res.status(400).json({ ok: false, message: 'Invalid message template on campaign' });
        }
      }

      const leads = await readSavedLeads();
      const knownPhrases = new Set(
        leads
          .map((l) => (typeof l.searchResult === 'string' ? l.searchResult.trim() : ''))
          .filter(Boolean)
      );
      const unknown = phrases.filter((p) => !knownPhrases.has(p));
      if (unknown.length) {
        return res.status(400).json({
          ok: false,
          message: `Search phrase not found in saved leads: ${unknown.join(', ')}`,
        });
      }

      const templates = await readMessageTemplates();
      const template = templates.find((t) => Number(t.id) === templateIdNum);
      if (!template) {
        return res.status(400).json({ ok: false, message: 'Message template not found' });
      }

      const matchingLeads = leads.filter((l) => phrases.includes(String(l.searchResult || '').trim()));
      const leadsInCampaign = matchingLeads.length;
      const contacts = mergeCampaignContactsPreservingProgress(
        current.contacts,
        matchingLeads,
        new Date().toISOString()
      );
      const prevAnalytics = current.analytics && typeof current.analytics === 'object' ? current.analytics : {};

      merged = {
        ...merged,
        name,
        searchPhrases: phrases,
        messageTemplateId: template.id,
        messageTemplateName: template.name,
        contacts,
        analytics: {
          ...prevAnalytics,
          leadsInCampaign,
          lastActivityAt: new Date().toISOString(),
        },
      };
    }

    if (hasStatus) {
      const nextStatus = body.status;
      const allowed = ['live', 'paused', 'completed'];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({ ok: false, message: 'Invalid status. Use live, paused, or completed.' });
      }
      if (merged.status === 'completed' && nextStatus !== 'completed') {
        return res.status(400).json({ ok: false, message: 'Cannot change status of a completed campaign' });
      }
      merged = { ...merged, status: nextStatus };
    }

    items[idx] = merged;
    await writeCampaigns(items);
    return res.json({ ok: true, item: items[idx], items });
  } catch (err) {
    const message = err?.message || 'Failed to update campaign';
    return res.status(500).json({ ok: false, message });
  }
});

app.delete('/api/campaigns/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const items = await readCampaigns();
    const filtered = items.filter((c) => String(c?.id) !== String(id));
    if (filtered.length === items.length) {
      return res.status(404).json({ ok: false, message: 'Campaign not found' });
    }
    await writeCampaigns(filtered);
    return res.json({ ok: true, items: filtered });
  } catch (err) {
    const message = err?.message || 'Failed to delete campaign';
    return res.status(500).json({ ok: false, message });
  }
});

app.post('/api/campaigns/:id/send', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const items = await readCampaigns();
    const camp = items.find((c) => String(c?.id) === String(id));
    if (!camp) {
      return res.status(404).json({ ok: false, message: 'Campaign not found' });
    }
    if (camp.status !== 'live') {
      return res.status(400).json({ ok: false, message: 'Campaign must be live to send messages' });
    }
    setImmediate(() => {
      runCampaignSend(id).catch((e) => console.error('[campaigns] manual send failed:', e?.message || e));
    });
    return res.json({ ok: true, message: 'Send started' });
  } catch (err) {
    const message = err?.message || 'Failed to start send';
    return res.status(500).json({ ok: false, message });
  }
});

app.get('/api/message-templates', requireAuth, async (req, res) => {
  try {
    const items = await readMessageTemplates();
    return res.json({ ok: true, items });
  } catch (err) {
    const message = err?.message || 'Failed to load message templates';
    return res.status(500).json({ ok: false, message });
  }
});

app.post('/api/message-templates', requireAuth, async (req, res) => {
  let normalized;
  try {
    normalized = normalizeMessageTemplateInput(req.body);
  } catch (err) {
    return res.status(400).json({ ok: false, message: err?.message || 'Invalid template' });
  }

  try {
    const items = await readMessageTemplates();
    const newId = Date.now();
    const messages = await persistMessageMediaFields(normalized.messages, newId, []);
    const newItem = {
      id: newId,
      name: normalized.name,
      messages,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    await writeMessageTemplates(items);
    return res.status(201).json({ ok: true, item: newItem, items });
  } catch (err) {
    const message = err?.message || 'Failed to save message template';
    return res.status(500).json({ ok: false, message });
  }
});

app.patch('/api/message-templates/:id', requireAuth, async (req, res) => {
  let normalized;
  try {
    normalized = normalizeMessageTemplateInput(req.body);
  } catch (err) {
    return res.status(400).json({ ok: false, message: err?.message || 'Invalid template' });
  }

  const idParam = req.params.id;
  try {
    const items = await readMessageTemplates();
    const idx = items.findIndex((t) => String(t?.id) === String(idParam));
    if (idx === -1) {
      return res.status(404).json({ ok: false, message: 'Message template not found' });
    }
    const prev = items[idx];
    const messages = await persistMessageMediaFields(normalized.messages, idParam, prev.messages || []);
    items[idx] = {
      ...prev,
      name: normalized.name,
      messages,
      updatedAt: new Date().toISOString(),
    };
    await writeMessageTemplates(items);
    return res.json({ ok: true, item: items[idx], items });
  } catch (err) {
    const message = err?.message || 'Failed to update message template';
    return res.status(500).json({ ok: false, message });
  }
});

app.delete('/api/message-templates/:id', requireAuth, async (req, res) => {
  const idParam = req.params.id;
  try {
    const items = await readMessageTemplates();
    const removed = items.find((t) => String(t?.id) === String(idParam));
    if (removed) {
      await deleteTemplateStoredMedia(removed);
    }
    const filtered = items.filter((t) => String(t?.id) !== String(idParam));
    if (filtered.length === items.length) {
      return res.status(404).json({ ok: false, message: 'Message template not found' });
    }
    await writeMessageTemplates(filtered);
    return res.json({ ok: true, items: filtered });
  } catch (err) {
    const message = err?.message || 'Failed to delete message template';
    return res.status(500).json({ ok: false, message });
  }
});

app.get('/api/whatsapp/session', requireAuth, async (req, res) => {
  try {
    const { initWhatsAppClient, getSessionSnapshot } = require('./whatsapp-client');
    await initWhatsAppClient();
    return res.json({ ok: true, session: getSessionSnapshot() });
  } catch (err) {
    const message = err?.message || 'Failed to load WhatsApp session';
    return res.status(500).json({ ok: false, message });
  }
});

app.post('/api/whatsapp/logout', requireAuth, async (req, res) => {
  try {
    const { logoutWhatsApp } = require('./whatsapp-client');
    await logoutWhatsApp();
    return res.json({ ok: true });
  } catch (err) {
    const message = err?.message || 'Failed to logout WhatsApp';
    return res.status(500).json({ ok: false, message });
  }
});

app.use(express.static(frontendBuildPath));

// Express 5/path-to-regexp no longer accepts bare "*" route patterns.
app.get(/^(?!\/api\/).*/, async (req, res) => {
  try {
    await fs.access(path.join(frontendBuildPath, 'index.html'));
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } catch {
    return res.status(404).send('Frontend build not found. Run "npm run build" in the frontend folder.');
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
  setImmediate(() => {
    initWhatsAppClient().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[WhatsApp] Startup init failed:', err?.message || err);
    });
  });
});

