function toLkNationalDigits(input) {
  if (input == null || input === '') return '';
  let d = String(input).replace(/\D/g, '');
  if (d.startsWith('94') && d.length >= 10) {
    d = `0${d.slice(2)}`;
  }
  return d;
}

function isLkMobileNational(digits) {
  return /^07\d{8}$/.test(digits);
}

function isLkLandlineNational(digits) {
  if (!/^0\d{8,10}$/.test(digits)) return false;
  return !isLkMobileNational(digits);
}

function normalizeDisplay(raw, nationalDigits) {
  const t = String(raw).trim();
  if (t && t.length < 40) return t;
  if (nationalDigits.length === 10) {
    return nationalDigits.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
  }
  return nationalDigits;
}

function extractPhoneCandidatesFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const results = [];
  const seen = new Set();

  const tryAdd = (raw) => {
    const nat = toLkNationalDigits(raw);
    if (!nat) return;
    if ((isLkMobileNational(nat) || isLkLandlineNational(nat)) && !seen.has(nat)) {
      seen.add(nat);
      results.push({ nationalDigits: nat, display: normalizeDisplay(raw, nat) });
    }
  };

  const patterns = [
    /\+?94\s*7\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\b07\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    /\+?94\s*(?:11|31|32|33|34|35|36|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91|94)\s*[\d\s()./-]{4,14}\d/gi,
    /\b0(?:11|31|32|33|34|35|36|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91|94)[\d\s()./-]{4,14}\d\b/gi,
    /\+94\s*\(\s*\d{2,3}\s*\)\s*[\d\s-]{5,12}\d/gi,
  ];

  const s = String(text);
  patterns.forEach((re) => {
    const m = s.match(re);
    if (m) m.forEach((chunk) => tryAdd(chunk));
  });

  const loose = text.match(/(?:\+?94|0)[\d\s()./-]{8,22}\d/g);
  if (loose) loose.forEach((chunk) => tryAdd(chunk));

  return results;
}

function extractAllPhonesFromPlace(place) {
  const candidates = [];
  const fields = [
    place?.phone,
    place?.phoneNumber,
    place?.phone_number,
    place?.telephone,
    place?.landline,
  ];
  if (Array.isArray(place?.phoneNumbers)) {
    place.phoneNumbers.forEach((p) => fields.push(p));
  }

  fields.forEach((v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (!s) return;
    extractPhoneCandidatesFromText(s).forEach((c) => candidates.push(c));
    const nat = toLkNationalDigits(s);
    if (isLkMobileNational(nat) || isLkLandlineNational(nat)) {
      if (!candidates.some((x) => x.nationalDigits === nat)) {
        candidates.push({ nationalDigits: nat, display: normalizeDisplay(s, nat) });
      }
    }
  });

  const textBlob = [place?.snippet, place?.title, place?.address].filter(Boolean).join('\n');
  extractPhoneCandidatesFromText(textBlob).forEach((c) => {
    if (!candidates.some((x) => x.nationalDigits === c.nationalDigits)) {
      candidates.push(c);
    }
  });

  return candidates;
}

function formatPhonesForStorage(phones) {
  if (!phones?.length) return '';
  return phones.map((p) => p.display).join(' · ');
}

/** First Sri Lanka mobile on contact → WhatsApp chat id (e.g. 94771234567@c.us). Landlines return null. */
function firstLkMobileWhatsAppChatId(contact) {
  const parts = extractPhoneCandidatesFromText(String(contact || ''));
  for (let i = 0; i < parts.length; i += 1) {
    const nat = parts[i].nationalDigits;
    if (isLkMobileNational(nat)) {
      return `94${nat.slice(1)}@c.us`;
    }
  }
  const nat = toLkNationalDigits(contact);
  if (isLkMobileNational(nat)) {
    return `94${nat.slice(1)}@c.us`;
  }
  return null;
}

module.exports = {
  extractAllPhonesFromPlace,
  formatPhonesForStorage,
  firstLkMobileWhatsAppChatId,
  classifyContactString(text) {
    const kinds = { mobile: false, landline: false };
    if (text == null || String(text).trim() === '') return kinds;
    const fromText = extractPhoneCandidatesFromText(String(text));
    fromText.forEach(({ nationalDigits }) => {
      if (isLkMobileNational(nationalDigits)) kinds.mobile = true;
      if (isLkLandlineNational(nationalDigits)) kinds.landline = true;
    });
    if (!fromText.length) {
      const nat = toLkNationalDigits(text);
      if (isLkMobileNational(nat)) kinds.mobile = true;
      else if (isLkLandlineNational(nat)) kinds.landline = true;
    }
    return kinds;
  },
};
