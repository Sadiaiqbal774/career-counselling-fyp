import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  careerRecommendations,
  getHighestCategory,
  getTopCategories,
  storageKeys,
} from "../data/quizData";

function Result() {

  const navigate = useNavigate();

  const storedScores = JSON.parse(
    localStorage.getItem(storageKeys.scores) || "null"
  );

  const [scholarships, setScholarships] = useState([]);
  const [loadingScholarships, setLoadingScholarships] = useState(true);

  // =========================================
  // REDIRECT IF NO RESULT
  // =========================================
  if (!storedScores) {
    return <Navigate to="/" replace />;
  }

  // =========================================
  // RESULT DATA
  // =========================================
  const highestCategory =
    getHighestCategory(storedScores);

  const topCategories =
    getTopCategories(storedScores);

  const recommendation =
    careerRecommendations[highestCategory];

  // =========================================
  // FETCH SCHOLARSHIPS
  // =========================================
  useEffect(() => {

    const fetchScholarships = async () => {

      try {

        // Estimated merit
        const estimatedMarks = 75;

        const response = await fetch(
          "http://localhost:5000/predict",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              Math: 4,
              Biology: 4,
              Computer: 4,
              Communication: 4,
              Leadership: 4,
              Marks: estimatedMarks,
              Background: "ICS",
              City: "Lahore"
            })
          }
        );

        const data = await response.json();

        if (data.scholarships) {
          setScholarships(data.scholarships);
        }

      } catch (err) {

        console.log(err);

      }

      setLoadingScholarships(false);
    };

    fetchScholarships();

  }, []);

  // =========================================
  // RESET QUIZ
  // =========================================
  const handleRestart = () => {

    localStorage.removeItem(storageKeys.scores);
    localStorage.removeItem(storageKeys.topCategories);

    navigate("/");

  };

  return (

    <main className="page-shell">

      <section
        className="card result-card"
        style={{
          maxWidth: "1000px"
        }}
      >

        {/* HEADER */}

        <p className="eyebrow">
          Career Assessment Result
        </p>

        <h1>
          {recommendation}
        </h1>

        <p className="muted-text">
          Based on your highest score, your strongest
          career fit is in the{" "}
          <strong>{highestCategory}</strong> field.
        </p>

        {/* TOP CATEGORIES */}

        <div className="result-panel">

          <h2>Top Categories</h2>

          <ul className="result-list">

            {topCategories.map((category) => (

              <li key={category}>
                {category}: {storedScores[category]} points
              </li>

            ))}

          </ul>

        </div>

        {/* SCORE SUMMARY */}

        <div className="result-panel">

          <h2>Score Summary</h2>

          <ul className="result-list">

            {Object.entries(storedScores).map(
              ([category, score]) => (

                <li key={category}>
                  {category}: {score} points
                </li>

              )
            )}

          </ul>

        </div>

        {/* SCHOLARSHIPS */}

        <div
          className="result-panel"
          style={{
            marginTop: "30px"
          }}
        >

          <h2>
            Recommended Scholarships
          </h2>

          {loadingScholarships ? (

            <p className="muted-text">
              Loading scholarships...
            </p>

          ) : scholarships.length > 0 ? (

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "18px",
                marginTop: "18px"
              }}
            >

              {scholarships.map(
                (scholarship, index) => (

                  <div
                    key={index}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "18px",
                      boxShadow:
                        "0 4px 10px rgba(0,0,0,0.06)"
                    }}
                  >

                    <h3
                      style={{
                        marginBottom: "12px",
                        color: "#2c3e50",
                        fontSize: "18px"
                      }}
                    >
                      {scholarship.name}
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "12px"
                      }}
                    >

                      <span
                        style={{
                          background: "#eef2ff",
                          color: "#4338ca",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        {scholarship.min_percentage}%+
                      </span>

                      <span
                        style={{
                          background: "#f3f4f6",
                          color: "#374151",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        {scholarship.field}
                      </span>

                    </div>

                    <p
                      style={{
                        fontSize: "14px",
                        color: "#666",
                        lineHeight: "1.5",
                        marginBottom: "18px"
                      }}
                    >
                      Scholarship opportunity available
                      for students meeting the required
                      merit criteria.
                    </p>

                    <a
                      href={scholarship.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "10px 16px",
                        background: "#2c3e50",
                        color: "#fff",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}
                    >
                      View Details
                    </a>

                  </div>

                )
              )}

            </div>

          ) : (

            <p className="muted-text">
              No scholarships available at the moment.
            </p>

          )}

        </div>

        {/* BUTTONS */}

        <div className="button-row">

          <button
            type="button"
            className="secondary-button"
            onClick={handleRestart}
          >
            Start Over
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/general-quiz")}
          >
            Retake Quiz
          </button>

        </div>

      </section>

    </main>
  );
}

export default Result;