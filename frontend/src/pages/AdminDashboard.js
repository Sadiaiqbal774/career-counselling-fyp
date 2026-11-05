import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
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

function getUserDisplayName(record, users = []) {
  if (!record) return 'Visitor';

  // 1. Direct candidate name — check multiple fields
  const candidateName = record.userName || record.user?.name || record.user?.full_name || record.name;
  if (candidateName && candidateName !== 'Anonymous (University Recommender)' && !isHash(candidateName)) {
    return candidateName;
  }

  // 2. Direct email
  const candidateEmail = record.userEmail || record.user?.email || record.email;

  // 3. Look up by userId in users list
  const uid = record.userId || record.user_id;
  if (uid && Array.isArray(users) && users.length > 0) {
    const uidStr = String(uid);
    const matched = users.find((u) => String(u.id) === uidStr || String(u.userId) === uidStr || String(u.email) === (candidateEmail || ''));
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

  // 5. Fallback without ever showing a hash
  if (record.source === 'university_recommender') return 'Student (Recommender)';
  if (record.source === 'quiz') return 'Student (Quiz)';
  return 'Student';
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

function SystemReportsView({ records, users = [], showHistory = true }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(10);
  const [hoveredDay, setHoveredDay] = useState(null);

  const summary = activitySummary(records);
  const maxTypeCount = summary.breakdown[0]?.[1] || 1;
  const maxTimelineCount = summary.maxTimelineTotal;

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

  const totalAssessments = summary.categories.assessments || 1;
  const assessmentPct = summary.total ? Math.round((summary.categories.assessments / summary.total) * 100) : 0;
  const chatbotPct = summary.total ? Math.round((summary.categories.chatbot / summary.total) * 100) : 0;
  const userPct = summary.total ? Math.round((summary.categories.user / summary.total) * 100) : 0;

  return (
    <div className="admin-reports-container">
      {/* 4 Unified Executive KPI Cards — FR-15-01: Monitor System Usage, FR-15-02: Usage Reporting */}
      <div className="admin-kpi-grid">
        {/* Card 1: Total Operations & Audit Logs */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#eef2ff', color: '#2563eb' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
              ● Live Telemetry
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{summary.total}</span>
              <span className="admin-kpi-share" style={{ color: '#2563eb' }}>100% Volume</span>
            </div>
            <div className="admin-kpi-title">Total System Operations</div>
            <div className="admin-kpi-desc">Total lifetime audit operations recorded across all modules</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)' }} />
          </div>
        </div>

        {/* Card 2: Student Assessments (FR-13) */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
              FR-13 Assessments
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{summary.categories.assessments}</span>
              <span className="admin-kpi-share" style={{ color: '#d97706' }}>{assessmentPct}% Share</span>
            </div>
            <div className="admin-kpi-title">Career Assessments</div>
            <div className="admin-kpi-desc">Aptitude evaluations &amp; career quiz submissions by students</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: `${assessmentPct}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)' }} />
          </div>
        </div>

        {/* Card 3: AI Assistant Inquiries (FR-14) */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              FR-14 Chatbot
            </span>
          </div>
          <div>
            <div className="admin-kpi-metric-row">
              <span className="admin-kpi-number">{summary.categories.chatbot}</span>
              <span className="admin-kpi-share" style={{ color: '#2563eb' }}>{chatbotPct}% Share</span>
            </div>
            <div className="admin-kpi-title">Assistant Inquiries</div>
            <div className="admin-kpi-desc">Student guidance questions answered by the AI counselor</div>
          </div>
          <div className="admin-bar-track" style={{ height: '6px' }}>
            <div className="admin-bar-fill" style={{ width: `${chatbotPct}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)' }} />
          </div>
        </div>

        {/* Card 4: Registered Students & Sign-ins (FR-15) */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <div className="admin-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#10b981' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="admin-kpi-tag" style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
              Users &amp; Auth
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
              <h3>Daily Activity Timeline Horizon</h3>
              <div className="admin-timeline-legend">
                <span><span className="admin-legend-dot admin-legend-dot--assessment" /> Assessments ({summary.categories.assessments})</span>
                <span><span className="admin-legend-dot admin-legend-dot--chatbot" /> Chatbot ({summary.categories.chatbot})</span>
                <span><span className="admin-legend-dot admin-legend-dot--user" /> Users ({summary.categories.user})</span>
                <span><span className="admin-legend-dot admin-legend-dot--admin" /> Admin ({summary.categories.admin})</span>
              </div>
            </div>
            <p className="admin-chart-card-subtitle">
              System operations over the past 7 days. Hover any day to inspect the exact activity composition.
            </p>
          </div>

          <div className="admin-horizon-wrap">
            {summary.timeline.map((item) => {
              const heightPct = item.total > 0
                ? Math.max(18, Math.round((item.total / maxTimelineCount) * 100))
                : 0;
              const formattedDate = formatShortDate(item.day);
              const weekday = formatDayWeekday(item.day);
              const isHovered = hoveredDay === item.day;
              const tooltipText = `${formattedDate} (${item.day}): ${item.total} events — ${item.breakdown.assessments} assessments, ${item.breakdown.chatbot} chat queries, ${item.breakdown.user} user logins, ${item.breakdown.admin} admin actions`;

              return (
                <div
                  key={item.day}
                  className={`admin-horizon-col ${isHovered ? 'admin-horizon-col--active' : ''}`}
                  onMouseEnter={() => setHoveredDay(item.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={tooltipText}
                >
                  {item.total > 0 ? (
                    <span className="admin-horizon-count">{item.total}</span>
                  ) : null}

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
                          title={`Users: ${item.breakdown.user}`}
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
                    <div className="admin-horizon-zero" title="No operations recorded on this day" />
                  )}

                  <span className={`admin-horizon-day-name ${item.isToday ? 'admin-horizon-day-name--today' : ''}`}>
                    {item.isToday ? 'Today' : weekday}
                  </span>
                  <span className="admin-horizon-date">{formattedDate}</span>
                </div>
              );
            })}
          </div>

          {hoveredDay ? (
            <div className="admin-timeline-hover-info">
              {(() => {
                const found = summary.timeline.find((t) => t.day === hoveredDay);
                if (!found) return null;
                const weekday = formatDayWeekday(found.day);
                const formatted = formatShortDate(found.day);
                return (
                  <span>
                    <strong>{found.isToday ? 'Today' : weekday}, {formatted}:</strong> {found.total} total system operations &mdash;{' '}
                    <span style={{ color: '#d97706', fontWeight: 600 }}>{found.breakdown.assessments} assessments</span>,{' '}
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{found.breakdown.chatbot} chat queries</span>,{' '}
                    <span style={{ color: '#059669', fontWeight: 600 }}>{found.breakdown.user} user logins</span>,{' '}
                    <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{found.breakdown.admin} admin actions</span>.
                  </span>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
              <span>7-Day Volume: <strong style={{ color: 'var(--ink)' }}>{summary.totalVolume7Days} ops</strong></span>
              <span>Peak Day: <strong style={{ color: 'var(--ink)' }}>{summary.maxTimelineTotal} ops</strong></span>
              <span>Audit Trail: <strong style={{ color: '#059669' }}>100% Verified</strong></span>
            </div>
          )}
        </div>

        {/* Chart 2: Student Career Pathways & Domain Distribution (FR-13-02 / FR-15-01) */}
        <div className="admin-chart-card">
          <div className="admin-chart-card-header">
            <div className="admin-chart-card-title-row">
              <h3>Career Pathways &amp; Aptitude Distribution</h3>
              <span className="admin-kpi-tag" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                FR-13 Analysis
              </span>
            </div>
            <p className="admin-chart-card-subtitle">
              Aptitude alignment and primary career categories matched across student quiz evaluations.
            </p>
          </div>

          <div className="admin-domain-list">
            {Object.entries(domainConfig).map(([key, config]) => {
              const count = summary.domainCounts[key] || 0;
              const pct = totalAssessments > 0 ? ((count / totalAssessments) * 100).toFixed(1) : 0;
              const barWidth = Math.max(count > 0 ? 12 : 2, Math.round((count / Math.max(1, totalAssessments)) * 100));

              return (
                <div key={key} className="admin-domain-card">
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
                  <div className="admin-bar-track" style={{ height: '8px' }}>
                    <div className="admin-bar-fill" style={{ width: `${barWidth}%`, background: config.gradient }} />
                  </div>
                  <div className="admin-domain-subpaths">
                    <span style={{ fontWeight: 600, color: 'var(--ink-faint)' }}>Matched Careers:</span> {config.subpaths}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Specific Top Career Titles */}
          {summary.careerBreakdown.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                Top Recommended Roles:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {summary.careerBreakdown.slice(0, 3).map(([career, count], index) => {
                  const pct = ((count / totalAssessments) * 100).toFixed(0);
                  return (
                    <div key={career} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 8px', background: 'var(--paper)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        #{index + 1} {career}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--ink-muted)', flexShrink: 0 }}>
                        {count} ({pct}%)
                      </span>
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
            <h3>System Operations Registry Breakdown</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
              {summary.breakdown.length} unique operations
            </span>
          </div>
          <p className="admin-chart-card-subtitle">
            Exact frequency of every individual action logged in the system activity journal (FR-15-01).
          </p>
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
  const assessments = data.assessments || [];

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
            Welcome to the Career Counselling Admin Portal. Monitor user accounts, institution listings, and student assessments.
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
        <div className="admin-dashboard-stat admin-dashboard-stat--dark" onClick={() => onNavigate('assessments')} style={{ cursor: 'pointer' }} title="View Assessment Reports">
          <span>Assessments Taken</span>
          <strong>{assessments.length}</strong>
          <small>Student Submissions &rarr;</small>
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
            <button type="button" className="admin-dash-action-btn" onClick={() => onNavigate('users')}>
              Manage Users &rarr;
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
            <button type="button" className="admin-dash-action-btn" onClick={() => onNavigate('universities')}>
              View Universities &rarr;
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
          <button type="button" className="admin-dash-action-btn" onClick={() => onNavigate('users')}>
            View All Users &rarr;
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
  return { field: record?.field || '', description: record?.description || '', minimumMarks: (record?.minimumMarks !== undefined && record?.minimumMarks !== null && record?.minimumMarks !== '') ? record.minimumMarks : '' };
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
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>FR-13-02 Performance Analysis</span>
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

function MonitoringTable({ tab, records, users = [] }) {
  const [visibleChatbotCount, setVisibleChatbotCount] = useState(10);
  const [visibleAssessmentsCount, setVisibleAssessmentsCount] = useState(10);
  const [chatbotSearch, setChatbotSearch] = useState('');
  const [chatbotFilter, setChatbotFilter] = useState('all');
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentFilter, setAssessmentFilter] = useState('all');
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
  const [tab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatbotView, setChatbotView] = useState('log');
  const [resourceView, setResourceView] = useState('list');
  const [users, setUsers] = useState([]); const [records, setRecords] = useState([]);
  const [dashboardData, setDashboardData] = useState({ users: [], activity: [], assessments: [], chatbot: [], scholarships: [], universities: [] });
  const [editingUser, setEditingUser] = useState(null); const [editingRecord, setEditingRecord] = useState(null); const [editingProgram, setEditingProgram] = useState(null);
  const [universitySearch, setUniversitySearch] = useState(''); const [universityCityFilter, setUniversityCityFilter] = useState('all'); const [scholarshipSearch, setScholarshipSearch] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [formResetKey, setFormResetKey] = useState(0);
  const [userSearch, setUserSearch] = useState(''); const [userFilter, setUserFilter] = useState('all');
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
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      navigate('/admin/login', { replace: true });
      throw new Error('Administrator session expired. Please sign in again.');
    }
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    if (response.status === 401) {
      await supabase.auth.signOut();
      navigate('/admin/login', { replace: true });
      throw new Error('Admin session expired. Please log in again.');
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
    const [stats, scholarships, universities, eligibility, assessments] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/scholarships'),
      api('/api/admin/universities'),
      api('/api/admin/eligibility'),
      api('/api/admin/assessments').catch(() => ({ records: [] })),
    ]);
    const sortedUsers = (stats.users || []).sort((a, b) => timestampValue(b) - timestampValue(a));
    setUsers(sortedUsers);
    setDashboardData({
      users: sortedUsers,
      scholarships: scholarships.records || [],
      universities: universities.records || [],
      eligibility: eligibility.records || [],
      assessments: assessments.records || [],
    });
  };
  useEffect(() => { loadDashboard().catch((loadError) => setError(loadError.message)); }, []);
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

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setResourceView('list');
    setEditingRecord(null); setEditingProgram(null); setError(''); setNotice('');
    setUniversityCityFilter('all'); setUniversitySearch(''); setScholarshipSearch('');
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

  const saveUser = async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingUser.name, email: editingUser.email, blocked: Boolean(editingUser.blocked) }),
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

  const signOut = async () => { await supabase.auth.signOut(); navigate('/admin/login', { replace: true }); };

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
              <table className="admin-table admin-users-table">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '21%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '24%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Name</th>
                    <th style={{ textAlign: 'left' }}>Email</th>
                    <th style={{ textAlign: 'center' }}>Provider</th>
                    <th style={{ textAlign: 'center' }}>Verified</th>
                    <th style={{ textAlign: 'center' }}>Last login</th>
                    <th style={{ textAlign: 'center' }}>Access</th>
                    <th className="admin-col-actions" style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{ textAlign: 'left' }}><strong style={{ color: 'var(--ink)' }}>{user.name}</strong></td>
                      <td style={{ textAlign: 'left' }}>{user.email}</td>
                      <td style={{ textAlign: 'center' }}>{user.authProvider}</td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusPill tone={user.emailConfirmed ? 'good' : 'warn'}>
                          {user.emailConfirmed ? 'Verified' : 'Unverified'}
                        </StatusPill>
                      </td>
                      <td style={{ textAlign: 'center' }}>{formatDateTime(user.lastSignInAt)}</td>
                      <td style={{ textAlign: 'center' }}><StatusPill tone={user.blocked ? 'warn' : 'good'}>{user.blocked ? 'Blocked' : 'Active'}</StatusPill></td>
                      <td className="admin-col-actions" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div className="admin-user-actions-wrap">
                          <button className="admin-action admin-action--user admin-action--toggle" type="button" onClick={() => toggleUserBlock(user)}>{user.blocked ? 'Unblock' : 'Block'}</button>
                          <button className="admin-action admin-action--user admin-action--edit" type="button" onClick={() => setEditingUser({ ...user })}>Edit</button>
                          <button className="admin-action admin-action--user admin-action--danger" type="button" onClick={() => deleteUser(user)}>Delete</button>
                        </div>
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
            <SystemReportsView records={records} users={users} />
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
              <MonitoringTable tab={activeResource} records={records} users={users} />
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
                        {activeResource === 'eligibility' && (
                          <span className="admin-card-chip admin-card-chip--location" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                            🎯 Minimum: {record.minimumMarks}% Marks
                          </span>
                        )}
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
                <button
                  type="button"
                  className="admin-export-btn"
                  onClick={() => { setResourceView('list'); setEditingRecord(null); setNotice(''); setError(''); }}
                  title={`Return to ${resourceLabels[activeResource] || 'records'}`}
                >
                  &larr; Back to {activeResource === 'eligibility' ? 'Eligibility' : (resourceLabels[activeResource] || 'Records')}
                </button>
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