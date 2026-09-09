import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import interestExamples from '../data/interestExamples.json';
import { getProfileCompletion, saveUserProfile, readUserProfile } from '../data/userData';
import { getBookmarks, toggleItemBookmark } from '../data/bookmarkData';
import './Profile.css';

const EMPTY_PROFILE = {
  fullName: '', email: '', phone: '', city: '', school: '', marks: '', intermediateMarks: '',
  intermediateGroup: 'Pre-Engineering', entryTest: 'None', entryTestScore: '',
  academicLevel: 'Intermediate', preferredField: 'Technology', interests: '', notes: '',
};
const interestStatements = Object.values(interestExamples).flat();
const pakistaniCities = [
  'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Hyderabad', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana', 'Abbottabad',
  'Mardan', 'Sahiwal', 'Okara', 'Gujrat', 'Jhelum', 'Wah Cantt', 'Taxila', 'Kohat', 'Bannu',
  'Dera Ghazi Khan', 'Dera Ismail Khan', 'Nawabshah', 'Mirpur (AJK)', 'Muzaffarabad', 'Gilgit',
  'Skardu', 'Swat', 'Chitral', 'Sheikhupura', 'Jhang', 'Nankana Sahib', 'Rahim Yar Khan',
];
const REQUIRED_FIELDS = { 1: ['fullName', 'email', 'phone', 'city', 'school'], 2: ['marks', 'intermediateMarks'] };
const profileStorageKey = (userId) => `career-guide-profile-${userId}`;

function readLocalProfile(userId) {
  return readUserProfile(userId);
}

function Profile() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [step, setStep] = useState(1);
  const [profileSaved, setProfileSaved] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [bookmarks, setBookmarks] = useState({ universities: [], scholarships: [] });
  const [savedTab, setSavedTab] = useState('all');

  const loadBookmarks = () => {
    setBookmarks(getBookmarks(currentUser?.id));
  };

  useEffect(() => {
    loadBookmarks();
  }, [currentUser]);

  const handleRemoveBookmark = (type, item) => {
    toggleItemBookmark(currentUser?.id, type, item);
    loadBookmarks();
    toast.success('Removed from saved opportunities');
  };


  useEffect(() => {
    let cancelled = false;
    async function loadProfileData() {
      if (!currentUser?.id) return;

      // Purge any stale/leaked test profile data (e.g. benat) from localStorage if current user is different
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('career-guide-profile-')) {
            const raw = localStorage.getItem(k);
            if (raw && raw.toLowerCase().includes('benat') && (!currentUser.email || !currentUser.email.toLowerCase().includes('benat'))) {
              localStorage.removeItem(k);
            }
          }
        });
      } catch {}

      let localProfile = readLocalProfile(currentUser.id);

      // Discard localProfile if it belongs to a different or missing email
      if (
        localProfile &&
        (!localProfile.email ||
          (currentUser.email &&
            localProfile.email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()))
      ) {
        localProfile = null;
        try {
          localStorage.removeItem(profileStorageKey(currentUser.id));
        } catch {}
      }

      if (
        localProfile &&
        Object.keys(localProfile).length > 0 &&
        localProfile.email &&
        currentUser.email &&
        localProfile.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
      ) {
        setProfile({
          ...EMPTY_PROFILE,
          ...localProfile,
          fullName: currentUser.name || localProfile.fullName || '',
          email: currentUser.email || localProfile.email || '',
          entryTest: localProfile.entryTest || 'None',
        });
      } else {
        setProfile({
          ...EMPTY_PROFILE,
          fullName: currentUser.name || '',
          email: currentUser.email || '',
        });
      }

      try {
        let [{ data: savedProfile, error: profileError }, { data: savedHistory }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email, phone, city, academic_level, school, marks, intermediate_marks, intermediate_group, entry_test, entry_test_score, preferred_field, interests, notes, updated_at').eq('id', currentUser.id).maybeSingle(),
          supabase.from('recommendations').select('*').eq('user_id', currentUser.id).order('saved_at', { ascending: false }).limit(5),
        ]);
        if (profileError && /column|schema cache|does not exist/i.test(profileError.message || '')) {
          const legacyResult = await supabase.from('profiles').select('id, full_name, email, academic_level, school, marks, preferred_field, interests, notes, updated_at').eq('id', currentUser.id).maybeSingle();
          savedProfile = legacyResult.data;
        }
        if (cancelled) return;

        if (savedProfile) {
          // Strictly require savedProfile email to match currentUser.email
          if (
            !savedProfile.email ||
            !currentUser.email ||
            savedProfile.email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()
          ) {
            return;
          }

          setProfile((prev) => ({
            ...prev,
            fullName: currentUser.name || savedProfile.full_name || prev.fullName || '',
            email: currentUser.email || savedProfile.email || prev.email || '',
            phone: savedProfile.phone || '',
            city: savedProfile.city || '',
            school: savedProfile.school || '',
            marks: savedProfile.marks !== null && savedProfile.marks !== undefined ? savedProfile.marks : '',
            intermediateMarks: savedProfile.intermediate_marks !== null && savedProfile.intermediate_marks !== undefined ? savedProfile.intermediate_marks : '',
            intermediateGroup: savedProfile.intermediate_group || 'Pre-Engineering',
            entryTest: savedProfile.entry_test || 'None',
            entryTestScore: savedProfile.entry_test_score || '',
            academicLevel: savedProfile.academic_level || 'Intermediate',
            preferredField: savedProfile.preferred_field || 'Technology',
            interests: savedProfile.interests || '',
            notes: savedProfile.notes || '',
          }));
        }
        if (savedHistory) {
          setRecommendations(savedHistory.map((item) => ({ ...item, highestCategory: item.highest_category, savedAt: item.saved_at })));
        }
      } catch {
        // Local profile remains primary fallback
      }
    }
    loadProfileData();
    return () => { cancelled = true; };
  }, [currentUser]);

  const completion = useMemo(() => {
    return getProfileCompletion(profile);
  }, [profile]);

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    let nextValue = type === 'number' && value !== '' && Number(value) < 0 ? '0' : value;

    if (name === 'phone') {
      // Remove any characters that aren't digits, +, or spaces
      nextValue = value.replace(/[^\d+ -]/g, '');
    }

    setProfile((previous) => ({
      ...previous,
      [name]: nextValue,
      ...(name === 'entryTest' && value === 'None' ? { entryTestScore: '' } : {}),
    }));
    setProfileSaved(false);
  };

  const validateStep = (stepNumber) => {
    const hasMissing = REQUIRED_FIELDS[stepNumber].some((key) => !String(profile[key] || '').trim());
    if (hasMissing) {
      const msg = 'Please fill in all required fields before continuing.';
      setErrorMessage(msg);
      toast.error(msg);
      return false;
    }

    if (stepNumber === 1) {
      const cleanPhone = profile.phone.replace(/[\s-]/g, '');
      if (!/^(?:\+92|0)?3\d{9}$/.test(cleanPhone)) {
        const msg = 'Please enter a valid Pakistani mobile number (e.g., 03001234567 or +923001234567).';
        setErrorMessage(msg);
        toast.error(msg);
        return false;
      }
    }

    if (stepNumber === 2) {
      if (['marks', 'intermediateMarks'].some((key) => Number(profile[key]) < 0 || Number(profile[key]) > 100)) {
        const msg = 'Academic percentages must be between 0 and 100.';
        setErrorMessage(msg);
        toast.error(msg);
        return false;
      }
      if (profile.entryTest && profile.entryTest !== 'None' && (!String(profile.entryTestScore).trim() || Number(profile.entryTestScore) < 0 || Number(profile.entryTestScore) > 100)) {
        const msg = 'Enter an entry test score between 0 and 100, or choose "None" if you have not taken a test.';
        setErrorMessage(msg);
        toast.error(msg);
        return false;
      }
    }

    setErrorMessage('');
    return true;
  };

  const goToStep2 = () => {
    if (validateStep(1)) {
      setStep(2);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (!validateStep(2)) {
      return;
    }

    // Save locally first to guarantee persistence
    saveUserProfile(currentUser.id, profile);
    localStorage.setItem(profileStorageKey(currentUser.id), JSON.stringify(profile));

    setProfileSaved(true);
    toast.success('Profile saved successfully! Your details are ready across all modules.');

    // Background online sync attempt
    try {
      const profilePayload = {
        id: currentUser.id,
        full_name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        city: profile.city,
        school: profile.school,
        marks: profile.marks ? Number(profile.marks) : null,
        intermediate_marks: profile.intermediateMarks ? Number(profile.intermediateMarks) : null,
        intermediate_group: profile.intermediateGroup,
        entry_test: profile.entryTest,
        entry_test_score: profile.entryTest !== 'None' && profile.entryTestScore ? Number(profile.entryTestScore) : null,
        academic_level: profile.academicLevel,
        preferred_field: profile.preferredField,
        interests: profile.interests,
        notes: profile.notes,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('profiles').upsert(profilePayload);
    } catch {
      // Offline fallback silent sync
    }
  };

  const handleExportProfile = () => {
    setShowMenu(false);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `profile_${profile.fullName || 'student'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Profile exported as JSON file.');
  };

  const handleResetProfile = () => {
    setShowMenu(false);
    if (window.confirm('Reset all fields to defaults? This will clear saved profile data.')) {
      const resetState = {
        ...EMPTY_PROFILE,
        fullName: currentUser?.name || '',
        email: currentUser?.email || '',
      };
      setProfile(resetState);
      if (currentUser?.id) {
        saveUserProfile(currentUser.id, resetState);
        try {
          localStorage.setItem(profileStorageKey(currentUser.id), JSON.stringify(resetState));
        } catch {}
      }
      toast.success('Profile fields reset to defaults.');
    }
  };

  const handleClearForm = () => {
    setShowMenu(false);
    if (window.confirm('Clear all input fields in the profile form?')) {
      const clearedState = {
        ...EMPTY_PROFILE,
        fullName: currentUser?.name || '',
        email: currentUser?.email || '',
      };
      setProfile(clearedState);
      if (currentUser?.id) {
        saveUserProfile(currentUser.id, clearedState);
        try {
          localStorage.setItem(profileStorageKey(currentUser.id), JSON.stringify(clearedState));
        } catch {}
      }
      toast.success('Profile form cleared.');
    }
  };

  const field = (label, name, type = 'text', placeholder = '', required = false) => (
    <label className="profile-field" htmlFor={`profile-${name}`}>
      <span>{label}{required && <span className="profile-required">*</span>}</span>
      <input
        id={`profile-${name}`}
        name={name}
        type={type}
        value={profile[name]}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        {...(type === 'number' ? { min: 0, max: 100 } : {})}
      />
    </label>
  );

  return (
    <main className="profile-page">

      {showScoreInfo && (
        <div className="profile-modal-overlay" onClick={() => setShowScoreInfo(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Entry Test Score Information</h3>
            <p><strong>Have you taken an entry test?</strong></p>
            <ul>
              <li><strong>Yes (ECAT, MDCAT, NET):</strong> Select your test from the dropdown and enter your percentage score (0-100).</li>
              <li><strong>No (Not taken yet):</strong> Select <strong>"None"</strong> in the Entry Test dropdown. The score field will be disabled and marked not applicable.</li>
            </ul>
            <p>Students selecting "None" achieve 100% profile completion without needing to enter 0 or placeholder scores.</p>
            <button type="button" className="profile-modal-close-btn" onClick={() => setShowScoreInfo(false)}>Got it</button>
          </div>
        </div>
      )}

      <section className="profile-workspace">
        <p className="profile-eyebrow profile-page-label">Profile management</p>
        <header className="profile-topbar">
          <div className="profile-identity">
            <div className="profile-avatar">{(profile.fullName || 'S').charAt(0).toUpperCase()}</div>
            <div>
              <h1>{profile.fullName || 'Student name'}</h1>
              <p>Class of 2026 · {profile.city || 'City not set'}</p>
            </div>
          </div>
          <div className="profile-completion">
            <div
              className="profile-ring"
              role="progressbar"
              aria-valuenow={completion}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Profile completion progress"
            >
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="profile-ring__track"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="profile-ring__indicator"
                  style={{
                    strokeDasharray: 119.38,
                    strokeDashoffset: 119.38 * (1 - Math.min(100, Math.max(0, completion)) / 100),
                  }}
                />
              </svg>
              <span className="profile-ring__text">{completion}%</span>
            </div>
            <div>
              <strong>{completion}% complete</strong>
              <small>{profile.entryTest === 'None' ? 'No entry test required' : profile.entryTestScore ? 'Entry test score added' : 'Add entry test score'}</small>
            </div>
            <div className="profile-actions-wrapper">
              <button
                type="button"
                className="profile-actions-trigger"
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label="Profile actions"
                title="Profile actions"
              >
                ⋮
              </button>
              {showMenu && (
                <div className="profile-actions-dropdown">
                  <button type="button" onClick={handleExportProfile}>Export profile (JSON)</button>
                  <button type="button" onClick={handleResetProfile}>Reset to default</button>
                  <button type="button" onClick={handleClearForm}>Clear form</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="profile-step-indicator">
          <span className={step === 1 ? 'profile-step profile-step--active' : 'profile-step'}>1. Personal information</span>
          <span className={step === 2 ? 'profile-step profile-step--active' : 'profile-step'}>2. Academic record</span>
        </div>

        {profileSaved ? (
          <section className="profile-saved-panel" role="status">
            <strong>Profile saved successfully.</strong>
            <p>Your profile data is synchronized and ready to auto-fill the University Recommender and Scholarship Finder.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="profile-save-button" onClick={() => setProfileSaved(false)} style={{ margin: 0, width: 'auto' }}>
                Edit profile
              </button>
              <button type="button" className="profile-back-button" onClick={() => navigate('/dashboard')} style={{ margin: 0 }}>
                Go to Dashboard
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSave} className="profile-form">
            {step === 1 && (
              <section className="profile-panel">
                <div className="profile-panel__heading">
                  <span className="profile-panel__icon">♙</span>
                  <div>
                    <h2>Personal information</h2>
                    <p>Your name and contact details.</p>
                  </div>
                </div>
                <div className="profile-fields">
                  {field('Full name', 'fullName', 'text', 'Your full name', true)}
                  {field('Email', 'email', 'email', 'you@example.com', true)}
                  {field('Phone number', 'phone', 'tel', '0300 1234567', true)}
                  <label className="profile-field" htmlFor="profile-city">
                    <span>Preferred city<span className="profile-required">*</span></span>
                    <select id="profile-city" name="city" value={profile.city} onChange={handleChange} required>
                      <option value="">Select a city</option>
                      {pakistaniCities.map((city) => <option key={city}>{city}</option>)}
                    </select>
                  </label>
                  {field('School / College', 'school', 'text', 'Your school or college', true)}
                </div>
                <button type="button" className="profile-save-button" onClick={goToStep2}>Next</button>
              </section>
            )}

            {step === 2 && (
              <section className="profile-panel">
                <div className="profile-panel__heading">
                  <span className="profile-panel__icon">▣</span>
                  <div>
                    <h2>Academic record</h2>
                    <p>Used to match your merit against university criteria.</p>
                  </div>
                </div>
                <div className="profile-fields profile-fields--academic">
                  {field('Matric %', 'marks', 'number', '88', true)}
                  {field('Intermediate %', 'intermediateMarks', 'number', '82', true)}
                  <label className="profile-field" htmlFor="profile-academicLevel">
                    <span>Academic level</span>
                    <select id="profile-academicLevel" name="academicLevel" value={profile.academicLevel} onChange={handleChange}>
                      <option>Intermediate</option>
                      <option>Undergraduate</option>
                      <option>Graduate</option>
                    </select>
                  </label>
                  <label className="profile-field" htmlFor="profile-intermediateGroup">
                    <span>Intermediate group</span>
                    <select id="profile-intermediateGroup" name="intermediateGroup" value={profile.intermediateGroup} onChange={handleChange}>
                      <option>Pre-Engineering</option>
                      <option>Pre-Medical</option>
                      <option>ICS</option>
                      <option>Commerce</option>
                    </select>
                  </label>
                  <label className="profile-field" htmlFor="profile-entryTest">
                    <span>Entry test</span>
                    <select id="profile-entryTest" name="entryTest" value={profile.entryTest} onChange={handleChange}>
                      <option value="None">None (Not taken)</option>
                      <option value="ECAT">ECAT</option>
                      <option value="MDCAT">MDCAT</option>
                      <option value="NET">NET</option>
                    </select>
                  </label>
                  <label className="profile-field" htmlFor="profile-entryTestScore">
                    <span>
                      Entry test score
                      <button
                        type="button"
                        className="profile-info-button"
                        onClick={() => setShowScoreInfo(true)}
                        aria-label="Entry test score information"
                        title="Click for score info"
                      >
                        i
                      </button>
                      {profile.entryTest !== 'None' && <span className="profile-required">*</span>}
                    </span>
                    <input
                      id="profile-entryTestScore"
                      name="entryTestScore"
                      type="number"
                      min="0"
                      max="100"
                      value={profile.entryTestScore}
                      onChange={handleChange}
                      placeholder={profile.entryTest === 'None' ? 'Not applicable' : '0-100'}
                      disabled={profile.entryTest === 'None'}
                    />
                  </label>
                  <label className="profile-field profile-field--wide" htmlFor="profile-interests">
                    <span>What describes you best?</span>
                    <small>Pick the statement closest to your interests.</small>
                    <select id="profile-interests" name="interests" value={profile.interests} onChange={handleChange}>
                      <option value="">-- Select a statement --</option>
                      {interestStatements.map((statement) => <option value={statement} key={statement}>{statement}</option>)}
                    </select>
                  </label>
                </div>
                <div className="profile-button-row">
                  <button type="button" className="profile-back-button" onClick={() => setStep(1)}>Back</button>
                  <button type="submit" className="profile-save-button">Save changes</button>
                </div>
              </section>
            )}
          </form>
        )}
        {errorMessage && <p className="profile-feedback profile-feedback--error">{errorMessage}</p>}

        <section className="profile-saved-section">
          <div className="profile-saved-header">
            <div>
              <p className="profile-eyebrow">Saved bookmarks</p>
              <h2>Saved Opportunities</h2>
              <p className="profile-saved-subtitle">
                Keep track of universities and scholarships you bookmarked while exploring options.
              </p>
            </div>
            <div className="profile-saved-tabs">
              <button
                type="button"
                className={`profile-saved-tab ${savedTab === 'all' ? 'profile-saved-tab--active' : ''}`}
                onClick={() => setSavedTab('all')}
              >
                All ({bookmarks.universities.length + bookmarks.scholarships.length})
              </button>
              <button
                type="button"
                className={`profile-saved-tab ${savedTab === 'universities' ? 'profile-saved-tab--active' : ''}`}
                onClick={() => setSavedTab('universities')}
              >
                Universities ({bookmarks.universities.length})
              </button>
              <button
                type="button"
                className={`profile-saved-tab ${savedTab === 'scholarships' ? 'profile-saved-tab--active' : ''}`}
                onClick={() => setSavedTab('scholarships')}
              >
                Scholarships ({bookmarks.scholarships.length})
              </button>
            </div>
          </div>

          {bookmarks.universities.length === 0 && bookmarks.scholarships.length === 0 ? (
            <div className="profile-saved-empty">
              <div className="profile-saved-empty-icon">⭐</div>
              <p><strong>No saved opportunities yet</strong></p>
              <p className="profile-muted">
                Explore universities and scholarships to bookmark opportunities you want to apply to later.
              </p>
              <div className="profile-saved-empty-actions">
                <button
                  type="button"
                  onClick={() => navigate('/university-recommender')}
                  className="profile-saved-btn profile-saved-btn--primary"
                >
                  Explore Universities
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/scholarships')}
                  className="profile-saved-btn profile-saved-btn--secondary"
                >
                  Find Scholarships
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-saved-grid">
              {(savedTab === 'all' || savedTab === 'universities') &&
                bookmarks.universities.map((uni, idx) => (
                  <article key={`saved-uni-${uni.id || uni.University || uni.name || idx}`} className="profile-saved-card">
                    <div className="profile-saved-card__badge">🏛️ University</div>
                    <h3 className="profile-saved-card__title">{uni.University || uni.name}</h3>
                    {uni.Program && <p className="profile-saved-card__detail"><strong>Program:</strong> {uni.Program}</p>}
                    {uni.City && <p className="profile-saved-card__detail"><strong>Location:</strong> {uni.City}</p>}
                    {uni.Merit && <p className="profile-saved-card__detail"><strong>Merit:</strong> {uni.Merit}% required</p>}
                    {uni.requirements && <p className="profile-saved-card__subdetail">{uni.requirements}</p>}
                    <div className="profile-saved-card__actions">
                      {(uni.link || uni.website_url || uni.website) && (
                        <a
                          href={uni.link || uni.website_url || uni.website}
                          target="_blank"
                          rel="noreferrer"
                          className="profile-saved-card__link"
                        >
                          Visit / Apply →
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveBookmark('universities', uni)}
                        className="profile-saved-card__remove"
                        title="Remove bookmark"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}

              {(savedTab === 'all' || savedTab === 'scholarships') &&
                bookmarks.scholarships.map((sch, idx) => (
                  <article key={`saved-sch-${sch.id || sch.name || idx}`} className="profile-saved-card">
                    <div className="profile-saved-card__badge profile-saved-card__badge--scholarship">🎓 Scholarship</div>
                    <h3 className="profile-saved-card__title">{sch.name}</h3>
                    {sch.provider && <p className="profile-saved-card__detail"><strong>Provider:</strong> {sch.provider}</p>}
                    {sch.field && <p className="profile-saved-card__detail"><strong>Category:</strong> {sch.field}</p>}
                    {sch.min_percentage && <p className="profile-saved-card__detail"><strong>Min Merit:</strong> {sch.min_percentage}%</p>}
                    {sch.provinces && <p className="profile-saved-card__subdetail">Region: {sch.provinces}</p>}
                    <div className="profile-saved-card__actions">
                      {(sch.link || sch.source_url) && (
                        <a
                          href={sch.link || sch.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="profile-saved-card__link"
                        >
                          Apply Now →
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveBookmark('scholarships', sch)}
                        className="profile-saved-card__remove"
                        title="Remove bookmark"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>

        <section className="profile-history">
          <p className="profile-eyebrow">Previous recommendations</p>
          <h2>Your saved recommendation history</h2>
          {recommendations.length === 0 ? (
            <p className="profile-muted">No previous recommendations yet. Complete a quiz to generate your first recommendation.</p>
          ) : (
            recommendations.map((item, index) => (
              <article key={`${item.recommendation}-${item.savedAt || index}`}>
                <strong>{item.recommendation}</strong>
                <p>Best match: {item.highestCategory || 'Not available'}</p>
                <p>Saved: {item.savedAt ? new Date(item.savedAt).toLocaleString() : 'Recently'}</p>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

export default Profile;
