// Accept Coach Invite & Create Account View for Inside Edge (/invite/:token)

import React, { useState, useEffect } from 'react';
import { getInviteByToken, consumeInviteAndCreateAccount } from '../modules/cricket/authService';
import type { CoachInvite } from '../types/cricket';
import { UserPlus, AlertCircle, ArrowRight, Lock, Mail, User } from 'lucide-react';


interface AcceptInviteViewProps {
  token: string;
  onAccountCreated?: () => void;
}

export const AcceptInviteView: React.FC<AcceptInviteViewProps> = ({ token, onAccountCreated }) => {
  const [invite, setInvite] = useState<CoachInvite | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      setIsVerifying(true);
      setVerifyError(null);
      try {
        const found = await getInviteByToken(token);
        if (!found) {
          setVerifyError('This invitation link is invalid or has expired. Please contact your Head Coach to send a new invite link.');
        } else if (found.used) {
          setVerifyError('This invitation link has already been used to create an account.');
        } else {
          setInvite(found);
        }
      } catch (err: any) {
        setVerifyError(err.message || 'Failed to verify invitation token.');
      } finally {
        setIsVerifying(false);
      }
    }
    loadInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setSubmitError('Please fill out all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await consumeInviteAndCreateAccount({
        inviteToken: token,
        email,
        pass: password,
        displayName
      });
      if (onAccountCreated) {
        onAccountCreated();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Verifying coach invitation link...
      </div>
    );
  }

  if (verifyError || !invite) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '420px', textAlign: 'center', border: '1px solid #ef4444', padding: '28px' }}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: '#ef4444' }}>
            Invalid Invitation Link
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
            {verifyError || 'This invitation is no longer valid.'}
          </p>
          <a
            href="/"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  const roleLabel = invite.role === 'head_coach' ? 'Head Coach' : 'Assistant Coach';

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
          maxWidth: '440px',
          padding: '28px',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(145deg, #18221c 0%, #0f1612 100%)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
            <UserPlus size={28} color="var(--accent-gold)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            Join Inside Edge Squad
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase' }}>
            Invited as: {roleLabel}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Invitation sent by {invite.createdByName}
          </div>
        </div>

        {submitError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{submitError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <User size={14} /> FULL NAME / DISPLAY NAME
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Coach Sarah Jenkins"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-elevated)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Mail size={14} /> EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="sarah@club.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-elevated)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Lock size={14} /> CREATE PASSWORD
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-elevated)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Lock size={14} /> CONFIRM PASSWORD
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-elevated)', color: 'var(--text-main)', fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isSubmitting ? 'CREATING ACCOUNT...' : <>CREATE ACCOUNT & ENTER APP <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};
