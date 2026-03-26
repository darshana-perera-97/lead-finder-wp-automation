import React from 'react';
import { extractAllPhonesFromPlace, formatPhonesForDisplay } from '../../../utils/lkPhone';

function DashboardTabContent({
  searchPhrase,
  setSearchPhrase,
  countryOptions,
  countryGl,
  setCountryGl,
  handleSearch,
  searchLoading,
  searchError,
  lastSearch,
  recentSearchItems,
  recentSearchLoading,
  recentSearchError,
  recentSearchPageIdx,
  setRecentSearchPageIdx,
  handleSaveAllLeads,
  saveLeadsLoading,
  saveLeadsMessage,
  saveLeadsError,
  waSession,
  waLoading,
  waError,
  onOpenWhatsAppIntegration,
  dashboardStats,
}) {
  const item = recentSearchItems[recentSearchPageIdx];
  const pageNumber = item?.page ?? recentSearchPageIdx + 1;
  const places = Array.isArray(item?.data?.places)
    ? item.data.places
    : Array.isArray(item?.data?.organic)
      ? item.data.organic
      : [];

  const searchParameters = item?.data?.searchParameters || {};
  const phrase = lastSearch?.searchPhrase || searchParameters?.q || '';

  const placesWithContactNumber = places.filter((place) => extractAllPhonesFromPlace(place).length > 0);
  const placesPreview = placesWithContactNumber.slice(0, 8);

  const session = waSession || { connected: false, messagingReady: false, account: null };
  const isWaReady = !!session.messagingReady && session.connected;
  const account = session.account;
  const waPhoneHint =
    account?.widUser || account?.phoneNumber ? String(account.widUser || account.phoneNumber) : '';

  let waSubtitle = '';
  let statusClass = 'border-gray-200 text-gray-600 bg-gray-50';
  let statusLabel = 'Unknown';

  if (waLoading) {
    waSubtitle = 'Checking connection…';
    statusClass = 'border-gray-200 text-gray-600 bg-gray-50';
    statusLabel = 'Checking';
  } else if (waError) {
    waSubtitle = waError;
    statusClass = 'border-red-200 text-red-800 bg-red-50';
    statusLabel = 'Error';
  } else if (isWaReady) {
    waSubtitle = [account?.pushname || account?.name || 'Linked', waPhoneHint].filter(Boolean).join(' · ');
    statusClass = 'border-green-200 text-green-800 bg-green-50';
    statusLabel = 'Ready';
  } else if (session.connected) {
    waSubtitle = 'Signed in — finishing setup. Open Integrations if this lasts more than a minute.';
    statusClass = 'border-amber-200 text-amber-800 bg-amber-50';
    statusLabel = 'Connecting';
  } else if (session.qrImage) {
    waSubtitle = 'Show QR on Integrations and scan with your phone.';
    statusClass = 'border-amber-200 text-amber-800 bg-amber-50';
    statusLabel = 'Scan QR';
  } else {
    waSubtitle = 'Link a device to send campaign messages.';
    statusClass = 'border-gray-200 text-gray-600 bg-gray-50';
    statusLabel = 'Not linked';
  }

  if (session.error && !waError && !isWaReady) {
    waSubtitle = waSubtitle ? `${waSubtitle} (${session.error})` : session.error;
  }

  return (
    <div className="grid grid-cols-12 gap-[14px]">
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
            aria-hidden
          >
            WA
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">WhatsApp connectivity</div>
            <div className="text-[12px] text-gray-600 mt-0.5 leading-snug">{waSubtitle}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusClass}`}>{statusLabel}</span>
          {!waLoading && !isWaReady && typeof onOpenWhatsAppIntegration === 'function' ? (
            <button
              type="button"
            className="h-9 rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-gray-800 bg-slate-50 hover:bg-slate-100"
              onClick={onOpenWhatsAppIntegration}
            >
              Integrations
            </button>
          ) : null}
        </div>
      </section>

      {dashboardStats?.error ? (
        <div className="col-span-12 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-[13px]" role="status">
          Could not load summary stats: {dashboardStats.error}
        </div>
      ) : null}

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12 sm:col-span-6 lg:col-span-3">
        <div className="flex items-center justify-between gap-3 mb-[10px]">
          <span className="text-[13px] font-semibold text-slate-700 tracking-[0.1px]">All Leads</span>
          <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white">
            leads.json
          </span>
        </div>
        <div className="text-[28px] font-extrabold tracking-[-0.6px] mb-[4px] text-slate-900">
          {dashboardStats?.loading ? '—' : dashboardStats.savedLeadsTotal}
        </div>
        <div className="text-slate-600 text-[12px]">
          {dashboardStats?.loading ? 'Loading…' : 'Total saved leads'}
        </div>
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12 sm:col-span-6 lg:col-span-3">
        <div className="flex items-center justify-between gap-3 mb-[10px]">
          <span className="text-[13px] font-semibold text-slate-700 tracking-[0.1px]">Saved landline leads</span>
          <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white">
            Landline
          </span>
        </div>
        <div className="text-[28px] font-extrabold tracking-[-0.6px] mb-[4px] text-slate-900">
          {dashboardStats?.loading ? '—' : dashboardStats.landlineLeadsCount}
        </div>
        <div className="text-slate-600 text-[12px]">
          {dashboardStats?.loading ? 'Loading…' : 'Sri Lanka landline on contact'}
        </div>
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12 sm:col-span-6 lg:col-span-3">
        <div className="flex items-center justify-between gap-3 mb-[10px]">
          <span className="text-[13px] font-semibold text-slate-700 tracking-[0.1px]">Message templates</span>
          <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white">
            Messages
          </span>
        </div>
        <div className="text-[28px] font-extrabold tracking-[-0.6px] mb-[4px] text-slate-900">
          {dashboardStats?.loading ? '—' : dashboardStats.messageTemplatesCount}
        </div>
        <div className="text-slate-600 text-[12px]">Saved 3-step template sets</div>
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12 sm:col-span-6 lg:col-span-3">
        <div className="flex items-center justify-between gap-3 mb-[10px]">
          <span className="text-[13px] font-semibold text-slate-700 tracking-[0.1px]">Campaigns</span>
          <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white">
            Campaigns
          </span>
        </div>
        <div className="text-[28px] font-extrabold tracking-[-0.6px] mb-[4px] text-slate-900">
          {dashboardStats?.loading ? '—' : dashboardStats.campaignsCount}
        </div>
        <div className="text-slate-600 text-[12px]">Created campaign records</div>
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
        <div className="flex items-center justify-between gap-3 mb-[10px]">
          <strong>Lead search</strong>
          <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-slate-200 text-gray-500 bg-slate-100">
            New query
          </span>
        </div>

        <form className="flex flex-wrap items-end gap-3 mt-[12px]" onSubmit={handleSearch}>
          <label className="flex flex-col gap-2 text-[13px] text-gray-700 flex-1 min-w-[220px]">
            Search phrase
            <input
              value={searchPhrase}
              onChange={(e) => setSearchPhrase(e.target.value)}
              placeholder="e.g. SaaS founders"
              required
              className="h-[42px] rounded-xl border border-slate-200 px-3 outline-none bg-slate-50 text-[14px] focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-[13px] text-gray-700 flex-1 min-w-[220px]">
            Country
            <select
              value={countryGl}
              onChange={(e) => setCountryGl(e.target.value)}
              required
              className="h-[42px] rounded-xl border border-slate-200 px-3 outline-none bg-slate-50 text-[14px] focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
            >
              {countryOptions.map((c) => (
                <option key={c.gl} value={c.gl}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="h-[44px] rounded-xl bg-slate-800 text-white font-bold text-[14px] px-4 whitespace-nowrap disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError ? (
          <div className="mt-[12px] p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
            {searchError}
          </div>
        ) : null}

        {lastSearch ? (
          <div className="mt-[12px] text-[13px] text-slate-700" aria-live="polite">
            Last search: <strong>{lastSearch.searchPhrase}</strong> in <strong>{lastSearch.country}</strong>
            {typeof lastSearch.pagesFetched === 'number' ? (
              <>
                {' '}
                | Pages fetched: <strong>{lastSearch.pagesFetched}</strong>
              </>
            ) : null}
          </div>
        ) : (
          <div className="mt-[12px] text-[13px] text-gray-500">Enter a phrase + country, then press Search.</div>
        )}
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-[14px] text-slate-900">Recent search results</div>
            <div className="text-[12px] text-gray-500 mt-0.5">
              {recentSearchItems.length ? `Serper pages fetched: ${recentSearchItems.length}` : 'No recent results yet'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={recentSearchLoading || !recentSearchItems.length || saveLeadsLoading}
              onClick={handleSaveAllLeads}
            >
              {saveLeadsLoading ? 'Saving...' : 'Save all Leads'}
            </button>
            <button
              type="button"
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-gray-700 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={recentSearchLoading || recentSearchPageIdx <= 0}
              onClick={() => setRecentSearchPageIdx((v) => Math.max(0, v - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-gray-700 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={recentSearchLoading || recentSearchItems.length === 0 || recentSearchPageIdx >= recentSearchItems.length - 1}
              onClick={() => setRecentSearchPageIdx((v) => Math.min(recentSearchItems.length - 1, v + 1))}
            >
              Next
            </button>
          </div>
        </div>

        {recentSearchLoading ? (
          <div className="mt-[12px] text-[13px] text-gray-500">Loading...</div>
        ) : recentSearchError ? (
          <div className="mt-[12px] p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
            {recentSearchError}
          </div>
        ) : recentSearchItems.length ? (
          <div className="mt-[12px]">
            {saveLeadsError ? (
              <div className="mb-[10px] p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
                {saveLeadsError}
              </div>
            ) : null}
            {saveLeadsMessage ? (
              <div className="mb-[10px] p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-[13px]">
                {saveLeadsMessage}
              </div>
            ) : null}
            <div className="text-[13px] text-gray-700 font-semibold">
              Search phrase: <span className="text-gray-900">{phrase}</span>
            </div>

            <div className="mt-[6px] text-[12px] text-gray-500">
              Showing Serper page {pageNumber}
              {typeof item?.organicCount === 'number' ? ` (places: ${item.organicCount})` : ''}
            </div>

            {placesPreview.length ? (
              <div className="mt-[12px] overflow-x-auto">
                <table className="min-w-full text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-[12px] font-semibold text-gray-700 border-b border-gray-200">Business name</th>
                      <th className="px-4 py-3 text-[12px] font-semibold text-gray-700 border-b border-gray-200">Contact number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placesPreview.map((r, idx) => {
                      const businessName = r?.title || 'Untitled';
                      const phoneNumber = formatPhonesForDisplay(extractAllPhonesFromPlace(r));
                      return (
                        <tr key={`${pageNumber}-${idx}`} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-[13px] text-gray-900 border-b border-gray-100">
                            {r?.link ? (
                              <a href={r.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                                {businessName}
                              </a>
                            ) : (
                              <span className="font-semibold text-blue-700">{businessName}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-gray-700 border-b border-gray-100">{phoneNumber}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-[12px] text-[13px] text-gray-500">
                No results with Sri Lanka mobile (07XXXXXXXX) or landline numbers on this page.
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default DashboardTabContent;

