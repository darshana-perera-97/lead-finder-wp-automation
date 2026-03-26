import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatSriLankaDateTime } from '../../../utils/sriLankaTime';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5656';

function statusBadgeClass(status) {
  if (status === 'live') return 'border-green-200 text-green-800 bg-green-50';
  if (status === 'paused') return 'border-amber-200 text-amber-800 bg-amber-50';
  if (status === 'completed') return 'border-emerald-200 text-emerald-900 bg-emerald-50';
  return 'border-slate-200 text-slate-600 bg-slate-50';
}

function statusLabel(status) {
  if (status === 'live') return 'Live';
  if (status === 'paused') return 'Paused';
  if (status === 'completed') return 'Completed';
  return 'Completed';
}

/** Finished automated sequence: all sends done, or user replied (so follow-ups were skipped). */
function contactFunnelDoneUi(c) {
  if (!c || !c.chatId) return true;
  if (!c.message1Sent) return false;
  if (c.userReplyAfterMessage1At) return true;
  if (!c.message2Sent) return false;
  if (c.userReplyAfterMessage2At) return true;
  return !!c.message3Sent;
}

/**
 * From campaign.contacts: which template step is “active” (min next step among reachable leads)
 * and how many contacts finished the sequence (sent or stopped by reply).
 */
function computeCampaignSequenceInsights(contacts) {
  const list = Array.isArray(contacts) ? contacts : [];
  if (list.length === 0) {
    return {
      hasContacts: false,
      totalContacts: 0,
      reachableCount: 0,
      completedCount: 0,
      currentStep: null,
    };
  }

  const reachable = list.filter((c) => c && c.chatId);
  const completedCount = list.filter((c) => c && contactFunnelDoneUi(c)).length;

  function nextStepForContact(c) {
    if (!c || !c.chatId) return null;
    if (contactFunnelDoneUi(c)) return null;
    if (!c.message1Sent) return 1;
    if (!c.message2Sent) return 2;
    if (!c.message3Sent) return 3;
    return null;
  }

  const pendingSteps = reachable.map(nextStepForContact).filter((s) => s != null);
  const currentStep = pendingSteps.length ? Math.min(...pendingSteps) : null;

  return {
    hasContacts: true,
    totalContacts: list.length,
    reachableCount: reachable.length,
    completedCount,
    currentStep,
  };
}

function authHeaders() {
  const token = (() => {
    try {
      return localStorage.getItem('accessToken');
    } catch {
      return null;
    }
  })();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function CampaignsTabContent() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selected, setSelected] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [modalLeadsLoading, setModalLeadsLoading] = useState(false);
  const [modalTemplatesLoading, setModalTemplatesLoading] = useState(false);
  const [leadsForPhrases, setLeadsForPhrases] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [campaignName, setCampaignName] = useState('');
  const [selectedPhrases, setSelectedPhrases] = useState([]);
  const [templateId, setTemplateId] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
        headers: {
          Accept: 'application/json',
          ...authHeaders(),
        },
      });

      if (!res.ok) {
        let msg = 'Failed to load campaigns';
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setCampaigns(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const phraseOptions = useMemo(() => {
    const s = new Set();
    leadsForPhrases.forEach((l) => {
      const p = typeof l.searchResult === 'string' ? l.searchResult.trim() : '';
      if (p) s.add(p);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [leadsForPhrases]);

  function closeCampaignModal() {
    setCreateOpen(false);
    setEditingCampaignId(null);
    setCreateError('');
    setCampaignName('');
    setSelectedPhrases([]);
    setTemplateId('');
  }

  async function openCreateModal() {
    setEditingCampaignId(null);
    setCreateOpen(true);
    setCreateError('');
    setCampaignName('');
    setSelectedPhrases([]);
    setTemplateId('');
    setModalLeadsLoading(true);
    setModalTemplatesLoading(true);

    try {
      const [lr, tr] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leads`, { headers: { Accept: 'application/json', ...authHeaders() } }),
        fetch(`${API_BASE_URL}/api/message-templates`, { headers: { Accept: 'application/json', ...authHeaders() } }),
      ]);

      if (lr.ok) {
        const ld = await lr.json();
        setLeadsForPhrases(Array.isArray(ld?.items) ? ld.items : []);
      } else {
        setLeadsForPhrases([]);
      }

      if (tr.ok) {
        const td = await tr.json();
        setMessageTemplates(Array.isArray(td?.items) ? td.items : []);
      } else {
        setMessageTemplates([]);
      }
    } catch {
      setLeadsForPhrases([]);
      setMessageTemplates([]);
    } finally {
      setModalLeadsLoading(false);
      setModalTemplatesLoading(false);
    }
  }

  async function openEditModal(c) {
    setEditingCampaignId(c?.id ?? null);
    setCreateError('');
    setCampaignName(typeof c?.name === 'string' ? c.name : '');
    setSelectedPhrases(Array.isArray(c?.searchPhrases) ? [...c.searchPhrases] : []);
    setTemplateId(c?.messageTemplateId != null ? String(c.messageTemplateId) : '');
    setCreateOpen(true);
    setModalLeadsLoading(true);
    setModalTemplatesLoading(true);

    try {
      const [lr, tr] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leads`, { headers: { Accept: 'application/json', ...authHeaders() } }),
        fetch(`${API_BASE_URL}/api/message-templates`, { headers: { Accept: 'application/json', ...authHeaders() } }),
      ]);

      if (lr.ok) {
        const ld = await lr.json();
        setLeadsForPhrases(Array.isArray(ld?.items) ? ld.items : []);
      } else {
        setLeadsForPhrases([]);
      }

      if (tr.ok) {
        const td = await tr.json();
        setMessageTemplates(Array.isArray(td?.items) ? td.items : []);
      } else {
        setMessageTemplates([]);
      }
    } catch {
      setLeadsForPhrases([]);
      setMessageTemplates([]);
    } finally {
      setModalLeadsLoading(false);
      setModalTemplatesLoading(false);
    }
  }

  function togglePhrase(p) {
    setSelectedPhrases((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function submitCreateCampaign(e) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const isEdit = editingCampaignId != null && editingCampaignId !== '';
      const url = isEdit
        ? `${API_BASE_URL}/api/campaigns/${encodeURIComponent(editingCampaignId)}`
        : `${API_BASE_URL}/api/campaigns`;
      const method = isEdit ? 'PATCH' : 'POST';
      const payload = {
        name: campaignName.trim(),
        searchPhrases: selectedPhrases,
        messageTemplateId: templateId === '' ? null : Number(templateId),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || (isEdit ? 'Failed to update campaign' : 'Failed to create campaign'));
      }

      setCampaigns(Array.isArray(data?.items) ? data.items : []);
      if (selected && isEdit && String(selected.id) === String(editingCampaignId) && data.item) {
        setSelected(data.item);
      }
      closeCampaignModal();
    } catch (err) {
      setCreateError(err?.message || 'Failed to save campaign');
    } finally {
      setCreateLoading(false);
    }
  }

  async function patchStatus(campaignId, status) {
    setUpdatingId(campaignId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${encodeURIComponent(campaignId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update campaign');
      }

      setCampaigns(Array.isArray(data?.items) ? data.items : []);
      setSelected((prev) => (prev && String(prev.id) === String(campaignId) ? data.item : prev));
    } catch (err) {
      setError(err?.message || 'Failed to update campaign');
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteCampaign(campaignId) {
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    setDeletingId(campaignId);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns/${encodeURIComponent(campaignId)}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          ...authHeaders(),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to delete campaign');
      }
      setCampaigns(Array.isArray(data?.items) ? data.items : []);
      setSelected((prev) => (prev && String(prev.id) === String(campaignId) ? null : prev));
    } catch (err) {
      setError(err?.message || 'Failed to delete campaign');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-[14px]">
      <div className="col-span-12 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="h-10 rounded-xl bg-blue-600 text-white font-bold text-sm px-4 hover:bg-blue-700"
          onClick={openCreateModal}
        >
          Create Campaign
        </button>
      </div>

      {error ? (
        <div className="col-span-12 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="col-span-12 text-[13px] text-gray-500">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="col-span-12 text-[13px] text-gray-500">
          No saved campaigns yet. Use Create Campaign to add one.
        </div>
      ) : (
        campaigns.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(c)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(c);
              }
            }}
            className="col-span-12 sm:col-span-6 lg:col-span-4 text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-blue-200 hover:shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-600/20 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="font-bold text-[15px] text-slate-900 leading-snug pr-2">{c.name || 'Untitled campaign'}</div>
              <span
                className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusBadgeClass(c.status)}`}
              >
                {statusLabel(c.status)}
              </span>
            </div>
            {c.messageTemplateName ? (
              <div className="text-[12px] text-gray-600 mb-1">
                Message: <span className="font-medium text-gray-800">{c.messageTemplateName}</span>
              </div>
            ) : null}
            {Array.isArray(c.searchPhrases) && c.searchPhrases.length ? (
              <div className="text-[11px] text-gray-500 line-clamp-2 mb-2">Phrases: {c.searchPhrases.join(', ')}</div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-800 bg-white hover:bg-gray-50 disabled:opacity-50"
                disabled={updatingId === c.id || deletingId === c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(c);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="h-9 rounded-xl border border-red-200 px-3 text-sm text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                disabled={updatingId === c.id || deletingId === c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCampaign(c.id);
                }}
              >
                {deletingId === c.id ? 'Deleting…' : 'Delete'}
              </button>
              {c.status === 'completed' ? null : c.status === 'live' ? (
                <button
                  type="button"
                  className="h-9 rounded-xl border border-amber-200 px-3 text-sm text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                  disabled={updatingId === c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    patchStatus(c.id, 'paused');
                  }}
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="h-9 rounded-xl border border-green-200 px-3 text-sm text-green-800 bg-green-50 hover:bg-green-100 disabled:opacity-50"
                  disabled={updatingId === c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    patchStatus(c.id, 'live');
                  }}
                >
                  Continue
                </button>
              )}
            </div>
            <div className="mt-3 text-[11px] text-gray-400">Click card for analytics</div>
          </div>
        ))
      )}

      {createOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-campaign-title"
          onClick={() => !createLoading && closeCampaignModal()}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 id="create-campaign-title" className="m-0 text-lg font-bold text-slate-900">
                {editingCampaignId != null ? 'Edit campaign' : 'Create campaign'}
              </h2>
              <button
                type="button"
                className="h-9 w-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0 disabled:opacity-50"
                disabled={createLoading}
                onClick={closeCampaignModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form className="flex flex-col gap-4" onSubmit={submitCreateCampaign}>
              <label className="flex flex-col gap-1.5 text-[13px] text-gray-700">
                Campaign name
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                  placeholder="e.g. March salon outreach"
                  className="h-11 rounded-xl border border-gray-200 px-3 outline-none text-[14px] focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
                />
              </label>

              <div>
                <div className="text-[13px] font-semibold text-gray-800 mb-2">Search phrases (from saved leads)</div>
                {modalLeadsLoading ? (
                  <div className="text-[13px] text-gray-500">Loading phrases...</div>
                ) : phraseOptions.length === 0 ? (
                  <div className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    No search phrases found. Save leads from the Dashboard (Lead search) first.
                  </div>
                ) : (
                  <div className="max-h-[180px] overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
                    {phraseOptions.map((p) => (
                      <label
                        key={p}
                        className="flex items-start gap-2 text-[13px] text-gray-800 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-gray-300"
                          checked={selectedPhrases.includes(p)}
                          onChange={() => togglePhrase(p)}
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="text-[11px] text-gray-500 mt-1">{selectedPhrases.length} selected</div>
              </div>

              <label className="flex flex-col gap-1.5 text-[13px] text-gray-700">
                Message template
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  required
                  disabled={modalTemplatesLoading}
                  className="h-11 rounded-xl border border-gray-200 px-3 outline-none text-[14px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 disabled:opacity-60"
                >
                  <option value="">Select a template…</option>
                  {messageTemplates.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name || `Template ${t.id}`}
                    </option>
                  ))}
                </select>
                {modalTemplatesLoading ? (
                  <span className="text-[12px] text-gray-500">Loading templates…</span>
                ) : messageTemplates.length === 0 ? (
                  <span className="text-[12px] text-amber-700">Add templates on the Messages page first.</span>
                ) : null}
              </label>

              {createError ? (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
                  {createError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="h-10 rounded-xl border border-gray-200 px-4 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={createLoading}
                  onClick={closeCampaignModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 text-white font-bold text-sm px-4 disabled:opacity-50"
                  disabled={createLoading || selectedPhrases.length === 0 || !templateId || phraseOptions.length === 0}
                >
                  {createLoading
                    ? editingCampaignId != null
                      ? 'Saving…'
                      : 'Starting…'
                    : editingCampaignId != null
                      ? 'Save changes'
                      : 'Start campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-analytics-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 id="campaign-analytics-title" className="m-0 text-lg font-bold text-slate-900">
                  Campaign analytics
                </h2>
                <p className="m-0 mt-1 text-[13px] text-gray-600">{selected.name}</p>
              </div>
              <button
                type="button"
                className="h-9 w-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {(() => {
              const modalProg = computeCampaignSequenceInsights(selected.contacts);
              const showCompleted =
                selected.status === 'completed' ||
                (modalProg.hasContacts &&
                  modalProg.reachableCount > 0 &&
                  modalProg.currentStep == null);
              const badgeStatus = showCompleted ? 'completed' : selected.status;

              return (
                <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Campaign state</div>
                  <span
                    className={`inline-flex text-[12px] font-semibold px-2.5 py-1 rounded-full border ${statusBadgeClass(badgeStatus)}`}
                  >
                    {statusLabel(badgeStatus)}
                  </span>
                  <p className="text-[11px] text-gray-600 mt-2 m-0 leading-snug">
                    {showCompleted
                      ? 'Completed — no further automated sends for this campaign.'
                      : selected.status === 'live'
                        ? 'While live, the campaign can send your template sequence to matching leads.'
                        : selected.status === 'paused'
                          ? 'Sending is paused. Use Continue on the campaign card to set live again.'
                          : 'Completed — no further automated sends for this campaign.'}
                  </p>
                  {(() => {
                    const prog = modalProg;
                    if (!prog.hasContacts) {
                      return (
                        <p className="text-[11px] text-gray-500 mt-2 m-0 leading-snug">
                          Sequence step and per-contact completion appear when this campaign has a saved contact list (after
                          creation or a send run).
                        </p>
                      );
                    }

                    let stepLine;
                    if (prog.reachableCount === 0) {
                      stepLine = '— (no WhatsApp chat on file for contacts)';
                    } else if (prog.currentStep == null) {
                      stepLine = 'Message sequence done for every reachable contact (tracked steps sent)';
                    } else {
                      const runWord = selected.status === 'live' ? 'Running on' : 'Next pending';
                      stepLine =
                        selected.status === 'live'
                          ? `${runWord} message ${prog.currentStep} of 3`
                          : `${runWord}: message ${prog.currentStep} of 3`;
                    }

                    return (
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                        <div className="border border-gray-100/80 rounded-lg px-2.5 py-2 bg-white/60">
                          <dt className="text-[10px] text-gray-500 uppercase tracking-wide">Sequence</dt>
                          <dd className="m-0 mt-0.5 font-semibold text-slate-900 leading-snug">{stepLine}</dd>
                        </div>
                        <div className="border border-gray-100/80 rounded-lg px-2.5 py-2 bg-white/60">
                          <dt className="text-[10px] text-gray-500 uppercase tracking-wide">Contacts completed</dt>
                          <dd className="m-0 mt-0.5 font-semibold text-slate-900 tabular-nums">
                            {prog.completedCount} / {prog.totalContacts}
                          </dd>
                          <dd className="m-0 text-[10px] text-gray-500 font-normal">sent all steps or replied (no more sends)</dd>
                        </div>
                      </dl>
                    );
                  })()}
                </div>
              );
            })()}

            {selected.messageTemplateName ? (
              <p className="text-[13px] text-gray-700 mb-2">
                <span className="text-gray-500">Message template:</span>{' '}
                <strong>{selected.messageTemplateName}</strong>
              </p>
            ) : null}
            {Array.isArray(selected.searchPhrases) && selected.searchPhrases.length ? (
              <p className="text-[13px] text-gray-700 mb-4">
                <span className="text-gray-500">Search phrases:</span> {selected.searchPhrases.join(', ')}
              </p>
            ) : null}

            {selected.lastSendError ? (
              <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
                <strong className="font-semibold">Last send error:</strong> {selected.lastSendError}
              </div>
            ) : null}

            {selected.analytics && typeof selected.analytics === 'object' ? (
              <dl className="grid grid-cols-2 gap-3 text-[13px]">
                {[
                  ['Messages delivered', selected.analytics.messagesDelivered],
                  ['Leads in campaign', selected.analytics.leadsInCampaign],
                  [
                    'Last activity',
                    selected.analytics.lastActivityAt ? formatSriLankaDateTime(selected.analytics.lastActivityAt) : null,
                  ],
                ]
                  .filter(([, v]) => v != null && v !== '')
                  .map(([label, value]) => (
                    <div key={label} className="border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/80">
                      <dt className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</dt>
                      <dd className="m-0 mt-1 font-semibold text-gray-900">{value}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-[13px] text-gray-500">No analytics stored for this campaign.</p>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100 text-[12px] text-gray-500">
              Created: {selected.createdAt ? formatSriLankaDateTime(selected.createdAt) : 'N/A'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CampaignsTabContent;
