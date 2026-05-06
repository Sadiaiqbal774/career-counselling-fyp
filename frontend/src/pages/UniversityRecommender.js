import React, { useState, useRef } from "react";

// ─── Google Font ───────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// ─── CSS Variables & Global Styles ────────────────────────────────
const globalStyle = document.createElement("style");

globalStyle.textContent = `
  :root {
    --bg: #F7EFE7;
    --bg-card: #FDF9F5;
    --bg-right: #FFFFFF;
    --accent: #C17B3F;
    --accent-dk: #9E5F28;
    --accent-lt: #F2E0CC;
    --text: #2C2016;
    --text-muted: #7A6555;
    --border: #E0D0BF;
    --success: #2D7A4F;
    --danger: #C0392B;
    --shadow: 0 4px 20px rgba(100,60,20,0.10);
    --radius: 14px;
    --font-head: 'Playfair Display', Georgia, serif;
    --font-body: 'DM Sans', sans-serif;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: var(--bg);
    font-family: var(--font-body);
    color: var(--text);
  }

  .section-title {
    font-family: var(--font-head);
    font-size: 17px;
    color: var(--accent-dk);
    margin: 28px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid var(--border);
  }

  .field-group {
    margin-bottom: 18px;
  }

  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
  }

  .radio-pill {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .radio-pill input[type="radio"] {
    display: none;
  }

  .radio-pill label {
    padding: 8px 16px;
    border: 1.5px solid var(--border);
    border-radius: 99px;
    font-size: 13px;
    color: var(--text-muted);
    cursor: pointer;
    background: var(--bg-card);
    transition: all .18s ease;
  }

  .radio-pill input[type="radio"]:checked + label {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .mark-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: var(--bg-card);
    font-size: 14px;
    color: var(--text);
    outline: none;
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .submit-btn {
    flex: 1;
    padding: 14px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }

  .clear-btn {
    flex: 1;
    padding: 14px;
    background: transparent;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }

  .uni-card {
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    margin-top: 14px;
    box-shadow: var(--shadow);
  }

  .uni-card h4 {
    font-family: var(--font-head);
    font-size: 16px;
    color: var(--accent-dk);
    margin-bottom: 10px;
  }

  .uni-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 8px 0;
  }

  .uni-tag {
    padding: 4px 12px;
    border-radius: 99px;
    font-size: 12px;
    background: var(--accent-lt);
    color: var(--accent-dk);
  }

  .eligible-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 700;
  }

  .eligible-badge.yes {
    background: #d4edda;
    color: var(--success);
  }

  .eligible-badge.no {
    background: #fdecea;
    color: var(--danger);
  }

  .uni-links {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .uni-link {
    font-size: 13px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 8px;
    text-decoration: none;
  }

  .uni-link.primary {
    background: var(--accent-lt);
    color: var(--accent-dk);
  }

  .error-box {
    margin-top: 12px;
    padding: 10px 14px;
    background: #fdecea;
    border: 1px solid #f5c6c2;
    border-radius: 10px;
    color: var(--danger);
    font-size: 13px;
    font-weight: 500;
  }

  .career-header {
    background: linear-gradient(135deg, var(--accent-lt) 0%, #f9f1e8 100%);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 18px;
  }

  .career-header h3 {
    font-family: var(--font-head);
    font-size: 22px;
    color: var(--accent-dk);
  }
`;

document.head.appendChild(globalStyle);

// ─── Radio Component ──────────────────────────────────────────────
function RadioPills({ name, options, onChange, value }) {
  return (
    <div className="radio-pill">
      {options.map(({ val, label }) => (
        <React.Fragment key={val}>
          <input
            type="radio"
            id={`${name}-${val}`}
            name={name}
            value={val}
            onChange={onChange}
            checked={value === val}
          />
          <label htmlFor={`${name}-${val}`}>
            {label}
          </label>
        </React.Fragment>
      ))}
    </div>
  );
}

const INTEREST_OPTS = [
  { val: "1", label: "Low" },
  { val: "2", label: "Below Avg" },
  { val: "3", label: "Average" },
  { val: "4", label: "Good" },
  { val: "5", label: "Excellent" }
];

const BG_OPTS = [
  "ICS",
  "Pre-Medical",
  "Pre-Engineering",
  "Commerce",
  "Arts"
].map(v => ({ val: v, label: v }));

const CITY_OPTS = [
  "Lahore",
  "Islamabad"
].map(v => ({ val: v, label: v }));

// ─── Main Component ───────────────────────────────────────────────
function UniversityRecommender() {

  const [formData, setFormData] = useState({
    Math: "",
    Biology: "",
    Computer: "",
    Communication: "",
    Leadership: "",
    Matric: "",
    Inter: "",
    Background: "",
    City: ""
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resultRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleClearForm = () => {
    setFormData({
      Math: "",
      Biology: "",
      Computer: "",
      Communication: "",
      Leadership: "",
      Matric: "",
      Inter: "",
      Background: "",
      City: ""
    });

    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const avgMarks =
      (parseFloat(formData.Matric) +
        parseFloat(formData.Inter)) / 2;

    const finalData = {
      Math: parseInt(formData.Math),
      Biology: parseInt(formData.Biology),
      Computer: parseInt(formData.Computer),
      Communication: parseInt(formData.Communication),
      Leadership: parseInt(formData.Leadership),
      Marks: avgMarks,
      Background: formData.Background,
      City: formData.City
    };

    try {

      const response = await fetch(
        "http://localhost:5000/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(finalData)
        }
      );

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setResult(data);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth"
        });
      }, 100);

    } catch (err) {

      setError(
        "Server not responding. Please run Flask backend."
      );

    }

    setLoading(false);
  };

  return (

    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg)"
      }}
    >

      {/* LEFT SIDE */}

      <div
        style={{
          width: "50%",
          padding: "32px 28px",
          overflowY: "auto",
          borderRight: "2px solid var(--border)"
        }}
      >

        <h1
          style={{
            fontFamily: "var(--font-head)",
            color: "var(--accent-dk)",
            marginBottom: "10px"
          }}
        >
          Career Counseling System
        </h1>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "14px",
            marginBottom: "20px"
          }}
        >
          Get university and scholarship recommendations based on your profile.
        </p>

        <form onSubmit={handleSubmit}>

          <p className="section-title">
            Interest Assessment
          </p>

          {[
            { name: "Math", label: "Mathematics Interest" },
            { name: "Biology", label: "Biology Interest" },
            { name: "Computer", label: "Computer Interest" },
            { name: "Communication", label: "Communication Skills" },
            { name: "Leadership", label: "Leadership Skills" }
          ].map(({ name, label }) => (

            <div className="field-group" key={name}>

              <span className="field-label">
                {label}
              </span>

              <RadioPills
                name={name}
                options={INTEREST_OPTS}
                onChange={handleChange}
                value={formData[name]}
              />

            </div>
          ))}

          <p className="section-title">
            Academic Information
          </p>

          <div className="field-group">

            <span className="field-label">
              Matric Percentage
            </span>

            <input
              type="number"
              name="Matric"
              className="mark-input"
              placeholder="Enter Matric %"
              value={formData.Matric}
              onChange={handleChange}
            />

          </div>

          <div className="field-group">

            <span className="field-label">
              Intermediate Percentage
            </span>

            <input
              type="number"
              name="Inter"
              className="mark-input"
              placeholder="Enter Inter %"
              value={formData.Inter}
              onChange={handleChange}
            />

          </div>

          <div className="field-group">

            <span className="field-label">
              Academic Background
            </span>

            <RadioPills
              name="Background"
              options={BG_OPTS}
              onChange={handleChange}
              value={formData.Background}
            />

          </div>

          <div className="field-group">

            <span className="field-label">
              Preferred City
            </span>

            <RadioPills
              name="City"
              options={CITY_OPTS}
              onChange={handleChange}
              value={formData.City}
            />

          </div>

          <div className="button-group">

            <button
              className="submit-btn"
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : "Get Recommendations"}
            </button>

            <button
              type="button"
              className="clear-btn"
              onClick={handleClearForm}
            >
              Clear
            </button>

          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

        </form>
      </div>

      {/* RIGHT SIDE */}

      <div
        ref={resultRef}
        style={{
          width: "50%",
          padding: "32px 28px",
          overflowY: "auto",
          background: "var(--bg-right)"
        }}
      >

        {!result && !loading && (

          <div
            style={{
              textAlign: "center",
              marginTop: "120px",
              color: "var(--text-muted)"
            }}
          >
            Results will appear here.
          </div>

        )}

        {result && (

          <div>

            {/* Career */}

            <div className="career-header">

              <p
                style={{
                  fontSize: "12px",
                  marginBottom: "6px",
                  color: "var(--accent)"
                }}
              >
                Recommended Career
              </p>

              <h3>
                {result.career}
              </h3>

            </div>

            {/* Universities */}

            {result.universities &&
              result.universities.map((uni, index) => (

                <div className="uni-card" key={index}>

                  <h4>
                    {uni.University}
                  </h4>

                  <div className="uni-meta">

                    <span className="uni-tag">
                      {uni.Program}
                    </span>

                    <span className="uni-tag">
                      {uni.City}
                    </span>

                    <span
                      className={`eligible-badge ${
                        uni.eligibility === "Eligible"
                          ? "yes"
                          : "no"
                      }`}
                    >
                      {uni.eligibility}
                    </span>

                  </div>

                  <p
                    style={{
                      marginTop: "10px",
                      fontSize: "13px"
                    }}
                  >
                    <strong>Your Marks:</strong>{" "}
                    {uni.your_marks}%
                  </p>

                  <p
                    style={{
                      marginTop: "6px",
                      fontSize: "13px"
                    }}
                  >
                    <strong>Required Merit:</strong>{" "}
                    {uni.Merit}%
                  </p>

                  <p
                    style={{
                      marginTop: "6px",
                      fontSize: "13px"
                    }}
                  >
                    <strong>Requirements:</strong>{" "}
                    {uni.requirements}
                  </p>

                  <div className="uni-links">

                    <a
                      href={uni.link}
                      target="_blank"
                      rel="noreferrer"
                      className="uni-link primary"
                    >
                      Official Website
                    </a>

                  </div>

                </div>

              ))}

            {/* Scholarships */}

            {result.scholarships &&
              result.scholarships.length > 0 && (

                <>
                  <p className="section-title">
                    Available Scholarships
                  </p>

                  {result.scholarships.map(
                    (scholarship, index) => (

                      <div
                        key={index}
                        className="uni-card"
                        style={{
                          borderLeft:
                            "4px solid var(--accent)"
                        }}
                      >

                        <h4>
                          {scholarship.name}
                        </h4>

                        <div className="uni-meta">

                          <span className="uni-tag">
                            Eligibility:{" "}
                            {
                              scholarship.min_percentage
                            }
                            %+
                          </span>

                          <span className="uni-tag">
                            {scholarship.field}
                          </span>

                        </div>

                        <p
                          style={{
                            marginTop: "10px",
                            fontSize: "13px",
                            color: "var(--text-muted)"
                          }}
                        >
                          Scholarship available for
                          students meeting the merit
                          criteria.
                        </p>

                        <div className="uni-links">

                          <a
                            href={scholarship.link}
                            target="_blank"
                            rel="noreferrer"
                            className="uni-link primary"
                          >
                            View Details
                          </a>

                        </div>

                      </div>

                    )
                  )}
                </>
              )}

          </div>

        )}

      </div>

    </div>
  );
}

export default UniversityRecommender;