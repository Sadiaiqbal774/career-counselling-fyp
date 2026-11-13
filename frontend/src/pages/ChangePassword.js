import { useMemo, useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import { hasPassword, isStrongPassword } from '../lib/authHelpers';
import './Auth.css';
import PasswordField from '../components/PasswordField';

function ChangePassword() {
  const navigate = useNavigate();
  const { currentUser, initialized, isAuthenticated, changePassword, resetPassword, setPasswordForGoogleUser } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alternativeMessage, setAlternativeMessage] = useState('');

  // ----- OTP / Set‑Password state -----
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpCooldownRef = useRef(null);

  // Cleanup cooldown on unmount
  useEffect(() => () => {
    if (otpCooldownRef.current) clearInterval(otpCooldownRef.current);
  }, []);

  const email = useMemo(() => currentUser?.email || '', [currentUser]);
  const usesPassword = hasPassword(currentUser);

  if (initialized && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ----- Request OTP (reauth) -----
  const requestOtp = async () => {
    setOtpError('');
    if (otpCooldownRef.current) return; // already counting down
    const { error } = await supabase.auth.reauthenticate();
    if (error) {
      if (error.status === 429) {
        setOtpError('Too many requests – please wait a minute.');
      } else {
        setOtpError(error.message || 'Failed to send verification code.');
      }
      return;
    }
    // Success – start 60 s cooldown
    setOtpSent(true);
    setOtpCooldown(60);
    otpCooldownRef.current = setInterval(() => {
      setOtpCooldown((c) => {
        if (c <= 1) {
          clearInterval(otpCooldownRef.current);
          otpCooldownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (newPwd !== confirmPwd) {
      setOtpError('Passwords do not match.');
      return;
    }
    if (!isStrongPassword(newPwd)) {
      setOtpError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    try {
      await setPasswordForGoogleUser({ email, otpCode, newPassword: newPwd });
      toast.success('Password set successfully.');
      setShowSetPassword(false);
    } catch (e) {
      setOtpError(e.message || 'Unable to set password.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) {
      setError('Please login again before changing password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password does not meet strength requirements.');
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword({ oldPassword, newPassword: password });
      setMessage('Password updated successfully.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 900);
    } catch (err) {
      setError(err.message || 'Unable to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tryAnotherWay = async () => {
    setAlternativeMessage('');
    try {
      await resetPassword(email);
      setAlternativeMessage('If an account exists for this email, a secure reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to send the reset link.');
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-shell">
        <aside className="auth-hero">
          <div className="auth-brand-row">
            <div className="auth-brand-mark">CG</div>
            <div>
              <div className="auth-brand-name">CareerGuide</div>
              <div className="auth-brand-subtitle">Account security</div>
            </div>
          </div>
          <h1>Change your password</h1>
          <p>Choose a new secure password for your account.</p>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Account security</p>
            <h2>Change password</h2>
            <p className="muted-text">Set a strong new password for your account.</p>
          </div>

          {usesPassword ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-field">
                <span>Current password</span>
                <PasswordField value={oldPassword} onChange={(ev) => setOldPassword(ev.target.value)} required />
              </label>
              <label className="auth-field">
                <span>New password</span>
                <PasswordField value={password} onChange={(ev) => setPassword(ev.target.value)} required />
              </label>
              <label className="auth-field">
                <span>Confirm password</span>
                <PasswordField value={confirmPassword} onChange={(ev) => setConfirmPassword(ev.target.value)} required />
              </label>
              {error && <p className="auth-error">{error}</p>}
              {message && <p className="auth-success">{message}</p>}
              {alternativeMessage && <p className="auth-success">{alternativeMessage}</p>}
              <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Change password'}
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <p className="muted-text">
                This account uses Google sign‑in and has no current password.
              </p>
              {!currentUser.emailConfirmed && (
                <p className="auth-error">Your Google email is not verified. Please verify it first.</p>
              )}
              <button
                type="button"
                className="auth-primary-button"
                disabled={!currentUser.emailConfirmed}
                onClick={() => setShowSetPassword(true)}
              >
                Set a password
              </button>
            </div>
          )}
          <button type="button" className="auth-secondary-button" onClick={tryAnotherWay}>
            Try another way (send reset link)
          </button>
        </section>
      </section>

      {/* ----- Set‑Password Modal ----- */}
      {showSetPassword && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Set a password for your account</h2>
            {!otpSent ? (
              <>
                <p>We will send a verification code to your email.</p>
                {otpError && <p className="auth-error">{otpError}</p>}
                <button className="auth-primary-button" onClick={requestOtp} disabled={otpCooldown > 0}>
                  {otpCooldown > 0 ? `Resend code (${otpCooldown}s)` : 'Send verification code'}
                </button>
                <button className="auth-secondary-button" onClick={() => setShowSetPassword(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <form onSubmit={handleSetPassword} className="auth-form">
                <label className="auth-field">
                  <span>Verification code</span>
                  <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
                </label>
                <label className="auth-field">
                  <span>New password</span>
                  <PasswordField value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
                </label>
                <label className="auth-field">
                  <span>Confirm password</span>
                  <PasswordField value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
                </label>
                {otpError && <p className="auth-error">{otpError}</p>}
                <button className="auth-primary-button" type="submit">Set password</button>
                <button className="auth-secondary-button" type="button" onClick={() => setShowSetPassword(false)}>
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default ChangePassword;
