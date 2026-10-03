import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabase";
import { readUserProfile, readUserQuizData } from "../data/userData";
import { isItemBookmarked, toggleItemBookmark } from "../data/bookmarkData";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

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
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [marks, setMarks] = useState(null);
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [quizScores, setQuizScores] = useState({});
  const [bookmarkTick, setBookmarkTick] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/scholarships`)
      .then((res) => res.json())
      .then((data) => setScholarships(data))
      .catch((err) => console.log("Error fetching scholarships:", err));
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
    // eslint-disable-next-line no-unused-expressions
    bookmarkTick;
    const isSaved = isItemBookmarked(currentUser?.id, "scholarships", scholarship);
    const badgeStyle = {
      eligible: { background: "#e3f3e8", color: "#28734a" },
      "not-eligible": { background: "#fbe6e3", color: "#a52b22" },
      unknown: { background: "#f0e2d4", color: "#7a5f4f" },
    }[eligibility];
    const badgeLabel = {
      eligible: "You are eligible",
      "not-eligible": "Below required merit",
      unknown: "Merit not specified",
    }[eligibility];

    return (
      <div key={key} className="scholarship-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
          <h2 className="scholarship-card-title">{scholarship.name}</h2>
          <span style={{ ...badgeStyle, padding: "5px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
            {badgeLabel}
          </span>
        </div>
        {scholarship.provider && (
          <div className="scholarship-card-meta"><strong>Provider:</strong> {scholarship.provider}</div>
        )}
        <div className="scholarship-card-meta">
          <strong>Minimum Percentage:</strong> {scholarship.min_percentage ?? "N/A"}%
        </div>
        {scholarship.provinces && (
          <div className="scholarship-card-meta">
            <strong>Region:</strong> {scholarship.provinces}
          </div>
        )}
        <div className="scholarship-card-meta" style={{ marginBottom: "20px" }}>
          <strong>Field:</strong> {scholarship.field}
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "auto", alignItems: "center" }}>
          <a href={scholarship.link} target="_blank" rel="noreferrer" className="scholarship-apply-btn" style={{ flex: 1, marginTop: 0, textAlign: "center" }}>
            Apply Now
          </a>
          <button
            type="button"
            onClick={() => handleToggleBookmark(scholarship)}
            style={{
              padding: "11px 16px",
              borderRadius: "8px",
              border: isSaved ? "1.5px solid #b8863a" : "1.5px solid #d7ccc8",
              background: isSaved ? "#faf1de" : "#ffffff",
              color: isSaved ? "#8a5f1c" : "#5d4037",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease"
            }}
            title={isSaved ? "Remove from saved opportunities in profile" : "Save to Profile"}
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
          <button type="button" onClick={() => navigate("/result")} className="scholarship-nav-btn">Back to results</button>
          <button type="button" onClick={() => navigate("/university-recommender")}
            style={{ padding: "9px 16px", border: "1px solid #c17b3f", borderRadius: "8px", background: "#c17b3f", color: "#fff", fontWeight: "600", cursor: "pointer" }}>
            University Recommender
          </button>
          <button type="button" onClick={() => navigate("/profile")} className="scholarship-nav-btn">Saved in Profile</button>
          <button type="button" onClick={() => navigate("/dashboard")} className="scholarship-nav-btn">Dashboard</button>
        </div>
        <h1 className="scholarship-title"><span style={{ fontSize: "44px" }}>🎓</span>Scholarship Finder</h1>
        <p className="scholarship-subtitle">Find scholarships based on your academic background, marks, and interests.</p>
      </div>

      {recommendedScholarships.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", marginBottom: "6px", color: "#3e2723" }}>Recommended for You</h2>
          <p style={{ fontSize: "14px", color: "#6d4c41", marginBottom: "18px" }}>
            Based on your {userProfile?.intermediateGroup ? `${userProfile.intermediateGroup} background` : "quiz results and interests"}.
          </p>
          <div style={gridStyle}>{recommendedScholarships.map((s, i) => renderCard(s, `rec-${i}`))}</div>
          <hr style={{ margin: "36px 0", borderColor: "#d7ccc8" }} />
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
        flexWrap: "wrap",
        background: "#ffffff",
        padding: "16px 20px",
        borderRadius: "14px",
        border: "1px solid #e0d0bf",
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
            border: "1.5px solid #d7ccc8",
            background: "#fff",
            color: "#3e2723",
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
          <label htmlFor="student-marks-input" style={{ fontSize: "14px", fontWeight: 600, color: "#5d4037", whiteSpace: "nowrap" }}>
            Your Marks:
          </label>
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
              border: "1.5px solid #d7ccc8",
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center"
            }}
          />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#5d4037" }}>%</span>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#3e2723", whiteSpace: "nowrap", cursor: "pointer", fontWeight: 500 }}>
          <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
          Show only eligible
        </label>
      </div>

      <div style={gridStyle}>{filteredScholarships.map((s, i) => renderCard(s, i))}</div>
      {filteredScholarships.length === 0 && <p style={{ marginTop: "24px" }}>No scholarships match your filter criteria.</p>}
    </div>
  );
}

export default ScholarshipFinder;
