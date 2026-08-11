// Coach Sign-In View for Inside Edge (Firebase Auth)

import React, { useState } from 'react';
import { loginWithEmailAndPassword, sendPasswordResetEmail } from '../modules/cricket/authService';
import { Shield, Key, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
  onTestAccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onTestAccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [isResetOpen, setIsResetOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithEmailAndPassword(email, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetErrorMessage('Please enter your account email address.');
      return;
    }

    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    try {
      await sendPasswordResetEmail(resetEmail);
      setResetSuccessMessage('Password reset link sent! Check your email inbox to update your password.');
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(145deg, #18221c 0%, #0f1612 100%)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-gold-soft)',
              border: '2px solid var(--accent-gold)',
              marginBottom: '12px'
            }}
          >
            <Shield size={28} color="var(--accent-gold)" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            INSIDE EDGE
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase' }}>
            Cricket Coaching Platform
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Sign in to access your club squad data
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Mail size={14} /> COACH EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="headcoach@club.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> PASSWORD
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsResetOpen(true);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold"
            disabled={isLoading}
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoading ? 'SIGNING IN...' : <>SIGN IN TO CLUB APP <ArrowRight size={18} /></>}
          </button>
        </form>

        {/* Footer info note */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Need an account? Ask your club Head Coach for an invite link.
        </div>

        {/* Test Access (temporary, pre-launch) */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => onTestAccess && onTestAccess()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FlaskConical size={14} /> Tester
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isResetOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsResetOpen(false)}>
          <div className="bottom-sheet-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--accent-gold)" /> Reset Password
              </div>
              <button type="button" onClick={() => setIsResetOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {resetSuccessMessage ? (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--primary-green-light)', borderRadius: '8px', padding: '12px', color: 'var(--primary-green-light)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <div>{resetSuccessMessage}</div>
              </div>
            ) : (
              <form onSubmit={handleSendReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {resetErrorMessage && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#ef4444', fontSize: '0.8rem' }}>
                    {resetErrorMessage}
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACCOUNT EMAIL</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="coach@club.com"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', color: 'var(--text-main)', marginTop: '4px', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsResetOpen(false)} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
