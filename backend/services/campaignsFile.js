const fs = require('fs').promises;
const path = require('path');

const campaignsPath = path.join(__dirname, '..', 'data', 'campaigns.json');

let chain = Promise.resolve();

/**
 * Serialize read/modify/write on campaigns.json (sends + inbound reply handler).
 */
function runCampaignFileExclusive(fn) {
  const p = chain.then(() => fn());
  chain = p.catch((err) => {
    console.error('[campaignsFile]', err?.message || err);
  });
  return p;
}

async function readCampaignsJson() {
  try {
    const raw = await fs.readFile(campaignsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCampaignsJson(items) {
  await fs.mkdir(path.dirname(campaignsPath), { recursive: true });
  await fs.writeFile(campaignsPath, JSON.stringify(items, null, 2), 'utf8');
}

module.exports = {
  campaignsPath,
  runCampaignFileExclusive,
  readCampaignsJson,
  writeCampaignsJson,
};
