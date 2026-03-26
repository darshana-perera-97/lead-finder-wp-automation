/** IANA timezone for Sri Lanka (UTC+5:30, no DST). */
export const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  timeZone: SRI_LANKA_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

/** Calendar date in Colombo as YYYY-MM-DD (for filters, sorting). */
const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SRI_LANKA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * @param {string|number|Date|null|undefined} isoOrDate
 * @returns {string} Empty string if missing or invalid.
 */
export function formatSriLankaDateTime(isoOrDate) {
  if (isoOrDate == null || isoOrDate === '') return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return dateTimeFormatter.format(d);
}

/**
 * @param {string|number|Date|null|undefined} isoOrDate
 * @returns {string} Empty string if missing or invalid.
 */
export function formatYmdColombo(isoOrDate) {
  if (isoOrDate == null || isoOrDate === '') return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return ymdFormatter.format(d);
}
