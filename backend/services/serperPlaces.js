const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const SERPER_PLACES_URL = 'https://google.serper.dev/places';

function getPlacesCount(response) {
  if (!response || typeof response !== 'object') return 0;
  const places = Array.isArray(response.places) ? response.places : [];
  if (places.length > 0) return places.length;

  // Fallback for older/alternate shapes.
  const organic = Array.isArray(response.organic) ? response.organic : [];
  return organic.length;
}

async function searchPlacesUntilEmpty({ q, gl, hl = 'en', autocorrect = true, startPage = 1, maxPages = 20 }) {
  const SERPER_API_KEY = process.env.SERPER_API_KEY;
  if (!SERPER_API_KEY) {
    const err = new Error('Missing SERPER_API_KEY in backend/.env');
    err.statusCode = 500;
    throw err;
  }

  const results = [];
  let page = startPage;

  while (page <= maxPages) {
    const payload = {
      q,
      gl,
      hl,
      autocorrect,
      page,
      type: 'places',
    };

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: SERPER_PLACES_URL,
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(payload),
    };

    // eslint-disable-next-line no-await-in-loop
    const response = await axios.request(config);

    const placesCount = getPlacesCount(response.data);
    if (placesCount === 0) break;

    results.push({
      page,
      // Keep the old field name for UI compatibility.
      organicCount: placesCount,
      places: Array.isArray(response.data.places)
        ? response.data.places
        : Array.isArray(response.data.organic)
          ? response.data.organic
          : [],
      data: response.data,
    });

    page += 1;
  }

  return results;
}

async function storeRecentSearch({ results }) {
  const outDir = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'recentSearch.json');

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(results, null, 2), 'utf8');

  return { path: outFile, count: results.length };
}

async function storeDashboardData({ q, gl, startPage, results }) {
  const outDir = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'dashboardData.json');

  const perPage = results.map((r) => ({ page: r.page, organicCount: r.organicCount }));
  const leadsFound = results.reduce((sum, r) => sum + (r.organicCount || 0), 0);
  const qualifiedLeads = Math.round(leadsFound * 0.5); // deterministic placeholder metric
  const engagementRate = leadsFound === 0 ? 0 : Math.round(((qualifiedLeads / leadsFound) * 1000)) / 10;

  const payload = {
    lastQuery: {
      q,
      gl,
      startPage,
    },
    ranAt: new Date().toISOString(),
    pagesFetched: results.length,
    perPage,
    analytics: {
      leadsFound,
      qualifiedLeads,
      engagementRate,
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');

  return { path: outFile };
}

module.exports = {
  searchPlacesUntilEmpty,
  storeRecentSearch,
  storeDashboardData,
};

