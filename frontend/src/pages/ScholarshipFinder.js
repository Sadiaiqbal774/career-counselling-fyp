import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabase";
import { readUserProfile, readUserQuizData } from "../data/userData";
import { isItemBookmarked, toggleItemBookmark } from "../data/bookmarkData";

const BACKEND_FALLBACK = "https://career-counselling-fyp.onrender.com";

const resolveApiUrl = () => {
  const envUrl = (process.env.REACT_APP_API_URL || "").trim().replace(/\/+$/, '');
  if (envUrl) return envUrl;
  if (typeof window !== "undefined" && window.location && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return BACKEND_FALLBACK;
  }
  return "http://127.0.0.1:5000";
};

const API_URL = resolveApiUrl();

export function formatApplyUrl(url, scholarshipName = "") {
  const domainRedirects = {
    "ehsaas.hec.gov.pk": "https://www.hec.gov.pk/english/scholarshipsgrants/ehsaas/Pages/default.aspx",
    // add more domain corrections here if needed
  };
  const brokenDomains = ["wwf.gov.pk", "febgif.gov.pk"]; // extend as required

  // Guard for missing/invalid URLs – fall back to Google search or placeholder
  if (!url || typeof url !== "string") {
    return scholarshipName
      ? `https://www.google.com/search?q=${encodeURIComponent(scholarshipName + " scholarship application")}`
      : "#";
  }

  // Normalise the URL (trim, strip quotes/parentheses, remove extra delimiters)
  let trimmed = url.trim().replace(/^['\"]+|['\"]+$/g, "");
  trimmed = trimmed.replace(/\(.*?\)/g, "").trim();
  if (trimmed.includes(";")) trimmed = trimmed.split(";")[0].trim();
  if (trimmed.includes(" / ")) trimmed = trimmed.split(" / ")[0].trim();
  trimmed = trimmed.replace(/[.,;)]+$/, "");

  const lower = trimmed.toLowerCase();

  // 1️⃣ Redirect known broken domain to a working URL
  if (domainRedirects[lower]) {
    return domainRedirects[lower];
  }

  // 2️⃣ If the URL belongs to a dead domain, fall back to Google search for the scholarship name
  if (brokenDomains.some(d => lower.includes(d))) {
    return `https://www.google.com/search?q=${encodeURIComponent(scholarshipName + " scholarship application")}`;
  }

  // 3️⃣ Normal URL handling – keep already‑well‑formed URLs
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed.replace(/^\\\\+/, "")}`;
  }

  // 4️⃣ Fallback – Google search using whichever text we have
  return `https://www.google.com/search?q=${encodeURIComponent((scholarshipName || trimmed) + " scholarship application")}`;
}

function scholarshipEligibility(scholarship, marks) {
  const minPercentage = scholarship.min_percentage;
  if (minPercentage === null || minPercentage === undefined || minPercentage === "") return "unknown";
  if (marks === null) return "unknown";
  return marks >= Number(minPercentage) ? "eligible" : "not-eligible";
}

function getRelevantFields(profile, quizScores) {
  const fields = new Set();
  const group = (profile?.intermediateGroup || "").toLowerCase();
  if (group.includes("engineering") || group.includes("computer")) {
    fields.add("engineering"); fields.add("computer science"); fields.add("technology");
  }
  if (group.includes("medical") || group.includes("bio")) {
    fields.add("medical"); fields.add("biology"); fields.add("health");
  }
  if (group.includes("commerce") || group.includes("business")) {
    fields.add("business"); fields.add("commerce"); fields.add("management");
  }
  if (group.includes("arts") || group.includes("humanities")) {
    fields.add("arts"); fields.add("humanities"); fields.add("social");
  }
  if (quizScores) {
    if ((quizScores.Technology || 0) > 3) { fields.add("technology"); fields.add("computer science"); }
    if ((quizScores.Medical || 0) > 3) { fields.add("medical"); fields.add("health"); }
    if ((quizScores.Business || 0) > 3) { fields.add("business"); fields.add("management"); }
    if ((quizScores.Arts || quizScores.SocialSciences || 0) > 3) { fields.add("arts"); fields.add("social"); }
  }
  return fields;
}

function ScholarshipFinder() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [marks, setMarks] = useState(null);
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [quizScores, setQuizScores] = useState({});
  const [bookmarkTick, setBookmarkTick] = useState(0);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [search, selectedRegion, marks, onlyEligible]);

  const applyCustomOrdering = (items) => {
    const targetName = "HEC Learning Opportunities Abroad (Chinese Govt, Commonwealth, Hungarian etc.)";
    const idx = items.findIndex((s) => s.name === targetName);
    if (idx === -1) return items;
    const desiredIdx = 175;
    if (idx === desiredIdx) return items;
    const newArr = [...items];
    const [item] = newArr.splice(idx, 1);
    if (desiredIdx >= newArr.length) {
      newArr.push(item);
    } else {
      newArr.splice(desiredIdx, 0, item);
    }
    return newArr;
  };

  const fetchScholarships = () => {
    setLoading(true);
    setFetchError(null);

    const tryFetch = (url) => {
      return fetch(`${url}/scholarships`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
    };

    tryFetch(API_URL)
      .catch((err) => {
        if (API_URL !== BACKEND_FALLBACK) {
          console.warn("Primary API URL failed, trying live Render fallback...", err);
          return tryFetch(BACKEND_FALLBACK);
        }
        throw err;
      })
      .then((data) => {
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.records)) {
          list = data.records;
        } else if (data && data.error) {
          throw new Error(data.error);
        }
        setScholarships(applyCustomOrdering(list));
      })
      .catch((err) => {
        console.error("Error fetching scholarships:", err);
        setFetchError("Unable to fetch scholarships from backend. Please verify your connection.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  useEffect(() => {
    const localProfile = readUserProfile(currentUser?.id);
    const { scores: savedScores = {} } = readUserQuizData(currentUser?.id);
    setUserProfile(localProfile);
    setQuizScores(savedScores);
    const localVal = localProfile?.intermediateMarks || localProfile?.marks;
    if (localVal) setMarks(Number(localVal));
    if (!currentUser?.id) return;
    supabase
      .from("profiles")
      .select("marks, intermediate_marks, intermediate_group")
      .eq("id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        const value = data?.intermediate_marks || data?.marks || localVal;
        if (value) setMarks(Number(value));
        if (data?.intermediate_group) {
          setUserProfile((prev) => ({ ...(prev || {}), intermediateGroup: data.intermediate_group }));
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const relevantFields = useMemo(() => getRelevantFields(userProfile, quizScores), [userProfile, quizScores]);

  const filteredScholarships = useMemo(() => {
    const query = search.trim().toLowerCase();
    const region = selectedRegion.trim().toLowerCase();

    return scholarships
      .filter((s) => [s.name, s.provider, s.field, s.provinces].some((v) => String(v || "").toLowerCase().includes(query)))
      .filter((s) => {
        if (!region) return true;
        const prov = String(s.provinces || "").toLowerCase();
        const name = String(s.name || "").toLowerCase();
        return prov.includes(region) || prov.includes("federal") || prov.includes("national") || name.includes(region);
      })
      .filter((s) => !onlyEligible || scholarshipEligibility(s, marks) !== "not-eligible")
      .sort((a, b) => {
        const rank = { eligible: 0, unknown: 1, "not-eligible": 2 };
        return rank[scholarshipEligibility(a, marks)] - rank[scholarshipEligibility(b, marks)];
      });
  }, [scholarships, search, selectedRegion, onlyEligible, marks]);

  const recommendedScholarships = useMemo(() => {
    if (relevantFields.size === 0) return [];
    return scholarships
      .filter((s) => {
        const field = String(s.field || "").toLowerCase();
        return [...relevantFields].some((f) => field.includes(f));
      })
      .slice(0, 4);
  }, [scholarships, relevantFields]);

  const handleToggleBookmark = (scholarship) => {
    toggleItemBookmark(currentUser?.id, "scholarships", scholarship);
    setBookmarkTick((t) => t + 1);
  };

  const renderCard = (scholarship, key) => {
    const eligibility = scholarshipEligibility(scholarship, marks);
    const isSaved = isItemBookmarked(currentUser?.id, "scholarships", scholarship);
    const badgeStyle = {
      eligible: { background: "#e3f3e8", color: "#28734a", border: "1px solid #b9dfc4" },
      "not-eligible": { background: "#fbe6e3", color: "#a52b22", border: "1px solid #f2c0bc" },
      unknown: { background: "#f3ede6", color: "#8a5f1c", border: "1px solid #e2d2c1" },
    }[eligibility];
    const badgeLabel = {
      eligible: "You are eligible",
      "not-eligible": "Below required merit",
      unknown: "Merit not specified",
    }[eligibility];

    return (
      <div key={key} className="scholarship-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px 12px", marginBottom: "12px", flexWrap: "wrap" }}>
          <h2 className="scholarship-card-title" style={{ flex: "1 1 180px", minWidth: 0, margin: 0, wordBreak: "break-word" }}>
            {scholarship.name}
          </h2>
          <span
            className="scholarship-card-badge"
            style={{
              ...badgeStyle,
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: 1.3,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              maxWidth: "100%",
              wordBreak: "break-word",
            }}
          >
            {badgeLabel}
          </span>
        </div>
        {scholarship.provider && (
          <div className="scholarship-card-meta"><strong>Provider:</strong> {scholarship.provider}</div>
        )}
        <div className="scholarship-card-meta"><strong>Minimum Percentage:</strong> {scholarship.min_percentage ?? "N/A"}%</div>
        {scholarship.provinces && (
          <div className="scholarship-card-meta"><strong>Region:</strong> {scholarship.provinces}</div>
        )}
        <div className="scholarship-card-meta" style={{ marginBottom: "20px" }}>
          <strong>Field:</strong> {scholarship.field}
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "auto", alignItems: "center" }}>
          <a
            href={formatApplyUrl(scholarship.link || scholarship.source_url, scholarship.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="scholarship-apply-btn"
            style={{ flex: 1, marginTop: 0, textAlign: "center" }}
          >
            Apply Now →
          </a>
          <button
            type="button"
            onClick={() => handleToggleBookmark(scholarship)}
            style={{
              padding: "11px 16px",
              borderRadius: "8px",
              border: isSaved ? "1.5px solid var(--accent, #b8863a)" : "1.5px solid var(--border, #d7ccc8)",
              background: isSaved ? "rgba(193, 123, 63, 0.15)" : "var(--surface, #ffffff)",
              color: isSaved ? "var(--accent, #8a5f1c)" : "var(--text, #5d4037)",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
            title={isSaved ? "Remove from bookmarks" : "Save bookmark"}
          >
            <span style={{ fontSize: "16px", color: isSaved ? "#b8863a" : "inherit" }}>{isSaved ? "★" : "☆"}</span>
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>
    );
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "25px",
    alignItems: "stretch",
  };

  return (
    <div className="scholarship-page">
      <div className="scholarship-header">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
          <button type="button" onClick={() => navigate("/dashboard")} className="scholarship-nav-btn">← Back to Dashboard</button>
          <button type="button" onClick={() => navigate("/result")} className="scholarship-nav-btn">Back to results</button>
          <button type="button" onClick={() => navigate("/university-recommender")}
            style={{ padding: "9px 16px", border: "1px solid #c17b3f", borderRadius: "8px", background: "#c17b3f", color: "#fff", fontWeight: "600", cursor: "pointer" }}>
            University Recommender
          </button>
          <button type="button" onClick={() => navigate("/saved")} className="scholarship-nav-btn">⭐ Saved</button>
        </div>
        <h1 className="scholarship-title"><span style={{ fontSize: "44px" }}>🎓</span>Scholarship Finder</h1>
        <p className="scholarship-subtitle">Find scholarships based on your academic background, marks, and interests.</p>
      </div>

      {recommendedScholarships.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", marginBottom: "6px", color: "var(--text, #3e2723)" }}>Recommended for You</h2>
          <p style={{ fontSize: "14px", color: "var(--muted, #6d4c41)", marginBottom: "18px" }}>
            Based on your {userProfile?.intermediateGroup ? `${userProfile.intermediateGroup} background` : "quiz results and interests"}.
          </p>
          <div style={gridStyle}>{recommendedScholarships.map((s, i) => renderCard(s, `rec-${i}`))}</div>
          <hr style={{ margin: "36px 0", borderColor: "var(--border, #d7ccc8)" }} />
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
        flexWrap: "wrap",
        background: "var(--surface, #ffffff)",
        padding: "16px 20px",
        borderRadius: "14px",
        border: "1px solid var(--border, #e0d0bf)",
        boxShadow: "0 2px 8px rgba(62, 39, 35, 0.05)"
      }}>
        <input
          type="search"
          aria-label="Search scholarships"
          placeholder="Search by name, provider or field"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="scholarship-search-input"
          style={{ minWidth: "240px", flex: 1 }}
        />

        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1.5px solid var(--border, #d7ccc8)",
            background: "var(--surface, #fff)",
            color: "var(--text, #3e2723)",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer"
          }}
          aria-label="Filter by region or province"
        >
          <option value="">All Regions &amp; Provinces</option>
          <option value="Federal">Federal / National</option>
          <option value="Punjab">Punjab</option>
          <option value="Sindh">Sindh</option>
          <option value="Khyber">KPK</option>
          <option value="Balochistan">Balochistan</option>
          <option value="Islamabad">Islamabad</option>
          <option value="Azad Jammu">Azad Jammu &amp; Kashmir</option>
          <option value="International">International / Abroad</option>
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label htmlFor="student-marks-input" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text, #5d4037)", whiteSpace: "nowrap" }}>Your Marks:</label>
          <input
            id="student-marks-input"
            type="number"
            min="0"
            max="100"
            placeholder="e.g. 80"
            value={marks !== null && marks !== undefined ? marks : ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value)));
              setMarks(val);
            }}
            style={{
              width: "72px",
              padding: "9px 8px",
              borderRadius: "8px",
              border: "1.5px solid var(--border, #d7ccc8)",
              background: "var(--surface, #fff)",
              color: "var(--text, #3e2723)",
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center"
            }}
          />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text, #5d4037)" }}>%</span>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text, #3e2723)", whiteSpace: "nowrap", cursor: "pointer", fontWeight: 500 }}>
          <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} /> Show only eligible
        </label>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted, #6d4c41)", fontSize: "16px" }}>
          <div style={{ display: "inline-block", width: "28px", height: "28px", border: "3px solid #e0d0bf", borderTopColor: "#c17b3f", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "12px" }}></div>
          <div>Loading scholarships...</div>
        </div>
      )}

      {fetchError && !loading && (
        <div style={{ background: "#fbe6e3", border: "1px solid #f2c0bc", color: "#a52b22", padding: "14px 18px", borderRadius: "10px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <span>{fetchError}</span>
          <button type="button" onClick={fetchScholarships} style={{ background: "#a52b22", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {!loading && !fetchError && (
        <>
          <div style={gridStyle}>
            {filteredScholarships.slice(0, visibleCount).map((s, i) => renderCard(s, s.id || i))}
          </div>
          {filteredScholarships.length === 0 && <p style={{ marginTop: "24px" }}>No scholarships match your filter criteria.</p>}
          {visibleCount < filteredScholarships.length && (
            <div style={{ textAlign: "center", marginTop: "36px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="scholarship-show-more-btn"
                style={{
                  padding: "12px 28px",
                  borderRadius: "10px",
                  border: "1.5px solid var(--accent, #c17b3f)",
                  background: "var(--surface, #ffffff)",
                  color: "var(--accent, #c17b3f)",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                Show More Scholarships ({filteredScholarships.length - visibleCount} remaining) ↓
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ScholarshipFinder;
