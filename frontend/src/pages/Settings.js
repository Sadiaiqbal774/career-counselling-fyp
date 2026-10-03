import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

const SETTINGS_KEY = 'career-guide-settings';
const DEFAULT_SETTINGS = { darkMode: false };

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Settings() {
  const navigate = useNavigate();
  const { currentUser, logout, deleteAccount } = useAuth();
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true });
  }, [currentUser, navigate]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark-mode', settings.darkMode);
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    toast.success('Settings saved.');
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const removeAccount = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    const password = window.prompt('Enter your current password to confirm account deletion.');
    if (!password) return;
    try {
      await deleteAccount(password);
      navigate('/login', { replace: true });
    } catch (deleteError) {
      toast.error(deleteError.message || 'Unable to delete account.');
    }
  };

  return (
    <main className="settings-page">
      <section className="settings-header">
        <p className="eyebrow">CAREERGUIDE SETTINGS</p>
        <h1>Settings</h1>
        <p>Personalize your experience and manage your account preferences.</p>
      </section>
      <div className="settings-layout">
        <section className="settings-section">
          <div className="settings-section__heading"><span className="settings-icon">A</span><div><h2>Account</h2><p>Manage access to {currentUser?.email || 'your account'}.</p></div></div>
          <button className="settings-row" type="button" onClick={() => navigate('/change-password')}><span>Change password</span><span aria-hidden="true">›</span></button>
          <button className="settings-row" type="button" onClick={signOut}><span>Sign out</span><span aria-hidden="true">›</span></button>
          {!currentUser?.isAdmin && <button className="settings-row settings-row--danger" type="button" onClick={removeAccount}><span>Delete account</span><span aria-hidden="true">›</span></button>}
        </section>
        <section className="settings-section">
          <div className="settings-section__heading"><span className="settings-icon">D</span><div><h2>Display</h2><p>Choose the visual style that feels right to you.</p></div></div>
          <label className="settings-toggle-row"><span><strong>Dark mode</strong><small>Use a darker color palette across the app.</small></span><input type="checkbox" checked={settings.darkMode} onChange={(event) => updateSetting('darkMode', event.target.checked)} /><span className="toggle-track" aria-hidden="true" /></label>
        </section>
        <section className="settings-section">
          <div className="settings-section__heading"><span className="settings-icon">?</span><div><h2>Help &amp; Support</h2><p>Find product information or contact the team.</p></div></div>
          <div className="settings-support"><div><strong>About CareerGuide</strong><small>Career guidance, university discovery, and scholarship planning.</small></div><span className="settings-version">Version 1.0.0</span></div>
          <a className="settings-row" href="mailto:support@careerguide.app?subject=CareerGuide%20Support"><span>Contact support</span><span aria-hidden="true">›</span></a>
        </section>
      </div>
    </main>
  );
}

export default Settings;