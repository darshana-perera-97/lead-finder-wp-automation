import React from 'react';

function MessagesTabContent({
  messageTemplates,
  messagesLoading,
  messagesError,
  openAddMessageTemplate,
  openEditMessageTemplate,
  closeMessageTemplateModal,
  isAddMessagesOpen,
  editingTemplateId,
  saveMessageTemplate,
  setNewTemplate,
  newTemplate,
  updateTemplateMessage,
  onMediaFilePicked,
  savingTemplate,
  deleteMessageTemplate,
  deletingTemplateId,
}) {
  return (
    <>
      <div className="grid grid-cols-12 gap-[14px]">
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="font-bold text-[16px] text-slate-900">Saved Messages</div>
              <div className="text-[12px] text-gray-500 mt-1">
                Store 3-step message flows with media and intervals.
              </div>
            </div>
            <button
              type="button"
              className="h-9 rounded-xl bg-slate-800 text-white text-sm font-semibold px-3 hover:bg-slate-700"
              onClick={openAddMessageTemplate}
            >
              Add Messages
            </button>
          </div>

          {messagesError ? (
            <div className="mt-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
              {messagesError}
            </div>
          ) : null}

          {messagesLoading ? (
            <div className="text-[13px] text-gray-500 mt-3">Loading...</div>
          ) : messageTemplates.length === 0 ? (
            <div className="text-[13px] text-gray-500 mt-3">No saved messages yet.</div>
          ) : (
            <div className="grid grid-cols-12 gap-3 mt-3">
              {messageTemplates.map((t) => (
                <article
                  key={t.id}
                  className="col-span-12 md:col-span-6 xl:col-span-4 rounded-2xl border border-slate-200 p-4 bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14px] font-bold text-slate-900">{t.name || 'Untitled'}</h3>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        type="button"
                        className="h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-gray-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
                        onClick={() => openEditMessageTemplate(t)}
                        disabled={deletingTemplateId != null}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="h-8 rounded-lg border border-red-200 px-2.5 text-[12px] font-semibold text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        onClick={() => deleteMessageTemplate(t.id)}
                        disabled={deletingTemplateId != null}
                      >
                        {deletingTemplateId != null && String(deletingTemplateId) === String(t.id)
                          ? 'Deleting…'
                          : 'Delete'}
                      </button>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-gray-600 border border-slate-200">3 msgs</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(Array.isArray(t.messages) ? t.messages : []).map((m, i) => (
                      <div key={`${t.id}-${i}`} className="rounded-xl border border-slate-200 bg-slate-100 p-2.5">
                        <div className="text-[11px] text-gray-500">Message {i + 1}</div>
                        <div className="text-[12px] text-slate-800 mt-1 line-clamp-3">{m?.text || 'No text'}</div>
                        {m?.media ? (
                          <div className="text-[11px] text-slate-700 mt-1 truncate">Media attached</div>
                        ) : null}
                        {i > 0 ? (
                          <div className="text-[11px] text-gray-500 mt-1">Interval: {m?.interval || '00:00'}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isAddMessagesOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4">
          <div className="w-full max-w-[760px] bg-slate-50 rounded-2xl border border-slate-200 shadow-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <div className="font-bold text-[16px] text-slate-900">
                  {editingTemplateId != null ? 'Edit Messages' : 'Add Messages'}
                </div>
                <div className="text-[12px] text-gray-500 mt-1">
                  Create a 3-message sequence with media and intervals.
                </div>
              </div>
              <button
                type="button"
                className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-gray-700 bg-slate-50 hover:bg-slate-100"
                onClick={closeMessageTemplateModal}
              >
                Close
              </button>
            </div>

            <form className="p-5 space-y-4" onSubmit={saveMessageTemplate}>
              <label className="flex flex-col gap-2 text-[13px] text-gray-700">
                Message name
                <input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="e.g. Salon Outreach Sequence"
                  className="h-[42px] rounded-xl border border-slate-200 px-3 outline-none bg-slate-50 text-[14px] focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                />
              </label>

              {[0, 1, 2].map((idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[13px] text-slate-900">Message {idx + 1}</div>
                    {idx > 0 ? (
                      <label className="flex items-center gap-2 text-[12px] text-gray-600">
                        Interval (hh:mm)
                        <input
                          value={newTemplate.messages[idx].interval}
                          onChange={(e) => updateTemplateMessage(idx, { interval: e.target.value })}
                          pattern="\d{2}:\d{2}"
                          required
                          className="h-9 w-[88px] rounded-lg border border-slate-200 px-2 outline-none text-[12px] bg-slate-50 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    ) : (
                      <span className="text-[11px] text-gray-500">Sends first</span>
                    )}
                  </div>

                  <label className="flex flex-col gap-2 text-[12px] text-gray-600">
                    Text
                    <textarea
                      value={newTemplate.messages[idx].text}
                      onChange={(e) => updateTemplateMessage(idx, { text: e.target.value })}
                      placeholder={`Write message ${idx + 1}...`}
                      rows={3}
                      className="rounded-xl border border-slate-200 px-3 py-2 outline-none text-[13px] bg-slate-50 focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-[12px] text-gray-600">
                    Media (URL or Data URL)
                    <input
                      value={newTemplate.messages[idx].media}
                      onChange={(e) => updateTemplateMessage(idx, { media: e.target.value })}
                      placeholder="https://... or auto-fill from file upload"
                      className="h-[40px] rounded-xl border border-slate-200 px-3 outline-none text-[13px] bg-slate-50 focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-[12px] text-gray-600">
                    Upload media file
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => onMediaFilePicked(idx, e.target.files?.[0])}
                      className="text-[12px] text-gray-700"
                    />
                  </label>
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="h-10 rounded-xl bg-slate-800 text-white text-sm font-semibold px-4 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingTemplate ? 'Saving...' : editingTemplateId != null ? 'Save changes' : 'Save Messages'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default MessagesTabContent;

