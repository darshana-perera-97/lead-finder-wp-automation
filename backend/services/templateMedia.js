const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

function isDataUrl(s) {
  return typeof s === 'string' && s.startsWith('data:') && DATA_URL_RE.test(s);
}

function isHttpUrl(s) {
  return /^https?:\/\//i.test(String(s || '').trim());
}

/** Stored reference written to messageTemplates.json */
function isLocalImageRef(s) {
  const t = String(s || '').trim();
  return /^images\/[a-zA-Z0-9._-]+$/.test(t);
}

function extFromMime(mime) {
  const base = String(mime || '').split(';')[0].trim().toLowerCase();
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };
  return map[base] || 'bin';
}

async function ensureImagesDir() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

async function writeDataUrlToFile(dataUrl, templateId, msgIdx) {
  const m = String(dataUrl).match(DATA_URL_RE);
  if (!m) return '';
  const mime = m[1];
  const b64 = m[2];
  const ext = extFromMime(mime);
  const rand = crypto.randomBytes(6).toString('hex');
  const filename = `${String(templateId)}-m${msgIdx}-${rand}.${ext}`;
  const rel = `images/${filename}`;
  const abs = path.join(IMAGES_DIR, filename);
  await ensureImagesDir();
  await fs.writeFile(abs, Buffer.from(b64, 'base64'));
  return rel;
}

async function deleteLocalFileIfExists(relPath) {
  if (!isLocalImageRef(relPath)) return;
  const base = path.basename(relPath);
  const abs = path.join(IMAGES_DIR, base);
  try {
    await fs.unlink(abs);
  } catch {
    // ignore
  }
}

/**
 * Replace data URLs with `images/...` paths; drop old local files when replaced or cleared.
 */
async function persistMessageMediaFields(messages, templateId, previousMessages = []) {
  const prev = Array.isArray(previousMessages) ? previousMessages : [];
  const out = [];

  for (let idx = 0; idx < messages.length; idx += 1) {
    const msg = messages[idx];
    const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
    const interval = typeof msg?.interval === 'string' ? msg.interval.trim() : '00:00';
    let media = typeof msg?.media === 'string' ? msg.media.trim() : '';
    const prevMedia = typeof prev[idx]?.media === 'string' ? prev[idx].media.trim() : '';

    if (isDataUrl(media)) {
      if (isLocalImageRef(prevMedia)) {
        await deleteLocalFileIfExists(prevMedia);
      }
      const saved = await writeDataUrlToFile(media, templateId, idx);
      media = saved || '';
    } else if (!media) {
      if (isLocalImageRef(prevMedia)) {
        await deleteLocalFileIfExists(prevMedia);
      }
      media = '';
    } else if (isHttpUrl(media)) {
      if (isLocalImageRef(prevMedia) && prevMedia !== media) {
        await deleteLocalFileIfExists(prevMedia);
      }
    } else if (isLocalImageRef(media)) {
      if (isLocalImageRef(prevMedia) && prevMedia !== media) {
        await deleteLocalFileIfExists(prevMedia);
      }
      const abs = path.join(IMAGES_DIR, path.basename(media));
      if (!fsSync.existsSync(abs)) {
        media = '';
      }
    }

    out.push({ text, media, interval: idx === 0 ? '00:00' : interval });
  }

  return out;
}

async function deleteTemplateStoredMedia(template) {
  const msgs = Array.isArray(template?.messages) ? template.messages : [];
  for (let i = 0; i < msgs.length; i += 1) {
    const med = msgs[i]?.media;
    if (isLocalImageRef(med)) {
      await deleteLocalFileIfExists(med);
    }
  }
}

function resolveImageAbsolutePath(mediaRef) {
  if (!isLocalImageRef(mediaRef)) return null;
  const base = path.basename(mediaRef);
  const abs = path.join(IMAGES_DIR, base);
  if (!abs.startsWith(IMAGES_DIR)) return null;
  return fsSync.existsSync(abs) ? abs : null;
}

module.exports = {
  IMAGES_DIR,
  isDataUrl,
  isHttpUrl,
  isLocalImageRef,
  persistMessageMediaFields,
  deleteTemplateStoredMedia,
  resolveImageAbsolutePath,
};
