import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AppFooter from '../common/AppFooter';
import pageContentMap from './pageContentMap';
import DashboardTabContent from './pages/DashboardTabContent';
import LeadsTabContent from './pages/LeadsTabContent';
import MessagesTabContent from './pages/MessagesTabContent';
import IntegrationsTabContent from './pages/IntegrationsTabContent';
import SettingsTabContent from './pages/SettingsTabContent';
import CampaignsTabContent from './pages/CampaignsTabContent';
import DefaultTabContent from './pages/DefaultTabContent';
import { classifyLeadContact } from '../../utils/lkPhone';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5656';

function cloneDefaultMessageTemplateForm() {
  return {
    name: '',
    messages: [
      { text: '', media: '', interval: '00:00' },
      { text: '', media: '', interval: '00:30' },
      { text: '', media: '', interval: '00:30' },
    ],
  };
}

function formStateFromSavedTemplate(t) {
  const msgs = Array.isArray(t?.messages) ? t.messages : [];
  const row = (i) => {
    const m = msgs[i] || {};
    return {
      text: typeof m.text === 'string' ? m.text : '',
      media: typeof m.media === 'string' ? m.media : '',
      interval: i === 0 ? '00:00' : typeof m.interval === 'string' ? m.interval : '00:30',
    };
  };
  return {
    name: typeof t?.name === 'string' ? t.name : '',
    messages: [row(0), row(1), row(2)],
  };
}

function Icon({
  children,
  viewBox = '0 0 24 24',
}) {
  return (
    <svg
      className="w-full h-full text-current opacity-95"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function Dashboard({ onLogout }) {
  const sections = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
          <Icon>
            <path
              d="M4 4h7v7H4V4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M13 4h7v7h-7V4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M4 13h7v7H4v-7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M13 13h7v7h-7v-7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </Icon>
        ),
      },
      {
        id: 'leads',
        label: 'leads',
        icon: (
          <Icon viewBox="0 0 24 24">
            <path
              d="M16 8a4 4 0 11-8 0 4 4 0 018 0Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M4.5 20c1.2-3.5 4.1-5 7.5-5s6.3 1.5 7.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Icon>
        ),
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: (
          <Icon viewBox="0 0 24 24">
            <path
              d="M4 6.8C4 5.2536 5.2536 4 6.8 4H17.2C18.7464 4 20 5.2536 20 6.8V14.2C20 15.7464 18.7464 17 17.2 17H9.2L6 20V17H6.8C5.2536 17 4 15.7464 4 14.2V6.8Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 8.5H16.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7.5 11.5H13.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Icon>
        ),
      },
      {
        id: 'camaigns',
        label: 'camaigns',
        icon: (
          <Icon viewBox="0 0 24 24">
            <path
              d="M4 12.5V9.8C4 8.80589 4.80589 8 5.8 8H14.2C15.1941 8 16 8.80589 16 9.8V12.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 12.5H19.2C20.1941 12.5 21 13.3059 21 14.3V15.5C21 16.4941 20.1941 17.3 19.2 17.3H16V12.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M8 8V6.8C8 5.80589 8.80589 5 9.8 5H10.7C11.6941 5 12.5 5.80589 12.5 6.8V8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M8 12.5V17.8C8 18.6941 8.80589 19.5 9.8 19.5H10.7C11.6941 19.5 12.5 18.6941 12.5 17.8V12.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </Icon>
        ),
      },
      {
        id: 'Settngs',
        label: 'Settngs',
        icon: (
          <Icon viewBox="0 0 24 24">
            <path
              d="M12 15.2C13.768 15.2 15.2 13.768 15.2 12C15.2 10.232 13.768 8.8 12 8.8C10.232 8.8 8.8 10.232 8.8 12C8.8 13.768 10.232 15.2 12 15.2Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M19.4 12C19.4 11.4 19.3 10.9 19.1 10.4L21 8.5L18.5 6L16.6 7.9C16.1 7.7 15.6 7.6 15 7.6C14.4 7.6 13.9 7.7 13.4 7.9L11.5 6L9 8.5L10.9 10.4C10.7 10.9 10.6 11.4 10.6 12C10.6 12.6 10.7 13.1 10.9 13.6L9 15.5L11.5 18L13.4 16.1C13.9 16.3 14.4 16.4 15 16.4C15.6 16.4 16.1 16.3 16.6 16.1L18.5 18L21 15.5L19.1 13.6C19.3 13.1 19.4 12.6 19.4 12Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Icon>
        ),
      },
      {
        id: 'intergrations',
        label: 'intergrations',
        icon: (
          <Icon viewBox="0 0 24 24">
            <path
              d="M9 8L12 5L15 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 5V14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7 14C7 17.3 9.7 20 13 20H18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M19 16C18.4 15.4 17.4 15.4 16.8 16C16.2 16.6 16.2 17.6 16.8 18.2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Icon>
        ),
      },
    ],
    []
  );

  const [activeId, setActiveId] = useState('dashboard');
  const [searchPhrase, setSearchPhrase] = useState('');
  const countryOptions = useMemo(
    () => [
      { label: 'Sri Lanka', gl: 'lk' },
      { label: 'United States', gl: 'us' },
      { label: 'United Kingdom', gl: 'gb' },
      { label: 'India', gl: 'in' },
      { label: 'Canada', gl: 'ca' },
      { label: 'Australia', gl: 'au' },
      { label: 'Pakistan', gl: 'pk' },
      { label: 'Germany', gl: 'de' },
      { label: 'France', gl: 'fr' },
      { label: 'United Arab Emirates', gl: 'ae' },
    ],
    []
  );

  const [countryGl, setCountryGl] = useState('lk');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lastSearch, setLastSearch] = useState(null);
  const [recentSearchItems, setRecentSearchItems] = useState([]);
  const [recentSearchPageIdx, setRecentSearchPageIdx] = useState(0);
  const [recentSearchLoading, setRecentSearchLoading] = useState(false);
  const [recentSearchError, setRecentSearchError] = useState('');
  const [saveLeadsLoading, setSaveLeadsLoading] = useState(false);
  const [saveLeadsMessage, setSaveLeadsMessage] = useState('');
  const [saveLeadsError, setSaveLeadsError] = useState('');
  const [leadItems, setLeadItems] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState('');

  const [dashboardStats, setDashboardStats] = useState({
    loading: true,
    error: '',
    savedLeadsTotal: 0,
    landlineLeadsCount: 0,
    messageTemplatesCount: 0,
    campaignsCount: 0,
  });

  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState('');
  const [waSession, setWaSession] = useState({
    connected: false,
    qrImage: null,
    account: null,
  });

  const [messageTemplates, setMessageTemplates] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [isAddMessagesOpen, setIsAddMessagesOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);
  const [newTemplate, setNewTemplate] = useState(() => cloneDefaultMessageTemplateForm());

  async function fetchRecentSearch() {
    setRecentSearchLoading(true);
    setRecentSearchError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/recent-search`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let msg = 'Failed to load recent search results';
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setRecentSearchItems(items);
      setRecentSearchPageIdx(0);
    } catch (err) {
      setRecentSearchError(err?.message || 'Failed to load recent search results');
    } finally {
      setRecentSearchLoading(false);
    }
  }

  const fetchDashboardStats = useCallback(async () => {
    setDashboardStats((s) => ({ ...s, loading: true, error: '' }));
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();
      const headers = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const [lr, tr, cr] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leads`, { headers }),
        fetch(`${API_BASE_URL}/api/message-templates`, { headers }),
        fetch(`${API_BASE_URL}/api/campaigns`, { headers }),
      ]);
      const leadsPayload = lr.ok ? await lr.json().catch(() => ({})) : {};
      const templatesPayload = tr.ok ? await tr.json().catch(() => ({})) : {};
      const campaignsPayload = cr.ok ? await cr.json().catch(() => ({})) : {};
      const items = Array.isArray(leadsPayload.items) ? leadsPayload.items : [];
      const landlineLeadsCount = items.reduce(
        (n, lead) => (classifyLeadContact(lead?.contact).landline ? n + 1 : n),
        0
      );
      setDashboardStats({
        loading: false,
        error: '',
        savedLeadsTotal: items.length,
        landlineLeadsCount,
        messageTemplatesCount: Array.isArray(templatesPayload.items) ? templatesPayload.items.length : 0,
        campaignsCount: Array.isArray(campaignsPayload.items) ? campaignsPayload.items.length : 0,
      });
    } catch (err) {
      setDashboardStats({
        loading: false,
        error: err?.message || 'Failed to load dashboard stats',
        savedLeadsTotal: 0,
        landlineLeadsCount: 0,
        messageTemplatesCount: 0,
        campaignsCount: 0,
      });
    }
  }, []);

  async function handleSaveAllLeads() {
    setSaveLeadsLoading(true);
    setSaveLeadsMessage('');
    setSaveLeadsError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/leads/save-recent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to save leads');
      }

      const skipped = Number(data?.skippedDuplicates) || 0;
      const saved = data?.savedNow ?? 0;
      const total = data?.totalSaved ?? 0;
      setSaveLeadsMessage(
        `Saved ${saved} leads. Total stored: ${total}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`
      );
      fetchDashboardStats();
    } catch (err) {
      setSaveLeadsError(err?.message || 'Failed to save leads');
    } finally {
      setSaveLeadsLoading(false);
    }
  }

  useEffect(() => {
    if (activeId !== 'dashboard') return;
    fetchRecentSearch();
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, fetchDashboardStats]);

  async function fetchSavedLeads() {
    setLeadsLoading(true);
    setLeadsError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let msg = 'Failed to load leads';
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setLeadItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setLeadsError(err?.message || 'Failed to load leads');
    } finally {
      setLeadsLoading(false);
    }
  }

  async function importCustomLeads(rows) {
    const payloadRows = Array.isArray(rows) ? rows : [];
    if (!payloadRows.length) {
      throw new Error('No rows to import');
    }

    const token = (() => {
      try {
        return localStorage.getItem('accessToken');
      } catch {
        return null;
      }
    })();

    const res = await fetch(`${API_BASE_URL}/api/leads/import-custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rows: payloadRows }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || 'Failed to import custom leads');
    }

    await fetchSavedLeads();
    fetchDashboardStats();
    return data;
  }

  useEffect(() => {
    if (activeId !== 'leads') return;
    fetchSavedLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function fetchWhatsAppSession() {
    setWaLoading(true);
    setWaError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/whatsapp/session`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let msg = 'Failed to load WhatsApp session';
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setWaSession(data?.session || { connected: false, qrImage: null, account: null });
    } catch (err) {
      setWaError(err?.message || 'Failed to load WhatsApp session');
    } finally {
      setWaLoading(false);
    }
  }

  useEffect(() => {
    if (activeId !== 'intergrations' && activeId !== 'Settngs' && activeId !== 'dashboard') return;
    fetchWhatsAppSession();
    const id = window.setInterval(fetchWhatsAppSession, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function fetchMessageTemplates() {
    setMessagesLoading(true);
    setMessagesError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/message-templates`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let msg = 'Failed to load saved messages';
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setMessageTemplates(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setMessagesError(err?.message || 'Failed to load saved messages');
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (activeId !== 'messages') return;
    fetchMessageTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function updateTemplateMessage(index, patch) {
    setNewTemplate((prev) => ({
      ...prev,
      messages: prev.messages.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function onMediaFilePicked(index, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateTemplateMessage(index, { media: typeof reader.result === 'string' ? reader.result : '' });
    };
    reader.readAsDataURL(file);
  }

  function openAddMessageTemplate() {
    setEditingTemplateId(null);
    setNewTemplate(cloneDefaultMessageTemplateForm());
    setIsAddMessagesOpen(true);
  }

  function openEditMessageTemplate(t) {
    setEditingTemplateId(t?.id ?? null);
    setNewTemplate(formStateFromSavedTemplate(t));
    setIsAddMessagesOpen(true);
  }

  function closeMessageTemplateModal() {
    setIsAddMessagesOpen(false);
    setEditingTemplateId(null);
    setNewTemplate(cloneDefaultMessageTemplateForm());
  }

  async function saveMessageTemplate(e) {
    e.preventDefault();
    setMessagesError('');
    setSavingTemplate(true);
    try {
      const hhmm = /^\d{2}:\d{2}$/;
      if (!newTemplate.name.trim()) throw new Error('Message name is required');
      if (!hhmm.test(newTemplate.messages[1].interval) || !hhmm.test(newTemplate.messages[2].interval)) {
        throw new Error('Time interval must be in hh:mm format');
      }

      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const payload = {
        name: newTemplate.name.trim(),
        messages: newTemplate.messages.map((m, idx) => ({
          text: m.text,
          media: m.media,
          interval: idx === 0 ? '00:00' : m.interval,
        })),
      };

      const isEdit = editingTemplateId != null && editingTemplateId !== '';
      const url = isEdit
        ? `${API_BASE_URL}/api/message-templates/${encodeURIComponent(editingTemplateId)}`
        : `${API_BASE_URL}/api/message-templates`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = isEdit ? 'Failed to update message template' : 'Failed to save message template';
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      closeMessageTemplateModal();
      await fetchMessageTemplates();
    } catch (err) {
      setMessagesError(err?.message || 'Failed to save message template');
    } finally {
      setSavingTemplate(false);
    }
  }

  async function deleteMessageTemplate(templateId) {
    if (!window.confirm('Delete this message template? Campaigns that use it may fail to send until you pick another template.')) {
      return;
    }
    setDeletingTemplateId(templateId);
    setMessagesError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();
      const res = await fetch(`${API_BASE_URL}/api/message-templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to delete message template');
      }
      setMessageTemplates(Array.isArray(data?.items) ? data.items : []);
      if (editingTemplateId != null && String(editingTemplateId) === String(templateId)) {
        closeMessageTemplateModal();
      }
      fetchDashboardStats();
    } catch (err) {
      setMessagesError(err?.message || 'Failed to delete message template');
    } finally {
      setDeletingTemplateId(null);
    }
  }

  async function handleWhatsAppLogout() {
    setWaLoading(true);
    setWaError('');
    try {
      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/whatsapp/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        let msg = 'Failed to logout WhatsApp';
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      await fetchWhatsAppSession();
    } catch (err) {
      setWaError(err?.message || 'Failed to logout WhatsApp');
    } finally {
      setWaLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearchLoading(true);
    try {
      const payload = {
        searchPhrase: searchPhrase.trim(),
        country: countryGl.trim(),
      };

      const token = (() => {
        try {
          return localStorage.getItem('accessToken');
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = 'Search failed';
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setLastSearch({
        searchPhrase: payload.searchPhrase,
        country: (countryOptions.find((c) => c.gl === countryGl) || { label: countryGl }).label,
        pagesFetched: data?.pagesFetched,
        at: new Date().toISOString(),
      });
      await fetchRecentSearch();
    } catch (err) {
      setSearchError(err?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  const active = useMemo(() => sections.find((s) => s.id === activeId) || sections[0], [activeId, sections]);
  const content = useMemo(() => pageContentMap[activeId] || pageContentMap.dashboard, [activeId]);

  return (
    <div className="h-screen flex bg-[#f6f7fb] text-slate-900">
      <Sidebar sections={sections} activeId={activeId} onSelect={setActiveId} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={active.label} subtitle="Minimal UI dashboard" onLogout={onLogout} />
        <main className="flex-1 overflow-auto p-[22px] pb-[28px]">
          <div className="max-w-[1180px] mx-auto">
            {activeId === 'messages' ? (
              <MessagesTabContent
                messageTemplates={messageTemplates}
                messagesLoading={messagesLoading}
                messagesError={messagesError}
                openAddMessageTemplate={openAddMessageTemplate}
                openEditMessageTemplate={openEditMessageTemplate}
                closeMessageTemplateModal={closeMessageTemplateModal}
                isAddMessagesOpen={isAddMessagesOpen}
                editingTemplateId={editingTemplateId}
                saveMessageTemplate={saveMessageTemplate}
                setNewTemplate={setNewTemplate}
                newTemplate={newTemplate}
                updateTemplateMessage={updateTemplateMessage}
                onMediaFilePicked={onMediaFilePicked}
                savingTemplate={savingTemplate}
                deleteMessageTemplate={deleteMessageTemplate}
                deletingTemplateId={deletingTemplateId}
              />
            ) : activeId === 'intergrations' ? (
              <IntegrationsTabContent
                waLoading={waLoading}
                waError={waError}
                waSession={waSession}
                handleWhatsAppLogout={handleWhatsAppLogout}
              />
            ) : activeId === 'dashboard' ? (
              <DashboardTabContent
                searchPhrase={searchPhrase}
                setSearchPhrase={setSearchPhrase}
                countryOptions={countryOptions}
                countryGl={countryGl}
                setCountryGl={setCountryGl}
                handleSearch={handleSearch}
                searchLoading={searchLoading}
                searchError={searchError}
                lastSearch={lastSearch}
                recentSearchItems={recentSearchItems}
                recentSearchLoading={recentSearchLoading}
                recentSearchError={recentSearchError}
                recentSearchPageIdx={recentSearchPageIdx}
                setRecentSearchPageIdx={setRecentSearchPageIdx}
                handleSaveAllLeads={handleSaveAllLeads}
                saveLeadsLoading={saveLeadsLoading}
                saveLeadsMessage={saveLeadsMessage}
                saveLeadsError={saveLeadsError}
                waSession={waSession}
                waLoading={waLoading}
                waError={waError}
                onOpenWhatsAppIntegration={() => setActiveId('intergrations')}
                dashboardStats={dashboardStats}
              />
            ) : activeId === 'leads' ? (
              <LeadsTabContent
                leadsLoading={leadsLoading}
                leadsError={leadsError}
                leadItems={leadItems}
                onImportCustomLeads={importCustomLeads}
              />
            ) : activeId === 'Settngs' ? (
              <SettingsTabContent waSession={waSession} waLoading={waLoading} waError={waError} />
            ) : activeId === 'camaigns' ? (
              <CampaignsTabContent />
            ) : (
              <DefaultTabContent content={content} />
            )}
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  );
}

export default Dashboard;

