import React, { useEffect, useState } from "react";

function ScholarshipFinder() {

  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================
  // FETCH SCHOLARSHIPS
  // =========================================
  useEffect(() => {

    const fetchScholarships = async () => {

      try {

        // Dummy request to backend
        const response = await fetch(
          "http://localhost:5000/predict",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              Math: 3,
              Biology: 3,
              Computer: 3,
              Communication: 3,
              Leadership: 3,
              Marks: 100,
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

        setError(
          "Unable to load scholarships. Please run backend server."
        );

      }

      setLoading(false);
    };

    fetchScholarships();

  }, []);

  return (

    <div style={styles.page}>

      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>

          <h1 style={styles.title}>
            Scholarship Finder
          </h1>

          <p style={styles.subtitle}>
            Explore national and international scholarships
            based on merit and academic eligibility.
          </p>

        </div>

        {/* LOADING */}
        {loading && (
          <div style={styles.messageBox}>
            Loading scholarships...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* SCHOLARSHIP LIST */}
        {!loading && scholarships.length > 0 && (

          <div style={styles.grid}>

            {scholarships.map((scholarship, index) => (

              <div
                key={index}
                style={styles.card}
              >

                <h3 style={styles.cardTitle}>
                  {scholarship.name}
                </h3>

                <div style={styles.tags}>

                  <span style={styles.tag}>
                    Eligibility:{" "}
                    {scholarship.min_percentage}%+
                  </span>

                  <span style={styles.tag}>
                    {scholarship.field}
                  </span>

                </div>

                <p style={styles.description}>
                  Scholarship opportunity available for
                  students meeting the required merit criteria.
                </p>

                <a
                  href={scholarship.link}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.button}
                >
                  View Details
                </a>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

// =========================================
// STYLES
// =========================================
const styles = {

  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif"
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto"
  },

  header: {
    marginBottom: "30px"
  },

  title: {
    fontSize: "34px",
    color: "#2c3e50",
    marginBottom: "10px"
  },

  subtitle: {
    fontSize: "15px",
    color: "#666"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px"
  },

  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "22px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb"
  },

  cardTitle: {
    fontSize: "20px",
    color: "#2c3e50",
    marginBottom: "14px"
  },

  tags: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px"
  },

  tag: {
    background: "#eef2ff",
    color: "#4338ca",
    padding: "6px 12px",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "600"
  },

  description: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.6",
    marginBottom: "20px"
  },

  button: {
    display: "inline-block",
    padding: "10px 16px",
    background: "#2c3e50",
    color: "#fff",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600"
  },

  messageBox: {
    background: "#ffffff",
    padding: "18px",
    borderRadius: "10px",
    textAlign: "center",
    color: "#555",
    marginTop: "20px"
  },

  errorBox: {
    background: "#fdecea",
    color: "#c0392b",
    padding: "14px",
    borderRadius: "10px",
    marginTop: "20px"
  }
};

export default ScholarshipFinder;