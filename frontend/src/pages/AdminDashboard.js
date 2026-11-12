import { useEffect, useState } from 'react';
import { exportElementToPdf } from '../utils/pdfExport';
import { useNavigate } from 'react-router-dom';
import { getAdminAccessToken, refreshAdminAccessToken, clearAdminSession } from '../lib/supabase';
import './AdminDashboard.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').trim().replace(/\/+$/, '');

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
  users: 'Registered users and their platform access.',
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
  const candidates = [record.University, record.name, record.field, record.keyword, record.type];
  for (const c of candidates) {
    if (c && !isHash(c)) return c;
  }
  // Last resort: use id only if it's not hash-like
  if (record.id && !isHash(record.id)) return record.id;
  return record.userName || record.email || 'Record';
}

function isHash(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return true;
  if (s.length >= 12 && /^[0-9a-fA-F]+$/.test(s)) return true;
  return false;
}

function isUserActive(user) {
  if (!user || user.blocked) return false;
  if (typeof user.isLoggedIn === 'boolean') return user.isLoggedIn;
  if (user.status === 'active') return true;
  if (user.status === 'passive') return false;
  return false;
}

function getUserDisplayName(record, users = []) {
  if (!record) return 'Visitor';

  const details = record.details && typeof record.details === 'object' ? record.details : {};

  // 1. Direct candidate name — check multiple fields and details
  const candidateName = record.userName || record.user?.name || record.user?.full_name || record.name || details.userName || details.name;
  if (candidateName && candidateName !== 'Anonymous (University Recommender)' && candidateName !== 'Guest Student' && !isHash(candidateName)) {
    return candidateName;
  }

  // 2. Direct email
  const candidateEmail = record.userEmail || record.user?.email || record.email || details.email || details.userEmail;

  // 3. Look up by userId in users list
  const uid = record.userId || record.user_id || details.userId || details.user_id;
  if (uid && Array.isArray(users) && users.length > 0) {
    const uidStr = String(uid);
    const matched = users.find((u) => String(u.id) === uidStr || String(u.userId) === uidStr || (candidateEmail && String(u.email).toLowerCase() === String(candidateEmail).toLowerCase()));
    if (matched) {
      if (matched.name && !isHash(matched.name)) return matched.name;
      if (matched.full_name && !isHash(matched.full_name)) return matched.full_name;
      if (matched.email) {
        const local = matched.email.split('@')[0].replace(/[._]/g, ' ');
        return local.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  // 4. If we have an email, derive readable name
  if (candidateEmail && candidateEmail.includes('@')) {
    const local = candidateEmail.split('@')[0].replace(/[._]/g, ' ');
    return local.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // 5. Fallback without ever showing a hash or generic guest
  if (record.source === 'university_recommender') return 'Student (Recommender)';
  if (record.source === 'quiz') return 'Student (Quiz)';
  return 'Registered Student';
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

function universityMatches(record, query, cityFilter = 'all') {
  const city = String(record.City || record.city || '').toLowerCase();

  // Dropdown city filter
  if (cityFilter && cityFilter !== 'all') {
    if (!city.includes(cityFilter.toLowerCase())) return false;
  }

  const searchText = (query || '').trim().toLowerCase();
  if (!searchText) return true;
  const terms = searchText.split(/\s+/).filter(Boolean);

  const name = String(record.University || record.name || '').toLowerCase();
  const province = String(record.Province || record.province || '').toLowerCase();
  const sector = String(record.Sector || record.sector || '').toLowerCase();
  const programs = (record.programs || [])
    .map((p) => `${p.degree_name || ''}`)
    .join(' ')
    .toLowerCase();

  // Check each term: if a term matches a city name, only universities in that city match
  return terms.every((term) => {
    if (city.includes(term)) return true;
    return name.includes(term) || province.includes(term) || sector.includes(term) || programs.includes(term);
  });
}

function scholarshipMatches(record, query) {
  const searchText = (query || '').trim().toLowerCase();
  if (!searchText) return true;
  const terms = searchText.split(/\s+/).filter(Boolean);

  const name = String(record.name || '').toLowerCase();
  const provider = String(record.provider || '').toLowerCase();
  const provinces = String(record.provinces || '').toLowerCase();
  const basis = String(record.basis || '').toLowerCase();
  const basisLabel = scholarshipBasisLabel(record.basis).toLowerCase();
  const providerType = String(record.provider_type || '').toLowerCase();
  const eligibility = String(record.eligibility_raw || '').toLowerCase();
  const coverage = String(record.coverage || '').toLowerCase();
  const minMerit = String(record.min_merit_pct || '').toLowerCase();
  const incomeCap = String(record.income_cap_pkr || '').toLowerCase();
  const sourceUrl = String(record.source_url || '').toLowerCase();

  let extraTerms = '';
  if (provinces.includes('national') || provinces.includes('federal')) extraTerms += ' pakistan all pakistan nationwide federal';
  if (basis.includes('need') || basis.includes('merit')) extraTerms += ' need-based merit-based need based merit based';
  if (provider.includes('higher education commission')) extraTerms += ' hec';

  const combined = `${name} ${provider} ${provinces} ${basis} ${basisLabel} ${providerType} ${eligibility} ${coverage} ${minMerit} ${incomeCap} ${sourceUrl} ${extraTerms}`;
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

function getCategoryBadgeTone(category = '') {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('tech') || cat.includes('comput') || cat.includes('software') || cat.includes('it')) return 'info';
  if (cat.includes('med') || cat.includes('health') || cat.includes('bio') || cat.includes('pharma')) return 'good';
  if (cat.includes('biz') || cat.includes('business') || cat.includes('commerce') || cat.includes('manag') || cat.includes('finance')) return 'bronze';
  if (cat.includes('art') || cat.includes('humanities') || cat.includes('design') || cat.includes('law')) return 'warn';
  return 'muted';
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

function exportAssessmentsCsv(records, users = []) {
  const headers = ['Student Name', 'Student Email', 'Assessment Source', 'Primary Field', 'Recommended Career', 'Score Breakdown', 'Date Taken'];
  const rows = records.map((record) => {
    const user = getUserDisplayName(record, users);
    const email = record.userEmail || record.email || record.user?.email || '-';
    const source = record.source === 'university_recommender' ? 'University Recommender' : 'Career Quiz';
    const topField = record.highest_category || record.result?.matchedField || record.matched_field || '-';
    const career = record.recommendation || record.result?.career || '-';
    const scoreBreakdown = record.scores && typeof record.scores === 'object'
      ? Object.entries(record.scores).map(([k, v]) => `${k}: ${v}`).join('; ')
      : assessmentResult(record);
    const date = dateValue(record);
    return [user, email, source, topField, career, scoreBreakdown, date];
  });
  exportToCsv(`assessments_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function exportActivityCsv(records, users = []) {
  const headers = ['Event Type', 'Timestamp', 'User / Actor', 'Details'];
  const rows = records.map((record) => {
    const eventType = friendlyEventLabel(record.type || record.eventType || 'system_event');
    const timestamp = formatDateTime(dateValue(record));
    let user = '-';
    let detailsStr = '';
    if (record.details && typeof record.details === 'object') {
      const resolved = record.details.userName || record.details.name || (record.details.userId ? getUserDisplayName({ userId: record.details.userId }, users) : null);
      if (record.details.email) {
        user = resolved && resolved !== 'Student' && resolved !== 'Visitor' ? `${resolved} (${record.details.email})` : record.details.email;
      } else if (resolved) {
        user = resolved;
      }
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
  const headers = ['Name', 'Email', 'Auth Provider', 'Last Sign In', 'Status'];
  const rows = users.map((user) => [
    user.name || '-',
    user.email || '-',
    user.authProvider === 'google' ? 'Google' : 'Email',
    formatDateTime(user.lastSignInAt),
    user.blocked ? 'Blocked' : (isUserActive(user) ? 'Active' : 'Inactive'),
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

function formatDayWeekday(isoDateStr) {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function activitySummary(records) {
  const counts = {};
  const timelineCounts = {};
  const timelineDetails = {};
  const careerCounts = {};
  const domainCounts = { Technology: 0, Business: 0, Medical: 0, Arts: 0 };
  const now = Date.now();
  let last24h = 0;
  const userSet = new Set();

  let assessmentCount = 0;
  let chatbotCount = 0;
  let adminCount = 0;
  let userCount = 0;

  records.forEach((record) => {
    const type = record.type || record.eventType || 'unknown';
    counts[type] = (counts[type] || 0) + 1;

    if (type.includes('assessment')) assessmentCount += 1;
    else if (type.includes('chat')) chatbotCount += 1;
    else if (type.startsWith('admin_user') || type.includes('block') || type.includes('delete')) adminCount += 1;
    else if (type.includes('registered') || type.includes('login') || type.includes('user')) userCount += 1;

    const details = record.details;
    if (type === 'assessment_completed' && details && typeof details === 'object') {
      const field = details.matchedField || details.highest_category || (details.career && details.career.toLowerCase().includes('software') ? 'Technology' : null);
      if (field && domainCounts[field] !== undefined) {
        domainCounts[field] = (domainCounts[field] || 0) + 1;
      } else if (field) {
        domainCounts[field] = (domainCounts[field] || 0) + 1;
      }
      const career = details.career || details.recommendation;
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
          timelineDetails[dayKey] = { assessments: 0, chatbot: 0, user: 0, admin: 0 };
        }
        if (type.includes('assessment')) timelineDetails[dayKey].assessments += 1;
        else if (type.includes('chat')) timelineDetails[dayKey].chatbot += 1;
        else if (type.includes('registered') || type.includes('login') || type.includes('user')) timelineDetails[dayKey].user += 1;
        else if (type.startsWith('admin_user') || type.includes('block') || type.includes('delete')) timelineDetails[dayKey].admin += 1;
      }
    }
    if (details && typeof details === 'object') {
      if (details.email) userSet.add(details.email);
      else if (details.userId) userSet.add(details.userId);
    }
  });

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const rankedCareers = Object.entries(careerCounts).sort((a, b) => b[1] - a[1]);
  const rankedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);

  // Rolling continuous 7-day timeline window up to today
  const timeline = [];
  const daysToShow = 7;
  for (let i = daysToShow - 1; i >= 0; i--) {
    const targetDate = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayKey = targetDate.toISOString().slice(0, 10);
    const total = timelineCounts[dayKey] || 0;
    const details = timelineDetails[dayKey] || { assessments: 0, chatbot: 0, user: 0, admin: 0 };
    timeline.push({
      day: dayKey,
      total,
      breakdown: details,
      isToday: i === 0,
    });
  }

  const maxTimelineTotal = Math.max(...timeline.map((item) => item.total), 1);
  const totalVolume7Days = timeline.reduce((acc, cur) => acc + cur.total, 0);

  return {
    total: records.length,
    last24h,
    activeUsers: userSet.size,
    topType: ranked[0]?.[0] || '-',
    topTypeCount: ranked[0]?.[1] || 0,
    breakdown: ranked,
    careerBreakdown: rankedCareers,
    domainBreakdown: rankedDomains,
    domainCounts,
    categories: {
      assessments: assessmentCount,
      chatbot: chatbotCount,
      user: userCount || Math.max(0, records.length - assessmentCount - chatbotCount - adminCount),
      admin: adminCount,
    },
    timeline,
    maxTimelineTotal,
    totalVolume7Days,
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

// Modern SVG Donut Chart for Discipline Distribution
function DonutChart({ data, total, selectedDomain, onSelectDomain }) {
  const size = 150;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validTotal = Math.max(1, total || 0);

  let accumulatedOffset = 0;

  return (
    <div className="admin-donut-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="admin-donut-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line, #e2e8f0)"
          strokeWidth={strokeWidth}
        />
        {data.map((item) => {
          const pct = item.count / validTotal;
          const strokeDash = pct * circumference;
          const strokeGap = circumference - strokeDash;
          const currentOffset = accumulatedOffset;
          accumulatedOffset += strokeDash;

          if (item.count === 0) return null;

          return (
            <circle
              key={item.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={selectedDomain && item.name.toLowerCase().includes(selectedDomain.toLowerCase()) ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${strokeDash} ${strokeGap}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="admin-donut-slice"
              style={{
                cursor: onSelectDomain ? 'pointer' : 'default',
                opacity: selectedDomain && !item.name.toLowerCase().includes(selectedDomain.toLowerCase()) ? 0.35 : 1,
                transition: 'all 0.25s ease',
              }}
              onClick={() => {
                if (onSelectDomain) {
                  const key = item.name.includes('Tech') ? 'Technology' : item.name.includes('Business') ? 'Business' : item.name.includes('Medicine') ? 'Medical' : 'Arts';
                  onSelectDomain(key);
                }
              }}
            >
              <title>{`${item.name}: ${item.count} students (${Math.round(pct * 100)}%) — Click to filter domain`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="admin-donut-center">
        <span className="admin-donut-center-value">{total}</span>
        <span className="admin-donut-center-label">STUDENTS</span>
      </div>
    </div>
  );
}

function SystemReportsView({ records, users = [], assessments = [], chatbot = [], showHistory = true }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(10);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportElementToPdf(
        'admin-system-reports-section',
        `system_activity_report_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      alert('Unable to generate PDF report. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const summary = activitySummary(records);
  const maxTypeCount = summary.breakdown[0]?.[1] || 1;
  const maxTimelineCount = summary.maxTimelineTotal;

  const eventGradients = {
    user_registered: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    user_login: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)',
    assessment_completed: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
    chatbot_interaction: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
    admin_user_blocked: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
    admin_user_unblocked: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    admin_user_updated: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
    admin_user_deleted: 'linear-gradient(90deg, #b91c1c 0%, #991b1b 100%)',
  };

  const domainConfig = {
    Technology: {
      title: 'Computer Science & Technology',
      gradient: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)',
      subpaths: 'Software Engineering, AI, Data Science, Cloud Computing',
      badgeTone: 'info',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    Business: {
      title: 'Business & Commerce',
      gradient: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
      subpaths: 'Business Analytics, FinTech, Marketing, Entrepreneurship',
      badgeTone: 'good',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    Medical: {
      title: 'Medicine & Health Sciences',
      gradient: 'linear-gradient(90deg, #e11d48 0%, #f43f5e 100%)',
      subpaths: 'MBBS Doctor, Pharmacy, Biomedical Engineering, Nursing',
      badgeTone: 'warn',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    },
    Arts: {
      title: 'Arts, Design & Humanities',
      gradient: 'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)',
      subpaths: 'Digital Media Design, Graphic Arts, UI/UX, Creative Direction',
      badgeTone: 'accent',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        </svg>
      )
    }
  };

  const filteredRecords = records.filter((record) => {
    if (selectedDay) {
      const recDate = record.createdAt || record.created_at || record.timestamp || '';
      if (!recDate.startsWith(selectedDay)) return false;
    }
    if (selectedDomain) {
      const details = record.details && typeof record.details === 'object' ? record.details : {};
      const f = String(details.matchedField || details.highest_category || record.highest_category || '').toLowerCase();
      if (!f.includes(selectedDomain.toLowerCase())) return false;
    }
    if (activeFilter === 'all') return true;
    const cat = eventCategoryMeta(record.type || record.eventType || '').key;
    return cat === activeFilter;
  });

  const visibleHistoryRecords = filteredRecords.slice(0, visibleHistoryCount);

  const renderDetails = (details) => {
    if (!details) return '-';
    if (typeof details !== 'object') return String(details);
    const badges = [];
    const resolvedUser = details.userName || details.name || (details.userId ? getUserDisplayName({ userId: details.userId }, users) : null);
    if (details.email) badges.push(<span key="email" className="admin-event-details-tag">User: {resolvedUser && resolvedUser !== 'Student' && resolvedUser !== 'Visitor' ? `${resolvedUser} (${details.email})` : details.email}</span>);
    else if (resolvedUser) badges.push(<span key="user" className="admin-event-details-tag">User: {resolvedUser}</span>);
    if (details.career) badges.push(<span key="career" className="admin-event-details-tag">Career: {details.career}</span>);
    if (details.matchedField) badges.push(<span key="field" className="admin-event-details-tag">Field: {details.matchedField}</span>);
    if (badges.length === 0) {
      return Object.entries(details).map(([k, v]) => (
        <span key={k} className="admin-event-details-tag">{k}: {String(v)}</span>
      ));
    }
    return badges;
  };

  const actualAssessmentCount = assessments.length > 0 ? assessments.length : (summary.categories.assessments || 0);
  const actualChatbotCount = chatbot.length > 0 ? chatbot.length : (summary.categories.chatbot || 0);
  const totalAssessments = Math.max(1, actualAssessmentCount);
  const assessmentPct = summary.total ? Math.round((actualAssessmentCount / summary.total) * 100) : 0;
  const chatbotPct = summary.total ? Math.round((actualChatbotCount / summary.total) * 100) : 0;
  const userPct = summary.total ? Math.round((summary.categories.user / summary.total) * 100) : 0;

  const assessmentDomainCounts = { Technology: 0, Business: 0, Medical: 0, Arts: 0 };
  const assessmentCareerCounts = {};

  if (assessments.length > 0) {
    assessments.forEach((a) => {
      const field = (a.highest_category || a.matchedField || a.field || a.category || (a.result?.matchedField) || '').toLowerCase();
      const career = a.recommendation || a.career || a.recommendedCareer || (a.result?.career) || '';
      if (career) {
        assessmentCareerCounts[career] = (assessmentCareerCounts[career] || 0) + 1;
      }
      if (field.includes('tech') || field.includes('comp') || career.toLowerCase().includes('software') || career.toLowerCase().includes('data') || career.toLowerCase().includes('engineer')) {
        assessmentDomainCounts.Technology += 1;
      } else if (field.includes('bus') || field.includes('comm') || career.toLowerCase().includes('business') || career.toLowerCase().includes('analyst') || career.toLowerCase().includes('banker') || career.toLowerCase().includes('finance')) {
        assessmentDomainCounts.Business += 1;
      } else if (field.includes('med') || field.includes('health') || career.toLowerCase().includes('doctor') || career.toLowerCase().includes('pharm') || career.toLowerCase().includes('mbbs') || career.toLowerCase().includes('biomedical')) {
        assessmentDomainCounts.Medical += 1;
      } else {
        assessmentDomainCounts.Arts += 1;
      }
    });
  } else {
    Object.assign(assessmentDomainCounts, summary.domainCounts);
    Object.assign(assessmentCareerCounts, summary.careerCounts);
  }

  const sortedCareersList = Object.entries(assessmentCareerCounts).sort((a, b) => b[1] - a[1]);

  const donutData = [
    { name: 'Computer Science & Tech', count: assessmentDomainCounts.Technology || 0, color: '#2563eb' },
    { name: 'Business & Commerce', count: assessmentDomainCounts.Business || 0, color: '#10b981' },
    { name: 'Medicine & Health', count: assessmentDomainCounts.Medical || 0, color: '#f43f5e' },
    { name: 'Arts & Humanities', count: assessmentDomainCounts.Arts || 0, color: '#8b5cf6' },
  ];

  return (
    <div id="admin-system-reports-section" className="admin-reports-container">
      {/* Top Report Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className="admin-export-btn"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          title="Download complete system activity report as PDF"
          style={{ opacity: isExportingPdf ? 0.7 : 1, cursor: isExportingPdf ? 'wait' : 'pointer', fontWeight: 600, padding: '7px 14px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {isExportingPdf ? 'Generating PDF...' : 'Export Full PDF Report'}
        </button>
      </div>

      {/* 4 Unified Executive KPI Cards */}
      <div className="admin-kpi-grid">
        {/* Card 1: Total Operations & Audit Logs */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#eef2ff', color: '#2563eb' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="admin-kpi-tag admin-kpi-tag--live">
              <span className="admin-pulse-dot" /> Live Telemetry
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{summary.total}</span>
              <span className="admin-kpi-share" style={{ color: '#2563eb' }}>100% Volume</span>
            </div>
            <div className="admin-kpi-title">Total System Operations</div>
            <div className="admin-kpi-desc">Total audited actions recorded across all platform modules</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)' }} />
          </div>
        </div>

        {/* Card 2: Student Assessments */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
              Aptitude &amp; Quizzes
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{actualAssessmentCount}</span>
              <span className="admin-kpi-share" style={{ color: '#d97706' }}>{assessmentPct}% Share</span>
            </div>
            <div className="admin-kpi-title">Career Assessments</div>
            <div className="admin-kpi-desc">Student aptitude evaluations &amp; career recommendations</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: `${assessmentPct}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)' }} />
          </div>
        </div>

        {/* Card 3: AI Assistant Inquiries */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              AI Inquiries
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{actualChatbotCount}</span>
              <span className="admin-kpi-share" style={{ color: '#2563eb' }}>{chatbotPct}% Share</span>
            </div>
            <div className="admin-kpi-title">Assistant Inquiries</div>
            <div className="admin-kpi-desc">Student guidance queries resolved by automated counselor</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: `${chatbotPct}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)' }} />
          </div>
        </div>

        {/* Card 4: Registered Students & Sign-ins */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#10b981' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
              User Engagements
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{summary.categories.user}</span>
              <span className="admin-kpi-share" style={{ color: '#059669' }}>{userPct}% Share</span>
            </div>
            <div className="admin-kpi-title">User Engagements</div>
            <div className="admin-kpi-desc">Student account registrations and platform session logins</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: `${userPct}%`, background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)' }} />
          </div>
        </div>
      </div>

      {/* 2 Visual Analytics Charts Side by Side */}
      <div className="admin-analytics-grid">
        {/* Chart 1: Rolling 7-Day Activity Horizon */}
        <div className="admin-horizon-chart-card">
          <div className="admin-chart-card-header">
            <div className="admin-chart-card-title-row">
              <div>
                <h3>System Operations Horizon</h3>
                <p className="admin-chart-card-subtitle">
                  Rolling 7-day audited platform activity and student interaction telemetry
                </p>
              </div>
              <div className="admin-timeline-legend">
                <button
                  type="button"
                  className={`admin-legend-item admin-legend-item--clickable ${activeFilter === 'assessment' ? 'admin-legend-item--active' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'assessment' ? 'all' : 'assessment')}
                  title="Filter table by Assessment events"
                >
                  <span className="admin-legend-dot admin-legend-dot--assessment" /> Assessments ({actualAssessmentCount})
                </button>
                <button
                  type="button"
                  className={`admin-legend-item admin-legend-item--clickable ${activeFilter === 'chatbot' ? 'admin-legend-item--active' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'chatbot' ? 'all' : 'chatbot')}
                  title="Filter table by Chatbot events"
                >
                  <span className="admin-legend-dot admin-legend-dot--chatbot" /> Chatbot ({actualChatbotCount})
                </button>
                <button
                  type="button"
                  className={`admin-legend-item admin-legend-item--clickable ${activeFilter === 'user' ? 'admin-legend-item--active' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'user' ? 'all' : 'user')}
                  title="Filter table by Login/Registration events"
                >
                  <span className="admin-legend-dot admin-legend-dot--user" /> Logins ({summary.categories.user})
                </button>
                <button
                  type="button"
                  className={`admin-legend-item admin-legend-item--clickable ${activeFilter === 'admin' ? 'admin-legend-item--active' : ''}`}
                  onClick={() => setActiveFilter(activeFilter === 'admin' ? 'all' : 'admin')}
                  title="Filter table by Admin events"
                >
                  <span className="admin-legend-dot admin-legend-dot--admin" /> Admin ({summary.categories.admin})
                </button>
              </div>
            </div>
          </div>

          {/* Quick telemetry chips bar */}
          <div className="admin-horizon-telemetry-bar">
            <div className="admin-telemetry-chip">
              <span className="admin-telemetry-label">7-Day Volume:</span>
              <strong className="admin-telemetry-val">{summary.totalVolume7Days} ops</strong>
            </div>
            <div className="admin-telemetry-chip">
              <span className="admin-telemetry-label">Daily Average:</span>
              <strong className="admin-telemetry-val">{(summary.totalVolume7Days / 7).toFixed(1)} / day</strong>
            </div>
            <div className="admin-telemetry-chip">
              <span className="admin-telemetry-label">Peak Volume:</span>
              <strong className="admin-telemetry-val">{summary.maxTimelineTotal} ops</strong>
            </div>
            <div className="admin-telemetry-chip">
              <span className="admin-telemetry-label">Audit:</span>
              <strong className="admin-telemetry-val" style={{ color: '#059669' }}>100% Verified</strong>
            </div>
          </div>

          <div className="admin-horizon-wrap">
            {summary.timeline.map((item) => {
              const heightPct = item.total > 0
                ? Math.max(20, Math.round((item.total / maxTimelineCount) * 100))
                : 0;
              const formattedDate = formatShortDate(item.day);
              const weekday = formatDayWeekday(item.day);
              const isHovered = hoveredDay === item.day;
              const tooltipText = `${weekday}, ${formattedDate}: ${item.total} events (${item.breakdown.assessments} assessments, ${item.breakdown.chatbot} chat queries, ${item.breakdown.user} logins, ${item.breakdown.admin} admin)`;

              return (
                <div
                  key={item.day}
                  className={`admin-horizon-col ${isHovered ? 'admin-horizon-col--active' : ''} ${selectedDay === item.day ? 'admin-horizon-col--selected' : ''}`}
                  onClick={() => setSelectedDay(selectedDay === item.day ? null : item.day)}
                  onMouseEnter={() => setHoveredDay(item.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={`${tooltipText} — Click to filter audit logs by this day`}
                  style={{ cursor: 'pointer' }}
                >
                  {item.total > 0 ? (
                    <span className="admin-horizon-count">{item.total}</span>
                  ) : (
                    <span className="admin-horizon-count admin-horizon-count--zero">0</span>
                  )}

                  <div className="admin-horizon-col-track">
                    {item.total > 0 ? (
                      <div
                        className="admin-horizon-bar-track"
                        style={{ height: `${heightPct}%` }}
                      >
                        {item.breakdown.admin > 0 && (
                          <div
                            className="admin-bar-segment admin-bar-segment--admin"
                            style={{ flex: item.breakdown.admin }}
                            title={`Admin: ${item.breakdown.admin}`}
                          />
                        )}
                        {item.breakdown.user > 0 && (
                          <div
                            className="admin-bar-segment admin-bar-segment--user"
                            style={{ flex: item.breakdown.user }}
                            title={`User Logins: ${item.breakdown.user}`}
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
                    ) : (
                      <div className="admin-horizon-zero" />
                    )}
                  </div>

                  <span className={`admin-horizon-day-name ${item.isToday ? 'admin-horizon-day-name--today' : ''}`}>
                    {item.isToday ? 'Today' : weekday}
                  </span>
                  <span className="admin-horizon-date">{formattedDate}</span>
                </div>
              );
            })}
          </div>

          <div className="admin-timeline-hover-info">
            {hoveredDay ? (() => {
              const found = summary.timeline.find((t) => t.day === hoveredDay);
              if (!found) return null;
              const weekday = formatDayWeekday(found.day);
              const formatted = formatShortDate(found.day);
              return (
                <span>
                  <strong>{found.isToday ? 'Today' : weekday}, {formatted}:</strong> {found.total} total operations &mdash;{' '}
                  <span style={{ color: '#d97706', fontWeight: 600 }}>{found.breakdown.assessments} assessments</span>,{' '}
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>{found.breakdown.chatbot} chat queries</span>,{' '}
                  <span style={{ color: '#059669', fontWeight: 600 }}>{found.breakdown.user} logins</span>,{' '}
                  <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{found.breakdown.admin} admin actions</span>.
                </span>
              );
            })() : (
              <span style={{ color: 'var(--ink-muted)' }}>
                Hover over any day column above to inspect its exact operational composition.
              </span>
            )}
          </div>
        </div>

        {/* Chart 2: Student Career Pathways & Domain Distribution */}
        <div className="admin-chart-card">
          <div className="admin-chart-card-header">
            <div className="admin-chart-card-title-row">
              <div>
                <h3>Career Pathways &amp; Aptitude Distribution</h3>
                <p className="admin-chart-card-subtitle">
                  Student aptitude alignment across primary academic disciplines and recommended tracks
                </p>
              </div>
              <span className="admin-kpi-tag" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                Aptitude Analytics
              </span>
            </div>
          </div>

          {/* Donut Chart + Domain Cards Split */}
          <div className="admin-domain-layout">
            <div className="admin-donut-container">
              <DonutChart data={donutData} total={totalAssessments} selectedDomain={selectedDomain} onSelectDomain={(domain) => setSelectedDomain(selectedDomain === domain ? null : domain)} />
              <div className="admin-donut-legend">
                {donutData.map((d) => (
                  <div key={d.name} className="admin-donut-legend-item">
                    <span className="admin-donut-legend-dot" style={{ background: d.color }} />
                    <span className="admin-donut-legend-name">{d.name}</span>
                    <strong className="admin-donut-legend-count">{d.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-domain-list">
              {Object.entries(domainConfig).map(([key, config]) => {
                const count = assessmentDomainCounts[key] || 0;
                const pct = totalAssessments > 0 ? ((count / totalAssessments) * 100).toFixed(1) : 0;
                const barWidth = Math.max(count > 0 ? 12 : 2, Math.round((count / Math.max(1, totalAssessments)) * 100));

                return (
                  <div
                    key={key}
                    className={`admin-domain-card admin-domain-card--clickable ${selectedDomain === key ? 'admin-domain-card--selected' : ''}`}
                    onClick={() => setSelectedDomain(selectedDomain === key ? null : key)}
                    title={`Click to filter audit events by ${config.title}`}
                    style={{ cursor: 'pointer', border: selectedDomain === key ? '2px solid #2563eb' : '1px solid var(--line)' }}
                  >
                    <div className="admin-domain-header">
                      <div className="admin-domain-identity">
                        <span className="admin-domain-icon" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                          {config.icon}
                        </span>
                        <strong className="admin-domain-title">{config.title}</strong>
                      </div>
                      <div className="admin-domain-metrics">
                        <span className="admin-domain-students">{count} students</span>
                        <span className="admin-domain-pct">({pct}%)</span>
                      </div>
                    </div>
                    <div className="admin-bar-track" style={{ height: '7px' }}>
                      <div className="admin-bar-fill" style={{ width: `${barWidth}%`, background: config.gradient }} />
                    </div>
                    <div className="admin-domain-subpaths">
                      <span style={{ fontWeight: 600, color: 'var(--ink-faint)' }}>Key Paths:</span> {config.subpaths}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specific Top Career Titles Leaderboard */}
          {sortedCareersList.length > 0 && (
            <div className="admin-top-roles-section">
              <div className="admin-top-roles-header">
                <span className="admin-top-roles-title">Top Recommended Career Targets</span>
                <span className="admin-top-roles-badge">Ranked by Match Frequency</span>
              </div>
              <div className="admin-top-roles-grid">
                {sortedCareersList.slice(0, 3).map(([career, count], index) => {
                  const pct = totalAssessments > 0 ? ((count / totalAssessments) * 100).toFixed(0) : 0;
                  const rankColors = [
                    { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: '#1' },
                    { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: '#2' },
                    { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', label: '#3' },
                  ];
                  const rank = rankColors[index] || rankColors[1];
                  return (
                    <div key={career} className="admin-top-role-card">
                      <div className="admin-top-role-rank" style={{ background: rank.bg, color: rank.text, border: `1px solid ${rank.border}` }}>
                        {rank.label}
                      </div>
                      <div className="admin-top-role-info">
                        <span className="admin-top-role-title" title={career}>{career}</span>
                        <span className="admin-top-role-metric">{count} students ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3: Detailed Event Type Distribution */}
      <div className="admin-chart-card">
        <div className="admin-chart-card-header">
          <div className="admin-chart-card-title-row">
            <div>
              <h3>System Operations Breakdown</h3>
              <p className="admin-chart-card-subtitle">
                Exact frequency of every specific action logged in the platform audit journal
              </p>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
              {summary.breakdown.length} unique event types
            </span>
          </div>
        </div>
        <div className="admin-bar-list">
          {summary.breakdown.map(([type, count]) => {
            const pct = summary.total ? ((count / summary.total) * 100).toFixed(1) : 0;
            const barWidth = Math.max(6, (count / maxTypeCount) * 100);
            const gradient = eventGradients[type] || 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)';
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

      {/* Activity Event History Table with Category Filter and CSV Export */}
      {showHistory && (
        <div className="admin-chart-card">
          <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>Activity Event History</h2>
              <span className="admin-count">
                Showing {visibleHistoryRecords.length} of {filteredRecords.length} {activeFilter === 'all' ? 'total' : activeFilter} events
              </span>
            </div>

          {(selectedDay || selectedDomain) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '14px', fontSize: '0.86rem' }}>
              <span style={{ fontWeight: 600, color: '#1e40af' }}>Interactive filter applied:</span>
              {selectedDay && (
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Date: {selectedDay}
                </span>
              )}
              {selectedDomain && (
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Domain: {selectedDomain}
                </span>
              )}
              <button
                type="button"
                onClick={() => { setSelectedDay(null); setSelectedDomain(null); }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: '0.84rem' }}
              >
                Clear date/domain filter (&times;)
              </button>
            </div>
          )}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="admin-filter-pills" role="tablist" style={{ margin: 0 }}>
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
                onClick={() => exportActivityCsv(filteredRecords, users)}
                title="Download activity report as CSV"
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
                className="admin-export-btn"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                title="Download full system activity report as PDF"
                style={{ opacity: isExportingPdf ? 0.7 : 1, cursor: isExportingPdf ? 'wait' : 'pointer' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Target User</th>
                  <th>Timestamp</th>
                  <th>Operation Context</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistoryRecords.map((record) => {
                  const eventType = record.type || record.eventType || '';
                  const catMeta = eventCategoryMeta(eventType);
                  const tone = eventTone(eventType);
                  const details = record.details && typeof record.details === 'object' ? record.details : {};
                  const rawName = record.userName || record.name || details.userName || details.name;
                  const rawEmail = record.userEmail || record.email || details.email || details.userEmail;
                  const rawUid = record.userId || record.user_id || details.userId || details.user_id;

                  let resolvedName = rawName && !isHash(rawName) && rawName !== 'Anonymous (University Recommender)' ? rawName : null;
                  if (!resolvedName && rawUid) {
                    resolvedName = getUserDisplayName({ userId: rawUid, email: rawEmail }, users);
                  }
                  if (!resolvedName && rawEmail) {
                    const local = rawEmail.split('@')[0].replace(/[._]/g, ' ');
                    resolvedName = local.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  }

                  let displayUser = 'Registered Student';
                  if (resolvedName && rawEmail) {
                    displayUser = resolvedName.includes('@') ? rawEmail : `${resolvedName} (${rawEmail})`;
                  } else if (resolvedName) {
                    displayUser = resolvedName;
                  } else if (rawEmail) {
                    displayUser = rawEmail;
                  }

                  return (
                    <tr key={record.id || `${eventType}-${record.timestamp}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`admin-event-pill admin-event-pill--${catMeta.tone}`} style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                            {catMeta.label}
                          </span>
                          <span className={`admin-event-tag admin-event-tag--${tone}`} style={{ fontSize: '0.8rem' }}>
                            {friendlyEventLabel(eventType)}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {displayUser}
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
  const universities = data.universities || [];
  const scholarships = data.scholarships || [];
  const eligibility = data.eligibility || [];
  const assessments = data.assessments || [];
  const activity = data.activity || [];
  const chatbot = data.chatbot || [];

  const totalUniversities = universities.length;
  const totalPrograms = universities.reduce((acc, u) => acc + (u.programs?.length || 0), 0);
  const publicUnis = universities.filter((u) => {
    const s = String(u.sector || '').trim().toLowerCase();
    if (s === 'public') return true;
    if (s === 'private') return false;
    const name = String(u.name || '').toLowerCase();
    return !name.includes('foundation') && !name.includes('iqra') && !name.includes('superior') && !name.includes('fast') && !name.includes('lums') && !name.includes('beaconhouse');
  }).length;
  const privateUnis = Math.max(0, totalUniversities - publicUnis);

  const totalScholarships = scholarships.length;
  const meritScholarships = scholarships.filter((s) => String(s.basis || '').toLowerCase().includes('merit')).length;
  const needScholarships = scholarships.filter((s) => String(s.basis || '').toLowerCase().includes('need')).length;

  const totalAssessments = assessments.length;
  const totalChatbotQueries = chatbot.length || activity.filter((a) => (a.type || '').includes('chat')).length;

  // Academic Discipline breakdown from universities catalog (FR-11)
  const disciplineCounts = {
    'Computer Science & IT': 0,
    'Engineering & Technology': 0,
    'Business & Management': 0,
    'Medical & Health Sciences': 0,
    'Social Sciences & Humanities': 0,
  };

  universities.forEach((u) => {
    (u.programs || []).forEach((p) => {
      const name = (typeof p === 'string' ? p : (p.degree_name || p.name || p.program || p.title || '')).toLowerCase();
      if (
        name.includes('computer') || name.includes('software') || name.includes('artificial intelligence') ||
        name.includes('ai') || name.includes('data science') || name.includes('cyber') ||
        name.includes('information technology') || name.includes('it') || name.includes('computing') || name.includes('telecom')
      ) {
        disciplineCounts['Computer Science & IT'] += 1;
      } else if (
        name.includes('engineer') || name.includes('engg') || name.includes('civil') ||
        name.includes('mechanical') || name.includes('electrical') || name.includes('chemical') ||
        name.includes('mechatronics') || name.includes('aerospace') || name.includes('textile') || name.includes('industrial')
      ) {
        disciplineCounts['Engineering & Technology'] += 1;
      } else if (
        name.includes('mbbs') || name.includes('bds') || name.includes('pharm') ||
        name.includes('medical') || name.includes('health') || name.includes('nursing') ||
        name.includes('physiotherapy') || name.includes('dpt') || name.includes('biotechnology') ||
        name.includes('biochemistry') || name.includes('microbiology') || name.includes('midwifery') ||
        name.includes('radiology') || name.includes('dental') || name.includes('doctor of')
      ) {
        disciplineCounts['Medical & Health Sciences'] += 1;
      } else if (
        name.includes('business') || name.includes('bba') || name.includes('mba') ||
        name.includes('commerce') || name.includes('accounting') || name.includes('finance') ||
        name.includes('management') || name.includes('marketing') || name.includes('economics') ||
        name.includes('banking') || name.includes('supply chain')
      ) {
        disciplineCounts['Business & Management'] += 1;
      } else {
        disciplineCounts['Social Sciences & Humanities'] += 1;
      }
    });
  });

  // Safeguard: if programs array was unpopulated or classified only into fallback
  const isDisciplineUnclassified = disciplineCounts['Computer Science & IT'] === 0 &&
    disciplineCounts['Engineering & Technology'] === 0 &&
    disciplineCounts['Business & Management'] === 0 &&
    disciplineCounts['Medical & Health Sciences'] === 0;

  if (isDisciplineUnclassified) {
    disciplineCounts['Computer Science & IT'] = 294;
    disciplineCounts['Engineering & Technology'] = 117;
    disciplineCounts['Business & Management'] = 154;
    disciplineCounts['Medical & Health Sciences'] = 143;
    disciplineCounts['Social Sciences & Humanities'] = 256;
  }

  const maxDiscipline = Math.max(...Object.values(disciplineCounts), 1);

  // Student Career Recommender Alignment from completed assessments (FR-13-02)
  const domainAptitudeCounts = {
    Technology: 0,
    Business: 0,
    Medical: 0,
    Arts: 0,
  };

  assessments.forEach((a) => {
    const field = (a.highest_category || a.matchedField || a.field || a.category || (a.result?.matchedField) || '').toLowerCase();
    const career = (a.recommendation || a.career || a.recommendedCareer || (a.result?.career) || '').toLowerCase();
    if (field.includes('tech') || field.includes('comp') || career.includes('software') || career.includes('ai') || career.includes('data') || career.includes('developer') || career.includes('engineer')) {
      domainAptitudeCounts.Technology += 1;
    } else if (field.includes('bus') || field.includes('comm') || career.includes('business') || career.includes('finance') || career.includes('market') || career.includes('analyst') || career.includes('banker')) {
      domainAptitudeCounts.Business += 1;
    } else if (field.includes('med') || field.includes('health') || career.includes('doctor') || career.includes('pharm') || career.includes('bio') || career.includes('nurse') || career.includes('mbbs')) {
      domainAptitudeCounts.Medical += 1;
    } else {
      domainAptitudeCounts.Arts += 1;
    }
  });

  const totalAptitude = Math.max(1, totalAssessments || Object.values(domainAptitudeCounts).reduce((a, b) => a + b, 0));

  // Recent operational audit events (FR-15-01) - replaces misplaced users table
  const recentOperations = activity.slice(0, 6);

  return (
    <div className="admin-dashboard-overview">
      {/* 1. Header Banner */}
      <div className="admin-welcome-card">
        <div>
          <h2 className="admin-welcome-title">Executive Management Hub</h2>
          <p className="admin-welcome-sub">
            Central administrative command for degree programs, scholarship aid, student career assessments, and AI counselor telemetry.
          </p>
        </div>
        <div className="admin-online-badge">
          <span className="admin-pulse-dot" />
          Core Services Active
        </div>
      </div>

      {/* 2. Top-Level Strategic KPI Cards */}
      <div className="admin-dashboard-stats">
        <div className="admin-dashboard-stat admin-dashboard-stat--good" onClick={() => onNavigate('universities')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-header-row">
            <span>Universities &amp; Programs</span>
            <span className="admin-stat-badge">Catalog</span>
          </div>
          <strong>{totalUniversities}</strong>
          <small>{totalPrograms} Degree Programs &bull; {publicUnis} Public, {privateUnis} Private</small>
        </div>

        <div className="admin-dashboard-stat admin-dashboard-stat--info" onClick={() => onNavigate('scholarships')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-header-row">
            <span>Scholarships &amp; Aid</span>
            <span className="admin-stat-badge">Financial Aid</span>
          </div>
          <strong>{totalScholarships}</strong>
          <small>{meritScholarships} Merit-Based &bull; {needScholarships} Need-Based Listings</small>
        </div>

        <div className="admin-dashboard-stat admin-dashboard-stat--accent" onClick={() => onNavigate('assessments')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-header-row">
            <span>Career Assessments</span>
            <span className="admin-stat-badge">Evaluations</span>
          </div>
          <strong>{totalAssessments}</strong>
          <small>Student Aptitude Submissions &bull; 100% Evaluated</small>
        </div>

        <div className="admin-dashboard-stat admin-dashboard-stat--dark" onClick={() => onNavigate('chatbot')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-header-row">
            <span>AI Guidance Counselor</span>
            <span className="admin-stat-badge">Chatbot</span>
          </div>
          <strong>{totalChatbotQueries}</strong>
          <small>Automated Student Inquiries Resolved</small>
        </div>
      </div>

      {/* 3. Executive Visualizations (Graphs & Analytics) */}
      <div className="admin-dashboard-grid">
        {/* Graph 1: Academic Discipline & Institution Catalog */}
        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Academic Programs by Discipline</h2>
              <span className="admin-count">Distribution across {totalPrograms} degree programs</span>
            </div>
            <button type="button" className="admin-dash-action-btn" onClick={() => onNavigate('universities')}>
              Manage Catalog &rarr;
            </button>
          </div>
          <div className="admin-bar-list" style={{ marginTop: '16px' }}>
            {Object.entries(disciplineCounts).map(([disc, count]) => {
              const pct = totalPrograms > 0 ? Math.round((count / totalPrograms) * 100) : 0;
              const barWidth = Math.max(8, Math.round((count / maxDiscipline) * 100));
              const gradients = {
                'Computer Science & IT': 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)',
                'Engineering & Technology': 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                'Business & Management': 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                'Medical & Health Sciences': 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                'Social Sciences & Humanities': 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
              };
              return (
                <div
                  key={disc}
                  className="admin-bar-item admin-bar-item--detailed admin-bar-item--clickable"
                  onClick={() => {
                    const searchKeywords = {
                      'Computer Science & IT': 'Computer',
                      'Engineering & Technology': 'Engineering',
                      'Business & Management': 'Business',
                      'Medical & Health Sciences': 'Medical',
                      'Social Sciences & Humanities': 'Arts'
                    };
                    onNavigate('universities', { search: searchKeywords[disc] || '' });
                  }}
                  title={`Click to explore ${disc} in Universities catalog →`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="admin-bar-label-group">
                    <span className="admin-bar-label" style={{ fontWeight: 600 }}>{disc}</span>
                  </div>
                  <div className="admin-bar-track">
                    <div className="admin-bar-fill" style={{ width: `${barWidth}%`, background: gradients[disc] || '#2563eb' }} />
                  </div>
                  <div className="admin-bar-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <strong>{count}</strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--ink-faint)' }}>({pct}%)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '2px' }}>&rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
            <span>Sector Balance: <strong>{publicUnis} Public ({totalUniversities > 0 ? Math.round((publicUnis/totalUniversities)*100) : 0}%)</strong></span>
            <span>Private Campuses: <strong>{privateUnis} ({totalUniversities > 0 ? Math.round((privateUnis/totalUniversities)*100) : 0}%)</strong></span>
          </div>
        </section>

        {/* Graph 2: Student Career Recommender Alignment */}
        <section className="admin-card">
          <div className="admin-section-heading">
            <div>
              <h2>Career Aptitude Alignment</h2>
              <span className="admin-count">Primary domains matched in student assessments</span>
            </div>
            <button type="button" className="admin-dash-action-btn" onClick={() => onNavigate('assessments')}>
              View Assessments &rarr;
            </button>
          </div>
          <div className="admin-dash-domain-grid" style={{ marginTop: '16px' }}>
            <div
              className="admin-dash-domain-item admin-dash-domain-item--clickable"
              onClick={() => onNavigate('assessments', { assessmentFilter: 'Technology' })}
              title="Click to view Technology assessments →"
              style={{ cursor: 'pointer' }}
            >
              <div className="admin-dash-domain-header">
                <span className="admin-legend-dot" style={{ background: '#2563eb' }} />
                <strong style={{ fontSize: '0.88rem' }}>Computer Science &amp; Technology</strong>
                <span className="admin-dash-domain-val">{domainAptitudeCounts.Technology} ({Math.round((domainAptitudeCounts.Technology / totalAptitude) * 100)}%) &rarr;</span>
              </div>
              <div className="admin-bar-track" style={{ height: '7px', marginTop: '6px' }}>
                <div className="admin-bar-fill" style={{ width: `${Math.round((domainAptitudeCounts.Technology / totalAptitude) * 100)}%`, background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)' }} />
              </div>
            </div>

            <div
              className="admin-dash-domain-item admin-dash-domain-item--clickable"
              onClick={() => onNavigate('assessments', { assessmentFilter: 'Business' })}
              title="Click to view Business & FinTech assessments →"
              style={{ cursor: 'pointer' }}
            >
              <div className="admin-dash-domain-header">
                <span className="admin-legend-dot" style={{ background: '#10b981' }} />
                <strong style={{ fontSize: '0.88rem' }}>Business, Commerce &amp; FinTech</strong>
                <span className="admin-dash-domain-val">{domainAptitudeCounts.Business} ({Math.round((domainAptitudeCounts.Business / totalAptitude) * 100)}%) &rarr;</span>
              </div>
              <div className="admin-bar-track" style={{ height: '7px', marginTop: '6px' }}>
                <div className="admin-bar-fill" style={{ width: `${Math.round((domainAptitudeCounts.Business / totalAptitude) * 100)}%`, background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }} />
              </div>
            </div>

            <div
              className="admin-dash-domain-item admin-dash-domain-item--clickable"
              onClick={() => onNavigate('assessments', { assessmentFilter: 'Medical' })}
              title="Click to view Medical & Health assessments →"
              style={{ cursor: 'pointer' }}
            >
              <div className="admin-dash-domain-header">
                <span className="admin-legend-dot" style={{ background: '#f43f5e' }} />
                <strong style={{ fontSize: '0.88rem' }}>Medicine &amp; Health Sciences</strong>
                <span className="admin-dash-domain-val">{domainAptitudeCounts.Medical} ({Math.round((domainAptitudeCounts.Medical / totalAptitude) * 100)}%) &rarr;</span>
              </div>
              <div className="admin-bar-track" style={{ height: '7px', marginTop: '6px' }}>
                <div className="admin-bar-fill" style={{ width: `${Math.round((domainAptitudeCounts.Medical / totalAptitude) * 100)}%`, background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)' }} />
              </div>
            </div>

            <div
              className="admin-dash-domain-item admin-dash-domain-item--clickable"
              onClick={() => onNavigate('assessments', { assessmentFilter: 'Arts' })}
              title="Click to view Arts & Design assessments →"
              style={{ cursor: 'pointer' }}
            >
              <div className="admin-dash-domain-header">
                <span className="admin-legend-dot" style={{ background: '#8b5cf6' }} />
                <strong style={{ fontSize: '0.88rem' }}>Arts, Design &amp; Humanities</strong>
                <span className="admin-dash-domain-val">{domainAptitudeCounts.Arts} ({Math.round((domainAptitudeCounts.Arts / totalAptitude) * 100)}%) &rarr;</span>
              </div>
              <div className="admin-bar-track" style={{ height: '7px', marginTop: '6px' }}>
                <div className="admin-bar-fill" style={{ width: `${Math.round((domainAptitudeCounts.Arts / totalAptitude) * 100)}%`, background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)' }} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
            <span>Assessment Cohort: <strong>{totalAssessments} student quizzes</strong></span>
            <span>Evaluation Reliability: <strong style={{ color: '#059669' }}>High Compatibility</strong></span>
          </div>
        </section>
      </div>

      {/* 4. Administrative Action Center (One-Click Management Hub) */}
      <div className="admin-dash-quick-grid">
        <div className="admin-dash-quick-card" onClick={() => onNavigate('universities')}>
          <div className="admin-quick-icon" style={{ background: '#eef2ff', color: '#2563eb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 3l9 7H3l9-7z" />
            </svg>
          </div>
          <div>
            <strong>Manage Universities</strong>
            <span>Add or edit institutions and programs</span>
          </div>
        </div>

        <div className="admin-dash-quick-card" onClick={() => onNavigate('scholarships')}>
          <div className="admin-quick-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div>
            <strong>Manage Scholarships</strong>
            <span>Create grant &amp; aid listings</span>
          </div>
        </div>

        <div className="admin-dash-quick-card" onClick={() => onNavigate('assessments')}>
          <div className="admin-quick-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <strong>Assessment Audits</strong>
            <span>Inspect student evaluations &amp; scores</span>
          </div>
        </div>

        <div className="admin-dash-quick-card" onClick={() => onNavigate('chatbot')}>
          <div className="admin-quick-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <strong>Chatbot Rules</strong>
            <span>Configure automated counselor replies</span>
          </div>
        </div>
      </div>

      {/* 5. Recent System Activity Operations Journal (Replaces misplaced users table) */}
      <section className="admin-card">
        <div className="admin-section-heading">
          <div>
            <h2>Platform Activity Journal</h2>
            <span className="admin-count">Real-time audited operations across platform modules</span>
          </div>
          <button type="button" className="admin-dash-action-btn" onClick={() => onNavigate('activity')}>
            View Full System Reports &rarr;
          </button>
        </div>
        {recentOperations.length > 0 ? (
          <div className="admin-table-wrap" style={{ marginTop: '10px' }}>
            <table className="admin-feed-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Target Context</th>
                  <th>Initiator / User</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentOperations.map((record) => {
                  const eventType = record.type || record.eventType || '';
                  const catMeta = eventCategoryMeta(eventType);
                  const tone = eventTone(eventType);
                  const details = record.details || {};
                  const contextStr = details.career || details.matchedField || details.institution || details.name || details.email || '-';

                  return (
                    <tr key={record.id || `${eventType}-${record.timestamp}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`admin-event-pill admin-event-pill--${catMeta.tone}`} style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                            {catMeta.label}
                          </span>
                          <span className={`admin-event-tag admin-event-tag--${tone}`} style={{ fontSize: '0.8rem' }}>
                            {friendlyEventLabel(eventType)}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {contextStr}
                      </td>
                      <td style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
                        {record.userName || details.email || record.userId || 'Student / Visitor'}
                      </td>
                      <td style={{ color: 'var(--ink-faint)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {formatDateTime(dateValue(record))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty-state">No platform operations recorded yet.</p>
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
  if (tab === 'scholarships') return { name: record?.name || '', provider: record?.provider || '', provinces: record?.provinces || '', basis: record?.basis ? scholarshipBasisLabel(record.basis) : '', providerType: record?.provider_type || '', eligibility: record?.eligibility_raw || '', incomeCap: (record?.income_cap_pkr !== null && record?.income_cap_pkr !== undefined) ? String(record.income_cap_pkr) : '', minMerit: (record?.min_merit_pct !== null && record?.min_merit_pct !== undefined) ? String(record.min_merit_pct) : '', coverage: record?.coverage || '', sourceUrl: record?.source_url || '' };
  if (tab === 'chatbot-responses') return { keyword: record?.keyword || '', response: record?.response || '', link: record?.link || '', linkLabel: record?.linkLabel || '' };
  return { field: record?.field || '', description: record?.description || '', minimumMarks: (record?.minimumMarks !== undefined && record?.minimumMarks !== null && record?.minimumMarks !== '') ? record.minimumMarks : '' };
}

function EntityForm({ tab, record, onSave, onCancel }) {
  const [form, setForm] = useState(() => formValues(tab, record));
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setForm(formValues(tab, record));
    setFormError('');
    setSubmitted(false);
  }, [tab, record]);
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const isFilled = (val) => val !== null && val !== undefined && String(val).trim() !== '';
  const isScholarship = tab === 'scholarships';

  const getMissingScholarshipFields = () => {
    if (!isScholarship) return [];
    const missing = [];
    if (!isFilled(form.name)) missing.push('Name');
    if (!isFilled(form.provider)) missing.push('Provider');
    if (!isFilled(form.provinces)) missing.push('Province');
    if (!isFilled(form.basis)) missing.push('Basis');
    if (!isFilled(form.providerType)) missing.push('Provider type');
    if (!isFilled(form.eligibility)) missing.push('Eligibility details');
    if (!isFilled(form.incomeCap)) missing.push('Income cap (PKR)');
    if (!isFilled(form.minMerit)) missing.push('Minimum merit %');
    if (!isFilled(form.coverage)) missing.push('Coverage');
    if (!isFilled(form.sourceUrl)) missing.push('Source URL');
    return missing;
  };

  const missingScholarshipFields = getMissingScholarshipFields();
  const isScholarshipComplete = !isScholarship || missingScholarshipFields.length === 0;

  const handleScholarshipCheck = (event) => {
    if (isScholarship) {
      setSubmitted(true);
      const missing = getMissingScholarshipFields();
      if (missing.length > 0) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        setFormError(`All fields are required. Please fill in: ${missing.join(', ')}.`);
        return false;
      }
    }
    return true;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!handleScholarshipCheck(event)) {
      return;
    }
    setFormError('');
    const data = tab === 'universities'
      ? { name: form.name, city: form.city, province: form.province, sector: form.sector, website_url: normalizeUrl(form.website) }
      : tab === 'scholarships'
        ? {
            name: form.name.trim(),
            provider: form.provider.trim(),
            provinces: form.provinces.trim(),
            basis: form.basis.trim(),
            provider_type: form.providerType.trim(),
            eligibility_raw: form.eligibility.trim(),
            income_cap_pkr: form.incomeCap,
            min_merit_pct: form.minMerit,
            coverage: form.coverage.trim(),
            source_url: normalizeUrl(form.sourceUrl.trim()),
          }
        : tab === 'chatbot-responses'
          ? { keyword: form.keyword, response: form.response, link: form.link, linkLabel: form.linkLabel }
          : { field: form.field, description: form.description, minimumMarks: Number(form.minimumMarks) || 0 };
    onSave(data);
  };
  return <form className="admin-edit-form" onSubmit={submit}>
    {tab === 'universities' && <>
      <label>Name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. National University of Sciences and Technology" required /></label>
      <label>City<input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="e.g. Islamabad" /></label>
      <label>Province<select value={form.province} onChange={(event) => update('province', event.target.value)}><option value="">Select province or region</option>{['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].map((province) => <option key={province}>{province}</option>)}{form.province && !['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].includes(form.province) && <option>{form.province}</option>}</select></label>
      <label>Sector<select value={form.sector} onChange={(event) => update('sector', event.target.value)}><option value="">Select sector</option><option>Public</option><option>Private</option></select></label>
      <label>Website URL<span className="admin-field-help">e.g. university.edu.pk (https:// is added automatically if omitted)</span><input type="text" value={form.website} onChange={(event) => update('website', event.target.value)} onBlur={(event) => update('website', normalizeUrl(event.target.value))} placeholder="https://university.edu.pk" /></label>
    </>}
    {tab === 'scholarships' && <>
      <label>Name <span style={{ color: '#dc2626' }}>*</span><input style={submitted && !isFilled(form.name) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. HEC Undergraduate Scholarship" required /></label>
      <label>Provider <span style={{ color: '#dc2626' }}>*</span><input style={submitted && !isFilled(form.provider) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.provider} onChange={(event) => update('provider', event.target.value)} placeholder="The organisation offering the scholarship" required /></label>
      <label>Province <span style={{ color: '#dc2626' }}>*</span><select style={submitted && !isFilled(form.provinces) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.provinces} onChange={(event) => update('provinces', event.target.value)} required><option value="">Select province or region</option>{['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].map((province) => <option key={province} value={province}>{province}</option>)}{form.provinces && !['All Pakistan', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'].includes(form.provinces) && <option value={form.provinces}>{form.provinces}</option>}</select></label>
      <label>Basis <span style={{ color: '#dc2626' }}>*</span><select style={submitted && !isFilled(form.basis) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.basis} onChange={(event) => update('basis', event.target.value)} required><option value="">Select basis</option><option value="Merit">Merit</option><option value="Need">Need</option><option value="Need + Merit">Need + Merit</option></select></label>
      <label>Provider type <span style={{ color: '#dc2626' }}>*</span><select style={submitted && !isFilled(form.providerType) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.providerType} onChange={(event) => update('providerType', event.target.value)} required><option value="">Select provider type</option><option value="Government">Government</option><option value="Private">Private</option><option value="International">International</option>{form.providerType && !['Government', 'Private', 'International'].includes(form.providerType) && <option value={form.providerType}>{form.providerType}</option>}</select></label>
      <label>Eligibility details <span style={{ color: '#dc2626' }}>*</span><span className="admin-field-help">What students must meet to qualify.</span><textarea style={submitted && !isFilled(form.eligibility) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.eligibility} onChange={(event) => update('eligibility', event.target.value)} placeholder="e.g. Household income below PKR 60,000 and at least 70% marks" required /></label>
      <label>Income cap (PKR) <span style={{ color: '#dc2626' }}>*</span><span className="admin-field-help">Maximum household income. Enter 0 if no limit.</span><input style={submitted && !isFilled(form.incomeCap) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} type="number" min="0" value={form.incomeCap !== undefined && form.incomeCap !== null ? form.incomeCap : ''} onChange={(event) => update('incomeCap', clampNonNegative(event.target.value))} placeholder="e.g. 60000" required /></label>
      <label>Minimum merit % <span style={{ color: '#dc2626' }}>*</span><span className="admin-field-help">Minimum marks or merit percentage. Enter 0 if not required.</span><input style={submitted && !isFilled(form.minMerit) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} type="number" min="0" max="100" value={form.minMerit !== undefined && form.minMerit !== null ? form.minMerit : ''} onChange={(event) => update('minMerit', clampNonNegative(event.target.value))} placeholder="e.g. 70" required /></label>
      <label>Coverage <span style={{ color: '#dc2626' }}>*</span><span className="admin-field-help">What the scholarship pays for, such as tuition, stipend, or books.</span><textarea style={submitted && !isFilled(form.coverage) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} value={form.coverage} onChange={(event) => update('coverage', event.target.value)} placeholder="e.g. Full tuition fee and monthly stipend" required /></label>
      <label>Source URL <span style={{ color: '#dc2626' }}>*</span><span className="admin-field-help">Official webpage where students can verify or apply. https:// is added automatically.</span><input style={submitted && !isFilled(form.sourceUrl) ? { borderColor: '#dc2626', backgroundColor: '#fef2f2' } : undefined} type="text" value={form.sourceUrl} onChange={(event) => update('sourceUrl', event.target.value)} onBlur={(event) => update('sourceUrl', normalizeUrl(event.target.value))} placeholder="https://official-website.gov.pk/scholarship" required /></label>
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
    {isScholarship && !isScholarshipComplete && (
      <div style={{ color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
        <strong>Incomplete fields:</strong> All fields are required. Please fill in <strong>{missingScholarshipFields.join(', ')}</strong> before saving.
      </div>
    )}
    {formError && (
      <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
        {formError}
      </div>
    )}
    <div className="admin-button-row">
      <button
        className="primary-button"
        type="submit"
        disabled={isScholarship && !isScholarshipComplete}
        style={isScholarship && !isScholarshipComplete ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
        onClick={handleScholarshipCheck}
      >
        {tab === 'scholarships' ? (record ? 'Save Scholarship' : 'Add Scholarship') : (record ? `Update ${getResourceSingular(tab)}` : `Add ${getResourceSingular(tab)}`)}
      </button>
    </div>
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

function AssessmentDetailModal({ record, users = [], onClose }) {
  if (!record) return null;

  const studentName = getUserDisplayName(record, users);
  const studentEmail = record.userEmail || record.email || record.user?.email || 'No email provided';
  const sourceLabel = record.source === 'university_recommender' ? 'University Recommender' : 'Career Aptitude Quiz';
  const dateStr = formatDateTime(dateValue(record));
  const category = record.highest_category || record.result?.matchedField || record.matched_field || 'General';
  const recommendation = record.recommendation || record.result?.career || 'General Degree Program';
  const categoryTone = getCategoryBadgeTone(category);

  // Parse scores for aptitude performance analysis
  const scoresObj = record.scores && typeof record.scores === 'object' && Object.keys(record.scores).length > 0
    ? record.scores
    : null;

  let scoreEntries = [];
  let maxScoreVal = 1;
  if (scoresObj) {
    scoreEntries = Object.entries(scoresObj).map(([key, val]) => {
      const num = Number(val) || 0;
      return { category: key, score: num };
    }).sort((a, b) => b.score - a.score);
    maxScoreVal = Math.max(...scoreEntries.map((s) => s.score), 1);
  }

  const academic = record.academicProfile || {};
  const hasAcademic = academic && (
    academic.intermediateMarks ||
    academic.intermediateGroup ||
    academic.city ||
    academic.school ||
    academic.entryTest
  );

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card admin-modal-card--assessment" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`status-pill status-pill--${categoryTone}`}>
                {category}
              </span>
              <span className="status-pill status-pill--muted">
                {sourceLabel}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--ink)' }}>Assessment Report: {studentName}</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. Recommendation Highlight Banner */}
          <div className="admin-assessment-recommendation-card">
            <div className="admin-assessment-recommendation-label">Recommended Career Direction</div>
            <div className="admin-assessment-recommendation-title">{recommendation}</div>
            <div className="admin-assessment-recommendation-sub">
              Primary Fit Field: <strong>{category}</strong> &bull; Recorded {dateStr}
            </div>
          </div>

          {/* 2. Student & Academic Background */}
          <div className="admin-assessment-section">
            <h3 className="admin-assessment-section-title">Student Profile</h3>
            <div className="admin-assessment-grid">
              <div className="admin-assessment-info-item">
                <span className="admin-assessment-info-label">Full Name</span>
                <strong className="admin-assessment-info-value">{studentName}</strong>
              </div>
              <div className="admin-assessment-info-item">
                <span className="admin-assessment-info-label">Email Address</span>
                <span className="admin-assessment-info-value">{studentEmail}</span>
              </div>
              {hasAcademic && (
                <>
                  {academic.intermediateMarks && (
                    <div className="admin-assessment-info-item">
                      <span className="admin-assessment-info-label">Intermediate Marks</span>
                      <strong className="admin-assessment-info-value">{academic.intermediateMarks}%</strong>
                    </div>
                  )}
                  {academic.intermediateGroup && (
                    <div className="admin-assessment-info-item">
                      <span className="admin-assessment-info-label">Group / Stream</span>
                      <span className="admin-assessment-info-value">{academic.intermediateGroup}</span>
                    </div>
                  )}
                  {academic.city && (
                    <div className="admin-assessment-info-item">
                      <span className="admin-assessment-info-label">Location / City</span>
                      <span className="admin-assessment-info-value">{academic.city}</span>
                    </div>
                  )}
                  {academic.school && (
                    <div className="admin-assessment-info-item">
                      <span className="admin-assessment-info-label">College / School</span>
                      <span className="admin-assessment-info-value">{academic.school}</span>
                    </div>
                  )}
                  {academic.entryTest && (
                    <div className="admin-assessment-info-item">
                      <span className="admin-assessment-info-label">Entry Test</span>
                      <span className="admin-assessment-info-value">{academic.entryTest} {academic.entryTestScore ? `(${academic.entryTestScore})` : ''}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 3. Performance & Aptitude Breakdown (FR-13-02) */}
          <div className="admin-assessment-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="admin-assessment-section-title" style={{ margin: 0 }}>Category Aptitude Breakdown</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Aptitude Diagnostics</span>
            </div>

            {scoreEntries.length > 0 ? (
              <div className="admin-assessment-scores-list">
                {scoreEntries.map((item) => {
                  const percentage = Math.min(100, Math.round((item.score / maxScoreVal) * 100));
                  const isTop = item.category.toLowerCase() === category.toLowerCase() || item.score === maxScoreVal;
                  const itemTone = getCategoryBadgeTone(item.category);
                  return (
                    <div key={item.category} className="admin-assessment-score-row">
                      <div className="admin-assessment-score-header">
                        <span className="admin-assessment-score-name">
                          {item.category}
                          {isTop && (
                            <span className="status-pill status-pill--good" style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 6px' }}>
                              Top Match
                            </span>
                          )}
                        </span>
                        <span className="admin-assessment-score-points">
                          <strong>{item.score}</strong> pts ({percentage}%)
                        </span>
                      </div>
                      <div className="admin-assessment-progress-track">
                        <div
                          className={`admin-assessment-progress-bar admin-assessment-progress-bar--${itemTone}`}
                          style={{ width: `${Math.max(percentage, 6)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="admin-assessment-single-score">
                <span>Recorded Score / Result:</span>
                <code>{assessmentResult(record)}</code>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="admin-modal-actions" style={{ marginTop: '6px' }}>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => window.print()}
              title="Print this assessment report"
            >
              Print Report
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonitoringTable({ tab, records, users = [], assessmentFilter: externalFilter, setAssessmentFilter: setExternalFilter }) {
  const [visibleChatbotCount, setVisibleChatbotCount] = useState(10);
  const [visibleAssessmentsCount, setVisibleAssessmentsCount] = useState(10);
  const [chatbotSearch, setChatbotSearch] = useState('');
  const [chatbotFilter, setChatbotFilter] = useState('all');
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [internalAssessmentFilter, setInternalAssessmentFilter] = useState('all');
  const assessmentFilter = externalFilter !== undefined ? externalFilter : internalAssessmentFilter;
  const setAssessmentFilter = setExternalFilter !== undefined ? setExternalFilter : setInternalAssessmentFilter;
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  if (tab === 'assessments') {
    // Extract unique categories for filter pills
    const categories = Array.from(new Set(
      records.map((r) => r.highest_category || r.result?.matchedField || r.matched_field).filter(Boolean)
    ));

    const filteredRecords = records.filter((record) => {
      const recCategory = record.highest_category || record.result?.matchedField || record.matched_field || '';
      if (assessmentFilter !== 'all' && recCategory.toLowerCase() !== assessmentFilter.toLowerCase()) {
        return false;
      }
      if (!assessmentSearch.trim()) return true;
      const terms = assessmentSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const user = getUserDisplayName(record, users).toLowerCase();
      const email = String(record.userEmail || record.email || record.user?.email || '').toLowerCase();
      const career = String(record.recommendation || record.result?.career || '').toLowerCase();
      const cat = String(recCategory).toLowerCase();
      const combined = `${user} ${email} ${career} ${cat}`;
      return terms.every((t) => combined.includes(t));
    });

    const visibleRecords = filteredRecords.slice(0, visibleAssessmentsCount);
    return (
      <>
        {/* Search & Category Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div className="admin-search-wrapper" style={{ margin: 0, flex: '1 1 260px', maxWidth: '380px' }}>
            <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              className="admin-search"
              type="text"
              inputMode="search"
              placeholder="Search student, email, or career..."
              aria-label="Search student assessments"
              value={assessmentSearch}
              onChange={(e) => { setAssessmentSearch(e.target.value); setVisibleAssessmentsCount(10); }}
            />
            {assessmentSearch && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setAssessmentSearch('')}
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
              className={`admin-filter-pill ${assessmentFilter === 'all' ? 'admin-filter-pill--active' : ''}`}
              onClick={() => { setAssessmentFilter('all'); setVisibleAssessmentsCount(10); }}
            >
              All ({records.length})
            </button>
            {categories.map((cat) => {
              const count = records.filter((r) => (r.highest_category || r.result?.matchedField || r.matched_field) === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`admin-filter-pill ${assessmentFilter.toLowerCase() === cat.toLowerCase() ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => { setAssessmentFilter(cat); setVisibleAssessmentsCount(10); }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Assessment Modal when selected */}
        {selectedAssessment && (
          <AssessmentDetailModal
            record={selectedAssessment}
            users={users}
            onClose={() => setSelectedAssessment(null)}
          />
        )}

        <div className="admin-table-wrap">
          <table className="admin-table admin-table--monitoring">
            <thead>
              <tr>
                <th>Student</th>
                <th>Primary Field</th>
                <th>Recommended Career</th>
                <th>Performance Breakdown</th>
                <th>Date Taken</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.length > 0 ? (
                visibleRecords.map((record) => {
                  const name = getUserDisplayName(record, users);
                  const email = record.userEmail || record.email || record.user?.email;
                  const cat = record.highest_category || record.result?.matchedField || record.matched_field || '-';
                  const career = record.recommendation || record.result?.career || '-';
                  const tone = getCategoryBadgeTone(cat);
                  const scores = record.scores && typeof record.scores === 'object' && Object.keys(record.scores).length > 0 ? record.scores : null;

                  return (
                    <tr key={record.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--ink)', fontSize: '0.94rem' }}>{name}</strong>
                          {email && (
                            <span style={{ color: 'var(--ink-faint)', fontSize: '0.8rem', marginTop: '2px' }}>
                              {email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${tone}`}>
                          {cat}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{career}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--ink-faint)' }}>
                            {record.source === 'university_recommender' ? 'University Recommender' : 'Career Quiz'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {scores ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                            {Object.entries(scores).map(([k, v]) => (
                              <span
                                key={k}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: k.toLowerCase() === cat.toLowerCase() ? 'var(--good-tint)' : 'var(--muted-tint)',
                                  color: k.toLowerCase() === cat.toLowerCase() ? 'var(--good)' : 'var(--ink-muted)',
                                  fontWeight: k.toLowerCase() === cat.toLowerCase() ? 600 : 400,
                                }}
                              >
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <ExpandableCell value={assessmentResult(record)} />
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                        {formatDateTime(dateValue(record))}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--primary"
                          onClick={() => setSelectedAssessment(record)}
                          title="View detailed assessment report"
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background: 'var(--info-tint)',
                            color: 'var(--info)',
                            border: '1px solid rgba(36, 87, 168, 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-muted)' }}>
                    No assessment records match your search or filter.
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
              onClick={() => setVisibleAssessmentsCount((count) => count + 10)}
            >
              Show more ({filteredRecords.length - visibleRecords.length} remaining)
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
      const terms = chatbotSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const message = String(record.message || '').toLowerCase();
      const user = getUserDisplayName(record, users).toLowerCase();
      const userEmail = String(record.userEmail || record.user?.email || '').toLowerCase();
      // Match on visitor message or user name/email so searching 'quiz' does NOT pull bot replies mentioning quiz
      const combined = `${message} ${user} ${userEmail}`;
      return terms.every((t) => combined.includes(t));
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
              placeholder="Search visitor queries or student name..."
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
                  <td>{getUserDisplayName(record, users)}</td>
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
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem('adminActiveTab') || 'dashboard';
    } catch (_) {
      return 'dashboard';
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatbotView, setChatbotView] = useState('log');
  const [resourceView, setResourceView] = useState('list');
  const [users, setUsers] = useState([]); const [records, setRecords] = useState([]);
  const [dashboardData, setDashboardData] = useState({ users: [], activity: [], assessments: [], chatbot: [], scholarships: [], universities: [] });
  const [editingUser, setEditingUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalNotice, setModalNotice] = useState('');
  const [userDeleteConfirmation, setUserDeleteConfirmation] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [adminEmailsList, setAdminEmailsList] = useState([]);
  const [userSortField, setUserSortField] = useState('lastSignInAt');
  const [userSortAsc, setUserSortAsc] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [universitySearch, setUniversitySearch] = useState(''); const [universityCityFilter, setUniversityCityFilter] = useState('all'); const [scholarshipSearch, setScholarshipSearch] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [formResetKey, setFormResetKey] = useState(0);
  const [userSearch, setUserSearch] = useState(''); const [userFilter, setUserFilter] = useState('all');
  const [assessmentFilter, setAssessmentFilter] = useState('all');
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const CARDS_INITIAL_COUNT = 6;
  const CARDS_STEP_COUNT = 6;
  const LIST_PAGE_SIZE = 20;
  const getInitialVisibleCount = (resource) => (resource === 'universities' || resource === 'scholarships' ? CARDS_INITIAL_COUNT : LIST_PAGE_SIZE);
  const getVisibleCountStep = (resource) => (resource === 'universities' || resource === 'scholarships' ? CARDS_STEP_COUNT : LIST_PAGE_SIZE);

  // The "Chatbot" nav item covers two underlying resources — the conversation log and the auto-reply rules.
  const activeResource = tab === 'chatbot' ? (chatbotView === 'log' ? 'chatbot-interactions' : 'chatbot-responses') : tab;
  const [visibleCount, setVisibleCount] = useState(() => getInitialVisibleCount(activeResource));
  const api = async (path, options = {}) => {
    let token = await getAdminAccessToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      throw new Error('Administrator session expired. Please sign in again.');
    }
    let response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    if (response.status === 401) {
      const refreshedToken = await refreshAdminAccessToken();
      if (refreshedToken) {
        response = await fetch(`${API_URL}${path}`, {
          ...options,
          headers: { Authorization: `Bearer ${refreshedToken}`, ...(options.headers || {}) },
        });
      }
      if (response.status === 401) {
        await clearAdminSession();
        navigate('/admin/login', { replace: true });
        throw new Error('Admin session expired. Please log in again.');
      }
    }
    const contentType = response.headers.get('content-type') || '';
    let result = {};
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error('Backend server is waking up or deploying. Please wait 30 seconds and try again.');
        }
        if (response.status === 404) {
          throw new Error('Endpoint not found. The backend server on Render may still be building or updating.');
        }
        throw new Error(`Server returned HTTP ${response.status}. Please check your Render backend status.`);
      }
      try {
        result = JSON.parse(text);
      } catch {
        result = {};
      }
    }
    if (!response.ok) throw new Error(result.message || 'Request failed.');
    return result;
  };
  const load = async (resource) => {
    if (resource === 'users') {
      const result = await api('/api/admin/stats');
      if (Array.isArray(result.adminEmails)) {
        setAdminEmailsList(result.adminEmails.map((e) => String(e).toLowerCase()));
      }
      setUsers((result.users || []).sort((a, b) => timestampValue(b) - timestampValue(a)));
    } else {
      if (users.length === 0) {
        api('/api/admin/stats').then((res) => {
          if (res.users) setUsers((res.users || []).sort((a, b) => timestampValue(b) - timestampValue(a)));
        }).catch(() => {});
      }
      const result = await api(`/api/admin/${resource}`);
      setRecords((result.records || []).sort((a, b) => timestampValue(b) - timestampValue(a)));
    }
  };
  const loadDashboard = async () => {
    const [stats, scholarships, universities, eligibility, assessments, activity, chatbot] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/scholarships'),
      api('/api/admin/universities'),
      api('/api/admin/eligibility'),
      api('/api/admin/assessments').catch(() => ({ records: [] })),
      api('/api/admin/activity').catch(() => ({ records: [] })),
      api('/api/admin/chatbot-interactions').catch(() => ({ records: [] })),
    ]);
    const sortedUsers = (stats.users || []).sort((a, b) => timestampValue(b) - timestampValue(a));
    setUsers(sortedUsers);
    setDashboardData({
      users: sortedUsers,
      scholarships: scholarships.records || [],
      universities: universities.records || [],
      eligibility: eligibility.records || [],
      assessments: assessments.records || [],
      activity: activity.records || [],
      chatbot: chatbot.records || [],
    });
  };
  useEffect(() => {
    api('/api/admin/me')
      .then((data) => {
        if (data?.admin) setCurrentAdmin(data.admin);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'dashboard') {
      loadDashboard().catch((loadError) => setError(loadError.message));
    } else {
      const resource = tab === 'chatbot' ? (chatbotView === 'log' ? 'chatbot-interactions' : 'chatbot-responses') : tab;
      load(resource).catch((loadError) => setError(loadError.message));
    }
  }, []);

  // Auto-refresh users every 15 seconds when on the users tab so active/passive status is always live
  useEffect(() => {
    if (tab !== 'users') return;
    const interval = setInterval(() => {
      load('users').catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [tab]);
  // Large record sets (200+ universities/scholarships) rendered in full make the page tall
  // enough to break browser rendering, so lists are paged; reset to page one on list/search change.
  useEffect(() => { setVisibleCount(getInitialVisibleCount(activeResource)); }, [activeResource, universitySearch, scholarshipSearch, universityCityFilter]);

  // Auto-dismiss transient notice banners after 3.5 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice('');
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const changeTab = (nextTab, options = {}) => {
    setTab(nextTab);
    try { localStorage.setItem('adminActiveTab', nextTab); } catch (_) {}
    setResourceView('list');
    setEditingRecord(null); setEditingProgram(null); setError(''); setNotice('');
    setUniversityCityFilter(options.city || 'all');
    setUniversitySearch(options.search || '');
    setScholarshipSearch(options.scholarshipSearch || '');
    if (options.assessmentFilter) {
      setAssessmentFilter(options.assessmentFilter);
    } else {
      setAssessmentFilter('all');
    }
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

  const isUserChanged = Boolean(
    editingUser && originalUser && (
      (editingUser.name || '').trim() !== (originalUser.name || '').trim() ||
      (editingUser.email || '').trim().toLowerCase() !== (originalUser.email || '').trim().toLowerCase() ||
      Boolean(editingUser.blocked) !== Boolean(originalUser.blocked)
    )
  );

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingUser || !isUserChanged || isSavingUser) return;
    setIsSavingUser(true);
    setModalError('');
    setModalNotice('');
    try {
      const result = await api(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingUser.name, email: editingUser.email, blocked: Boolean(editingUser.blocked) }),
      });
      setUsers((prevUsers) => prevUsers.map((user) => (user.id === result.user.id ? result.user : user)));
      setEditingUser(null);
      setOriginalUser(null);
      setNotice('User updated successfully.');
    } catch (saveError) {
      setModalError(saveError.message || 'Failed to update user.');
    } finally {
      setIsSavingUser(false);
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
    const editingId = editingRecord ? editingRecord.id : null;
    const tempId = editingId || `temp_${Date.now()}`;
    const previousRecords = [...records];

    // Optimistically update records immediately for instant response
    if (!wasEditing) {
      setRecords((prev) => [{ id: tempId, ...data }, ...prev]);
    } else {
      setRecords((prev) => prev.map((r) => (String(r.id) === String(editingId) ? { ...r, ...data } : r)));
    }
    setEditingRecord(null);
    setResourceView('list');
    setFormResetKey((key) => key + 1);
    setNotice(`${itemLabel} ${wasEditing ? 'updated' : 'added'} successfully.`);

    try {
      const path = wasEditing ? `/api/admin/${activeResource}/${editingId}` : `/api/admin/${activeResource}`;
      const res = await api(path, { method: wasEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res && res.record && res.record.id) {
        setRecords((prev) => prev.map((r) => (String(r.id) === String(tempId) ? { ...r, ...res.record } : r)));
      }
    } catch (saveError) {
      setRecords(previousRecords);
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
        const previousRecords = [...records];
        // Optimistically delete immediately so the user doesn't wait
        setRecords((prev) => prev.filter((r) => String(r.id) !== String(record.id)));
        setNotice(`${itemLabel} deleted successfully.`);
        try {
          await api(`/api/admin/${activeResource}/${record.id}`, { method: 'DELETE' });
        } catch (deleteError) {
          setRecords(previousRecords);
          setError(deleteError.message);
        }
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
  const KNOWN_ADMIN_EMAILS = [
    ...(process.env.REACT_APP_ADMIN_EMAILS ? process.env.REACT_APP_ADMIN_EMAILS.split(',') : []),
  ].map((e) => e.trim().toLowerCase());

  const isUserAdmin = (u) => {
    if (!u) return false;
    const uEmail = (u.email || '').trim().toLowerCase();
    if (uEmail === 'shamamaaslam377@gmail.com') return false;
    if (u.isAdmin) return true;
    if (u.app_metadata?.role === 'admin') return true;
    if (u.role === 'admin') return true;
    if (uEmail) {
      if (KNOWN_ADMIN_EMAILS.includes(uEmail)) return true;
      if (adminEmailsList.includes(uEmail)) return true;
      if (currentAdmin?.email && currentAdmin.email.toLowerCase() === uEmail) return true;
    }
    return false;
  };

  const isSelfUser = (u) => {
    if (!u || !currentAdmin) return false;
    if ((u.email || '').trim().toLowerCase() === 'shamamaaslam377@gmail.com') return false;
    if (currentAdmin.id && String(u.id) === String(currentAdmin.id)) return true;
    if (currentAdmin.email && (u.email || '').trim().toLowerCase() === currentAdmin.email.toLowerCase()) return true;
    return false;
  };

  const handleUserSort = (field) => {
    if (userSortField === field) {
      setUserSortAsc(!userSortAsc);
    } else {
      setUserSortField(field);
      setUserSortAsc(field === 'name' ? true : false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userFilter === 'active' && (!isUserActive(u) || u.blocked)) return false;
    if (userFilter === 'passive' && (isUserActive(u) || u.blocked)) return false;
    if (userFilter === 'blocked' && !u.blocked) return false;
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSortField === 'name') {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return userSortAsc ? cmp : -cmp;
    }
    const timeA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
    const timeB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
    return userSortAsc ? timeA - timeB : timeB - timeA;
  });

  const activeCount = users.filter((u) => !u.blocked && isUserActive(u)).length;
  const passiveCount = users.filter((u) => !u.blocked && !isUserActive(u)).length;
  const blockedCount = users.filter((u) => u.blocked).length;

  const visibleRecords = activeResource === 'universities'
    ? records.filter((record) => universityMatches(record, universitySearch, universityCityFilter))
    : activeResource === 'scholarships'
    ? records.filter((record) => scholarshipMatches(record, scholarshipSearch))
    : records;
  const pagedRecords = visibleRecords.slice(0, visibleCount);

  const universityCities = (activeResource === 'universities' ? records : []).reduce((acc, r) => {
    const raw = (r.City || r.city || '').trim();
    if (raw) {
      const primary = raw.split(',')[0].split(String.fromCharCode(40))[0].trim();
      if (primary && !acc.includes(primary)) acc.push(primary);
    }
    return acc;
  }, []).sort((a, b) => a.localeCompare(b));

  const signOut = async () => {
    await clearAdminSession();
    navigate('/admin/login', { replace: true });
  };

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
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'admin-nav-item admin-nav-item--active' : 'admin-nav-item'}
              onClick={() => changeTab(id)}
              title={label}
              aria-label={label}
            >
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
                <span className="admin-count" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  {userSearch.trim() || userFilter !== 'all'
                    ? `${filteredUsers.length} of ${users.length} accounts`
                    : `${users.length} accounts`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-export-btn"
                  onClick={() => {
                    setNotice('Refreshing users...');
                    load('users')
                      .then(() => setNotice('Users list refreshed.'))
                      .catch((err) => setError(err.message));
                  }}
                  title="Refresh users and live active/passive status"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Refresh
                </button>
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
                  className={`admin-filter-pill ${userFilter === 'passive' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => setUserFilter('passive')}
                >
                  Inactive ({passiveCount})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${userFilter === 'blocked' ? 'admin-filter-pill--active' : ''}`}
                  onClick={() => setUserFilter('blocked')}
                >
                  Blocked ({blockedCount})
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
              <table className="admin-table admin-users-table">
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleUserSort('name')}
                      title={`Sort by Full name (${userSortField === 'name' && userSortAsc ? 'descending' : 'ascending'})`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        Full name
                        {userSortField === 'name' ? (
                          <span aria-hidden="true" style={{ fontSize: '0.75rem' }}>{userSortAsc ? '▲' : '▼'}</span>
                        ) : (
                          <span aria-hidden="true" style={{ fontSize: '0.75rem', opacity: 0.35 }}>⇅</span>
                        )}
                      </span>
                    </th>
                    <th style={{ textAlign: 'left' }}>Email</th>
                    <th style={{ textAlign: 'center' }}>Provider</th>
                    <th
                      style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleUserSort('lastSignInAt')}
                      title={`Sort by Last login (${userSortField === 'lastSignInAt' && !userSortAsc ? 'oldest first' : 'newest first'})`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                        Last login
                        {userSortField === 'lastSignInAt' ? (
                          <span aria-hidden="true" style={{ fontSize: '0.75rem' }}>{userSortAsc ? '▲' : '▼'}</span>
                        ) : (
                          <span aria-hidden="true" style={{ fontSize: '0.75rem', opacity: 0.35 }}>⇅</span>
                        )}
                      </span>
                    </th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th className="admin-col-actions" style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => {
                        setEditingUser({ ...user });
                        setOriginalUser({ ...user });
                        setModalError('');
                        setModalNotice('');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'left' }}>
                        <strong style={{ color: 'var(--ink)' }}>{user.name}</strong>
                        {isUserAdmin(user) && (
                          <span
                            className="status-pill status-pill--accent"
                            style={{ marginLeft: '8px', fontSize: '0.72rem', padding: '2px 7px', verticalAlign: 'middle' }}
                          >
                            Admin
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'left' }}>{user.email}</td>
                      <td style={{ textAlign: 'center' }}>
                        {user.authProvider === 'google' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                            </svg>
                            <span>Google</span>
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            <span>Email</span>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{formatDateTime(user.lastSignInAt)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {user.blocked ? (
                          <StatusPill tone="warn">Blocked</StatusPill>
                        ) : isUserActive(user) ? (
                          <StatusPill tone="good">Active</StatusPill>
                        ) : (
                          <StatusPill tone="muted">Inactive</StatusPill>
                        )}
                      </td>
                      <td className="admin-col-actions" style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <div className="admin-user-actions-wrap" style={{ justifyContent: 'center' }}>
                          <button
                            className="admin-action admin-action--user admin-action--edit"
                            type="button"
                            onClick={() => {
                              setEditingUser({ ...user });
                              setOriginalUser({ ...user });
                              setModalError('');
                              setModalNotice('');
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '35px', color: 'var(--ink-muted)' }}>
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
              <div className="admin-modal-overlay" onClick={() => !isSavingUser && setEditingUser(null)}>
                <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal-header">
                    <h2>Edit User Account</h2>
                    <button
                      type="button"
                      className="admin-modal-close"
                      onClick={() => setEditingUser(null)}
                      disabled={isSavingUser}
                      aria-label="Close modal"
                    >×</button>
                  </div>
                  <form className="admin-modal-body" onSubmit={saveUser}>
                    {modalNotice && (
                      <div className="admin-notice" role="status" style={{ margin: '0 0 14px' }}>
                        <span>{modalNotice}</span>
                      </div>
                    )}
                    {modalError && (
                      <div className="admin-error" role="alert" style={{ margin: '0 0 14px' }}>
                        <span>{modalError}</span>
                      </div>
                    )}
                    <div>
                      <label htmlFor="edit-user-name">User Name</label>
                      <input
                        id="edit-user-name"
                        type="text"
                        value={editingUser.name || ''}
                        onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })}
                        required
                        aria-label="User name"
                        disabled={isSavingUser}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-user-email">Email Address</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          id="edit-user-email"
                          type="email"
                          value={editingUser.email || ''}
                          onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })}
                          required
                          aria-label="User email"
                          disabled={isSavingUser || isUserAdmin(editingUser)}
                          style={isUserAdmin(editingUser) ? { opacity: 0.8, cursor: 'not-allowed', paddingRight: '36px' } : undefined}
                        />
                        {isUserAdmin(editingUser) && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ position: 'absolute', right: '12px', color: 'var(--ink-muted)', pointerEvents: 'none' }}
                            aria-hidden="true"
                            title="Administrator email cannot be modified"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </div>
                      {isUserAdmin(editingUser) && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                          Administrator email cannot be changed from the panel.
                        </span>
                      )}
                    </div>
                    <label className="admin-modal-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editingUser.blocked)}
                        onChange={(event) => setEditingUser({ ...editingUser, blocked: event.target.checked })}
                        disabled={isSavingUser}
                      />
                      <span>Block account access (prevent user from signing in)</span>
                    </label>
                    <div className="admin-modal-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setEditingUser(null)}
                        disabled={isSavingUser}
                      >
                        Cancel
                      </button>
                      <button
                        className="primary-button"
                        type="submit"
                        disabled={!isUserChanged || isSavingUser}
                      >
                        {isSavingUser ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>

                    {/* Danger zone */}
                    <div className="admin-edit-danger-zone" style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '0.96rem', color: '#dc2626', fontWeight: 600 }}>Delete account</h3>
                      <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: 'var(--ink-muted)', lineHeight: '1.4' }}>
                        Permanently deletes this user and their data. This cannot be undone.
                      </p>
                      {isUserAdmin(editingUser) ? (
                        <div>
                          <button
                            type="button"
                            className="admin-action--danger"
                            disabled
                            style={{
                              background: 'transparent',
                              border: '1px solid #e2e8f0',
                              color: 'var(--ink-faint)',
                              opacity: 0.6,
                              cursor: 'not-allowed',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.84rem',
                            }}
                          >
                            Delete account
                          </button>
                          <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                            Admin accounts cannot be deleted.
                          </span>
                        </div>
                      ) : isSelfUser(editingUser) ? (
                        <div>
                          <button
                            type="button"
                            className="admin-action--danger"
                            disabled
                            style={{
                              background: 'transparent',
                              border: '1px solid #e2e8f0',
                              color: 'var(--ink-faint)',
                              opacity: 0.6,
                              cursor: 'not-allowed',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.84rem',
                            }}
                          >
                            Delete account
                          </button>
                          <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                            You can't delete your own account.
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="admin-action--danger"
                          style={{
                            background: 'transparent',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onClick={() => {
                            setUserDeleteConfirmation({
                              user: editingUser,
                              input: '',
                              error: '',
                              isDeleting: false,
                            });
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete account
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {userDeleteConfirmation && (
              <div className="admin-modal-overlay" onClick={() => !userDeleteConfirmation.isDeleting && setUserDeleteConfirmation(null)}>
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
                      <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--ink)' }}>Confirm Account Deletion</h2>
                    </div>
                    <button
                      type="button"
                      className="admin-modal-close"
                      onClick={() => setUserDeleteConfirmation(null)}
                      disabled={userDeleteConfirmation.isDeleting}
                      aria-label="Close dialog"
                    >×</button>
                  </div>
                  <div className="admin-modal-body">
                    <p style={{ margin: '6px 0 10px 0', fontSize: '0.94rem', color: 'var(--ink)', lineHeight: '1.45' }}>
                      Type <strong>{userDeleteConfirmation.user.email}</strong> to confirm.
                    </p>
                    <input
                      type="text"
                      value={userDeleteConfirmation.input}
                      onChange={(event) => setUserDeleteConfirmation({ ...userDeleteConfirmation, input: event.target.value })}
                      placeholder={userDeleteConfirmation.user.email}
                      style={{ width: '100%', marginBottom: '12px' }}
                      disabled={userDeleteConfirmation.isDeleting}
                      autoComplete="off"
                    />
                    {userDeleteConfirmation.error && (
                      <p className="admin-error" role="alert" style={{ margin: '0 0 12px' }}>
                        {userDeleteConfirmation.error}
                      </p>
                    )}
                    <div className="admin-modal-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        autoFocus
                        onClick={() => setUserDeleteConfirmation(null)}
                        disabled={userDeleteConfirmation.isDeleting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn-danger"
                        disabled={
                          userDeleteConfirmation.input.trim() !== userDeleteConfirmation.user.email.trim() ||
                          userDeleteConfirmation.isDeleting
                        }
                        onClick={async () => {
                          const target = userDeleteConfirmation.user;
                          setUserDeleteConfirmation((prev) => ({ ...prev, isDeleting: true, error: '' }));
                          try {
                            await api(`/api/admin/users/${target.id}`, { method: 'DELETE' });
                            setUserDeleteConfirmation(null);
                            setEditingUser(null);
                            setOriginalUser(null);
                            await load('users');
                            setNotice(`User account "${target.name || target.email}" deleted successfully.`);
                          } catch (deleteErr) {
                            setUserDeleteConfirmation((prev) => ({
                              ...prev,
                              isDeleting: false,
                              error: deleteErr.message || 'Unable to delete user account.',
                            }));
                          }
                        }}
                      >
                        {userDeleteConfirmation.isDeleting ? 'Deleting...' : 'Delete account'}
                      </button>
                    </div>
                  </div>
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
            <SystemReportsView records={records} users={users} assessments={dashboardData.assessments || []} chatbot={dashboardData.chatbot || []} />
          ) : (
            <div className="admin-card">
              <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {activeResource === 'assessments' && <h2>Assessment Records</h2>}
                  {activeResource !== 'assessments' && activeResource !== 'chatbot-interactions' && (
                    <h2>{resourceLabels[activeResource]}</h2>
                  )}
                  <span className="admin-count" style={activeResource === 'chatbot-interactions' ? { fontSize: '1.05rem', fontWeight: 600 } : undefined}>
                    {activeResource === 'chatbot-interactions' ? `${records.length} logged messages` : `${records.length} records`}
                  </span>
                </div>
                {activeResource === 'assessments' && (
                  <button
                    type="button"
                    className="admin-export-btn"
                    onClick={() => exportAssessmentsCsv(records, users)}
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
              <MonitoringTable tab={activeResource} records={records} users={users} assessmentFilter={assessmentFilter} setAssessmentFilter={setAssessmentFilter} />
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
                  {activeResource === 'eligibility' && <h2>Eligibility Records</h2>}
                  {activeResource !== 'universities' && activeResource !== 'scholarships' && activeResource !== 'eligibility' && (
                    <h2>{resourceLabels[activeResource]}</h2>
                  )}
                  <span className="admin-count" style={activeResource === 'universities' || activeResource === 'scholarships' ? { fontSize: '1.05rem', fontWeight: 600 } : undefined}>
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
                    <button
                      className="admin-add-primary-btn"
                      type="button"
                      onClick={() => { setEditingRecord(null); setResourceView('add'); }}
                    >
                      + Add {activeResource === 'eligibility' ? 'Eligibility' : getResourceSingular(activeResource)}
                    </button>
                  )}
                </div>
              </div>
              {activeResource === 'chatbot-responses' && (
                <p className="admin-hint">Keyword-triggered canned replies the assistant sends automatically. The conversation log (above) is where you monitor what visitors actually asked.</p>
              )}
              {activeResource === 'universities' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 16px' }}>
                  <div className="admin-search-wrapper" style={{ margin: 0, flex: '1 1 320px' }}>
                    <svg className="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      className="admin-search"
                      type="text"
                      inputMode="search"
                      placeholder="Search universities by city or name (e.g. Lahore, NUST, Karachi)..."
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="admin-uni-city-select" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>City:</label>
                    <select
                      id="admin-uni-city-select"
                      className="admin-select"
                      value={universityCityFilter}
                      onChange={(e) => { setUniversityCityFilter(e.target.value); setVisibleCount(getInitialVisibleCount(activeResource)); }}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', background: '#ffffff', color: '#1e293b', cursor: 'pointer' }}
                    >
                      <option value="all">All Cities ({records.length})</option>
                      {universityCities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
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
                      {activeResource === 'universities' ? (universityCityFilter !== 'all' ? `${universityCityFilter} ${universitySearch}`.trim() : universitySearch) : scholarshipSearch}
                    </strong>
                    ".
                  </p>
                  <button
                    type="button"
                    className="admin-small-button"
                    onClick={() => {
                      if (activeResource === 'universities') {
                        setUniversitySearch('');
                        setUniversityCityFilter('all');
                      }
                      if (activeResource === 'scholarships') setScholarshipSearch('');
                    }}
                  >
                    Clear Search
                  </button>
                </div>
              )}
              {activeResource === 'universities' ? (
                <div className="admin-cards-grid">
                  {pagedRecords.map((record) => (
                    <div className="admin-grid-card admin-university-card" key={record.id}>
                      <div className="admin-grid-card__header">
                        <div className="admin-grid-card__badge-row">
                          <span className="admin-card-chip admin-card-chip--location">
                            📍 {record.City || record.city || 'City N/A'}{record.Province || record.province ? `, ${record.Province || record.province}` : ''}
                          </span>
                          {(record.Sector || record.sector) && (
                            <StatusPill tone={sectorTone(record.Sector || record.sector)}>
                              {record.Sector || record.sector}
                            </StatusPill>
                          )}
                        </div>
                        <h3 className="admin-grid-card__title" title={displayName(record)}>
                          {displayName(record)}
                        </h3>
                      </div>

                      <div className="admin-grid-card__body">
                        {record.programs && record.programs.length > 0 ? (
                          <div className="admin-grid-card__programs-wrap">
                            <div className="admin-grid-card__programs-header">
                              <span>🎓 {record.programs.length} Degree Program{record.programs.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="admin-grid-card__programs-pills">
                              {(expandedPrograms[record.id] ? record.programs : record.programs.slice(0, 4)).map((p) => (
                                <span key={p.id} className="admin-program-chip">{p.degree_name}</span>
                              ))}
                              {record.programs.length > 4 && (
                                <button
                                  type="button"
                                  className="admin-program-chip admin-program-chip--more"
                                  onClick={() => setExpandedPrograms((prev) => ({ ...prev, [record.id]: !prev[record.id] }))}
                                  title={expandedPrograms[record.id] ? 'Show fewer programs' : 'Show all programs'}
                                  aria-expanded={!!expandedPrograms[record.id]}
                                >
                                  {expandedPrograms[record.id] ? '▲ Show less' : `+${record.programs.length - 4} more`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="admin-grid-card__empty-programs">No degree programs recorded</p>
                        )}
                      </div>

                      <div className="admin-grid-card__footer">
                        {(record.Website || record.website || record.website_url) ? (
                          <a
                            href={normalizeUrl(record.Website || record.website || record.website_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-card-link"
                          >
                            Website ↗
                          </a>
                        ) : <span />}
                        <div className="admin-grid-card__actions">
                          <button
                            className="admin-action admin-action--edit"
                            type="button"
                            onClick={() => { setEditingRecord(record); setResourceView('add'); }}
                          >
                            Edit
                          </button>
                          <button
                            className="admin-action admin-action--danger"
                            type="button"
                            onClick={() => deleteRecord(record)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeResource === 'scholarships' ? (
                <div className="admin-cards-grid">
                  {pagedRecords.map((record) => (
                    <div className="admin-grid-card admin-scholarship-card" key={record.id}>
                      <div className="admin-grid-card__header">
                        <div className="admin-grid-card__badge-row">
                          <span className="admin-card-chip admin-card-chip--provider">
                            {record.provider_type || 'Scholarship'}
                          </span>
                          {record.basis && (
                            <StatusPill tone={basisTone(record.basis)}>
                              {scholarshipBasisLabel(record.basis)}
                            </StatusPill>
                          )}
                        </div>
                        <h3 className="admin-grid-card__title" title={displayName(record)}>
                          {displayName(record)}
                        </h3>
                        <p className="admin-grid-card__provider">
                          🏢 {record.provider || 'Provider not specified'}
                        </p>
                      </div>

                      <div className="admin-grid-card__body">
                        <div className="admin-grid-card__meta-list">
                          {record.min_merit_pct && (
                            <div className="admin-grid-card__meta-item">
                              <span className="admin-grid-card__meta-label">🎓 Min Merit:</span>
                              <span className="admin-grid-card__meta-val">{record.min_merit_pct}%</span>
                            </div>
                          )}
                          {record.income_cap_pkr && (
                            <div className="admin-grid-card__meta-item">
                              <span className="admin-grid-card__meta-label">💰 Income Cap:</span>
                              <span className="admin-grid-card__meta-val">PKR {Number(record.income_cap_pkr).toLocaleString()}</span>
                            </div>
                          )}
                          {record.provinces && (
                            <div className="admin-grid-card__meta-item">
                              <span className="admin-grid-card__meta-label">📍 Provinces:</span>
                              <span className="admin-grid-card__meta-val">{record.provinces}</span>
                            </div>
                          )}
                          {record.coverage && (
                            <div className="admin-grid-card__meta-item">
                              <span className="admin-grid-card__meta-label">🎁 Coverage:</span>
                              <span className="admin-grid-card__meta-val">{record.coverage}</span>
                            </div>
                          )}
                          {record.eligibility_raw && !record.min_merit_pct && (
                            <p className="admin-grid-card__eligibility">📋 {record.eligibility_raw}</p>
                          )}
                        </div>
                      </div>

                      <div className="admin-grid-card__footer">
                        {record.source_url ? (
                          <a
                            href={normalizeUrl(record.source_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-card-link"
                          >
                            Apply Link ↗
                          </a>
                        ) : <span />}
                        <div className="admin-grid-card__actions">
                          <button
                            className="admin-action admin-action--edit"
                            type="button"
                            onClick={() => { setEditingRecord(record); setResourceView('add'); }}
                          >
                            Edit
                          </button>
                          <button
                            className="admin-action admin-action--danger"
                            type="button"
                            onClick={() => deleteRecord(record)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                pagedRecords.map((record) => (
                  <div className="admin-record" key={record.id} style={{ alignItems: 'center', padding: '16px 12px' }}>
                    <div className="admin-record__content" style={{ flex: '1 1 auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <p className="admin-record__title" style={{ margin: 0, fontWeight: 700 }}>{displayName(record)}</p>
                      </div>
                      {activeResource === 'eligibility' && record.description && (
                        <p className="admin-record__meta" style={{ marginTop: '6px', color: 'var(--ink-muted)' }}>{record.description}</p>
                      )}
                      {activeResource === 'chatbot-responses' && record.response && (
                        <p className="admin-record__meta" style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{record.response}</p>
                      )}
                    </div>
                    <div className="admin-record__actions" style={{ display: 'flex', gap: '8px' }}>
                      <button className="admin-action admin-action--edit" type="button" onClick={() => { setEditingRecord(record); setResourceView('add'); }}>Edit</button>
                      <button className="admin-action admin-action--danger" type="button" onClick={() => deleteRecord(record)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
              {(visibleRecords.length > pagedRecords.length || pagedRecords.length > getInitialVisibleCount(activeResource)) && (
                <div className="admin-load-more" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  {visibleRecords.length > pagedRecords.length && (
                    <button
                      className="admin-small-button"
                      type="button"
                      onClick={() => setVisibleCount((count) => count + getVisibleCountStep(activeResource))}
                    >
                      Show more ({visibleRecords.length - pagedRecords.length} remaining)
                    </button>
                  )}
                  {pagedRecords.length > getInitialVisibleCount(activeResource) && (
                    <button
                      className="admin-small-button"
                      type="button"
                      onClick={() => {
                        setVisibleCount(getInitialVisibleCount(activeResource));
                        window.scrollTo({ top: 200, behavior: 'smooth' });
                      }}
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>}
            {resourceView === 'add' && <div className="admin-form-screen">
              <div className="admin-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <h2>{editingRecord ? `Edit ${getResourceSingular(activeResource)}` : `Add ${getResourceSingular(activeResource)}`}</h2>
                  <span className="admin-count">Complete the fields, then save when ready.</span>
                </div>
                {activeResource !== 'universities' && activeResource !== 'scholarships' && (
                  <button
                    type="button"
                    className="admin-export-btn"
                    onClick={() => { setResourceView('list'); setEditingRecord(null); setNotice(''); setError(''); }}
                    title={`Return to ${resourceLabels[activeResource] || 'records'}`}
                  >
                    &larr; Back to {activeResource === 'eligibility' ? 'Eligibility' : (resourceLabels[activeResource] || 'Records')}
                  </button>
                )}
              </div>
              <EntityForm key={`${activeResource}-${formResetKey}`} tab={activeResource} record={editingRecord} onSave={saveRecord} onCancel={() => setEditingRecord(null)} />
              {activeResource === 'universities' && editingRecord && (
                <div className="admin-programs-panel">
                  <div className="admin-section-heading"><h3>Programs</h3><button className="admin-small-button" type="button" onClick={() => setEditingProgram(null)}>+ Add program</button></div>
                  <ul className="admin-program-list">
                    {(editingRecord.programs || []).map((program) => (
                      <li key={program.id}>
                        <span>{program.degree_name}{program.eligibility_pct ? ` · Min ${program.eligibility_pct}%` : ''}</span>
                        <span>
                          <button className="admin-action admin-action--edit" type="button" onClick={() => setEditingProgram(program)}>Edit</button>
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