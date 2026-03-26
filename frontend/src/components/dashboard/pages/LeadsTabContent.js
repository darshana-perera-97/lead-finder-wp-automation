import React, { useEffect, useMemo, useState } from 'react';
import { classifyLeadContact } from '../../../utils/lkPhone';
import { formatSriLankaDateTime, formatYmdColombo } from '../../../utils/sriLankaTime';

const PAGE_SIZE = 10;
const SAMPLE_CSV_CONTENT = 'contactName,contactNumber\nJohn Silva,0771234567\nNadeesha Perera,0719876543\n';

function leadCreatedYmdColombo(lead) {
  const t = lead.time || lead.createdAt;
  if (!t) return '';
  return formatYmdColombo(t);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCustomLeadsCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) throw new Error('CSV file is empty');

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = headers.indexOf('contactname');
  const numberIdx = headers.indexOf('contactnumber');

  if (nameIdx < 0 || numberIdx < 0) {
    throw new Error('CSV headers must be exactly: contactName, contactNumber');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const contactName = (cols[nameIdx] || '').trim();
    const contactNumber = (cols[numberIdx] || '').trim();
    if (!contactName && !contactNumber) continue;
    if (!contactName || !contactNumber) {
      throw new Error(`Invalid row ${i + 1}: contactName and contactNumber are required`);
    }
    rows.push({ contactName, contactNumber });
  }

  if (!rows.length) throw new Error('No valid rows found in CSV');
  return rows;
}

function LeadsTabContent({ leadsLoading, leadsError, leadItems, onImportCustomLeads }) {
  const [leadTab, setLeadTab] = useState('hand');
  const [pageIdx, setPageIdx] = useState(0);
  const [filterBusiness, setFilterBusiness] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSearchPhrase, setFilterSearchPhrase] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  const filteredLeads = useMemo(() => {
    return leadItems.flatMap((lead) => {
      const kinds = classifyLeadContact(lead.contact);
      const rows = [];
      if (leadTab === 'hand' && kinds.mobile) {
        rows.push({ ...lead, _rowKey: `${lead.leadId}-hand` });
      }
      if (leadTab === 'land' && kinds.landline) {
        rows.push({ ...lead, _rowKey: `${lead.leadId}-land` });
      }
      return rows;
    });
  }, [leadItems, leadTab]);

  const searchFilteredLeads = useMemo(() => {
    const bn = filterBusiness.trim().toLowerCase();
    const sp = filterSearchPhrase.trim().toLowerCase();
    const ct = filterContact.trim().toLowerCase();

    return filteredLeads.filter((lead) => {
      if (bn && !String(lead.leadname || '').toLowerCase().includes(bn)) return false;
      if (sp && !String(lead.searchResult || '').toLowerCase().includes(sp)) return false;
      if (ct && !String(lead.contact || '').toLowerCase().includes(ct)) return false;
      if (filterDate && leadCreatedYmdColombo(lead) !== filterDate) return false;
      return true;
    });
  }, [filteredLeads, filterBusiness, filterDate, filterSearchPhrase, filterContact]);

  const total = searchFilteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPageIdx(0);
  }, [leadTab, filterBusiness, filterDate, filterSearchPhrase, filterContact]);

  useEffect(() => {
    setPageIdx((prev) => Math.min(prev, Math.max(0, totalPages - 1)));
  }, [totalPages, searchFilteredLeads.length]);

  const pagedLeads = useMemo(
    () => searchFilteredLeads.slice(pageIdx * PAGE_SIZE, pageIdx * PAGE_SIZE + PAGE_SIZE),
    [searchFilteredLeads, pageIdx]
  );

  const handCount = useMemo(() => {
    return leadItems.filter((l) => classifyLeadContact(l.contact).mobile).length;
  }, [leadItems]);

  const landCount = useMemo(() => {
    return leadItems.filter((l) => classifyLeadContact(l.contact).landline).length;
  }, [leadItems]);

  async function onCsvPicked(e) {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    e.target.value = '';
    if (!file) return;

    setImportError('');
    setImportMessage('');
    setImportLoading(true);
    try {
      const csvText = await file.text();
      const rows = parseCustomLeadsCsv(csvText);
      if (typeof onImportCustomLeads !== 'function') {
        throw new Error('Import handler is not available');
      }
      const data = await onImportCustomLeads(rows);
      const saved = Number(data?.savedNow) || 0;
      const skipped = Number(data?.skippedDuplicates) || 0;
      const total = Number(data?.totalSaved) || 0;
      setImportMessage(
        `Imported ${saved} custom leads. Total stored: ${total}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`
      );
    } catch (err) {
      setImportError(err?.message || 'Failed to import CSV');
    } finally {
      setImportLoading(false);
    }
  }

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-leads-sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="font-bold text-[14px] text-slate-900">Saved leads</div>
        <div className="flex rounded-xl border border-gray-200 p-0.5 bg-gray-50">
          <button
            type="button"
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
              leadTab === 'hand' ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setLeadTab('hand')}
          >
            Handphones
            <span className="ml-1 text-[11px] font-normal text-gray-500">({handCount})</span>
          </button>
          <button
            type="button"
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
              leadTab === 'land' ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setLeadTab('land')}
          >
            Landphones
            <span className="ml-1 text-[11px] font-normal text-gray-500">({landCount})</span>
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-xl border border-gray-200 bg-gray-50">
        <div className="text-[12px] font-semibold text-gray-800">Import leads from CSV</div>
        <div className="mt-1 text-[12px] text-gray-600">Only two columns are accepted: contactName, contactNumber</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="h-9 px-3 inline-flex items-center rounded-xl border border-gray-200 bg-white text-[13px] text-gray-800 cursor-pointer hover:bg-gray-100">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onCsvPicked} disabled={importLoading} />
            {importLoading ? 'Importing...' : 'Upload CSV'}
          </label>
          <button
            type="button"
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-800 hover:bg-gray-100"
            onClick={downloadSampleCsv}
          >
            Download sample CSV
          </button>
        </div>
        <pre className="mt-2 text-[11px] text-gray-700 bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto">{SAMPLE_CSV_CONTENT.trim()}</pre>
        {importMessage ? <div className="mt-2 text-[12px] text-emerald-700">{importMessage}</div> : null}
        {importError ? <div className="mt-2 text-[12px] text-red-700">{importError}</div> : null}
      </div>

      {!leadsLoading && !leadsError && leadItems.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-[12px] font-semibold text-gray-700 mb-2">Filters</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1.5 text-[12px] text-gray-600">
              Business name
              <input
                type="text"
                value={filterBusiness}
                onChange={(e) => setFilterBusiness(e.target.value)}
                placeholder="Contains…"
                className="h-10 rounded-xl border border-gray-200 px-3 outline-none text-[13px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] text-gray-600">
              Created date
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 px-3 outline-none text-[13px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] text-gray-600">
              Search phrase
              <input
                type="text"
                value={filterSearchPhrase}
                onChange={(e) => setFilterSearchPhrase(e.target.value)}
                placeholder="Contains…"
                className="h-10 rounded-xl border border-gray-200 px-3 outline-none text-[13px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] text-gray-600">
              Contact number
              <input
                type="text"
                value={filterContact}
                onChange={(e) => setFilterContact(e.target.value)}
                placeholder="Contains…"
                className="h-10 rounded-xl border border-gray-200 px-3 outline-none text-[13px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </label>
          </div>
          {(filterBusiness || filterDate || filterSearchPhrase || filterContact) ? (
            <button
              type="button"
              className="mt-3 text-[12px] text-blue-700 font-semibold hover:underline"
              onClick={() => {
                setFilterBusiness('');
                setFilterDate('');
                setFilterSearchPhrase('');
                setFilterContact('');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="text-[12px] text-gray-500">
          Showing: {total} matching
          {total ? (
            <>
              {' '}
              · Page {pageIdx + 1} of {totalPages}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={leadsLoading || pageIdx <= 0}
            onClick={() => setPageIdx((v) => Math.max(0, v - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={leadsLoading || total === 0 || pageIdx >= totalPages - 1}
            onClick={() => setPageIdx((v) => Math.min(totalPages - 1, v + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {leadsLoading ? (
        <div className="mt-[12px] text-[13px] text-gray-500">Loading...</div>
      ) : leadsError ? (
        <div className="mt-[12px] p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
          {leadsError}
        </div>
      ) : leadItems.length === 0 ? (
        <div className="mt-[12px] text-[13px] text-gray-500">No saved leads yet.</div>
      ) : filteredLeads.length === 0 ? (
        <div className="mt-[12px] text-[13px] text-gray-500">
          No leads in this category. Numbers are grouped as 07XXXXXXXX (hand) or other valid 0-prefixed national numbers (land).
        </div>
      ) : searchFilteredLeads.length === 0 ? (
        <div className="mt-[12px] text-[13px] text-gray-500">No leads match your filters.</div>
      ) : (
        <div className="mt-[12px] overflow-x-auto">
          <table className="min-w-full text-left border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-700 border-b border-gray-200">Business name</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-700 border-b border-gray-200">Created</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-700 border-b border-gray-200">Search phrase</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-gray-700 border-b border-gray-200">Contact number</th>
              </tr>
            </thead>
            <tbody>
              {pagedLeads.map((lead) => (
                <tr key={lead._rowKey} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-[13px] text-gray-900 border-b border-gray-100">{lead.leadname || 'Untitled'}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-700 border-b border-gray-100 whitespace-nowrap">
                    {lead.time || lead.createdAt ? formatSriLankaDateTime(lead.time || lead.createdAt) || '—' : '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-700 border-b border-gray-100">{lead.searchResult || 'N/A'}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-700 border-b border-gray-100">{lead.contact || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default LeadsTabContent;
