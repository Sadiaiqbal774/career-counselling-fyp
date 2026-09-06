import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import interestExamples from '../data/interestExamples.json';
import './Profile.css';

const EMPTY_PROFILE = {
  fullName: '', email: '', phone: '', city: '', school: '', marks: '', intermediateMarks: '',
  intermediateGroup: 'Pre-Engineering', entryTest: 'ECAT', entryTestScore: '',
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
  try {
    return JSON.parse(localStorage.getItem(profileStorageKey(userId)) || 'null');
  } catch {
    return null;
  }
}

function Profile() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [step, setStep] = useState(1);
  const [profileSaved, setProfileSaved] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadProfileData() {
      if (!currentUser?.id) return;
      let [{ data: savedProfile, error: profileError }, { data: savedHistory, error: historyError }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, city, academic_level, school, marks, intermediate_marks, intermediate_group, entry_test, entry_test_score, preferred_field, interests, notes, updated_at').eq('id', currentUser.id).maybeSingle(),
        supabase.from('recommendations').select('*').eq('user_id', currentUser.id).order('saved_at', { ascending: false }).limit(5),
      ]);
      if (profileError && /column|schema cache|does not exist/i.test(profileError.message || '')) {
        const legacyResult = await supabase.from('profiles').select('id, full_name, email, academic_level, school, marks, preferred_field, interests, notes, updated_at').eq('id', currentUser.id).maybeSingle();
        savedProfile = legacyResult.data;
        profileError = legacyResult.error;
      }
      if (cancelled) return;
      if (profileError || historyError) {
        setErrorMessage(profileError?.message || historyError?.message || 'Unable to load profile data.');
        return;
      }
      const localProfile = readLocalProfile(currentUser.id);
      setProfile({
        ...EMPTY_PROFILE,
        ...localProfile,
        fullName: savedProfile?.full_name || localProfile?.fullName || currentUser.name || '', email: currentUser.email || localProfile?.email || savedProfile?.email || '',
        phone: savedProfile?.phone || localProfile?.phone || '', city: savedProfile?.city || localProfile?.city || '', school: savedProfile?.school || localProfile?.school || '',
        marks: savedProfile?.marks || localProfile?.marks || '', intermediateMarks: savedProfile?.intermediate_marks || localProfile?.intermediateMarks || '',
        intermediateGroup: savedProfile?.intermediate_group || localProfile?.intermediateGroup || 'Pre-Engineering', entryTest: savedProfile?.entry_test || localProfile?.entryTest || 'ECAT',
        entryTestScore: savedProfile?.entry_test_score || localProfile?.entryTestScore || '', academicLevel: savedProfile?.academic_level || localProfile?.academicLevel || 'Intermediate',
        preferredField: savedProfile?.preferred_field || localProfile?.preferredField || 'Technology', interests: savedProfile?.interests || localProfile?.interests || '', notes: savedProfile?.notes || localProfile?.notes || '',
      });
      setRecommendations((savedHistory || []).map((item) => ({ ...item, highestCategory: item.highest_category, savedAt: item.saved_at })));
    }
    loadProfileData();
    return () => { cancelled = true; };
  }, [currentUser]);

  const completion = useMemo(() => {
    const required = ['fullName', 'email', 'phone', 'city', 'school', 'marks', 'intermediateMarks'];
    if (profile.entryTest !== 'None') required.push('entryTestScore');
    return Math.round((required.filter((key) => String(profile[key]).trim()).length / required.length) * 100);
  }, [profile]);

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    const nextValue = type === 'number' && value !== '' && Number(value) < 0 ? '0' : value;
    setProfile((previous) => ({ ...previous, [name]: nextValue, ...(name === 'entryTest' && value === 'None' ? { entryTestScore: '' } : {}) }));
    setProfileSaved(false);
  };

  const validateStep = (stepNumber) => {
    const hasMissing = REQUIRED_FIELDS[stepNumber].some((key) => !String(profile[key]).trim());
    if (hasMissing) { setErrorMessage('Please fill in all required fields before continuing.'); return false; }
    if (stepNumber === 1 && !/^(?:\+92|0)?3\d{9}$/.test(profile.phone.replace(/[\s-]/g, ''))) {
      setErrorMessage('Please enter a valid Pakistani mobile number, for example 03001234567.'); return false;
    }
    if (stepNumber === 2 && ['marks', 'intermediateMarks'].some((key) => Number(profile[key]) < 0 || Number(profile[key]) > 100)) {
      setErrorMessage('Academic percentages must be between 0 and 100.'); return false;
    }
    if (stepNumber === 2 && profile.entryTest !== 'None' && (!String(profile.entryTestScore).trim() || Number(profile.entryTestScore) < 0 || Number(profile.entryTestScore) > 100)) {
      setErrorMessage('Enter an entry test score between 0 and 100, or choose None.'); return false;
    }
    setErrorMessage('');
    return true;
  };

  const goToStep2 = () => { if (validateStep(1)) setStep(2); };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validateStep(2)) return;
    const profilePayload = {
      id: currentUser.id, full_name: profile.fullName, email: profile.email, phone: profile.phone, city: profile.city,
      school: profile.school, marks: profile.marks, intermediate_marks: profile.intermediateMarks,
      intermediate_group: profile.intermediateGroup, entry_test: profile.entryTest, entry_test_score: profile.entryTestScore || null,
      academic_level: profile.academicLevel, preferred_field: profile.preferredField, interests: profile.interests,
      notes: profile.notes, updated_at: new Date().toISOString(),
    };
    localStorage.setItem(profileStorageKey(currentUser.id), JSON.stringify(profile));
    let { error } = await supabase.from('profiles').upsert(profilePayload);
    if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
      const legacyPayload = {
        id: currentUser.id, full_name: profile.fullName, email: profile.email, academic_level: profile.academicLevel,
        school: profile.school, marks: profile.marks, preferred_field: profile.preferredField,
        interests: profile.interests, notes: profile.notes, updated_at: new Date().toISOString(),
      };
      const legacyResult = await supabase.from('profiles').upsert(legacyPayload);
      error = legacyResult.error;
      if (!error) setErrorMessage('Profile saved locally and to the existing fields. Run the profile migration in Supabase to save the new fields online.');
    }
    if (error) { setErrorMessage(`Profile saved locally. Online sync failed: ${error.message || 'database unavailable'}`); return; }
    setProfileSaved(true);
  };

  const field = (label, name, type = 'text', placeholder = '', required = false) => (
    <label className="profile-field" htmlFor={`profile-${name}`}>
      <span>{label}{required && <span className="profile-required">*</span>}</span>
      <input id={`profile-${name}`} name={name} type={type} value={profile[name]} onChange={handleChange} placeholder={placeholder} required={required} {...(type === 'number' ? { min: 0 } : {})} />
    </label>
  );

  return (
    <main className="profile-page">
      <section className="profile-workspace">
        <p className="profile-eyebrow profile-page-label">Profile management</p>
        <header className="profile-topbar">
          <div className="profile-identity">
            <div className="profile-avatar">{(profile.fullName || 'S').charAt(0).toUpperCase()}</div>
            <div><h1>{profile.fullName || 'Student name'}</h1><p>Class of 2026 · {profile.city || 'City not set'}</p></div>
          </div>
          <div className="profile-completion">
            <div className="profile-ring"><span>{completion}%</span></div>
            <div><strong>{completion}% complete</strong><small>{profile.entryTest === 'None' ? 'No entry test required' : profile.entryTestScore ? 'Entry test score added' : 'Add entry test score'}</small></div>
          </div>
        </header>

        <div className="profile-step-indicator"><span className={step === 1 ? 'profile-step profile-step--active' : 'profile-step'}>1. Personal information</span><span className={step === 2 ? 'profile-step profile-step--active' : 'profile-step'}>2. Academic record</span></div>

        {profileSaved ? <section className="profile-saved-panel" role="status"><strong>Profile saved successfully.</strong><p>Your profile is ready to use across recommendations.</p><button type="button" className="profile-save-button" onClick={() => setProfileSaved(false)}>Edit profile</button></section> : <form onSubmit={handleSave} className="profile-form">
          {step === 1 && <section className="profile-panel">
            <div className="profile-panel__heading"><span className="profile-panel__icon">♙</span><div><h2>Personal information</h2><p>Your name and contact details.</p></div></div>
            <div className="profile-fields">{field('Full name', 'fullName', 'text', 'Your full name', true)}{field('Email', 'email', 'email', 'you@example.com', true)}{field('Phone number', 'phone', 'tel', '0300 1234567', true)}<label className="profile-field" htmlFor="profile-city"><span>Preferred city<span className="profile-required">*</span></span><select id="profile-city" name="city" value={profile.city} onChange={handleChange} required><option value="">Select a city</option>{pakistaniCities.map((city) => <option key={city}>{city}</option>)}</select></label>{field('School / College', 'school', 'text', 'Your school or college', true)}</div>
            <button type="button" className="profile-save-button" onClick={goToStep2}>Next</button>
          </section>}

          {step === 2 && <section className="profile-panel">
            <div className="profile-panel__heading"><span className="profile-panel__icon">▣</span><div><h2>Academic record</h2><p>Used to match your merit against university criteria.</p></div></div>
            <div className="profile-fields profile-fields--academic">{field('Matric %', 'marks', 'number', '88', true)}{field('Intermediate %', 'intermediateMarks', 'number', '82', true)}
              <label className="profile-field" htmlFor="profile-academicLevel"><span>Academic level</span><select id="profile-academicLevel" name="academicLevel" value={profile.academicLevel} onChange={handleChange}><option>Intermediate</option><option>Undergraduate</option><option>Graduate</option></select></label>
              <label className="profile-field" htmlFor="profile-intermediateGroup"><span>Intermediate group</span><select id="profile-intermediateGroup" name="intermediateGroup" value={profile.intermediateGroup} onChange={handleChange}><option>Pre-Engineering</option><option>Pre-Medical</option><option>ICS</option><option>Commerce</option></select></label>
              <label className="profile-field" htmlFor="profile-entryTest"><span>Entry test</span><select id="profile-entryTest" name="entryTest" value={profile.entryTest} onChange={handleChange}><option>ECAT</option><option>MDCAT</option><option>NET</option><option>None</option></select></label>
              <label className="profile-field" htmlFor="profile-entryTestScore"><span>Entry test score <button type="button" className="profile-info-button" title="Leave this blank when no entry test was taken." aria-label="Entry test score information">i</button>{profile.entryTest !== 'None' && <span className="profile-required">*</span>}</span><input id="profile-entryTestScore" name="entryTestScore" type="number" min="0" max="100" value={profile.entryTestScore} onChange={handleChange} placeholder={profile.entryTest === 'None' ? 'Not applicable' : '0-100'} disabled={profile.entryTest === 'None'} /></label>
              <label className="profile-field profile-field--wide" htmlFor="profile-interests"><span>What describes you best?</span><small>Pick the statement closest to your interests.</small><select id="profile-interests" name="interests" value={profile.interests} onChange={handleChange}><option value="">-- Select a statement --</option>{interestStatements.map((statement) => <option value={statement} key={statement}>{statement}</option>)}</select></label>
            </div>
            <div className="profile-button-row"><button type="button" className="profile-back-button" onClick={() => setStep(1)}>Back</button><button type="submit" className="profile-save-button">Save changes</button></div>
          </section>}
        </form>}
        {errorMessage && <p className="profile-feedback profile-feedback--error">{errorMessage}</p>}

        <section className="profile-history"><p className="profile-eyebrow">Previous recommendations</p><h2>Your saved recommendation history</h2>
          {recommendations.length === 0 ? <p className="profile-muted">No previous recommendations yet. Complete a quiz to generate your first recommendation.</p> : recommendations.map((item, index) => <article key={`${item.recommendation}-${item.savedAt || index}`}><strong>{item.recommendation}</strong><p>Best match: {item.highestCategory || 'Not available'}</p><p>Saved: {item.savedAt ? new Date(item.savedAt).toLocaleString() : 'Recently'}</p></article>)}
        </section>
      </section>
    </main>
  );
}

export default Profile;
