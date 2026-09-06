import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabase";
import { readUserProfile } from "../data/userData";

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function scholarshipEligibility(scholarship, marks) {
  const minPercentage = scholarship.min_percentage;
  if (minPercentage === null || minPercentage === undefined || minPercentage === '') {
    return 'unknown';
  }
  if (marks === null) {
    return 'unknown';
  }
  return marks >= Number(minPercentage) ? 'eligible' : 'not-eligible';
}

function ScholarshipFinder() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [scholarships, setScholarships] = useState([]);
  const [search, setSearch] = useState('');
  const [marks, setMarks] = useState(null);
  const [onlyEligible, setOnlyEligible] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/scholarships`)
      .then((response) => response.json())
      .then((data) => {
        setScholarships(data);
      })
      .catch((error) => {
        console.log("Error fetching scholarships:", error);
      });
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('profiles')
      .select('marks, intermediate_marks')
      .eq('id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        const localProfile = readUserProfile(currentUser.id);
        const value = localProfile?.intermediateMarks || localProfile?.marks || data?.intermediate_marks || data?.marks;
        setMarks(value ? Number(value) : null);
      })
      .catch(() => setMarks(null));
  }, [currentUser]);

  const filteredScholarships = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scholarships
      .filter((scholarship) => [scholarship.name, scholarship.provider, scholarship.field]
        .some((value) => String(value || '').toLowerCase().includes(query)))
      .filter((scholarship) => !onlyEligible || scholarshipEligibility(scholarship, marks) !== 'not-eligible')
      .sort((a, b) => {
        const rank = { eligible: 0, unknown: 1, 'not-eligible': 2 };
        return rank[scholarshipEligibility(a, marks)] - rank[scholarshipEligibility(b, marks)];
      });
  }, [scholarships, search, onlyEligible, marks]);

  return (
    <div
      style={{
        padding: "40px",
        minHeight: "100vh",
        background: "#f8f5f2",
      }}
    >
      {/* Heading Section */}

      <div
        style={{
          marginBottom: "40px",
          borderBottom: "2px solid #d7ccc8",
          paddingBottom: "20px",
        }}
      >
      <button type="button" onClick={() => navigate('/result')} style={{ marginBottom: "20px", padding: "9px 14px", border: "1px solid #d7ccc8", borderRadius: "8px", background: "#fff", color: "#3e2723" }}>
        ← Back to results
      </button>
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "18px",
            marginTop: "10px",
            color: "#3e2723",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            lineHeight: "1.3",
          }}
        >
          <span style={{ fontSize: "44px" }}>🎓</span>
          Scholarship Finder
        </h1>

        <p
          style={{
            color: "#6d4c41",
            fontSize: "18px",
            lineHeight: "1.7",
            maxWidth: "750px",
          }}
        >
          Find scholarships based on your academic background,
          marks, and interests.
        </p>
      </div>

      {/* Scholarship Cards */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <input
          type="search"
          aria-label="Search scholarships"
          placeholder="Search scholarships by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "13px 15px",
            border: "1px solid #d7ccc8",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#3e2723",
            fontSize: "16px",
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#5d4037", fontSize: "15px", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={onlyEligible} onChange={(event) => setOnlyEligible(event.target.checked)} />
          Show only scholarships I'm eligible for
        </label>
      </div>

      {marks === null && (
        <p style={{ color: "#6d4c41", marginBottom: "20px" }}>
          Add your marks in your <a href="/profile" style={{ color: "#3e2723", fontWeight: 600 }}>Profile</a> to see which scholarships you're eligible for.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "25px",
          alignItems: "stretch",
        }}
      >
        {filteredScholarships.map((scholarship, index) => {
          const eligibility = scholarshipEligibility(scholarship, marks);
          const badgeStyle = {
            eligible: { background: "#e3f3e8", color: "#28734a" },
            'not-eligible': { background: "#fbe6e3", color: "#a52b22" },
            unknown: { background: "#f0e2d4", color: "#7a5f4f" },
          }[eligibility];
          const badgeLabel = {
            eligible: "✓ You're eligible",
            'not-eligible': "✗ Below required merit",
            unknown: "Merit not specified",
          }[eligibility];
          return (
            <div
              key={index}
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                padding: "25px",
                boxShadow:
                  "0 4px 12px rgba(62, 39, 35, 0.08)",
                border: "1px solid #d7ccc8",
                transition: "0.3s",
                height: "310px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <h2
                  style={{
                    color: "#3e2723",
                    fontSize: "22px",
                    lineHeight: "1.4",
                    margin: 0,
                  }}
                >
                  {scholarship.name}
                </h2>
                <span style={{ ...badgeStyle, padding: "5px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {badgeLabel}
                </span>
              </div>

              <div
                style={{
                  marginBottom: "12px",
                  color: "#5d4037",
                  fontSize: "16px",
                }}
              >
                <strong>Minimum Percentage:</strong>{" "}
                {scholarship.min_percentage}%
              </div>

              <div
                style={{
                  marginBottom: "22px",
                  color: "#5d4037",
                  fontSize: "16px",
                }}
              >
                <strong>Field:</strong>{" "}
                {scholarship.field}
              </div>

              <a
                href={scholarship.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  background: "#6d4c41",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  transition: "0.3s",
                  marginTop: "auto",
                }}
              >
                Apply Now
              </a>
            </div>
          );
        })}
      </div>
      {filteredScholarships.length === 0 && (
        <p style={{ color: "#6d4c41", marginTop: "24px" }}>
          No scholarships match your search.
        </p>
      )}
    </div>
  );
}

export default ScholarshipFinder;