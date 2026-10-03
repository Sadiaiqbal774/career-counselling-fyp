import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import interestExamples from "../data/interestExamples.json";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabase";
import { readUserProfile, readUserQuizData } from "../data/userData";
import { isItemBookmarked, toggleItemBookmark } from "../data/bookmarkData";

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

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
    --bg:         #F7EFE7;
    --bg-card:    #FDF9F5;
    --bg-right:   #FFFFFF;
    --accent:     #C17B3F;
    --accent-dk:  #9E5F28;
    --accent-lt:  #F2E0CC;
    --text:       #2C2016;
    --text-muted: #7A6555;
    --border:     #E0D0BF;
    --success:    #2D7A4F;
    --danger:     #C0392B;
    --shadow:     0 4px 20px rgba(100,60,20,0.10);
    --radius:     14px;
    --font-head:  'Playfair Display', Georgia, serif;
    --font-body:  'DM Sans', sans-serif;
  }

  html.dark-mode {
    --bg:         #171412;
    --bg-card:    #231b17;
    --bg-right:   #1d1612;
    --accent:     #d48b4e;
    --accent-dk:  #e09f67;
    --accent-lt:  #38291f;
    --text:       #f7efe7;
    --text-muted: #cbb9a8;
    --border:     #3d2f26;
    --success:    #34a869;
    --danger:     #e05244;
    --shadow:     0 4px 24px rgba(0,0,0,0.45);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    font-family: var(--font-body);
    color: var(--text);
  }

  /* scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  /* radio groups */
  .radio-pill { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .radio-pill input[type="radio"] { display: none; }
  .radio-pill label {
    padding: 6px 16px;
    border: 1.5px solid var(--border);
    border-radius: 99px;
    font-size: 13px;
    font-family: var(--font-body);
    color: var(--text-muted);
    cursor: pointer;
    transition: all .18s ease;
    background: var(--bg-card);
    user-select: none;
  }
  .radio-pill input[type="radio"]:checked + label {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(193,123,63,.30);
  }
  .radio-pill label:hover { border-color: var(--accent); color: var(--accent); }

  /* number input */
  .mark-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: var(--bg-card);
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text);
    outline: none;
    transition: border-color .18s;
  }
  .mark-input:focus { border-color: var(--accent); }
  .mark-input::placeholder { color: #bba898; }

  /* section title */
  .section-title {
    font-family: var(--font-head);
    font-size: 17px;
    color: var(--accent-dk);
    margin: 28px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid var(--border);
  }

  /* field group */
  .field-group { margin-bottom: 18px; }
  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: .02em;
  }
  .field-desc { font-size: 11.5px; color: var(--text-muted); margin-bottom: 6px; }

  /* step badge */
  .step-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--accent-lt);
    color: var(--accent-dk);
    font-size: 11px;
    font-weight: 700;
    margin-right: 8px;
    flex-shrink: 0;
  }

  /* button group */
  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  /* submit button */
  .submit-btn {
    flex: 1;
    padding: 14px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: .03em;
    transition: background .18s, transform .12s, box-shadow .18s;
    box-shadow: 0 4px 14px rgba(193,123,63,.30);
  }
  .submit-btn:hover { background: var(--accent-dk); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(193,123,63,.35); }
  .submit-btn:active { transform: translateY(0); }
  .submit-btn:disabled { opacity: .65; cursor: not-allowed; transform: none; }

  /* clear button */
  .clear-btn {
    flex: 1;
    padding: 14px;
    background: transparent;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    transition: all .18s;
  }
  .clear-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-lt); }
  .clear-btn:active { transform: scale(0.98); }
  .clear-btn:disabled { opacity: .65; cursor: not-allowed; }

  /* error */
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

  /* university card */
  .uni-card {
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    margin-top: 14px;
    box-shadow: var(--shadow);
    transition: transform .15s, box-shadow .15s;
    position: relative;
    height: 310px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.5s ease-out forwards;
  }
  .uni-card:nth-child(1) { animation-delay: 0.1s; }
  .uni-card:nth-child(2) { animation-delay: 0.2s; }
  .uni-card:nth-child(3) { animation-delay: 0.3s; }
  .uni-card:nth-child(4) { animation-delay: 0.4s; }
  .uni-card:nth-child(5) { animation-delay: 0.5s; }
  .uni-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(100,60,20,.13); }
  .uni-card .uni-links { margin-top: auto; }
  .uni-card h4 { font-family: var(--font-head); font-size: 16px; color: var(--accent-dk); margin-bottom: 10px; margin-right: 45px; }
  
  .rank-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-lt), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--accent-dk);
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(193,123,63,.20);
  }

  .uni-meta { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0; }
  .uni-tag {
    padding: 3px 12px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 500;
    background: var(--accent-lt);
    color: var(--accent-dk);
  }
  .eligible-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .04em;
  }
  .eligible-badge.yes { background: #d4edda; color: var(--success); }
  .eligible-badge.no  { background: #fdecea; color: var(--danger); }
  .eligible-badge.unknown { background: var(--accent-lt); color: var(--accent-dk); }
  .marks-row {
    display: flex; gap: 16px; flex-wrap: wrap;
    margin: 8px 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  .marks-row strong { color: var(--text); }

  .merit-meter {
    height: 6px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
    margin-top: 8px;
  }
  .merit-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--success), var(--accent));
    border-radius: 99px;
    transition: width 0.6s ease;
  }
  .merit-label {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .uni-links { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
  .uni-link {
    font-size: 13px; font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
    text-decoration: none;
    transition: opacity .15s;
  }
  .uni-link:hover { opacity: .8; }
  .uni-link.primary { background: var(--accent-lt); color: var(--accent-dk); }
  .uni-link.secondary { background: #e8f5ee; color: var(--success); }
  .guidance-list {
    margin-top: 10px;
    padding-left: 18px;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.7;
  }
  .guidance-list li::marker { color: var(--accent); }

  /* summary stats */
  .summary-stats {
    background: linear-gradient(135deg, var(--accent-lt) 0%, #f9f1e8 100%);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-around;
    text-align: center;
    animation: slideUp 0.5s ease-out forwards;
  }
  .summary-stat-item {
    flex: 1;
  }
  .summary-stat-label {
    font-size: 11px;
    color: var(--accent-dk);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 6px;
  }
  .summary-stat-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent-dk);
  }
  .summary-stat-divider {
    border-left: 1.5px solid var(--border);
  }

  /* career header */
  .career-header {
    background: linear-gradient(135deg, var(--accent-lt) 0%, #f9f1e8 100%);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 8px;
    animation: slideUp 0.5s ease-out forwards;
  }
  .career-header h3 {
    font-family: var(--font-head);
    font-size: 22px;
    color: var(--accent-dk);
  }
  .reasons-list { margin-top: 10px; padding-left: 18px; font-size: 13.5px; line-height: 1.75; color: var(--text-muted); }
  .reasons-list li::marker { color: var(--accent); }

  /* empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 60%; text-align: center; color: var(--text-muted); gap: 12px;
  }
  .empty-icon { font-size: 48px; opacity: .5; }

  /* loading dots */
  .loader { display: flex; gap: 8px; justify-content: center; margin: 40px 0; }
  .loader span {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--accent);
    animation: bounce 1.2s infinite ease-in-out;
  }
  .loader span:nth-child(2) { animation-delay: .2s; }
  .loader span:nth-child(3) { animation-delay: .4s; }
  @keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.5} 40%{transform:scale(1);opacity:1} }

  /* divider */
  .divider { border: none; border-top: 1.5px solid var(--border); margin: 20px 0; }

  /* progress bar */
  .progress-wrap { height: 4px; background: var(--border); border-radius: 99px; margin-top: 24px; }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-lt), var(--accent));
    border-radius: 99px;
    transition: width .3s ease;
  }

  /* slide up animation */
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(globalStyle);

// ─── Helper: count filled fields ──────────────────────────────────
function countFilled(formData) {
  return Object.values(formData).filter(val => val !== "" && val !== null && val !== undefined).length;
}

// ─── Radio Pill Group Component ───────────────────────────────────
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
          <label htmlFor={`${name}-${val}`}>{label}</label>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Scholarship Card Component ───────────────────────────────────
function ScholarshipCard({ scholarship, index, yourMerit, isSaved, onToggleBookmark }) {
  const hasMerit = scholarship.min_percentage != null;

  return (
    <div className="uni-card">
      <div className="rank-badge">#{index + 1}</div>

      <h4>{scholarship.name}</h4>

      <div className="uni-meta">
        <span className="uni-tag">{scholarship.field}</span>
        <span className={`eligible-badge ${hasMerit ? "yes" : "unknown"}`}>
          {hasMerit ? "✓ Eligible" : "Merit not listed"}
        </span>
      </div>

      <div className="marks-row">
        <span>
          <strong>Your Merit:</strong> {yourMerit}%
        </span>
        {hasMerit && (
          <>
            <span>•</span>
            <span>
              <strong>Required Merit:</strong> {scholarship.min_percentage}%
            </span>
          </>
        )}
      </div>

      {hasMerit && (
        <>
          <div className="merit-meter">
            <div className="merit-fill" style={{ width: "100%" }} />
          </div>
          <p className="merit-label">✓ Eligible based on your academic percentage</p>
        </>
      )}

      <div className="uni-links">
        <a href={scholarship.link} target="_blank" rel="noreferrer" className="uni-link primary">
          Apply Now →
        </a>
        <button
          type="button"
          onClick={() => onToggleBookmark && onToggleBookmark(scholarship)}
          className="uni-link"
          style={{
            border: isSaved ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
            background: isSaved ? "var(--accent-lt)" : "var(--bg-card)",
            color: isSaved ? "var(--accent-dk)" : "var(--text)",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
          title={isSaved ? "Remove from saved opportunities in profile" : "Save scholarship to profile"}
        >
          <span>{isSaved ? "★" : "☆"}</span>
          <span>{isSaved ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
}

const INTEREST_OPTS = [
  { val: "1", label: "Low" },
  { val: "2", label: "Below Avg" },
  { val: "3", label: "Average" },
  { val: "4", label: "Good" },
  { val: "5", label: "Excellent" },
];

const BG_OPTS = ["ICS", "Pre-Medical", "Pre-Engineering", "Commerce", "Arts"].map(v => ({ val: v, label: v }));
const CITY_OPTS = [
  { val: "", label: "All Cities (Nationwide)" },
  { val: "Sukkur", label: "Sukkur" },
  { val: "Islamabad", label: "Islamabad" },
  { val: "Lahore", label: "Lahore" },
  { val: "Karachi", label: "Karachi" },
  { val: "Rawalpindi", label: "Rawalpindi" },
  { val: "Peshawar", label: "Peshawar" },
  { val: "Faisalabad", label: "Faisalabad" },
  { val: "Multan", label: "Multan" },
  { val: "Quetta", label: "Quetta" },
];

function getInterestDefaults(statement) {
  const category = Object.entries(interestExamples).find(([, statements]) => statements.includes(statement))?.[0] || '';
  const defaults = { Math: '3', Biology: '3', Computer: '3', Communication: '3', Leadership: '3' };
  if (category.includes('Computer') || category === 'Engineering') defaults.Computer = '5';
  if (category.includes('Computer') || category === 'Engineering' || category.includes('Natural')) defaults.Math = '4';
  if (category.includes('Medicine')) defaults.Biology = '5';
  if (category.includes('Business')) { defaults.Communication = '5'; defaults.Leadership = '5'; }
  if (category.includes('Social') || category.includes('Arts')) defaults.Communication = '4';
  return defaults;
}

// ─── Main App ─────────────────────────────────────────────────────
function UniversityRecommender() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    Math: "", Biology: "", Computer: "",
    Communication: "", Leadership: "",
    Matric: "", Inter: "", Background: "", City: "",
    Interests: ""
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useCustomText, setUseCustomText] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [resultCityFilter, setResultCityFilter] = useState("");
  const [bookmarkTick, setBookmarkTick] = useState(0);
  const resultRef = useRef(null);

  const handleToggleUniBookmark = (uni) => {
    toggleItemBookmark(currentUser?.id, "universities", uni);
    setBookmarkTick((t) => t + 1);
  };

  const handleToggleScholarshipBookmark = (scholarship) => {
    toggleItemBookmark(currentUser?.id, "scholarships", scholarship);
    setBookmarkTick((t) => t + 1);
  };

  const isUniSaved = (uni) => isItemBookmarked(currentUser?.id, "universities", uni);
  const isScholarshipSaved = (scholarship) => isItemBookmarked(currentUser?.id, "scholarships", scholarship);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedProfile() {
      const localProfile = readUserProfile(currentUser?.id);
      const _quizData = readUserQuizData(currentUser?.id) || {};
      const modelAnswers = _quizData.modelAnswers || {};
      const savedScores = _quizData.scores || {};

      let remoteData = null;
      if (currentUser?.id) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("marks, intermediate_marks, intermediate_group, city, interests")
            .eq("id", currentUser.id)
            .maybeSingle();
          remoteData = data;
        } catch {
          // ignore offline sync
        }
      }

      if (cancelled) return;

      const savedProfile = {
        ...(remoteData || {}),
        ...(localProfile || {}),
        intermediate_marks: localProfile?.intermediateMarks ?? remoteData?.intermediate_marks,
        intermediate_group: localProfile?.intermediateGroup ?? remoteData?.intermediate_group,
      };

      const interestDefaults = getInterestDefaults(savedProfile.interests || savedProfile.Interests);

      // Determine smart scores from model quiz OR general quiz scores OR interest defaults
      const calcMath = modelAnswers.Math 
        ? String(Math.min(5, Math.max(1, Math.round(Number(modelAnswers.Math) / 20)))) 
        : (savedScores.Technology ? '4' : (interestDefaults.Math || '3'));

      const calcBiology = modelAnswers.Biology 
        ? String(Math.min(5, Math.max(1, Math.round(Number(modelAnswers.Biology) / 20)))) 
        : (savedScores.Medical ? '5' : (interestDefaults.Biology || '2'));

      const calcComputer = modelAnswers.Computer 
        ? String(Math.min(5, Math.max(1, Math.round(Number(modelAnswers.Computer) / 20)))) 
        : (savedScores.Technology ? '5' : (interestDefaults.Computer || '4'));

      const calcCommunication = modelAnswers.Communication 
        ? String(Math.min(5, Math.max(1, Math.round(Number(modelAnswers.Communication) / 20)))) 
        : (savedScores.Arts || savedScores.SocialSciences || savedScores.Business ? '4' : (interestDefaults.Communication || '3'));

      const calcLeadership = modelAnswers.Leadership 
        ? String(Math.min(5, Math.max(1, Math.round(Number(modelAnswers.Leadership) / 20)))) 
        : (savedScores.Business ? '5' : (interestDefaults.Leadership || '3'));

      const calcMatric = savedProfile.marks !== null && savedProfile.marks !== undefined && String(savedProfile.marks).trim() !== ''
        ? String(savedProfile.marks)
        : (modelAnswers.Marks ? String(modelAnswers.Marks) : '85');

      const calcInter = savedProfile.intermediate_marks || savedProfile.intermediateMarks || '80';
      const calcBackground = savedProfile.intermediate_group || savedProfile.intermediateGroup || modelAnswers.Background || 'Pre-Engineering';
      const calcCity = (savedProfile.city && ["Lahore", "Islamabad"].includes(savedProfile.city)) ? savedProfile.city : (savedProfile.city || 'Islamabad');
      const calcInterests = savedProfile.interests || "I enjoy technology, solving logical problems, and building modern software applications.";

      setFormData({
        Math: calcMath,
        Biology: calcBiology,
        Computer: calcComputer,
        Communication: calcCommunication,
        Leadership: calcLeadership,
        Matric: calcMatric,
        Inter: calcInter,
        Background: calcBackground,
        City: calcCity,
        Interests: calcInterests,
      });

      setProfileLoaded(true);
    }

    loadSavedProfile();
    return () => { cancelled = true; };
  }, [currentUser]);

  const totalFields = Object.keys(formData).length;
  const progress = Math.round((countFilled(formData) / totalFields) * 100);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const nextValue = type === 'number' && value !== '' && Number(value) < 0 ? '0' : value;
    setFormData({ ...formData, [name]: nextValue });
  };

  const validateForm = () => {
    const { Math, Biology, Computer, Communication, Leadership, Matric, Inter, Background, City, Interests } = formData;

    // Check all fields are filled
    if (!Math || !Biology || !Computer || !Communication || !Leadership || !Matric || !Inter || !Background || !City) {
      return "Please fill all fields before submitting.";
    }

    if (!Interests || Interests.trim().split(/\s+/).length < 6) {
      return "Please describe your interests in a full sentence (at least a few words) so the AI can make a confident prediction.";
    }

    // Validate Matric and Inter are numbers and in valid range
    const matricNum = parseFloat(Matric);
    const interNum = parseFloat(Inter);

    if (isNaN(matricNum) || isNaN(interNum)) {
      return "Marks must be valid numbers.";
    }

    if (matricNum < 0 || matricNum > 100 || interNum < 0 || interNum > 100) {
      return "Marks must be between 0 and 100.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }

    setError("");
    setLoading(true);

    const avgMarks = (parseFloat(formData.Matric) + parseFloat(formData.Inter)) / 2;
    const finalData = {
      Math: parseInt(formData.Math),
      Biology: parseInt(formData.Biology),
      Computer: parseInt(formData.Computer),
      Communication: parseInt(formData.Communication),
      Leadership: parseInt(formData.Leadership),
      Marks: avgMarks,
      Background: formData.Background,
      City: formData.City,
      Interests: formData.Interests
    };

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData)
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setResult(null);
        setLoading(false);
        return;
      }
      setResult(data);
      // Auto-scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError("Server not responding. Please make sure the backend is running.");
      setResult(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    const hasSavedInputs = profileLoaded
      && !autoSubmitted
      && Object.values(formData).every((value) => String(value || '').trim())
      && !loading;
    if (hasSavedInputs) {
      setAutoSubmitted(true);
      void handleSubmit({ preventDefault: () => {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitted, formData, loading, profileLoaded]);

  const handleClearForm = () => {
    setFormData({
      Math: "", Biology: "", Computer: "",
      Communication: "", Leadership: "",
      Matric: "", Inter: "", Background: "", City: "",
      Interests: ""
    });
    setResult(null);
    setError("");
  };

  return (
    <div style={{
      display: "flex", height: "100vh",
      fontFamily: "var(--font-body)",
      background: "var(--bg)"
    }}>
      <div style={{ position: "fixed", top: "76px", left: "16px", zIndex: 10, display: "flex", gap: "8px" }}>
        <button type="button" onClick={() => navigate('/result')} style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-card)", color: "var(--text)", fontWeight: 600, cursor: "pointer" }}>
          ← Back to results
        </button>
        <button type="button" onClick={() => navigate('/scholarships')} style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-card)", color: "var(--text)", fontWeight: 600, cursor: "pointer" }}>
          🎓 Scholarships
        </button>
        <button type="button" onClick={() => navigate('/profile')} style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-card)", color: "var(--text)", fontWeight: 600, cursor: "pointer" }}>
          Saved in Profile
        </button>
        <button type="button" onClick={() => navigate('/dashboard')} style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-card)", color: "var(--text)", fontWeight: 600, cursor: "pointer" }}>
          📊 Dashboard
        </button>
      </div>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: "50%",
        padding: "85px 28px 32px 28px",
        background: "var(--bg)",
        overflowY: "auto",
        borderRight: "2px solid var(--border)"
      }}>

        {/* Header */}
        <div style={{ marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontSize: "28px" }}>🎓</span>
            <h1 style={{ fontFamily: "var(--font-head)", fontSize: "24px", color: "var(--accent-dk)", lineHeight: 1.2 }}>
              Career Counseling<br />
              <span style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: 400, color: "var(--text-muted)" }}>
                Pakistan University Recommender
              </span>
            </h1>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(45, 122, 79, 0.12)', border: '1px solid #2d7a4f', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#2d7a4f', fontWeight: 600, marginTop: '4px', marginBottom: '8px' }}>
            ✓ Auto-populated from your Profile &amp; Quiz results
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Answer the questions below based on your interests and academic performance to receive personalised university recommendations.
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ margin: "18px 0 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
            <span>Form Progress</span><span>{progress}%</span>
          </div>
          <div className="progress-wrap">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Interest Section ── */}
          <p className="section-title">
            <span className="step-badge">1</span> Interest Assessment
          </p>

          {[
            { name: "Math", label: "Mathematics Interest" },
            { name: "Biology", label: "Biology Interest" },
            { name: "Computer", label: "Computer / IT Interest" },
            { name: "Communication", label: "Communication Skills" },
            { name: "Leadership", label: "Leadership Qualities" },
          ].map(({ name, label }) => (
            <div className="field-group" key={name}>
              <span className="field-label">{label}</span>
              <RadioPills
                name={name}
                options={INTEREST_OPTS}
                onChange={handleChange}
                value={formData[name]}
              />
            </div>
          ))}

          <div className="field-group">
            <span className="field-label">What describes you best?</span>
            <p className="field-desc">Pick the statement closest to your interests — these give the AI the clearest signal to predict your field</p>

            {!useCustomText && (
              <>
                <select
                  name="Interests"
                  onChange={handleChange}
                  value={formData.Interests}
                  className="mark-input"
                  style={{ width: "100%" }}
                >
                  <option value="">-- Select a statement --</option>
                  {Object.entries(interestExamples).map(([category, statements]) => (
                    <optgroup label={category} key={category}>
                      {statements.map((statement) => (
                        <option value={statement} key={statement}>{statement}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setUseCustomText(true)}
                  className="clear-btn"
                  style={{ marginTop: "8px", padding: "8px 14px", fontSize: "13px" }}
                >
                  None of these — let me write my own
                </button>
              </>
            )}

            {useCustomText && (
              <>
                <textarea
                  name="Interests"
                  rows="3"
                  placeholder="I enjoy coding and building apps in my free time"
                  onChange={handleChange}
                  value={formData.Interests}
                  className="mark-input"
                  style={{ width: "100%", resize: "vertical" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomText(false);
                    setFormData((prev) => ({ ...prev, Interests: "" }));
                  }}
                  className="clear-btn"
                  style={{ marginTop: "8px", padding: "8px 14px", fontSize: "13px" }}
                >
                  Pick from the list instead
                </button>
              </>
            )}
          </div>

          <hr className="divider" />

          {/* ── Academic Section ── */}
          <p className="section-title">
            <span className="step-badge">2</span> Academic Information
          </p>

          <div style={{ display: "flex", gap: "14px" }}>
            <div className="field-group" style={{ flex: 1 }}>
              <span className="field-label">Matric Percentage</span>
              <p className="field-desc">Your Matric result (e.g., 85)</p>
              <input
                type="number" name="Matric" min="0" max="100"
                placeholder="0 – 100" onChange={handleChange}
                value={formData.Matric}
                className="mark-input"
              />
            </div>
            <div className="field-group" style={{ flex: 1 }}>
              <span className="field-label">Intermediate Percentage</span>
              <p className="field-desc">Your Inter result (e.g., 88)</p>
              <input
                type="number" name="Inter" min="0" max="100"
                placeholder="0 – 100" onChange={handleChange}
                value={formData.Inter}
                className="mark-input"
              />
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">Academic Background</span>
            <RadioPills
              name="Background"
              options={BG_OPTS}
              onChange={handleChange}
              value={formData.Background}
            />
          </div>

          <div className="field-group">
            <span className="field-label">Preferred City</span>
            <RadioPills
              name="City"
              options={CITY_OPTS}
              onChange={handleChange}
              value={formData.City}
            />
          </div>

          <div className="button-group">
            <button className="submit-btn" disabled={loading}>
              {loading ? "Analysing your profile…" : " Get My Recommendations"}
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              className="clear-btn"
              disabled={loading}
            >
              Clear
            </button>
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

        </form>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        ref={resultRef}
        style={{
          width: "50%",
          padding: "70px 28px 32px 28px",
          background: "var(--bg-right)",
          overflowY: "auto"
        }}
      >

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <div className="loader">
              <span /><span /><span />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "12px" }}>
              Analysing your profile and matching universities…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="empty-state" style={{ height: "100%", justifyContent: "center" }}>
            <div className="empty-icon"></div>
            <p style={{ fontFamily: "var(--font-head)", fontSize: "18px", color: "var(--accent-dk)" }}>
              Your results will appear here
            </p>
            <p style={{ fontSize: "13px", maxWidth: "280px" }}>
              Complete the form on the left and click <strong>Get My Recommendations</strong> to see matched universities and career guidance.
            </p>
          </div>
        )}

        {/* No universities found */}
        {result && result.universities && result.universities.length === 0 && (
          <div className="error-box" style={{ marginBottom: "12px" }}>
            ⚠️ No universities found based on your current marks.
            Consider improving your marks or exploring alternative related programs.
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Career Card */}
            <div className="career-header">
              <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "6px" }}>
                Recommended Career
              </p>
              <h3> {result.career}</h3>
              {result.reasons && (
                <ul className="reasons-list">
                  {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
              {result.city_notice && (
                <p style={{ fontSize: "12.5px", color: "var(--accent-dk)", marginTop: "8px", background: "var(--accent-lt)", padding: "6px 12px", borderRadius: "6px" }}>
                  ℹ️ {result.city_notice}
                </p>
              )}
              {result.matched_field && result.matched_field !== result.career && (
                <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "10px" }}>
                  We don't have {result.career} programs in our university database yet —
                  showing your next closest match, <strong>{result.matched_field}</strong>, instead.
                </p>
              )}
              {result.low_confidence && (
                <p style={{ fontSize: "12.5px", color: "var(--danger)", marginTop: "10px" }}>
                  This prediction has low confidence. Try describing your interests in more
                  detail for a more reliable match.
                </p>
              )}
            </div>

            {/* Summary Stats */}
            {result.universities && result.universities.length > 0 && (
              <div className="summary-stats">
                <div className="summary-stat-item">
                  <div className="summary-stat-label">Your Average</div>
                  <div className="summary-stat-value">
                    {((parseFloat(formData.Matric) + parseFloat(formData.Inter)) / 2).toFixed(1)}%
                  </div>
                </div>
                <div className="summary-stat-item summary-stat-divider" />
                <div className="summary-stat-item">
                  <div className="summary-stat-label">Career Match</div>
                  <div className="summary-stat-value">
                    {result.confidence != null ? `${Math.round(result.confidence * 100)}%` : "—"}
                  </div>
                </div>
                <div className="summary-stat-item summary-stat-divider" />
                <div className="summary-stat-item">
                  <div className="summary-stat-label">Matches</div>
                  <div className="summary-stat-value">{result.universities.length}</div>
                </div>
              </div>
            )}

            {/* Subtitle & City Filter */}
            {result.universities && result.universities.length > 0 && (() => {
              // eslint-disable-next-line no-unused-expressions
              bookmarkTick;
              const allCities = [...new Set(result.universities.map((u) => u.City).filter(Boolean))];
              const displayed = result.universities.filter((uni) => {
                if (!resultCityFilter) return true;
                return String(uni.City || "").toLowerCase().includes(resultCityFilter.toLowerCase());
              });
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 10px", flexWrap: "wrap", gap: "8px" }}>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                      <strong style={{ color: "var(--text)" }}>{displayed.length}</strong> of {result.universities.length} matched universities
                    </p>
                    {allCities.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label htmlFor="filter-uni-city" style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Filter by City:</label>
                        <select
                          id="filter-uni-city"
                          value={resultCityFilter}
                          onChange={(e) => setResultCityFilter(e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "var(--bg-card)",
                            color: "var(--text)",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          <option value="">All Cities</option>
                          {allCities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {displayed.map((uni, i) => {
                    const isSaved = isUniSaved(uni);
                    return (
                      <div className="uni-card" key={i}>
                        <div className="rank-badge">#{i + 1}</div>

                        <h4> {uni.University}</h4>

                        <div className="uni-meta">
                          <span className="uni-tag"> {uni.Program}</span>
                          <span className="uni-tag"> {uni.City}</span>

                          <span
                            className={`eligible-badge ${uni.eligibility === "Eligible"
                                ? "yes"
                                : uni.eligibility === "Not Eligible"
                                  ? "no"
                                  : "unknown"
                              }`}
                          >
                            {uni.eligibility === "Eligible"
                              ? "✓ Eligible"
                              : uni.eligibility === "Not Eligible"
                                ? "✗ Not Eligible"
                                : "Merit not listed"}
                          </span>
                        </div>

                        <div className="marks-row">
                          <span>
                            <strong>Your Marks:</strong>{" "}
                            {uni.your_marks}%
                          </span>

                          <span>•</span>

                          <span>
                            <strong>Required Merit:</strong>{" "}
                            {uni.Merit}%
                          </span>
                        </div>

                        {/* Eligibility Progress Bar */}
                        {uni.your_marks && uni.Merit && (
                          <>
                            <div className="merit-meter">
                              <div
                                className="merit-fill"
                                style={{
                                  width: `${Math.min(
                                    (uni.your_marks / uni.Merit) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <p className="merit-label">
                              {uni.your_marks >= uni.Merit
                                ? "✓ Above merit requirement"
                                : `${Math.round(
                                  uni.Merit - uni.your_marks
                                )} points needed`}
                            </p>
                          </>
                        )}

                        <p
                          style={{
                            fontSize: "13px",
                            color: "var(--text-muted)",
                            marginTop: "6px",
                          }}
                        >
                          <strong style={{ color: "var(--text)" }}>
                            Requirements:
                          </strong>{" "}
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

                          <a
                            href={uni.link}
                            target="_blank"
                            rel="noreferrer"
                            className="uni-link primary"
                          >
                            Apply Now →
                          </a>

                          <button
                            type="button"
                            onClick={() => handleToggleUniBookmark(uni)}
                            className="uni-link"
                            style={{
                              border: isSaved ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                              background: isSaved ? "var(--accent-lt)" : "var(--bg-card)",
                              color: isSaved ? "var(--accent-dk)" : "var(--text)",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px"
                            }}
                            title={isSaved ? "Remove from saved opportunities in profile" : "Save university to Profile"}
                          >
                            <span>{isSaved ? "★" : "☆"}</span>
                            <span>{isSaved ? "Saved" : "Save"}</span>
                          </button>
                        </div>

                        {uni.guidance && uni.guidance.length > 0 && (
                          <>
                            <p
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "var(--text-muted)",
                                marginTop: "12px",
                                textTransform: "uppercase",
                                letterSpacing: ".05em",
                              }}
                            >
                              Guidance
                            </p>

                            <ul className="guidance-list">
                              {uni.guidance.map((g, idx) => (
                                <li key={idx}>{g}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {/* Scholarship Recommendations */}

            {(() => {
              const yourMerit = (
                (parseFloat(formData.Matric) + parseFloat(formData.Inter)) / 2
              ).toFixed(1);

              return (
                <>
                  {result.pakistan_scholarships && result.pakistan_scholarships.length > 0 && (
                    <div style={{ marginTop: "30px" }}>
                      <div
                        style={{
                          marginBottom: "18px",
                          padding: "18px",
                          background: "linear-gradient(135deg, var(--accent-lt) 0%, #f9f1e8 100%)",
                          border: "1.5px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      >
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "6px" }}>
                          Scholarship Opportunities
                        </p>
                        <h3 style={{ fontFamily: "var(--font-head)", fontSize: "22px", color: "var(--accent-dk)" }}>
                          🎓 Scholarships in Pakistan
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>
                          Government and provider scholarships available within Pakistan.
                        </p>
                      </div>

                      {result.pakistan_scholarships.map((scholarship, index) => (
                        <ScholarshipCard
                          key={index}
                          scholarship={scholarship}
                          index={index}
                          yourMerit={yourMerit}
                          isSaved={isScholarshipSaved(scholarship)}
                          onToggleBookmark={handleToggleScholarshipBookmark}
                        />
                      ))}
                    </div>
                  )}

                  {result.international_scholarships && result.international_scholarships.length > 0 && (
                    <div style={{ marginTop: "30px" }}>
                      <div
                        style={{
                          marginBottom: "18px",
                          padding: "18px",
                          background: "linear-gradient(135deg, var(--accent-lt) 0%, #f9f1e8 100%)",
                          border: "1.5px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      >
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "6px" }}>
                          Scholarship Opportunities
                        </p>
                        <h3 style={{ fontFamily: "var(--font-head)", fontSize: "22px", color: "var(--accent-dk)" }}>
                          🌍 International Scholarships
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>
                          Scholarships to study abroad, open to Pakistani students.
                        </p>
                      </div>

                      {result.international_scholarships.map((scholarship, index) => (
                        <ScholarshipCard
                          key={index}
                          scholarship={scholarship}
                          index={index}
                          yourMerit={yourMerit}
                          isSaved={isScholarshipSaved(scholarship)}
                          onToggleBookmark={handleToggleScholarshipBookmark}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

          </div>
        )}
      </div>

    </div>
  );
}

export default UniversityRecommender;