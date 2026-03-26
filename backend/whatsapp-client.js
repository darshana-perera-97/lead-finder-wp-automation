const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

let client = null;
let latestQrDataUrl = null;
let connected = false;
/** True only after `ready` — safe for sendMessage (not just authenticated). */
let messagingReady = false;
let account = null;
let initializing = false;
let lastError = null;

function buildAccountPayload(info) {
  // whatsapp-web.js `client.info` can vary a bit by version, so we defensively map fields.
  if (!info || typeof info !== 'object') return null;
  const wid = info?.wid;
  return {
    phoneNumber: wid?.user || info?.pushname || null,
    pushname: info?.pushname || null,
    name: info?.name || null,
    widUser: wid?.user || null,
    widSerialized: typeof wid?._serialized === 'string' ? wid._serialized : null,
  };
}

function getAuthPath() {
  // LocalAuth default directory is created under the current working directory.
  // Since backend starts from `/backend`, this will be `backend/.wwebjs_auth`.
  return path.join(__dirname, '.wwebjs_auth');
}

function resolveChromeExecutablePath() {
  const fromEnv = process.env.CHROME_EXECUTABLE_PATH;
  const candidates = [
    fromEnv,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) return candidate;
  }
  return null;
}

async function initWhatsAppClient() {
  if (client || initializing) return client;

  initializing = true;
  connected = false;
  messagingReady = false;
  latestQrDataUrl = null;
  account = null;
  lastError = null;

  const executablePath = resolveChromeExecutablePath();
  if (!executablePath) {
    initializing = false;
    lastError = 'No local Chrome/Edge executable found. Set CHROME_EXECUTABLE_PATH in backend/.env.';
    throw new Error(lastError);
  }

  const newClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  newClient.on('qr', async (qr) => {
    try {
      latestQrDataUrl = await qrcode.toDataURL(qr);
      connected = false;
      messagingReady = false;
      account = null;
    } catch {
      latestQrDataUrl = null;
      lastError = 'Failed to generate WhatsApp QR code';
    }
  });

  newClient.on('ready', async () => {
    connected = true;
    messagingReady = true;
    latestQrDataUrl = null;
    try {
      const info = await newClient.info;
      account = buildAccountPayload(info);
    } catch {
      account = null;
    }
    try {
      const { registerCampaignInboundListener } = require('./services/campaignInbound');
      registerCampaignInboundListener(newClient);
    } catch {
      // best-effort; campaign replies won't update JSON without this
    }
  });

  newClient.on('authenticated', () => {
    connected = true;
    latestQrDataUrl = null;
  });

  newClient.on('auth_failure', () => {
    connected = false;
    messagingReady = false;
    latestQrDataUrl = null;
    account = null;
    lastError = 'WhatsApp authentication failed';
  });

  newClient.on('disconnected', () => {
    connected = false;
    messagingReady = false;
    latestQrDataUrl = null;
    account = null;
  });

  newClient.on('change_state', (state) => {
    // eslint-disable-next-line no-console
    console.log('[WhatsApp] state:', state);
  });

  client = newClient;
  newClient
    .initialize()
    .catch((err) => {
      lastError = err?.message || 'Failed to initialize WhatsApp client';
      connected = false;
      messagingReady = false;
      latestQrDataUrl = null;
      account = null;
      client = null;
      // eslint-disable-next-line no-console
      console.error('[WhatsApp] init error:', lastError);
    })
    .finally(() => {
      initializing = false;
    });

  return client;
}

function getSessionSnapshot() {
  return {
    connected,
    messagingReady,
    initializing,
    qrImage: latestQrDataUrl,
    account,
    error: lastError,
  };
}

function getClient() {
  return client;
}

/**
 * Resolve when WhatsApp client is connected and usable (or reject on timeout).
 */
function waitForWhatsAppReady(timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    if (messagingReady && client) {
      resolve(client);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (messagingReady && client) {
        clearInterval(timer);
        resolve(client);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error('WhatsApp is not connected. Link your account under Integrations, then try again.'));
      }
    }, 400);
  });
}

async function logoutWhatsApp() {
  if (!client) return;

  const oldClient = client;
  client = null;
  connected = false;
  messagingReady = false;
  latestQrDataUrl = null;
  account = null;
  lastError = null;

  try {
    await oldClient.logout();
  } catch {
    // best-effort logout
  }

  try {
    await oldClient.destroy();
  } catch {
    // best-effort destroy
  }

  try {
    await fs.rm(getAuthPath(), { recursive: true, force: true });
  } catch {
    // ignore
  }
}

module.exports = {
  initWhatsAppClient,
  getSessionSnapshot,
  getClient,
  waitForWhatsAppReady,
  logoutWhatsApp,
};

