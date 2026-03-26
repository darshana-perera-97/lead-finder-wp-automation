import React from 'react';

function IntegrationsTabContent({ waLoading, waError, waSession, handleWhatsAppLogout }) {
  return (
    <div className="grid grid-cols-12 gap-[14px]">
      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
        <div className="flex items-start justify-between gap-4 mb-[10px]">
          <div>
            <div className="font-bold text-[16px] text-slate-900">WhatsApp Integration</div>
            <div className="text-[12px] text-gray-500 mt-1">
              {waSession.connected ? 'Account connected' : 'Not linked yet — scan QR'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {waSession.connected ? (
              <button
                type="button"
                className="h-9 rounded-xl border border-red-200 px-3 text-sm text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleWhatsAppLogout}
                disabled={waLoading}
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </div>

        {waLoading ? (
          <div className="mt-[14px] text-[13px] text-gray-500">Loading...</div>
        ) : waError ? (
          <div className="mt-[14px] p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
            {waError}
          </div>
        ) : waSession.connected ? (
          <div className="mt-[14px] space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200">
              <div className="text-[13px] font-semibold text-gray-800">Account</div>
              <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-green-200 text-green-700 bg-green-50">
                Connected
              </span>
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-6">
                <div className="text-[12px] text-gray-500">Name</div>
                <div className="text-[13px] text-gray-900 font-semibold mt-1">
                  {waSession.account?.name || waSession.account?.pushname || 'N/A'}
                </div>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <div className="text-[12px] text-gray-500">Phone</div>
                <div className="text-[13px] text-gray-900 font-semibold mt-1">
                  {waSession.account?.widUser || waSession.account?.phoneNumber || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-[14px] flex flex-col items-center gap-4">
            {waSession.qrImage ? (
              <>
                <img
                  src={waSession.qrImage}
                  alt="WhatsApp QR code"
                  className="w-[220px] h-[220px] rounded-2xl border border-gray-200 bg-white"
                />
                <div className="text-[13px] text-gray-600">
                  Open WhatsApp, then Settings, Linked Devices, and Link a Device.
                </div>
              </>
            ) : (
              <div className="text-[13px] text-gray-500">Generating QR code...</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default IntegrationsTabContent;

