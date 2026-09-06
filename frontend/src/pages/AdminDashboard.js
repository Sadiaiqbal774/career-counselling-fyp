import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const ADMIN_TOKEN_KEY = 'career-guide-admin-token';

const tabs = [
  ['users', 'Users'],
  ['scholarships', 'Scholarships'],
  ['universities', 'Universities'],
  ['assessments', 'Assessments'],
  ['chatbot', 'Chatbot'],
  ['eligibility', 'Eligibility'],
  ['activity', 'System reports'],
];

// One-line context shown under the page title, keyed by top-level tab id.
const tabDescriptions = {
  users: 'Everyone with an account on the platform, and their access.',
  scholarships: 'The scholarship listings shown in the Scholarship Finder.',
  universities: 'University profiles and the programs listed under each.',
  assessments: 'Read-only. Every quiz and recommender result a student has taken.',
  chatbot: 'Monitor visitor conversations and manage the automated replies.',
  eligibility: 'Minimum-marks thresholds used by the eligibility checker.',
  activity: 'Read-only. A log of system events kept for auditing.',
};

// Small line icons, one per nav item. currentColor so they inherit the button's text color.
const tabIcons = {
  users: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="6.5" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 17c.9-3.4 3.6-5.3 6.5-5.3s5.6 1.9 6.5 5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  scholarships: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="7.5" r="4.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.3 11.2 6 17.5l4-2 4 2-1.3-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  universities: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4 2 8l8 4 8-4-8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.5 9.8v3.4c0 1.1 2 2.3 4.5 2.3s4.5-1.2 4.5-2.3V9.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  assessments: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="4" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4V3.2A1.2 1.2 0 0 1 9.2 2h1.6A1.2 1.2 0 0 1 12 3.2V4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 10.5l1.7 1.7 3.3-3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chatbot: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6a2.5 2.5 0 0 1-2.5 2.5H8l-4 3v-3H5.5A2.5 2.5 0 0 1 3 11.5v-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  eligibility: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2.5 16 4.7v4.6c0 4-2.6 6.8-6 8.2-3.4-1.4-6-4.2-6-8.2V4.7L10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.3 10 9.2 12l3.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 10.5h3l1.8-5 3 9 1.8-5.5h5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// Monitoring/audit logs — never editable or deletable from the UI.
const readOnlyResources = ['assessments', 'chatbot-interactions', 'activity'];

const resourceLabels = {
  users: 'Registered users',
  scholarships: 'Scholarships',
  universities: 'Universities',
  assessments: 'Assessments',
  'chatbot-interactions': 'Conversation log',
  'chatbot-responses': 'Auto-reply rules',
  eligibility: 'Eligibility',
  activity: 'System reports',
};

function displayName(record) {
  return record.University || record.name || record.field || record.keyword || record.type || record.id;
}

function scholarshipSummary(record) {
  const details = [];
  if (record.min_merit_pct !== null && record.min_merit_pct !== undefined && record.min_merit_pct !== '') details.push(`Min merit: ${record.min_merit_pct}%`);
  if (record.income_cap_pkr !== null && record.income_cap_pkr !== undefined && record.income_cap_pkr !== '') details.push(`Income cap: PKR ${record.income_cap_pkr}`);
  return details.join(' · ') || record.basis || '';
}

function scholarshipMatches(record, query) {
  const searchText = query.trim().toLowerCase();
  if (!searchText) return true;
  return [record.name, record.provider, record.provinces, record.basis, record.provider_type, record.eligibility_raw, record.coverage]
    .some((value) => String(value || '').toLowerCase().includes(searchText));
}

function clampNonNegative(value) {
  if (value === '') return '';
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return String(Math.max(0, number));
}

function dateValue(record) {
  return record.createdAt || record.created_at || record.date || record.timestamp || record.takenAt || '-';
}

function formatDateTime(value) {
  if (!value) return 'Never';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Never' : parsed.toLocaleString();
}

function assessmentResult(record) {
  if (record.score !== null && record.score !== undefined) return record.score;
  if (record.result) return typeof record.result === 'object' ? JSON.stringify(record.result) : record.result;
  if (record.scores) return JSON.stringify(record.scores);
  if (record.top_categories) return JSON.stringify(record.top_categories);
  return '-';
}

function assessmentSummary(records) {
  const counts = {};
  let scoreSum = 0;
  let scoreCount = 0;
  records.forEach((record) => {
    const category = record.highest_category || record.result?.career || record.result?.matchedField;
    if (!category) return;
    counts[category] = (counts[category] || 0) + 1;
    const topScore = record.scores && record.highest_category ? record.scores[record.highest_category] : undefined;
    if (typeof topScore === 'number') { scoreSum += topScore; scoreCount += 1; }
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    total: records.length,
    topCategory: ranked[0]?.[0] || '-',
    topCategoryCount: ranked[0]?.[1] || 0,
    avgTopScore: scoreCount ? (scoreSum / scoreCount).toFixed(1) : '-',
    breakdown: ranked,
  };
}

function activitySummary(records) {
  const counts = {};
  const now = Date.now();
  let last24h = 0;
  records.forEach((record) => {
    const type = record.type || record.eventType || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
    const timestamp = new Date(record.createdAt || record.created_at || record.timestamp).getTime();
    if (!Number.isNaN(timestamp) && now - timestamp <= 24 * 60 * 60 * 1000) last24h += 1;
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    total: records.length,
    last24h,
    topType: ranked[0]?.[0] || '-',
    topTypeCount: ranked[0]?.[1] || 0,
    breakdown: ranked,
  };
}

function chatbotInteractionsSummary(records) {
  const uniqueUsers = new Set(records.map((record) => record.userId).filter(Boolean));
  const unanswered = records.filter((record) => !String(record.response || '').trim()).length;
  return { total: records.length, uniqueUsers: uniqueUsers.size, unanswered };
}

// Small colored label used across tables and record lists for status/category words.
function StatusPill({ tone = 'muted', children }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

function basisTone(basis) {
  if (basis === 'Merit') return 'accent';
  if (basis === 'Need') return 'info';
  if (basis === 'Need+Merit') return 'good';
  return 'muted';
}

function sectorTone(sector) {
  if (sector === 'Public') return 'info';
  if (sector === 'Private') return 'accent';
  return 'muted';
}

function MonitoringSummary({ tab, records }) {
  if (tab === 'assessments') {
    const summary = assessmentSummary(records);
    return <div className="admin-metrics"><div><strong>{summary.total}</strong><span>Total assessments taken</span></div><div><strong>{summary.topCategory}</strong><span>Most common top interest ({summary.topCategoryCount})</span></div><div><strong>{summary.avgTopScore}</strong><span>Average top-category score</span></div></div>;
  }
  if (tab === 'activity') {
    const summary = activitySummary(records);
    return <><div className="admin-metrics"><div><strong>{summary.total}</strong><span>Total logged events</span></div><div><strong>{summary.last24h}</strong><span>Events in last 24 hours</span></div><div><strong>{summary.topType}</strong><span>Most frequent event ({summary.topTypeCount})</span></div></div>{summary.breakdown.length > 0 && <ul className="admin-record__programs">{summary.breakdown.map(([type, count]) => <li key={type}>{type}: {count}</li>)}</ul>}</>;
  }
  if (tab === 'chatbot-interactions') {
    const summary = chatbotInteractionsSummary(records);
    return <div className="admin-metrics"><div><strong>{summary.total}</strong><span>Messages exchanged</span></div><div><strong>{summary.uniqueUsers}</strong><span>Unique visitors chatted</span></div><div><strong>{summary.unanswered}</strong><span>Sent with no bot reply</span></div></div>;
  }
  return null;
}

function formValues(tab, record) {
  if (tab === 'universities') return { name: record?.University || record?.name || '', city: record?.City || record?.city || '', province: record?.Province || record?.province || '', sector: record?.Sector || record?.sector || '', website: record?.Website || record?.website || record?.website_url || record?.url || '' };
  if (tab === 'scholarships') return { name: record?.name || '', provider: record?.provider || '', provinces: record?.provinces || '', basis: record?.basis || 'Merit', providerType: record?.provider_type || '', eligibility: record?.eligibility_raw || '', incomeCap: record?.income_cap_pkr || '', minMerit: record?.min_merit_pct || '', coverage: record?.coverage || '', sourceUrl: record?.source_url || '' };
  if (tab === 'chatbot-responses') return { keyword: record?.keyword || '', response: record?.response || '', link: record?.link || '', linkLabel: record?.linkLabel || '' };
  return { field: record?.field || '', description: record?.description || '', minimumMarks: record?.minimumMarks ?? 0 };
}

function EntityForm({ tab, record, onSave, onCancel }) {
  const [form, setForm] = useState(() => formValues(tab, record));
  useEffect(() => setForm(formValues(tab, record)), [tab, record]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const data = tab === 'universities'
      ? { name: form.name, city: form.city, province: form.province, sector: form.sector, website_url: form.website }
      : tab === 'scholarships'
        ? { name: form.name, provider: form.provider, provinces: form.provinces, basis: form.basis, provider_type: form.providerType, eligibility_raw: form.eligibility, income_cap_pkr: form.incomeCap, min_merit_pct: form.minMerit, coverage: form.coverage, source_url: form.sourceUrl }
        : tab === 'chatbot-responses'
          ? { keyword: form.keyword, response: form.response, link: form.link, linkLabel: form.linkLabel }
          : { field: form.field, description: form.description, minimumMarks: Number(form.minimumMarks) || 0 };
    onSave(data);
  };
  return <form className="admin-edit-form" onSubmit={submit}>
    <h2>{record ? 'Edit record' : 'Add record'}</h2>
    {tab === 'universities' && <><label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label>City<input value={form.city} onChange={(event) => update('city', event.target.value)} /></label><label>Province<input value={form.province} onChange={(event) => update('province', event.target.value)} /></label><label>Sector<select value={form.sector} onChange={(event) => update('sector', event.target.value)}><option value="">Select sector</option><option>Public</option><option>Private</option></select></label><label>Website URL<input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} /></label></>}
    {tab === 'scholarships' && <><label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label>Provider<input value={form.provider} onChange={(event) => update('provider', event.target.value)} /></label><label>Provinces<input value={form.provinces} onChange={(event) => update('provinces', event.target.value)} /></label><label>Basis<select value={form.basis} onChange={(event) => update('basis', event.target.value)}><option>Merit</option><option>Need</option><option>Need+Merit</option></select></label><label>Provider type<select value={form.providerType} onChange={(event) => update('providerType', event.target.value)}><option value="">Select provider type</option><option>Government</option><option>Private</option><option>International</option></select></label><label>Eligibility<textarea value={form.eligibility} onChange={(event) => update('eligibility', event.target.value)} /></label><label>Income cap PKR<input type="number" min="0" value={form.incomeCap} onChange={(event) => update('incomeCap', clampNonNegative(event.target.value))} /></label><label>Min merit %<input type="number" min="0" max="100" value={form.minMerit} onChange={(event) => update('minMerit', clampNonNegative(event.target.value))} /></label><label>Coverage<textarea value={form.coverage} onChange={(event) => update('coverage', event.target.value)} /></label><label>Source URL<input type="url" value={form.sourceUrl} onChange={(event) => update('sourceUrl', event.target.value)} /></label></>}
    {tab === 'eligibility' && <><label>Field / category name<input value={form.field} onChange={(event) => update('field', event.target.value)} required /></label><label>Minimum marks %<input type="number" min="0" max="100" step="0.1" value={form.minimumMarks} onChange={(event) => update('minimumMarks', clampNonNegative(event.target.value))} placeholder="e.g. 60" /></label><label>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} /></label></>}
    {tab === 'chatbot-responses' && <><label>Trigger keywords (comma separated)<input value={form.keyword} onChange={(event) => update('keyword', event.target.value)} placeholder="e.g. scholarship, funding" /></label><label>Response<textarea value={form.response} onChange={(event) => update('response', event.target.value)} required /></label><label>Link to page (optional)<select value={form.link} onChange={(event) => update('link', event.target.value)}><option value="">No link</option><option value="/quiz">Career quiz</option><option value="/university-recommender">University Recommender</option><option value="/scholarships">Scholarship Finder</option><option value="/profile">Profile</option><option value="/dashboard">Dashboard</option></select></label>{form.link && <label>Link button text<input value={form.linkLabel} onChange={(event) => update('linkLabel', event.target.value)} placeholder="e.g. Open Scholarship Finder" /></label>}</>}
    <div className="admin-button-row"><button className="primary-button" type="submit">{record ? 'Update record' : 'Add record'}</button><button className="secondary-button" type="button" onClick={() => (record ? onCancel() : setForm(formValues(tab, null)))}>Cancel</button></div>
  </form>;
}

function ProgramForm({ program, onSave, onCancel }) {
  const [degreeName, setDegreeName] = useState(program?.degree_name || '');
  const [meritFormula, setMeritFormula] = useState(program?.merit_formula || '');
  const [eligibilityPct, setEligibilityPct] = useState(program?.eligibility_pct ?? '');
  const [url, setUrl] = useState(program?.url || '');
  const resetFields = () => { setDegreeName(''); setMeritFormula(''); setEligibilityPct(''); setUrl(''); };
  return <form className="admin-program-form" onSubmit={(event) => { event.preventDefault(); onSave({ degree_name: degreeName, merit_formula: meritFormula, eligibility_pct: eligibilityPct, url }); }}><label>Degree / program<input value={degreeName} onChange={(event) => setDegreeName(event.target.value)} required /></label><label>Minimum merit %<input type="number" min="0" max="100" value={eligibilityPct} onChange={(event) => setEligibilityPct(clampNonNegative(event.target.value))} placeholder="e.g. 60" /></label><label>Merit formula<input value={meritFormula} onChange={(event) => setMeritFormula(event.target.value)} placeholder="e.g. Available upon contact" /></label><label>Program URL<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Defaults to university website" /></label><div className="admin-button-row"><button className="primary-button" type="submit">{program ? 'Update program' : 'Add program'}</button><button className="secondary-button" type="button" onClick={() => (program ? onCancel() : resetFields())}>Cancel</button></div></form>;
}

// Read-only monitoring tables: no edit/delete actions — these are audit logs, not admin-managed content.
function MonitoringTable({ tab, records }) {
  if (tab === 'assessments') return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Source</th><th>Score / result</th><th>Date taken</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.userName || record.user?.name || record.user?.full_name || record.user?.email || record.user_id || 'Unknown user'}</td><td>{record.source === 'university_recommender' ? 'University Recommender' : 'Career Quiz'}</td><td>{assessmentResult(record)}</td><td>{dateValue(record)}</td></tr>)}</tbody></table></div>;
  if (tab === 'chatbot-interactions') return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Visitor message</th><th>Bot reply</th><th>Timestamp</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.userName || record.user?.name || record.userId || 'Anonymous'}</td><td className="admin-table__message">{record.message || '-'}</td><td className="admin-table__message">{record.response || <StatusPill tone="muted">No reply matched</StatusPill>}</td><td>{dateValue(record)}</td></tr>)}</tbody></table></div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Event type</th><th>Timestamp</th><th>Details</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.type || record.eventType || '-'}</td><td>{dateValue(record)}</td><td>{typeof record.details === 'object' ? JSON.stringify(record.details) : record.details || '-'}</td></tr>)}</tbody></table></div>;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [chatbotView, setChatbotView] = useState('log');
  const [users, setUsers] = useState([]); const [records, setRecords] = useState([]);
  const [editingUser, setEditingUser] = useState(null); const [editingRecord, setEditingRecord] = useState(null); const [editingProgram, setEditingProgram] = useState(null);
  const [universitySearch, setUniversitySearch] = useState(''); const [scholarshipSearch, setScholarshipSearch] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [formResetKey, setFormResetKey] = useState(0);
  const RECORDS_PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(RECORDS_PAGE_SIZE);
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);

  // The "Chatbot" nav item covers two underlying resources — the conversation log and the auto-reply rules.
  const activeResource = tab === 'chatbot' ? (chatbotView === 'log' ? 'chatbot-interactions' : 'chatbot-responses') : tab;

  const api = async (path, options = {}) => { const response = await fetch(`${API_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } }); const result = await response.json(); if (response.status === 401) { sessionStorage.removeItem(ADMIN_TOKEN_KEY); navigate('/admin/login', { replace: true }); } if (!response.ok) throw new Error(result.message || 'Request failed.'); return result; };
  const load = async (resource) => { if (resource === 'users') setUsers((await api('/api/admin/stats')).users); else setRecords((await api(`/api/admin/${resource}`)).records); };
  useEffect(() => { load('users').catch((loadError) => setError(loadError.message)); }, []);
  // Large record sets (200+ universities/scholarships) rendered in full make the page tall
  // enough to break browser rendering, so lists are paged; reset to page one on list/search change.
  useEffect(() => { setVisibleCount(RECORDS_PAGE_SIZE); }, [activeResource, universitySearch, scholarshipSearch]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setEditingRecord(null); setEditingProgram(null); setError('');
    const resource = nextTab === 'chatbot' ? (chatbotView === 'log' ? 'chatbot-interactions' : 'chatbot-responses') : nextTab;
    load(resource).catch((loadError) => setError(loadError.message));
  };
  const switchChatbotView = (view) => {
    setChatbotView(view);
    setEditingRecord(null); setError('');
    load(view === 'log' ? 'chatbot-interactions' : 'chatbot-responses').catch((loadError) => setError(loadError.message));
  };

  const saveUser = async (event) => { event.preventDefault(); try { const result = await api(`/api/admin/users/${editingUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingUser) }); setUsers(users.map((user) => user.id === result.user.id ? result.user : user)); setEditingUser(null); setNotice('User updated successfully.'); } catch (saveError) { setError(saveError.message); } };
  const deleteUser = async (user) => { if (!window.confirm(`Delete the account for ${user.email}? This cannot be undone.`)) return; try { await api(`/api/admin/users/${user.id}`, { method: 'DELETE' }); setUsers(users.filter((entry) => entry.id !== user.id)); setNotice('User deleted.'); } catch (deleteError) { setError(deleteError.message); } };
  const saveRecord = async (data) => { const wasEditing = Boolean(editingRecord); try { const path = editingRecord ? `/api/admin/${activeResource}/${editingRecord.id}` : `/api/admin/${activeResource}`; await api(path, { method: editingRecord ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await load(activeResource); setEditingRecord(null); setFormResetKey((key) => key + 1); setNotice(wasEditing ? 'Record updated successfully.' : 'Record added successfully.'); } catch (saveError) { setError(saveError.message); } };
  const deleteRecord = async (record) => { if (!window.confirm(`Are you sure you want to delete ${displayName(record)}? This cannot be undone.`)) return; try { await api(`/api/admin/${activeResource}/${record.id}`, { method: 'DELETE' }); await load(activeResource); setNotice('Record deleted.'); } catch (deleteError) { setError(deleteError.message); } };
  const saveProgram = async (data) => { if (!editingRecord) return; const wasEditing = Boolean(editingProgram); try { const path = editingProgram ? `/api/admin/universities/${editingRecord.id}/programs/${editingProgram.id}` : `/api/admin/universities/${editingRecord.id}/programs`; await api(path, { method: editingProgram ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await load('universities'); const updated = (await api('/api/admin/universities')).records.find((university) => String(university.id) === String(editingRecord.id)); setEditingRecord(updated); setEditingProgram(null); setFormResetKey((key) => key + 1); setNotice(wasEditing ? 'Program updated successfully.' : 'Program added successfully.'); } catch (saveError) { setError(saveError.message); } };
  const deleteProgram = async (program) => { if (!editingRecord || !window.confirm(`Delete ${program.degree_name}? This cannot be undone.`)) return; try { await api(`/api/admin/universities/${editingRecord.id}/programs/${program.id}`, { method: 'DELETE' }); await load('universities'); const updated = (await api('/api/admin/universities')).records.find((university) => String(university.id) === String(editingRecord.id)); setEditingRecord(updated); setNotice('Program deleted.'); } catch (deleteError) { setError(deleteError.message); } };
  const visibleRecords = activeResource === 'universities' ? records.filter((record) => displayName(record).toLowerCase().includes(universitySearch.trim().toLowerCase())) : activeResource === 'scholarships' ? records.filter((record) => scholarshipMatches(record, scholarshipSearch)) : records;
  const pagedRecords = visibleRecords.slice(0, visibleCount);

  const signOut = () => { sessionStorage.removeItem(ADMIN_TOKEN_KEY); navigate('/admin/login', { replace: true }); };

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-brand-mark" aria-hidden="true">CG</span>
          <div className="admin-brand-text">
            <strong>CareerGuide</strong>
            <span>Admin console</span>
          </div>
        </div>
        <nav className="admin-nav" role="tablist" aria-label="Admin sections">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'admin-nav-item admin-nav-item--active' : 'admin-nav-item'} onClick={() => changeTab(id)}>
              <span className="admin-nav-icon" aria-hidden="true">{tabIcons[id]}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <button className="admin-signout" type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <h1>{resourceLabels[activeResource] || 'Administration'}</h1>
          {tabDescriptions[tab] && <p className="admin-topbar__subtitle">{tabDescriptions[tab]}</p>}
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}
        {notice && <p className="admin-notice" role="status">{notice}</p>}

        {tab === 'users' && (
          <div className="admin-card">
            <div className="admin-section-heading"><h2>Registered users</h2><span className="admin-count">{users.length} accounts</span></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Verified</th><th>Last login</th><th>Access</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.authProvider}</td>
                      <td><StatusPill tone={user.emailConfirmed ? 'good' : 'muted'}>{user.emailConfirmed ? 'Verified' : 'Unverified'}</StatusPill></td>
                      <td>{formatDateTime(user.lastSignInAt)}</td>
                      <td><StatusPill tone={user.blocked ? 'warn' : 'good'}>{user.blocked ? 'Blocked' : 'Active'}</StatusPill></td>
                      <td>
                        <button className="admin-action admin-action--toggle" type="button" onClick={() => setEditingUser({ ...user, blocked: !user.blocked })}>{user.blocked ? 'Unblock' : 'Block'}</button>
                        <button className="admin-action" type="button" onClick={() => setEditingUser({ ...user })}>Edit</button>
                        <button className="admin-action admin-action--danger" type="button" onClick={() => deleteUser(user)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {editingUser && (
              <form className="admin-edit-form" onSubmit={saveUser}>
                <h2>Edit user</h2>
                <input value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} required aria-label="User name" />
                <input type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} required aria-label="User email" />
                <label><input type="checkbox" checked={Boolean(editingUser.blocked)} onChange={(event) => setEditingUser({ ...editingUser, blocked: event.target.checked })} /> Block account access</label>
                <div className="admin-button-row">
                  <button className="primary-button" type="submit">Save changes</button>
                  <button className="secondary-button" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === 'chatbot' && (
          <div className="admin-subnav" role="tablist" aria-label="Chatbot views">
            <button type="button" role="tab" aria-selected={chatbotView === 'log'} className={chatbotView === 'log' ? 'admin-subnav-item admin-subnav-item--active' : 'admin-subnav-item'} onClick={() => switchChatbotView('log')}>Conversation log</button>
            <button type="button" role="tab" aria-selected={chatbotView === 'rules'} className={chatbotView === 'rules' ? 'admin-subnav-item admin-subnav-item--active' : 'admin-subnav-item'} onClick={() => switchChatbotView('rules')}>Auto-reply rules</button>
          </div>
        )}

        {tab !== 'users' && readOnlyResources.includes(activeResource) && (
          <div className="admin-card">
            <div className="admin-section-heading"><h2>{resourceLabels[activeResource]}</h2><span className="admin-count">{records.length} records</span></div>
            {activeResource === 'chatbot-interactions' && (
              <p className="admin-hint">Every message a visitor sent the assistant, shown together with the automated reply it received — this is how conversations are actually monitored.</p>
            )}
            <MonitoringSummary tab={activeResource} records={records} />
            <MonitoringTable tab={activeResource} records={records} />
          </div>
        )}

        {tab !== 'users' && !readOnlyResources.includes(activeResource) && (
          <div className="admin-card admin-record-layout">
            <div>
              <div className="admin-section-heading">
                <h2>{resourceLabels[activeResource]}</h2>
                <span className="admin-count">{activeResource === 'universities' ? `${records.length} universities` : activeResource === 'scholarships' ? `${records.length} scholarships` : activeResource === 'chatbot-responses' ? `${records.length} rules` : `${records.length} records`}</span>
                <button className="admin-small-button" type="button" onClick={() => setEditingRecord(null)}>Add</button>
              </div>
              {activeResource === 'chatbot-responses' && (
                <p className="admin-hint">Keyword-triggered canned replies the assistant sends automatically. The conversation log (above) is where you monitor what visitors actually asked.</p>
              )}
              {activeResource === 'universities' && <input className="admin-search" type="search" placeholder="Search universities" aria-label="Search universities" value={universitySearch} onChange={(event) => setUniversitySearch(event.target.value)} />}
              {activeResource === 'scholarships' && <input className="admin-search" type="search" placeholder="Search scholarships, providers, or criteria" aria-label="Search scholarships" value={scholarshipSearch} onChange={(event) => setScholarshipSearch(event.target.value)} />}
              {pagedRecords.map((record) => (
                <div className="admin-record" key={record.id}>
                  <div className="admin-record__content">
                    <p className={activeResource === 'scholarships' ? 'admin-record__title admin-record__title--truncate' : 'admin-record__title'} title={activeResource === 'scholarships' ? displayName(record) : undefined}>{displayName(record)}</p>
                    {activeResource === 'scholarships' ? (
                      <>
                        <p className="admin-record__subtitle">
                          {record.provider || 'Provider not specified'}
                          {record.basis && <StatusPill tone={basisTone(record.basis)}>{record.basis}</StatusPill>}
                        </p>
                        <p className="admin-record__meta">{scholarshipSummary(record)}</p>
                      </>
                    ) : (
                      <>
                        {([record.City || record.city, record.Province || record.province].filter(Boolean).join(', ') && !displayName(record).toLowerCase().includes((record.City || record.city || '').toLowerCase())) || (record.Sector || record.sector) ? (
                          <p className="admin-record__subtitle">
                            {[record.City || record.city, record.Province || record.province].filter(Boolean).join(', ')}
                            {(record.Sector || record.sector) && <StatusPill tone={sectorTone(record.Sector || record.sector)}>{record.Sector || record.sector}</StatusPill>}
                          </p>
                        ) : null}
                        {activeResource === 'universities' && record.programs?.length > 0 && <ul className="admin-record__programs">{record.programs.map((program) => <li key={program.id}>{program.degree_name}</li>)}</ul>}
                      </>
                    )}
                  </div>
                  <div className="admin-record__actions">
                    <button className="admin-action" type="button" onClick={() => setEditingRecord(record)}>Edit</button>
                    <button className="admin-action admin-action--danger" type="button" onClick={() => deleteRecord(record)}>Delete</button>
                  </div>
                </div>
              ))}
              {visibleRecords.length > pagedRecords.length && (
                <div className="admin-load-more">
                  <button className="admin-small-button" type="button" onClick={() => setVisibleCount((count) => count + RECORDS_PAGE_SIZE)}>
                    Load more ({visibleRecords.length - pagedRecords.length} remaining)
                  </button>
                </div>
              )}
            </div>
            <div>
              <EntityForm key={`${activeResource}-${formResetKey}`} tab={activeResource} record={editingRecord} onSave={saveRecord} onCancel={() => setEditingRecord(null)} />
              {activeResource === 'universities' && editingRecord && (
                <div className="admin-programs-panel">
                  <div className="admin-section-heading"><h3>Programs</h3><button className="admin-small-button" type="button" onClick={() => setEditingProgram(null)}>+ Add program</button></div>
                  <ul className="admin-program-list">
                    {(editingRecord.programs || []).map((program) => (
                      <li key={program.id}>
                        <span>{program.degree_name}{program.eligibility_pct ? ` · Min ${program.eligibility_pct}%` : ''}</span>
                        <span>
                          <button className="admin-action" type="button" onClick={() => setEditingProgram(program)}>Edit</button>
                          <button className="admin-action admin-action--danger" type="button" onClick={() => deleteProgram(program)}>Delete</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {editingProgram && <ProgramForm key={formResetKey} program={editingProgram} onSave={saveProgram} onCancel={() => setEditingProgram(null)} />}
                  {!editingProgram && <ProgramForm key={formResetKey} onSave={saveProgram} onCancel={() => setEditingProgram(null)} />}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;