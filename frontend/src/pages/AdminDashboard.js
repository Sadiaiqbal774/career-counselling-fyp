import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const ADMIN_TOKEN_KEY = 'career-guide-admin-token';

const tabs = [
  ['dashboard', 'Dashboard'],
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
  dashboard: 'Executive overview of student counselling, degree programs, and career assessments.',
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
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
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

const logoutIcon = (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.5 13.5 16 10l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 10H7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Monitoring/audit logs — never editable or deletable from the UI.
const readOnlyResources = ['assessments', 'chatbot-interactions', 'activity'];

const resourceLabels = {
  dashboard: 'Admin dashboard',
  users: 'Registered users',
  scholarships: 'Scholarships',
  universities: 'Universities',
  assessments: 'Assessments',
  'chatbot-interactions': 'Conversation log',
  'chatbot-responses': 'Auto-reply rules',
  eligibility: 'Eligibility',
  activity: 'System reports',
};

function getResourceSingular(resource) {
  if (resource === 'universities') return 'University';
  if (resource === 'scholarships') return 'Scholarship';
  if (resource === 'users') return 'User';
  if (resource === 'eligibility') return 'Eligibility Rule';
  if (resource === 'chatbot-responses') return 'Auto-Reply Rule';
  return 'Record';
}

function displayName(record) {
  return record.University || record.name || record.field || record.keyword || record.type || record.id;
}

function scholarshipSummary(record) {
  const details = [];
  if (record.min_merit_pct !== null && record.min_merit_pct !== undefined && record.min_merit_pct !== '') details.push(`Min merit: ${record.min_merit_pct}%`);
  if (record.income_cap_pkr !== null && record.income_cap_pkr !== undefined && record.income_cap_pkr !== '') details.push(`Income cap: PKR ${record.income_cap_pkr}`);
  return details.join(' · ') || record.eligibility_raw || record.coverage || '';
}

function scholarshipBasisLabel(basis) {
  const normalized = String(basis || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === 'merit-based' || normalized === 'merit') return 'Merit';
  if (normalized === 'need-based' || normalized === 'need') return 'Need';
  if (normalized === 'need + merit' || normalized === 'need+merit') return 'Need + Merit';
  return basis || 'Unspecified';
}

function universityMatches(record, query) {
  const searchText = (query || '').trim().toLowerCase();
  if (!searchText) return true;
  const terms = searchText.split(/\s+/).filter(Boolean);

  const name = String(record.University || record.name || '').toLowerCase();
  const city = String(record.City || record.city || '').toLowerCase();
  const province = String(record.Province || record.province || '').toLowerCase();
  const sector = String(record.Sector || record.sector || '').toLowerCase();
  const website = String(record.Website || record.website || record.website_url || record.url || '').toLowerCase();
  const programs = (record.programs || [])
    .map((p) => `${p.degree_name || ''} ${p.merit_formula || ''}`)
    .join(' ')
    .toLowerCase();

  const combined = `${name} ${city} ${province} ${sector} ${website} ${programs}`;
  return terms.every((term) => combined.includes(term));
}

function scholarshipMatches(record, query) {
  const searchText = (query || '').trim().toLowerCase();
  if (!searchText) return true;
  const terms = searchText.split(/\s+/).filter(Boolean);

  const name = String(record.name || '').toLowerCase();
  const provider = String(record.provider || '').toLowerCase();
  const provinces = String(record.provinces || '').toLowerCase();
  const basis = String(record.basis || '').toLowerCase();
  const providerType = String(record.provider_type || '').toLowerCase();
  const eligibility = String(record.eligibility_raw || '').toLowerCase();
  const coverage = String(record.coverage || '').toLowerCase();
  const minMerit = String(record.min_merit_pct || '').toLowerCase();
  const incomeCap = String(record.income_cap_pkr || '').toLowerCase();

  const combined = `${name} ${provider} ${provinces} ${basis} ${providerType} ${eligibility} ${coverage} ${minMerit} ${incomeCap}`;
  return terms.every((term) => combined.includes(term));
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

function timestampValue(record) {
  if (!record) return 0;
  if (typeof record === 'string') {
    const parsedValue = new Date(record).getTime();
    return Number.isNaN(parsedValue) ? 0 : parsedValue;
  }
  const value = dateValue(record);
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function assessmentResult(record) {
  if (record.score !== null && record.score !== undefined) return record.score;
  if (record.result) return typeof record.result === 'object' ? JSON.stringify(record.result) : record.result;
  if (record.scores) return JSON.stringify(record.scores);
  if (record.top_categories) return JSON.stringify(record.top_categories);
  return '-';
}

function exportToCsv(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportAssessmentsCsv(records) {
  const headers = ['User', 'Source', 'Top Category / Field', 'Score / Result', 'Date Taken'];
  const rows = records.map((record) => {
    const user = record.userName || record.user?.name || record.user?.full_name || record.user?.email || record.user_id || 'Unknown user';
    const source = record.source === 'university_recommender' ? 'University Recommender' : 'Career Quiz';
    const topField = record.highest_category || record.result?.career || record.result?.matchedField || record.matched_field || '-';
    const score = assessmentResult(record);
    const date = dateValue(record);
    return [user, source, topField, score, date];
  });
  exportToCsv(`assessments_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function exportActivityCsv(records) {
  const headers = ['Event Type', 'Timestamp', 'User / Actor', 'Details'];
  const rows = records.map((record) => {
    const eventType = friendlyEventLabel(record.type || record.eventType || 'system_event');
    const timestamp = formatDateTime(dateValue(record));
    let user = '-';
    let detailsStr = '';
    if (record.details && typeof record.details === 'object') {
      user = record.details.email || record.details.userId || '-';
      detailsStr = Object.entries(record.details)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
    } else if (record.details) {
      detailsStr = String(record.details);
    }
    return [eventType, timestamp, user, detailsStr];
  });
  exportToCsv(`system_activity_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function exportUsersCsv(users) {
  const headers = ['Name', 'Email', 'Auth Provider', 'Email Verified', 'Last Sign In', 'Status'];
  const rows = users.map((user) => [
    user.name || '-',
    user.email || '-',
    user.authProvider || 'Email',
    user.emailConfirmed ? 'Verified' : 'Unverified',
    formatDateTime(user.lastSignInAt),
    user.blocked ? 'Blocked' : 'Active',
  ]);
  exportToCsv(`users_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function exportUniversitiesCsv(universities) {
  const headers = ['University Name', 'City', 'Province', 'Sector', 'Website URL', 'Programs Count', 'Degree Programs'];
  const rows = universities.map((u) => [
    u.name || u.University || '',
    u.city || u.City || '',
    u.province || u.Province || '',
    u.sector || u.Sector || '',
    u.website || u.website_url || u.Website || '',
    (u.programs || []).length,
    (u.programs || []).map((p) => p.degree_name).join('; '),
  ]);
  exportToCsv(`universities_catalog_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function exportScholarshipsCsv(scholarships) {
  const headers = ['Scholarship Name', 'Provider', 'Provinces', 'Basis', 'Provider Type', 'Eligibility', 'Income Cap (PKR)', 'Min Merit %', 'Coverage', 'Source URL'];
  const rows = scholarships.map((s) => [
    s.name || '',
    s.provider || '',
    s.provinces || '',
    s.basis || '',
    s.provider_type || '',
    s.eligibility_raw || '',
    s.income_cap_pkr ? String(s.income_cap_pkr) : 'None',
    s.min_merit_pct ? String(s.min_merit_pct) : 'None',
    s.coverage || '',
    s.source_url || '',
  ]);
  exportToCsv(`scholarships_catalog_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function normalizeUrl(url) {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function assessmentSummary(records) {
  const counts = {};
  let scoreSum = 0;
  let scoreCount = 0;
  records.forEach((record) => {
    const category = record.highest_category || record.result?.career || record.result?.matchedField || record.matched_field;
    if (category) {
      counts[category] = (counts[category] || 0) + 1;
    }
    let topScore = NaN;
    if (record.scores && record.highest_category) {
      topScore = Number(record.scores[record.highest_category]);
    } else if (record.result?.confidence !== undefined && record.result?.confidence !== null) {
      const conf = Number(record.result.confidence);
      topScore = conf <= 1.0 ? conf * 100 : conf;
    } else if (record.answers?.Marks !== undefined && record.answers?.Marks !== null) {
      topScore = Number(record.answers.Marks);
    } else if (record.score !== undefined && record.score !== null) {
      topScore = Number(record.score);
    }
    if (Number.isFinite(topScore) && topScore > 0) {
      scoreSum += topScore;
      scoreCount += 1;
    }
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    total: records.length,
    topCategory: ranked[0]?.[0] || '-',
    topCategoryCount: ranked[0]?.[1] || 0,
    avgTopScore: scoreCount ? `${(scoreSum / scoreCount).toFixed(1)}%` : '-',
    breakdown: ranked,
  };
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatShortDate(isoDateStr) {
  if (!isoDateStr) return '';
  const parts = isoDateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${monthNames[m] || parts[1]} ${d}`;
  }
  return isoDateStr;
}

function activitySummary(records) {
  const counts = {};
  const timelineCounts = {};
  const timelineDetails = {};
  const careerCounts = {};
  const now = Date.now();
  let last24h = 0;
  const userSet = new Set();

  let assessmentCount = 0;
  let chatbotCount = 0;
  let adminCount = 0;

  records.forEach((record) => {
    const type = record.type || record.eventType || 'unknown';
    counts[type] = (counts[type] || 0) + 1;

    if (type.includes('assessment')) assessmentCount += 1;
    else if (type.includes('chat')) chatbotCount += 1;
    else if (type.startsWith('admin_user') || type.includes('block')) adminCount += 1;

    const details = record.details;
    if (type === 'assessment_completed' && details && typeof details === 'object') {
      const career = details.matchedField || details.career;
      if (career) {
        careerCounts[career] = (careerCounts[career] || 0) + 1;
      }
    }

    const dateStr = record.createdAt || record.created_at || record.timestamp || '';
    const timestamp = new Date(dateStr).getTime();
    if (!Number.isNaN(timestamp)) {
      if (now - timestamp <= 24 * 60 * 60 * 1000) last24h += 1;
      const dayKey = dateStr.slice(0, 10);
      if (dayKey) {
        timelineCounts[dayKey] = (timelineCounts[dayKey] || 0) + 1;
        if (!timelineDetails[dayKey]) {
          timelineDetails[dayKey] = { assessments: 0, chatbot: 0, admin: 0 };
        }
        if (type.includes('assessment')) timelineDetails[dayKey].assessments += 1;
        else if (type.includes('chat')) timelineDetails[dayKey].chatbot += 1;
        else if (type.startsWith('admin_user') || type.includes('block')) timelineDetails[dayKey].admin += 1;
      }
    }
    if (details && typeof details === 'object') {
      if (details.email) userSet.add(details.email);
      else if (details.userId) userSet.add(details.userId);
    }
  });

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const rankedCareers = Object.entries(careerCounts).sort((a, b) => b[1] - a[1]);
  const timeline = Object.entries(timelineCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([day, total]) => ({
      day,
      total,
      breakdown: timelineDetails[day] || { assessments: 0, chatbot: 0, admin: 0 }
    }));

  return {
    total: records.length,
    last24h,
    activeUsers: userSet.size,
    topType: ranked[0]?.[0] || '-',
    topTypeCount: ranked[0]?.[1] || 0,
    breakdown: ranked,
    careerBreakdown: rankedCareers,
    categories: {
      assessments: assessmentCount,
      chatbot: chatbotCount,
      admin: adminCount,
    },
    timeline,
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
  const label = scholarshipBasisLabel(basis);
  if (label === 'Merit') return 'accent';
  if (label === 'Need') return 'info';
  if (label === 'Need + Merit') return 'good';
  return 'muted';
}

function sectorTone(sector) {
  if (sector === 'Public') return 'info';
  if (sector === 'Private') return 'accent';
  return 'muted';
}

function friendlyEventLabel(type) {
  const map = {
    user_registered: 'Account Registered',
    user_login: 'User Sign In',
    assessment_completed: 'Career Assessment Taken',
    chatbot_interaction: 'Assistant Query',
    admin_user_blocked: 'Account Blocked',
    admin_user_unblocked: 'Account Unblocked',
    admin_user_updated: 'User Account Updated',
    admin_user_deleted: 'User Account Deleted',
  };
  return map[type] || type.replace(/_/g, ' ');
}

function eventTone(type) {
  if (type.includes('registered') || type.includes('unblock')) return 'registered';
  if (type.includes('login') || type.includes('update')) return 'login';
  if (type.includes('assessment')) return 'assessment';
  if (type.includes('chat')) return 'chatbot';
  if (type.includes('block') || type.includes('delete')) return 'admin';
  return 'login';
}

function eventCategoryMeta(type) {
  if (type.includes('assessment')) return { key: 'assessments', label: 'Student Test', tone: 'assessment' };
  if (type.includes('chat')) return { key: 'chatbot', label: 'AI Assistant', tone: 'chatbot' };
  if (type.includes('block') || type.includes('unblock')) return { key: 'admin', label: 'Security Action', tone: 'admin' };
  if (type.startsWith('admin_user')) return { key: 'admin', label: 'Admin Audit', tone: 'admin' };
  return { key: 'other', label: 'System Event', tone: 'login' };
}

function SystemReportsView({ records, showHistory = true }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(10);
  const [hoveredDay, setHoveredDay] = useState(null);

  const summary = activitySummary(records);
  const maxTypeCount = summary.breakdown[0]?.[1] || 1;
  const maxTimelineCount = Math.max(...summary.timeline.map((item) => item.total), 1);
  const maxCareerCount = summary.careerBreakdown[0]?.[1] || 1;

  const eventGradients = {
    user_registered: 'linear-gradient(90deg, #1f7a4d 0%, #2ecc71 100%)',
    user_login: 'linear-gradient(90deg, #2457a8 0%, #3498db 100%)',
    assessment_completed: 'linear-gradient(90deg, #b8863a 0%, #f39c12 100%)',
    chatbot_interaction: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
    admin_user_blocked: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
    admin_user_unblocked: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
    admin_user_updated: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
    admin_user_deleted: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 100%)',
  };

  const careerGradients = [
    'linear-gradient(90deg, #b8863a 0%, #d4a359 100%)',
    'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
    'linear-gradient(90deg, #059669 0%, #34d399 100%)',
    'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)',
  ];

  const filteredRecords = records.filter((record) => {
    if (activeFilter === 'all') return true;
    const cat = eventCategoryMeta(record.type || record.eventType || '').key;
    return cat === activeFilter;
  });

  const visibleHistoryRecords = filteredRecords.slice(0, visibleHistoryCount);

  const renderDetails = (details) => {
    if (!details) return '-';
    if (typeof details !== 'object') return String(details);
    const badges = [];
    if (details.email) badges.push(<span key="email" className="admin-event-details-tag">User: {details.email}</span>);
    if (details.career) badges.push(<span key="career" className="admin-event-details-tag">Career: {details.career}</span>);
    if (details.matchedField) badges.push(<span key="field" className="admin-event-details-tag">Field: {details.matchedField}</span>);
    if (details.userId && !details.email) badges.push(<span key="uid" className="admin-event-details-tag">User ID: {details.userId.slice(0, 8)}...</span>);
    if (badges.length === 0) {
      return Object.entries(details).map(([k, v]) => (
        <span key={k} className="admin-event-details-tag">{k}: {String(v)}</span>
      ));
    }
    return badges;
  };

  return (
    <div className="admin-reports-container">
      {/* 4 Overview Metrics */}
      <div className="admin-metrics">
        <div>
          <strong>{summary.total}</strong>
          <span>Total system events</span>
          <span className="admin-metric-desc">Lifetime audit log operations</span>
        </div>
        <div>
          <strong>{summary.categories.assessments}</strong>
          <span>Career assessments</span>
          <span className="admin-metric-desc">Completed quiz submissions</span>
        </div>
        <div>
          <strong>{summary.categories.chatbot}</strong>
          <span>Assistant queries</span>
          <span className="admin-metric-desc">Queries asked to career bot</span>
        </div>
        <div>
          <strong>{summary.categories.admin}</strong>
          <span>Admin audit actions</span>
          <span className="admin-metric-desc">User edits, deletions &amp; blocks</span>
        </div>
      </div>

      {/* 3 Domain Category Cards */}
      <div className="admin-reports-category-cards">
        <div className="admin-report-cat-card">
          <div className="admin-report-cat-header">
            <span className="admin-report-cat-icon">🎓</span>
            <div>
              <h3>Student Assessments</h3>
              <p>Career evaluations and test submissions</p>
            </div>
          </div>
          <div className="admin-report-cat-metric">
            <strong>{summary.categories.assessments}</strong>
            <span className="admin-report-cat-pct">
              {summary.total ? `${((summary.categories.assessments / summary.total) * 100).toFixed(0)}%` : '0%'} of activity
            </span>
          </div>
          <div className="admin-bar-track" style={{ height: '8px', marginTop: '10px' }}>
            <div
              className="admin-bar-fill"
              style={{
                width: `${summary.total ? (summary.categories.assessments / summary.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #b8863a 0%, #f39c12 100%)',
              }}
            />
          </div>
        </div>

        <div className="admin-report-cat-card">
          <div className="admin-report-cat-header">
            <span className="admin-report-cat-icon">💬</span>
            <div>
              <h3>AI Career Assistant</h3>
              <p>Automated admissions &amp; scholarship replies</p>
            </div>
          </div>
          <div className="admin-report-cat-metric">
            <strong>{summary.categories.chatbot}</strong>
            <span className="admin-report-cat-pct">
              {summary.total ? `${((summary.categories.chatbot / summary.total) * 100).toFixed(0)}%` : '0%'} of activity
            </span>
          </div>
          <div className="admin-bar-track" style={{ height: '8px', marginTop: '10px' }}>
            <div
              className="admin-bar-fill"
              style={{
                width: `${summary.total ? (summary.categories.chatbot / summary.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
              }}
            />
          </div>
        </div>

        <div className="admin-report-cat-card">
          <div className="admin-report-cat-header">
            <span className="admin-report-cat-icon">🛡️</span>
            <div>
              <h3>Administrative Audits</h3>
              <p>Account status toggles, edits &amp; deletions</p>
            </div>
          </div>
          <div className="admin-report-cat-metric">
            <strong>{summary.categories.admin}</strong>
            <span className="admin-report-cat-pct">
              {summary.total ? `${((summary.categories.admin / summary.total) * 100).toFixed(0)}%` : '0%'} of activity
            </span>
          </div>
          <div className="admin-bar-track" style={{ height: '8px', marginTop: '10px' }}>
            <div
              className="admin-bar-fill"
              style={{
                width: `${summary.total ? (summary.categories.admin / summary.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 2 Visual Charts Side by Side */}
      <div className="admin-graphs-grid">
        {/* Chart 1: Daily Activity Volume */}
        <div className="admin-graph-card">
          <div className="admin-graph-title">
            <span>Daily Activity Timeline</span>
            <div className="admin-timeline-legend">
              <span className="admin-legend-dot admin-legend-dot--assessment" /> Assessments
              <span className="admin-legend-dot admin-legend-dot--chatbot" /> Chatbot
              <span className="admin-legend-dot admin-legend-dot--admin" /> Admin
            </div>
          </div>
          <p className="admin-graph-subtitle">Total operations performed per day. Hover a column to see the activity breakdown.</p>
          {summary.timeline.length > 0 ? (
            <div className="admin-timeline-chart-wrap">
              {summary.timeline.map((item) => {
                const heightPct = Math.max(16, Math.round((item.total / maxTimelineCount) * 100));
                const formattedDate = formatShortDate(item.day);
                const isHovered = hoveredDay === item.day;
                const tooltipText = `${formattedDate} (${item.day}): ${item.total} events — ${item.breakdown.assessments} assessments, ${item.breakdown.chatbot} chat queries, ${item.breakdown.admin} admin actions`;
                return (
                  <div
                    key={item.day}
                    className="admin-timeline-column"
                    onMouseEnter={() => setHoveredDay(item.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    title={tooltipText}
                  >
                    <span className="admin-timeline-col-count">{item.total}</span>
                    <div
                      className={`admin-timeline-bar ${isHovered ? 'admin-timeline-bar--active' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {item.breakdown.admin > 0 && (
                        <div
                          className="admin-bar-segment admin-bar-segment--admin"
                          style={{ flex: item.breakdown.admin }}
                          title={`Admin: ${item.breakdown.admin}`}
                        />
                      )}
                      {item.breakdown.chatbot > 0 && (
                        <div
                          className="admin-bar-segment admin-bar-segment--chatbot"
                          style={{ flex: item.breakdown.chatbot }}
                          title={`Chatbot: ${item.breakdown.chatbot}`}
                        />
                      )}
                      {item.breakdown.assessments > 0 && (
                        <div
                          className="admin-bar-segment admin-bar-segment--assessment"
                          style={{ flex: item.breakdown.assessments }}
                          title={`Assessments: ${item.breakdown.assessments}`}
                        />
                      )}
                    </div>
                    <span className="admin-timeline-col-date">{formattedDate}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--ink-muted)', textAlign: 'center', padding: '40px 0' }}>No timeline events recorded yet.</p>
          )}
          {hoveredDay && (
            <div className="admin-timeline-hover-info">
              {(() => {
                const found = summary.timeline.find((t) => t.day === hoveredDay);
                if (!found) return null;
                return (
                  <span>
                    <strong>{formatShortDate(found.day)}:</strong> {found.total} total operations (
                    <span style={{ color: '#b8863a', fontWeight: 600 }}>{found.breakdown.assessments} assessments</span>,{' '}
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{found.breakdown.chatbot} chat queries</span>,{' '}
                    <span style={{ color: '#059669', fontWeight: 600 }}>{found.breakdown.admin} admin actions</span>)
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Chart 2: Top Student Career Fields Explored */}
        <div className="admin-graph-card">
          <div className="admin-graph-title">
            <span>Top Student Career Fields</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Top matches</span>
          </div>
          <p className="admin-graph-subtitle">Primary career pathways matched and explored by students during assessments.</p>
          <div className="admin-bar-list">
            {summary.careerBreakdown.length > 0 ? (
              summary.careerBreakdown.map(([career, count], index) => {
                const totalAssessments = summary.categories.assessments || 1;
                const pct = ((count / totalAssessments) * 100).toFixed(1);
                const barWidth = Math.max(8, (count / maxCareerCount) * 100);
                const gradient = careerGradients[index % careerGradients.length];
                return (
                  <div key={career} className="admin-career-field-item">
                    <div className="admin-career-field-header">
                      <span className="admin-career-rank">#{index + 1}</span>
                      <strong className="admin-career-title">{career}</strong>
                      <span className="admin-career-count">{count} students ({pct}%)</span>
                    </div>
                    <div className="admin-bar-track" style={{ height: '10px' }}>
                      <div className="admin-bar-fill" style={{ width: `${barWidth}%`, background: gradient }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--ink-muted)', textAlign: 'center', padding: '30px 0' }}>No career assessment data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Detailed Event Type Distribution */}
      <div className="admin-graph-card">
        <div className="admin-graph-title">
          <span>System Event Type Distribution</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Audit breakdown</span>
        </div>
        <p className="admin-graph-subtitle">Frequency of every individual operation logged in the platform activity registry.</p>
        <div className="admin-bar-list">
          {summary.breakdown.map(([type, count]) => {
            const pct = summary.total ? ((count / summary.total) * 100).toFixed(1) : 0;
            const barWidth = Math.max(6, (count / maxTypeCount) * 100);
            const gradient = eventGradients[type] || 'linear-gradient(90deg, #b8863a 0%, #8a5f1c 100%)';
            const catMeta = eventCategoryMeta(type);
            return (
              <div key={type} className="admin-bar-item admin-bar-item--detailed">
                <div className="admin-bar-label-group">
                  <span className={`admin-event-pill admin-event-pill--${catMeta.tone}`} style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                    {catMeta.label}
                  </span>
                  <span className="admin-bar-label" title={type}>{friendlyEventLabel(type)}</span>
                </div>
                <div className="admin-bar-track">
                  <div className="admin-bar-fill" style={{ width: `${barWidth}%`, background: gradient }} />
                </div>
                <div className="admin-bar-value">{count} <span style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>({pct}%)</span></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Event History Table with Category Filter and Pagination */}
      {showHistory && (
        <div className="admin-card" style={{ marginTop: '14px' }}>
          <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2>Activity Event History</h2>
              <span className="admin-count">
                Showing {visibleHistoryRecords.length} of {filteredRecords.length} {activeFilter === 'all' ? 'total' : activeFilter} events
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="admin-filter-pills" role="tablist">
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'all' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => { setActiveFilter('all'); setVisibleHistoryCount(10); }}
                >
                  All ({records.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'assessments' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => { setActiveFilter('assessments'); setVisibleHistoryCount(10); }}
                >
                  Assessments ({summary.categories.assessments})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'chatbot' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => { setActiveFilter('chatbot'); setVisibleHistoryCount(10); }}
                >
                  Chatbot ({summary.categories.chatbot})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'admin' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => { setActiveFilter('admin'); setVisibleHistoryCount(10); }}
                >
                  Admin Actions ({summary.categories.admin})
                </button>
              </div>
              <button
                type="button"
                className="admin-export-btn"
                onClick={() => exportActivityCsv(filteredRecords)}
                title="Download filtered activity report as CSV"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Category</th>
                  <th>Timestamp</th>
                  <th>Event Metadata</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistoryRecords.map((record) => {
                  const catMeta = eventCategoryMeta(record.type || record.eventType || '');
                  return (
                    <tr key={record.id}>
                      <td>
                        <span className={`admin-event-pill admin-event-pill--${eventTone(record.type || record.eventType || '')}`}>
                          {friendlyEventLabel(record.type || record.eventType || 'system_event')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 500 }}>
                          {catMeta.label}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
                        {formatDateTime(dateValue(record))}
                      </td>
                      <td>{renderDetails(record.details)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRecords.length > visibleHistoryRecords.length && (
            <div className="admin-load-more">
              <button
                type="button"
                className="admin-small-button"
                onClick={() => setVisibleHistoryCount((count) => count + 15)}
              >
                Show more ({filteredRecords.length - visibleHistoryRecords.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminOverview({ data, onNavigate }) {
  const [showAllUsers, setShowAllUsers] = useState(false);

  const users = data.users || [];
  const universities = data.universities || [];
  const scholarships = data.scholarships || [];
  const eligibility = data.eligibility || [];

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.blocked).length;
  const blockedUsers = users.filter((u) => u.blocked).length;
  const verifiedUsers = users.filter((u) => u.emailConfirmed).length;

  const totalUniversities = universities.length;
  const totalPrograms = universities.reduce((acc, u) => acc + (u.programs?.length || 0), 0);
  const totalScholarships = scholarships.length;
  const totalCriteria = eligibility.length;

  const userPreview = showAllUsers ? users : users.slice(0, 6);

  return (
    <div className="admin-dashboard-overview">
      {/* 1. Header / Welcome Banner with Status Indicator */}
      <div className="admin-welcome-card">
        <div>
          <h2 className="admin-welcome-title">Platform Overview</h2>
          <p className="admin-welcome-sub">
            Welcome to the Career Counselling Admin Portal. Monitor user accounts, institution listings, and platform data.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'var(--good-tint)', color: 'var(--good)', fontWeight: 600, fontSize: '0.84rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--good)' }}></span>
          System Online
        </div>
      </div>

      {/* 2. Top-Level Metric KPI Cards */}
      <div className="admin-dashboard-stats">
        <div className="admin-dashboard-stat admin-dashboard-stat--accent">
          <span>Total Users</span>
          <strong>{totalUsers}</strong>
          <small>{activeUsers} Active &bull; {blockedUsers} Blocked</small>
        </div>
        <div className="admin-dashboard-stat admin-dashboard-stat--good">
          <span>Universities</span>
          <strong>{totalUniversities}</strong>
          <small>{totalPrograms} Degree Programs</small>
        </div>
        <div className="admin-dashboard-stat admin-dashboard-stat--info">
          <span>Scholarships</span>
          <strong>{totalScholarships}</strong>
          <small>Active Listings</small>
        </div>
        <div className="admin-dashboard-stat admin-dashboard-stat--dark">
          <span>Eligibility Rules</span>
          <strong>{totalCriteria}</strong>
          <small>Threshold Criteria</small>
        </div>
      </div>

      {/* 3. Platform Health & Breakdown Panels */}
      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>User Base Breakdown</h2>
              <span className="admin-count">Account status distribution</span>
            </div>
            <button type="button" className="admin-text-button" onClick={() => onNavigate('users')}>
              Manage Users
            </button>
          </div>
          <div className="admin-health-grid" style={{ marginTop: '14px' }}>
            <div className="admin-health-box">
              <strong>{activeUsers}</strong>
              <span>Active Students</span>
              <small>{totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% of accounts</small>
            </div>
            <div className="admin-health-box">
              <strong>{verifiedUsers}</strong>
              <span>Verified Emails</span>
              <small>{totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0}% verification rate</small>
            </div>
            <div className="admin-health-box">
              <strong>{blockedUsers}</strong>
              <span>Blocked Accounts</span>
              <small>Suspended access</small>
            </div>
            <div className="admin-health-box">
              <strong>{totalUsers - verifiedUsers}</strong>
              <span>Pending Verification</span>
              <small>Unverified accounts</small>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Catalog &amp; Content Summary</h2>
              <span className="admin-count">Database content overview</span>
            </div>
            <button type="button" className="admin-text-button" onClick={() => onNavigate('universities')}>
              View Universities
            </button>
          </div>
          <div className="admin-health-grid" style={{ marginTop: '14px' }}>
            <div className="admin-health-box">
              <strong>{totalUniversities}</strong>
              <span>Listed Universities</span>
              <small>Institutions in catalog</small>
            </div>
            <div className="admin-health-box">
              <strong>{totalPrograms}</strong>
              <span>Academic Programs</span>
              <small>{totalUniversities > 0 ? (totalPrograms / totalUniversities).toFixed(1) : 0} avg per campus</small>
            </div>
            <div className="admin-health-box">
              <strong>{totalScholarships}</strong>
              <span>Scholarships</span>
              <small>Aid &amp; grant opportunities</small>
            </div>
            <div className="admin-health-box">
              <strong>{totalCriteria}</strong>
              <span>Active Criteria</span>
              <small>Field cut-off rules</small>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Recent Registered Users Table */}
      <section className="admin-card">
        <div className="admin-section-heading">
          <div>
            <h2>Recent User Accounts</h2>
            <span className="admin-count">{totalUsers} registered students</span>
          </div>
          <button type="button" className="admin-text-button" onClick={() => onNavigate('users')}>
            View all users &rarr;
          </button>
        </div>
        {userPreview.length > 0 ? (
          <div className="admin-table-wrap" style={{ marginTop: '10px' }}>
            <table className="admin-feed-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Auth Method</th>
                  <th>Account Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {userPreview.map((user) => (
                  <tr key={user.id || user.email}>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{user.name || 'Student'}</strong>
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{user.email}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                        {user.authProvider || 'Local'}
                      </span>
                    </td>
                    <td>
                      <StatusPill tone={user.blocked ? 'warn' : 'good'}>
                        {user.blocked ? 'Blocked' : 'Active'}
                      </StatusPill>
                    </td>
                    <td style={{ color: 'var(--ink-faint)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(user.createdAt || user.registeredAt || user.lastSignInAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty-state">No student accounts registered yet.</p>
        )}
        {users.length > 6 && (
          <button
            type="button"
            className="admin-show-more"
            onClick={() => setShowAllUsers((visible) => !visible)}
          >
            {showAllUsers ? 'Show less' : `Show more (${users.length - 6})`}
          </button>
        )}
      </section>
    </div>
  );
}

function MonitoringSummary({ tab, records }) {
  if (tab === 'assessments') {
    const summary = assessmentSummary(records);
    return (
      <div className="admin-metrics">
        <div>
          <strong>{summary.total}</strong>
          <span>Total assessments taken</span>
          <span className="admin-metric-desc">Completed quiz &amp; recommender submissions</span>
        </div>
        <div>
          <strong className="admin-metric-text">{summary.topCategory}</strong>
          <span>Most common top interest ({summary.topCategoryCount})</span>
          <span className="admin-metric-desc">Primary career field chosen by students</span>
        </div>
        <div>
          <strong>{summary.avgTopScore}</strong>
          <span>Average top-category score</span>
          <span className="admin-metric-desc">Mean compatibility score in student's #1 matched field</span>
        </div>
      </div>
    );
  }
  if (tab === 'activity') {
    return null;
  }
  if (tab === 'chatbot-interactions') {
    const summary = chatbotInteractionsSummary(records);
    return (
      <div className="admin-metrics">
        <div>
          <strong>{summary.total}</strong>
          <span>Messages exchanged</span>
          <span className="admin-metric-desc">Total queries received by assistant</span>
        </div>
        <div>
          <strong>{summary.uniqueUsers}</strong>
          <span>Unique visitors chatted</span>
          <span className="admin-metric-desc">Distinct users using chatbot</span>
        </div>
        <div>
          <strong>{summary.unanswered}</strong>
          <span>Sent with no bot reply</span>
          <span className="admin-metric-desc">Unmatched keyword requests</span>
        </div>
      </div>
    );
  }
  return null;
}

function formValues(tab, record) {
  if (tab === 'universities') return { name: record?.University || record?.name || '', city: record?.City || record?.city || '', province: record?.Province || record?.province || '', sector: record?.Sector || record?.sector || '', website: record?.Website || record?.website || record?.website_url || record?.url || '' };
  if (tab === 'scholarships') return { name: record?.name || '', provider: record?.provider || '', provinces: record?.provinces || '', basis: record?.basis || 'Merit', providerType: record?.provider_type || '', eligibility: record?.eligibility_raw || '', incomeCap: record?.income_cap_pkr || '', minMerit: record?.min_merit_pct || '', coverage: record?.coverage || '', sourceUrl: record?.source_url || '' };
  if (tab === 'chatbot-responses') return { keyword: record?.keyword || '', response: record?.response || '', link: record?.link || '', linkLabel: record?.linkLabel || '' };
  return { field: record?.field || '', description: record?.description || '', minimumMarks: record?.minimumMarks || '' };
}

function EntityForm({ tab, record, onSave, onCancel }) {
  const [form, setForm] = useState(() => formValues(tab, record));
  useEffect(() => setForm(formValues(tab, record)), [tab, record]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const data = tab === 'universities'
      ? { name: form.name, city: form.city, province: form.province, sector: form.sector, website_url: normalizeUrl(form.website) }
      : tab === 'scholarships'
        ? { name: form.name, provider: form.provider, provinces: form.provinces, basis: form.basis, provider_type: form.providerType, eligibility_raw: form.eligibility, income_cap_pkr: form.incomeCap, min_merit_pct: form.minMerit, coverage: form.coverage, source_url: normalizeUrl(form.sourceUrl) }
        : tab === 'chatbot-responses'
          ? { keyword: form.keyword, response: form.response, link: form.link, linkLabel: form.linkLabel }
          : { field: form.field, description: form.description, minimumMarks: Number(form.minimumMarks) || 0 };
    onSave(data);
  };
  return <form className="admin-edit-form" onSubmit={submit}>
    <h2>{record ? `Edit ${getResourceSingular(tab)}` : `Add ${getResourceSingular(tab)}`}</h2>
    {tab === 'universities' && <>
      <label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. National University of Sciences and Technology" required /></label>
      <label>City<input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="e.g. Islamabad" /></label>
      <label>Province<select value={form.province} onChange={(event) => update('province', event.target.value)}><option value="">Select province or region</option>{['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].map((province) => <option key={province}>{province}</option>)}{form.province && !['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].includes(form.province) && <option>{form.province}</option>}</select></label>
      <label>Sector<select value={form.sector} onChange={(event) => update('sector', event.target.value)}><option value="">Select sector</option><option>Public</option><option>Private</option></select></label>
      <label>Website URL<span className="admin-field-help">e.g. university.edu.pk (https:// is added automatically if omitted)</span><input type="text" value={form.website} onChange={(event) => update('website', event.target.value)} onBlur={(event) => update('website', normalizeUrl(event.target.value))} placeholder="https://university.edu.pk" /></label>
    </>}
    {tab === 'scholarships' && <>
      <label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. HEC Undergraduate Scholarship" required /></label>
      <label>Provider<input value={form.provider} onChange={(event) => update('provider', event.target.value)} placeholder="The organisation offering the scholarship" /></label>
      <label>Province<select value={form.provinces} onChange={(event) => update('provinces', event.target.value)}><option value="">Select province or region</option>{['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].map((province) => <option key={province}>{province}</option>)}{form.provinces && !['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].includes(form.provinces) && <option>{form.provinces}</option>}</select></label>
      <label>Basis<select value={form.basis} onChange={(event) => update('basis', event.target.value)}><option>Merit</option><option>Need</option><option>Need + Merit</option></select></label>
      <label>Provider type<select value={form.providerType} onChange={(event) => update('providerType', event.target.value)}><option value="">Select provider type</option><option>Government</option><option>Private</option><option>International</option></select></label>
      <label>Eligibility details<span className="admin-field-help">What students must meet to qualify.</span><textarea value={form.eligibility} onChange={(event) => update('eligibility', event.target.value)} placeholder="e.g. Household income below PKR 60,000 and at least 70% marks" /></label>
      <label>Income cap (PKR)<span className="admin-field-help">Maximum household income. Leave blank if there is no limit.</span><input type="number" min="0" value={form.incomeCap || ''} onChange={(event) => update('incomeCap', clampNonNegative(event.target.value))} placeholder="e.g. 60000" /></label>
      <label>Minimum merit %<span className="admin-field-help">Minimum marks or merit percentage. Leave blank if not required.</span><input type="number" min="0" max="100" value={form.minMerit || ''} onChange={(event) => update('minMerit', clampNonNegative(event.target.value))} placeholder="e.g. 70" /></label>
      <label>Coverage<span className="admin-field-help">What the scholarship pays for, such as tuition, stipend, or books.</span><textarea value={form.coverage} onChange={(event) => update('coverage', event.target.value)} placeholder="e.g. Full tuition fee and monthly stipend" /></label>
      <label>Source URL<span className="admin-field-help">Official webpage where students can verify or apply. https:// is added automatically.</span><input type="text" value={form.sourceUrl} onChange={(event) => update('sourceUrl', event.target.value)} onBlur={(event) => update('sourceUrl', normalizeUrl(event.target.value))} placeholder="https://official-website.gov.pk/scholarship" /></label>
    </>}
    {tab === 'eligibility' && <>
      <label>Field / category name<input value={form.field} onChange={(event) => update('field', event.target.value)} placeholder="e.g. Computer Science" required /></label>
      <label>Minimum marks %<span className="admin-field-help">The minimum percentage needed for this field.</span><input type="number" min="0" max="100" step="0.1" value={form.minimumMarks} onChange={(event) => update('minimumMarks', clampNonNegative(event.target.value))} placeholder="e.g. 60" /></label>
      <label>Description<span className="admin-field-help">Explain the academic requirement in plain language.</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="e.g. Requires strong mathematics and analytical skills" /></label>
    </>}
    {tab === 'chatbot-responses' && <>
      <label>Trigger keywords (comma separated)<input value={form.keyword} onChange={(event) => update('keyword', event.target.value)} placeholder="e.g. scholarship, funding" /></label>
      <label>Response<textarea value={form.response} onChange={(event) => update('response', event.target.value)} placeholder="Write the helpful reply the assistant should send" required /></label>
      <label>Link to page (optional)<select value={form.link} onChange={(event) => update('link', event.target.value)}><option value="">No link</option><option value="/quiz">Career quiz</option><option value="/university-recommender">University Recommender</option><option value="/scholarships">Scholarship Finder</option><option value="/profile">Profile</option><option value="/dashboard">Dashboard</option></select></label>
      {form.link && <label>Link button text<input value={form.linkLabel} onChange={(event) => update('linkLabel', event.target.value)} placeholder="e.g. Open Scholarship Finder" /></label>}
    </>}
    <div className="admin-button-row"><button className="primary-button" type="submit">{record ? `Update ${getResourceSingular(tab)}` : `Add ${getResourceSingular(tab)}`}</button></div>
  </form>;
}

function ProgramForm({ program, onSave, onCancel }) {
  const [degreeName, setDegreeName] = useState(program?.degree_name || '');
  const [meritFormula, setMeritFormula] = useState(program?.merit_formula || '');
  const [eligibilityPct, setEligibilityPct] = useState(program?.eligibility_pct ?? '');
  const [url, setUrl] = useState(program?.url || '');
  const resetFields = () => { setDegreeName(''); setMeritFormula(''); setEligibilityPct(''); setUrl(''); };
  return <form className="admin-program-form" onSubmit={(event) => { event.preventDefault(); onSave({ degree_name: degreeName, merit_formula: meritFormula, eligibility_pct: eligibilityPct, url: normalizeUrl(url) }); }}><label>Degree / program<input value={degreeName} onChange={(event) => setDegreeName(event.target.value)} placeholder="e.g. BS Computer Science" required /></label><label>Minimum merit %<input type="number" min="0" max="100" value={eligibilityPct || ''} onChange={(event) => setEligibilityPct(clampNonNegative(event.target.value))} placeholder="e.g. 60" /></label><label>Merit formula<input value={meritFormula} onChange={(event) => setMeritFormula(event.target.value)} placeholder="e.g. Available upon contact" /></label><label>Program URL<input type="text" value={url} onChange={(event) => setUrl(event.target.value)} onBlur={(event) => setUrl(normalizeUrl(event.target.value))} placeholder="Defaults to university website" /></label><div className="admin-button-row"><button className="primary-button" type="submit">{program ? 'Update Program' : 'Add Program'}</button><button className="secondary-button" type="button" onClick={() => (program ? onCancel() : resetFields())}>Cancel</button></div></form>;
}

// Read-only monitoring tables: no edit/delete actions — these are audit logs, not admin-managed content.
function ExpandableCell({ value, empty = '-', previewLength = 130 }) {
  const [expanded, setExpanded] = useState(false);
  const text = value === null || value === undefined || value === '' ? empty : String(value);
  if (text === empty || text.length <= previewLength) return <span>{text}</span>;
  return <div className={expanded ? 'admin-expandable admin-expandable--open' : 'admin-expandable'}><span>{text}</span><button type="button" onClick={() => setExpanded((open) => !open)}>{expanded ? 'Show less' : '... more'}</button></div>;
}

function MonitoringTable({ tab, records }) {
  const [visibleChatbotCount, setVisibleChatbotCount] = useState(10);
  const [visibleAssessmentsCount, setVisibleAssessmentsCount] = useState(10);
  const [chatbotSearch, setChatbotSearch] = useState('');
  const [chatbotFilter, setChatbotFilter] = useState('all');
  if (tab === 'assessments') {
    const visibleRecords = records.slice(0, visibleAssessmentsCount);
    return (
      <>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--monitoring">
            <thead>
              <tr>
                <th>User</th>
                <th>Source</th>
                <th>Score / result</th>
                <th>Date taken</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.userName || record.user?.name || record.user?.full_name || record.user?.email || record.user_id || 'Unknown user'}</td>
                  <td>{record.source === 'university_recommender' ? 'University Recommender' : 'Career Quiz'}</td>
                  <td><ExpandableCell value={assessmentResult(record)} /></td>
                  <td>{formatDateTime(dateValue(record))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length > visibleRecords.length && (
          <div className="admin-load-more">
            <button
              type="button"
              className="admin-small-button"
              onClick={() => setVisibleAssessmentsCount((count) => count + 10)}
            >
              Show more ({records.length - visibleRecords.length} remaining)
            </button>
          </div>
        )}
      </>
    );
  }
  if (tab === 'chatbot-interactions') {
    const unansweredCount = records.filter((r) => !String(r.response || '').trim()).length;
    const filteredRecords = records.filter((record) => {
      if (chatbotFilter === 'unanswered' && String(record.response || '').trim()) return false;
      if (!chatbotSearch.trim()) return true;
      const q = chatbotSearch.toLowerCase();
      const message = (record.message || '').toLowerCase();
      const response = (record.response || '').toLowerCase();
      const user = (record.userName || record.user?.name || record.userId || '').toLowerCase();
      return message.includes(q) || response.includes(q) || user.includes(q);
    });
    const visibleRecords = filteredRecords.slice(0, visibleChatbotCount);
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div className="admin-search-wrapper" style={{ margin: 0, flex: '1 1 260px', maxWidth: '380px' }}>
            <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              className="admin-search"
              type="text"
              inputMode="search"
              placeholder="Search queries or bot replies..."
              aria-label="Search chatbot conversations"
              value={chatbotSearch}
              onChange={(e) => { setChatbotSearch(e.target.value); setVisibleChatbotCount(10); }}
            />
            {chatbotSearch && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setChatbotSearch('')}
                aria-label="Clear search"
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          <div className="admin-filter-pills" role="tablist">
            <button
              type="button"
              className={`admin-filter-pill ${chatbotFilter === 'all' ? 'admin-filter-pill--active' : ''}`}
              onClick={() => { setChatbotFilter('all'); setVisibleChatbotCount(10); }}
            >
              All ({records.length})
            </button>
            <button
              type="button"
              className={`admin-filter-pill ${chatbotFilter === 'unanswered' ? 'admin-filter-pill--active' : ''}`}
              onClick={() => { setChatbotFilter('unanswered'); setVisibleChatbotCount(10); }}
            >
              Unanswered ({unansweredCount})
            </button>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--monitoring">
            <thead>
              <tr>
                <th>User</th>
                <th>Visitor message</th>
                <th>Bot reply</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.userName || record.user?.name || record.userId || 'Anonymous'}</td>
                  <td className="admin-table__message"><ExpandableCell value={record.message} previewLength={80} /></td>
                  <td className="admin-table__message">{record.response ? <ExpandableCell value={record.response} previewLength={80} /> : <StatusPill tone="muted">No reply matched</StatusPill>}</td>
                  <td>{formatDateTime(dateValue(record))}</td>
                </tr>
              ))}
              {visibleRecords.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>
                    No conversations match the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > visibleRecords.length && (
          <div className="admin-load-more">
            <button
              type="button"
              className="admin-small-button"
              onClick={() => setVisibleChatbotCount((count) => count + 10)}
            >
              Show more ({filteredRecords.length - visibleRecords.length} remaining)
            </button>
          </div>
        )}
      </>
    );
  }
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Event type</th><th>Timestamp</th><th>Details</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.type || record.eventType || '-'}</td><td>{dateValue(record)}</td><td>{typeof record.details === 'object' ? JSON.stringify(record.details) : record.details || '-'}</td></tr>)}</tbody></table></div>;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatbotView, setChatbotView] = useState('log');
  const [resourceView, setResourceView] = useState('list');
  const [users, setUsers] = useState([]); const [records, setRecords] = useState([]);
  const [dashboardData, setDashboardData] = useState({ users: [], activity: [], assessments: [], chatbot: [], scholarships: [], universities: [] });
  const [editingUser, setEditingUser] = useState(null); const [editingRecord, setEditingRecord] = useState(null); const [editingProgram, setEditingProgram] = useState(null);
  const [universitySearch, setUniversitySearch] = useState(''); const [scholarshipSearch, setScholarshipSearch] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [formResetKey, setFormResetKey] = useState(0);
  const [userSearch, setUserSearch] = useState(''); const [userFilter, setUserFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const RECORDS_PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(RECORDS_PAGE_SIZE);
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);

  // The "Chatbot" nav item covers two underlying resources — the conversation log and the auto-reply rules.
  const activeResource = tab === 'chatbot' ? (chatbotView === 'log' ? 'chatbot-interactions' : 'chatbot-responses') : tab;

  const api = async (path, options = {}) => { const response = await fetch(`${API_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } }); const result = await response.json(); if (response.status === 401) { sessionStorage.removeItem(ADMIN_TOKEN_KEY); navigate('/admin/login', { replace: true }); } if (!response.ok) throw new Error(result.message || 'Request failed.'); return result; };
  const load = async (resource) => { if (resource === 'users') { const result = await api('/api/admin/stats'); setUsers((result.users || []).sort((a, b) => timestampValue(b) - timestampValue(a))); } else { const result = await api(`/api/admin/${resource}`); setRecords((result.records || []).sort((a, b) => timestampValue(b) - timestampValue(a))); } };
  const loadDashboard = async () => {
    const [stats, scholarships, universities, eligibility] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/scholarships'),
      api('/api/admin/universities'),
      api('/api/admin/eligibility'),
    ]);
    setDashboardData({
      users: (stats.users || []).sort((a, b) => timestampValue(b) - timestampValue(a)),
      scholarships: scholarships.records || [],
      universities: universities.records || [],
      eligibility: eligibility.records || [],
    });
  };
  useEffect(() => { loadDashboard().catch((loadError) => setError(loadError.message)); }, []);
  // Large record sets (200+ universities/scholarships) rendered in full make the page tall
  // enough to break browser rendering, so lists are paged; reset to page one on list/search change.
  useEffect(() => { setVisibleCount(RECORDS_PAGE_SIZE); }, [activeResource, universitySearch, scholarshipSearch]);

  // Auto-dismiss transient notice banners after 3.5 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice('');
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setResourceView('list');
    setEditingRecord(null); setEditingProgram(null); setError(''); setNotice('');
    if (nextTab === 'dashboard') {
      loadDashboard().catch((loadError) => setError(loadError.message));
      return;
    }
    const resource = nextTab === 'chatbot' ? (chatbotView === 'log' ? 'chatbot-interactions' : 'chatbot-responses') : nextTab;
    load(resource).catch((loadError) => setError(loadError.message));
  };
  const switchChatbotView = (view) => {
    setChatbotView(view);
    setEditingRecord(null); setError(''); setNotice('');
    load(view === 'log' ? 'chatbot-interactions' : 'chatbot-responses').catch((loadError) => setError(loadError.message));
  };

  const toggleUserBlock = async (user) => {
    try {
      const nextBlocked = !user.blocked;
      const result = await api(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, email: user.email, blocked: nextBlocked }),
      });
      setUsers((prevUsers) => prevUsers.map((entry) => (entry.id === user.id ? result.user : entry)));
      setNotice(`User ${user.name || user.email} is now ${nextBlocked ? 'blocked' : 'active'}.`);
    } catch (toggleError) {
      setError(toggleError.message);
    }
  };

  const toggleUserVerified = async (user) => {
    try {
      const nextVerified = !user.emailConfirmed;
      const result = await api(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, email: user.email, emailConfirmed: nextVerified }),
      });
      setUsers((prevUsers) => prevUsers.map((entry) => (entry.id === user.id ? result.user : entry)));
      setNotice(`User ${user.name || user.email} is now ${nextVerified ? 'verified' : 'unverified'}.`);
    } catch (toggleError) {
      setError(toggleError.message);
    }
  };

  const saveUser = async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingUser, emailConfirmed: Boolean(editingUser.emailConfirmed) }),
      });
      setUsers((prevUsers) => prevUsers.map((user) => (user.id === result.user.id ? result.user : user)));
      setEditingUser(null);
      setNotice('User updated successfully.');
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const deleteUser = (user) => {
    setDeleteTarget({
      type: 'user',
      payload: user,
      title: user.name || user.email,
      message: `Are you sure you want to delete user account "${user.name ? `${user.name} (${user.email})` : user.email}"? All associated quiz submissions and saved preferences will be permanently removed.`,
    });
  };
  const saveRecord = async (data) => {
    const wasEditing = Boolean(editingRecord);
    const itemLabel = getResourceSingular(activeResource);
    try {
      const path = editingRecord ? `/api/admin/${activeResource}/${editingRecord.id}` : `/api/admin/${activeResource}`;
      await api(path, { method: editingRecord ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await load(activeResource);
      setEditingRecord(null);
      setResourceView('list');
      setFormResetKey((key) => key + 1);
      setNotice(`${itemLabel} ${wasEditing ? 'updated' : 'added'} successfully.`);
    } catch (saveError) {
      setError(saveError.message);
    }
  };
  const deleteRecord = (record) => {
    const itemLabel = getResourceSingular(activeResource);
    setDeleteTarget({
      type: 'record',
      payload: record,
      title: displayName(record),
      message: `Are you sure you want to delete ${itemLabel} "${displayName(record)}"? This will be permanently removed from the catalog.`,
    });
  };
  const saveProgram = async (data) => { if (!editingRecord) return; const wasEditing = Boolean(editingProgram); try { const path = editingProgram ? `/api/admin/universities/${editingRecord.id}/programs/${editingProgram.id}` : `/api/admin/universities/${editingRecord.id}/programs`; await api(path, { method: editingProgram ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await load('universities'); const updated = (await api('/api/admin/universities')).records.find((university) => String(university.id) === String(editingRecord.id)); setEditingRecord(updated); setEditingProgram(null); setFormResetKey((key) => key + 1); setNotice(wasEditing ? 'Program updated successfully.' : 'Program added successfully.'); } catch (saveError) { setError(saveError.message); } };
  const deleteProgram = (program) => {
    setDeleteTarget({
      type: 'program',
      payload: program,
      title: program.degree_name,
      message: `Are you sure you want to delete degree program "${program.degree_name}" from this university?`,
    });
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      if (target.type === 'user') {
        const user = target.payload;
        await api(`/api/admin/users/${user.id}`, { method: 'DELETE' });
        setUsers((prevUsers) => prevUsers.filter((entry) => entry.id !== user.id));
        setNotice('User deleted successfully.');
      } else if (target.type === 'record') {
        const record = target.payload;
        const itemLabel = getResourceSingular(activeResource);
        await api(`/api/admin/${activeResource}/${record.id}`, { method: 'DELETE' });
        await load(activeResource);
        setNotice(`${itemLabel} deleted successfully.`);
      } else if (target.type === 'program') {
        const program = target.payload;
        if (!editingRecord) return;
        await api(`/api/admin/universities/${editingRecord.id}/programs/${program.id}`, { method: 'DELETE' });
        await load('universities');
        const updated = (await api('/api/admin/universities')).records.find((u) => String(u.id) === String(editingRecord.id));
        setEditingRecord(updated);
        setNotice('Program deleted.');
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };
  const filteredUsers = users.filter((u) => {
    if (userFilter === 'active' && u.blocked) return false;
    if (userFilter === 'blocked' && !u.blocked) return false;
    if (userFilter === 'unverified' && u.emailConfirmed) return false;
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });
  const activeCount = users.filter((u) => !u.blocked).length;
  const blockedCount = users.filter((u) => u.blocked).length;
  const unverifiedCount = users.filter((u) => !u.emailConfirmed).length;

  const visibleRecords = activeResource === 'universities' ? records.filter((record) => universityMatches(record, universitySearch)) : activeResource === 'scholarships' ? records.filter((record) => scholarshipMatches(record, scholarshipSearch)) : records;
  const pagedRecords = visibleRecords.slice(0, visibleCount);

  const signOut = () => { sessionStorage.removeItem(ADMIN_TOKEN_KEY); navigate('/admin/login', { replace: true }); };

  return (
    <div className={sidebarCollapsed ? 'admin-app admin-app--sidebar-collapsed' : 'admin-app'}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-brand-mark" aria-hidden="true">CG</span>
          {!sidebarCollapsed && <div className="admin-brand-text">
            <strong>CareerGuide</strong>
            <span>Admin console</span>
          </div>}
          <button type="button" className="admin-sidebar-toggle" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>{sidebarCollapsed ? '>' : '<'}</button>
        </div>
        <nav className="admin-nav" role="tablist" aria-label="Admin sections">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'admin-nav-item admin-nav-item--active' : 'admin-nav-item'} onClick={() => changeTab(id)}>
              <span className="admin-nav-icon" aria-hidden="true">{tabIcons[id]}</span>
              {!sidebarCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <button
            className="admin-signout"
            type="button"
            onClick={signOut}
            title={sidebarCollapsed ? 'Sign out' : undefined}
            aria-label="Sign out"
          >
            <span className="admin-nav-icon" aria-hidden="true">{logoutIcon}</span>
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          {tab !== 'dashboard' && (
            <button
              type="button"
              className="admin-back-btn"
              onClick={() => changeTab('dashboard')}
              title="Return to Admin Dashboard"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Dashboard</span>
            </button>
          )}
          <h1>{resourceLabels[activeResource] || 'Administration'}</h1>
          {tabDescriptions[tab] && <p className="admin-topbar__subtitle">{tabDescriptions[tab]}</p>}
        </div>

        {tab === 'dashboard' && (
          <>
            {notice && (
              <div className="admin-notice" role="status">
                <span>{notice}</span>
                <button
                  type="button"
                  className="admin-notice-close"
                  onClick={() => setNotice('')}
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            )}
            {error && (
              <div className="admin-error" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="admin-notice-close"
                  onClick={() => setError('')}
                  aria-label="Dismiss error"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            )}
            <AdminOverview data={dashboardData} onNavigate={changeTab} />
          </>
        )}

        {tab === 'users' && (
          <div className="admin-card">
            <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2>Registered users</h2>
                <span className="admin-count">
                  {userSearch.trim() || userFilter !== 'all'
                    ? `${filteredUsers.length} of ${users.length} accounts`
                    : `${users.length} accounts`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-export-btn"
                  onClick={() => exportUsersCsv(filteredUsers)}
                  title="Download users list as CSV"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
                <button
                  type="button"
                  className="admin-back-btn admin-back-btn--outline"
                  onClick={() => changeTab('dashboard')}
                  title="Return to Admin Dashboard"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>

            {/* Users Search & Status Filter Pills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: '14px 0 16px' }}>
              <div className="admin-search-wrapper" style={{ margin: 0, flex: '1 1 280px', maxWidth: '420px' }}>
                <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  className="admin-search"
                  type="text"
                  inputMode="search"
                  placeholder="Search users by name or email..."
                  aria-label="Search registered users"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />
                {userSearch && (
                  <button
                    type="button"
                    className="admin-search-clear"
                    onClick={() => setUserSearch('')}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    &times;
                  </button>
                )}
              </div>
              <div className="admin-filter-pills" role="tablist">
                <button
                  type="button"
                  className={`admin-filter-pill ${userFilter === 'all' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => setUserFilter('all')}
                >
                  All ({users.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${userFilter === 'active' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => setUserFilter('active')}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${userFilter === 'blocked' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => setUserFilter('blocked')}
                >
                  Blocked ({blockedCount})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${userFilter === 'unverified' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => setUserFilter('unverified')}
                >
                  Unverified ({unverifiedCount})
                </button>
              </div>
            </div>

            {notice && (
              <div className="admin-notice" role="status">
                <span>{notice}</span>
                <button
                  type="button"
                  className="admin-notice-close"
                  onClick={() => setNotice('')}
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            )}
            {error && (
              <div className="admin-error" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="admin-notice-close"
                  onClick={() => setError('')}
                  aria-label="Dismiss error"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Verified</th><th>Last login</th><th>Access</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.authProvider}</td>
                      <td>
                        <button 
                          className={`admin-action admin-action--toggle ${user.emailConfirmed ? 'admin-action--good' : ''}`}
                          style={{ minWidth: '90px' }}
                          type="button" 
                          onClick={() => toggleUserVerified(user)}
                        >
                          {user.emailConfirmed ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td>{formatDateTime(user.lastSignInAt)}</td>
                      <td><StatusPill tone={user.blocked ? 'warn' : 'good'}>{user.blocked ? 'Blocked' : 'Active'}</StatusPill></td>
                      <td>
                        <button className="admin-action admin-action--toggle" type="button" onClick={() => toggleUserBlock(user)}>{user.blocked ? 'Unblock' : 'Block'}</button>
                        <button className="admin-action" type="button" onClick={() => setEditingUser({ ...user })}>Edit</button>
                        <button className="admin-action admin-action--danger" type="button" onClick={() => deleteUser(user)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '35px', color: 'var(--ink-muted)' }}>
                        No accounts match the current filter or search "{userSearch || userFilter}".
                        {userSearch && (
                          <div style={{ marginTop: '10px' }}>
                            <button type="button" className="admin-small-button" onClick={() => { setUserSearch(''); setUserFilter('all'); }}>
                              Clear Search
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {editingUser && (
              <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
                <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal-header">
                    <h2>Edit User Account</h2>
                    <button type="button" className="admin-modal-close" onClick={() => setEditingUser(null)} aria-label="Close modal">×</button>
                  </div>
                  <form className="admin-modal-body" onSubmit={saveUser}>
                    <div>
                      <label htmlFor="edit-user-name">User Name</label>
                      <input
                        id="edit-user-name"
                        type="text"
                        value={editingUser.name}
                        onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })}
                        required
                        aria-label="User name"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-user-email">Email Address</label>
                      <input
                        id="edit-user-email"
                        type="email"
                        value={editingUser.email}
                        onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })}
                        required
                        aria-label="User email"
                      />
                    </div>
                    <label className="admin-modal-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editingUser.blocked)}
                        onChange={(event) => setEditingUser({ ...editingUser, blocked: event.target.checked })}
                      />
                      <span>Block account access (prevent user from signing in)</span>
                    </label>
                    <label className="admin-modal-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editingUser.emailConfirmed)}
                        onChange={(event) => setEditingUser({ ...editingUser, emailConfirmed: event.target.checked })}
                      />
                      <span>Mark email address as verified</span>
                    </label>
                    <div className="admin-modal-actions">
                      <button className="secondary-button" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                      <button className="primary-button" type="submit">Save changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'chatbot' && (
          <div className="admin-subnav" role="tablist" aria-label="Chatbot views">
            <button type="button" role="tab" aria-selected={chatbotView === 'log'} className={chatbotView === 'log' ? 'admin-subnav-item admin-subnav-item--active' : 'admin-subnav-item'} onClick={() => switchChatbotView('log')}>Conversation log</button>
            <button type="button" role="tab" aria-selected={chatbotView === 'rules'} className={chatbotView === 'rules' ? 'admin-subnav-item admin-subnav-item--active' : 'admin-subnav-item'} onClick={() => switchChatbotView('rules')}>Auto-reply rules</button>
          </div>
        )}

        {tab !== 'dashboard' && tab !== 'users' && readOnlyResources.includes(activeResource) && (
          activeResource === 'activity' ? (
            <SystemReportsView records={records} />
          ) : (
            <div className="admin-card">
              <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>{resourceLabels[activeResource]}</h2>
                  <span className="admin-count">{records.length} records</span>
                </div>
                {activeResource === 'assessments' && (
                  <button
                    type="button"
                    className="admin-export-btn"
                    onClick={() => exportAssessmentsCsv(records)}
                    title="Download assessments as CSV"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                  </button>
                )}
              </div>
              {activeResource === 'chatbot-interactions' && (
                <p className="admin-hint">Every message a visitor sent the assistant, shown together with the automated reply it received — this is how conversations are actually monitored.</p>
              )}
              <MonitoringSummary tab={activeResource} records={records} />
              <MonitoringTable tab={activeResource} records={records} />
            </div>
          )
        )}

        {tab !== 'dashboard' && tab !== 'users' && !readOnlyResources.includes(activeResource) && (
          <div className="admin-card">
            {(activeResource === 'universities' || activeResource === 'scholarships') && (
              <div className="admin-subnav admin-resource-subnav" role="tablist" aria-label={`${resourceLabels[activeResource]} views`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={resourceView === 'list'}
                  className={resourceView === 'list' ? 'admin-subnav-item admin-subnav-item--active' : 'admin-subnav-item'}
                  onClick={() => { setResourceView('list'); setEditingRecord(null); setNotice(''); setError(''); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  Search {resourceLabels[activeResource]}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={resourceView === 'add'}
                  className={resourceView === 'add' ? 'admin-subnav-item admin-subnav-item--active' : 'admin-subnav-item'}
                  onClick={() => { setResourceView('add'); setEditingRecord(null); setNotice(''); setError(''); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add {getResourceSingular(activeResource)}
                </button>
              </div>
            )}
            {notice && (
              <div className="admin-notice" role="status">
                <span>{notice}</span>
                <button
                  type="button"
                  className="admin-notice-close"
                  onClick={() => setNotice('')}
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            )}
            {error && (
              <div className="admin-error" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="admin-notice-close"
                  onClick={() => setError('')}
                  aria-label="Dismiss error"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            )}
            {resourceView === 'list' && <div>
              <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2>{resourceLabels[activeResource]}</h2>
                  <span className="admin-count">
                    {activeResource === 'universities'
                      ? (universitySearch.trim()
                          ? `${visibleRecords.length} of ${records.length} universities`
                          : `${records.length} universities`)
                      : activeResource === 'scholarships'
                      ? (scholarshipSearch.trim()
                          ? `${visibleRecords.length} of ${records.length} scholarships`
                          : `${records.length} scholarships`)
                      : activeResource === 'chatbot-responses'
                      ? `${records.length} rules`
                      : `${records.length} records`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {activeResource === 'universities' && (
                    <button
                      type="button"
                      className="admin-export-btn"
                      onClick={() => exportUniversitiesCsv(visibleRecords)}
                      title="Download universities catalog as CSV"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export CSV
                    </button>
                  )}
                  {activeResource === 'scholarships' && (
                    <button
                      type="button"
                      className="admin-export-btn"
                      onClick={() => exportScholarshipsCsv(visibleRecords)}
                      title="Download scholarships catalog as CSV"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export CSV
                    </button>
                  )}
                  {(activeResource !== 'universities' && activeResource !== 'scholarships') && (
                    <button className="admin-small-button" type="button" onClick={() => { setEditingRecord(null); setResourceView('add'); }}>Add</button>
                  )}
                </div>
              </div>
              {activeResource === 'chatbot-responses' && (
                <p className="admin-hint">Keyword-triggered canned replies the assistant sends automatically. The conversation log (above) is where you monitor what visitors actually asked.</p>
              )}
              {activeResource === 'universities' && (
                <div className="admin-search-wrapper">
                  <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    className="admin-search"
                    type="text"
                    inputMode="search"
                    placeholder="Search universities by name, city, province, sector, or program (e.g. NUST, Lahore, CS)..."
                    aria-label="Search universities"
                    value={universitySearch}
                    onChange={(event) => setUniversitySearch(event.target.value)}
                  />
                  {universitySearch && (
                    <button
                      type="button"
                      className="admin-search-clear"
                      onClick={() => setUniversitySearch('')}
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      &times;
                    </button>
                  )}
                </div>
              )}
              {activeResource === 'scholarships' && (
                <div className="admin-search-wrapper">
                  <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    className="admin-search"
                    type="text"
                    inputMode="search"
                    placeholder="Search scholarships by name, provider, province, merit/need, criteria..."
                    aria-label="Search scholarships"
                    value={scholarshipSearch}
                    onChange={(event) => setScholarshipSearch(event.target.value)}
                  />
                  {scholarshipSearch && (
                    <button
                      type="button"
                      className="admin-search-clear"
                      onClick={() => setScholarshipSearch('')}
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      &times;
                    </button>
                  )}
                </div>
              )}
              {visibleRecords.length === 0 && (
                <div className="admin-empty-search-state">
                  <p>
                    No {activeResource} found matching "
                    <strong>
                      {activeResource === 'universities' ? universitySearch : scholarshipSearch}
                    </strong>
                    ".
                  </p>
                  <button
                    type="button"
                    className="admin-small-button"
                    onClick={() => {
                      if (activeResource === 'universities') setUniversitySearch('');
                      if (activeResource === 'scholarships') setScholarshipSearch('');
                    }}
                  >
                    Clear Search
                  </button>
                </div>
              )}
              {pagedRecords.map((record) => (
                <div className="admin-record" key={record.id}>
                  <div className="admin-record__content">
                    <p className={activeResource === 'scholarships' ? 'admin-record__title admin-record__title--truncate' : 'admin-record__title'} title={activeResource === 'scholarships' ? displayName(record) : undefined}>{displayName(record)}</p>
                    {activeResource === 'scholarships' ? (
                      <>
                        <p className="admin-record__subtitle" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{record.provider || 'Provider not specified'}</span>
                          {record.basis && <StatusPill tone={basisTone(record.basis)}>{scholarshipBasisLabel(record.basis)}</StatusPill>}
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
                        {activeResource === 'eligibility' && record.description && <p className="admin-record__meta" style={{ marginTop: '4px' }}>{record.description}</p>}
                        {activeResource === 'chatbot-responses' && record.response && <p className="admin-record__meta" style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{record.response}</p>}
                      </>
                    )}
                  </div>
                  <div className="admin-record__actions">
                    <button className="admin-action" type="button" onClick={() => { setEditingRecord(record); setResourceView('add'); }}>Edit</button>
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
            </div>}
            {resourceView === 'add' && <div className="admin-form-screen">
              <div className="admin-section-heading"><div><h2>{editingRecord ? `Edit ${getResourceSingular(activeResource)}` : `Add ${getResourceSingular(activeResource)}`}</h2><span className="admin-count">Complete the fields, then save when ready.</span></div><button type="button" className="admin-text-button" onClick={() => { setResourceView('list'); setEditingRecord(null); setNotice(''); setError(''); }}>&larr; Back to {resourceLabels[activeResource] || 'records'}</button></div>
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
            </div>}
          </div>
        )}

        {deleteTarget && (
          <div className="admin-modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="admin-modal-card admin-modal-card--danger" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="admin-danger-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </span>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--ink)' }}>Confirm Deletion</h2>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close dialog">×</button>
              </div>
              <div className="admin-modal-body">
                <p style={{ margin: '6px 0 8px 0', fontSize: '0.94rem', color: 'var(--ink)', lineHeight: '1.45' }}>
                  {deleteTarget.message}
                </p>
                <p style={{ margin: '0 0 18px 0', fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600 }}>
                  Warning: This action is permanent and cannot be undone.
                </p>
                <div className="admin-modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button type="button" className="admin-action-btn-danger" onClick={confirmDelete}>Confirm Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;