import React from 'react';

function formatDisplayPhone(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length >= 9) return `+${digits}`;
  return String(raw).trim();
}

function SettingsTabContent({ waSession, waLoading, waError }) {
  const session = waSession || { connected: false, account: null };
  const account = session.account;
  const phoneDisplay =
    formatDisplayPhone(account?.widUser) ||
    formatDisplayPhone(account?.phoneNumber) ||
    (account?.widUser || account?.phoneNumber || null);
  const isReady = !!session.messagingReady && session.connected;
  const showLinkedDetails = session.connected && account;

  return (
    <div className="grid grid-cols-12 gap-[14px]">
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-bold text-[16px] text-slate-900">WhatsApp account</div>
            <div className="text-[12px] text-gray-500 mt-1">Linked device used for campaigns and messaging.</div>
          </div>
          {session.connected ? (
            <span
              className={`shrink-0 text-[12px] font semifont-semibold px-2.5 py-1.5 rounded-full border ${
                isReady
                  ? 'border-green-200 text-green-700 bg-green-50'
                  : 'border-amber-200 text-amber-800 bg-amber-50'
              }`}
            >
              {isReady ? 'Connected' : 'Connecting…'}
            </span>
          ) : (
            <span className="shrink-0 text-[12px] font-semibold px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50">
              Not linked
            </span>
          )}
        </div>

        {waLoading ? (
          <div className="text-[13px] text-gray-500">Loading session…</div>
        ) : waError ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
            {waError}
          </div>
        ) : showLinkedDetails ? (
          <div className="space-y-4">
            {session.connected && !isReady ? (
              <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 m-0">
                Session is signing in. If this stays stuck, open <strong>Integrations</strong> and confirm the device is linked.
              </p>
            ) : null}

            <dl className="grid grid-cols-12 gap-3 m-0">
              <div className="col-span-12 sm:col-span-6 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5">
                <dt className="text-[11px] text-gray-500 uppercase tracking-wide">Display name</dt>
                <dd className="m-0 mt-1 text-[13px] font-semibold text-gray-900">
                  {account?.pushname || '—'}
                </dd>
              </div>
              <div className="col-span-12 sm:col-span-6 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5">
                <dt className="text-[11px] text-gray-500 uppercase tracking-wide">Profile name</dt>
                <dd className="m-0 mt-1 text-[13px] font-semibold text-gray-900">
                  {account?.name || '—'}
                </dd>
              </div>
              <div className="col-span-12 sm:col-span-6 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5">
                <dt className="text-[11px] text-gray-500 uppercase tracking-wide">Phone number</dt>
                <dd className="m-0 mt-1 text-[13px] font-semibold text-gray-900">
                  {phoneDisplay || '—'}
                </dd>
              </div>
              {account?.widSerialized ? (
                <div className="col-span-12 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5">
                  <dt className="text-[11px] text-gray-500 uppercase tracking-wide">WhatsApp id</dt>
                  <dd className="m-0 mt-1 text-[12px] font-mono text-gray-800 break-all">{account.widSerialized}</dd>
                </div>
              ) : null}
            </dl>

            {isReady ? (
              <p className="text-[12px] text-gray-600 m-0">
                This account is ready to send campaign messages. Use <strong>Integrations</strong> to disconnect or scan a new QR
                code.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="text-[13px] text-gray-600 space-y-2">
            <p className="m-0">No WhatsApp device linked yet.</p>
            <p className="m-0">
              Open the <strong>Integrations</strong> page, scan the QR code with your phone, then return here to see account
              details.
            </p>
            {session.error ? (
              <p className="m-0 text-amber-800 text-[12px] border border-amber-200 bg-amber-50 rounded-xl px-3 py-2">
                Server: {session.error}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

export default SettingsTabContent;
