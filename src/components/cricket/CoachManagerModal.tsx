// Coach Access Management Modal (Head Coach Dashboard)

import React, { useState, useEffect } from 'react';
import { getCoachesList, getCoachInvites, createCoachInvite } from '../../modules/cricket/authService';
import type { CoachUser, CoachInvite, CoachRole } from '../../types/cricket';
import { Users, UserPlus, Copy, Check, X } from 'lucide-react';


interface CoachManagerModalProps {
  currentCoach: CoachUser;
  onClose: () => void;
}

export const CoachManagerModal: React.FC<CoachManagerModalProps> = ({ currentCoach, onClose }) => {
  const [activeTab, setActiveTab] = useState<'coaches' | 'invites'>('coaches');
  const [coaches, setCoaches] = useState<CoachUser[]>([]);
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Invite generation state
  const [selectedRole, setSelectedRole] = useState<CoachRole>('assistant_coach');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const coachList = await getCoachesList();
      const inviteList = await getCoachInvites();
      setCoaches(coachList);
      setInvites(inviteList);
    } catch (err) {
      console.error('Error loading coach manager data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvite = async () => {
    setFeedback('');
    try {
      const invite = await createCoachInvite(selectedRole, currentCoach);
      const url = `${window.location.origin}/invite/${invite.token}`;
      setGeneratedInviteUrl(url);
      setInvites(prev => [invite, ...prev]);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to generate invitation link.');
    }
  };

  const handleCopyLink = async () => {
    if (!generatedInviteUrl) return;
    try {
      await navigator.clipboard.writeText(generatedInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback('Could not copy the link. Select and copy it manually instead.');
    }
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-manager-title"
        className="bottom-sheet-content"
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
              CLUB COACH MANAGEMENT
            </div>
            <div id="coach-manager-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Coaches & Permissions</div>
          </div>
          <button type="button" aria-label="Close coach management" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {feedback && (
          <div role="status" style={{ marginBottom: '14px', color: feedback.startsWith('Could not') ? '#f97316' : '#ef4444', fontSize: '0.85rem' }}>
            {feedback}
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '8px', padding: '4px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('coaches')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'coaches' ? 'var(--primary-green)' : 'transparent',
              color: activeTab === 'coaches' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Users size={16} /> REGISTERED COACHES ({coaches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invites')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'invites' ? 'var(--primary-green)' : 'transparent',
              color: activeTab === 'invites' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={16} /> INVITE COACH
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
            Loading coach data...
          </div>
        ) : (
          <>
            {/* Tab 1: Registered Coaches List */}
            {activeTab === 'coaches' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {coaches.map(c => (
                  <div
                    key={c.uid}
                    style={{
                      background: 'var(--bg-surface-card)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.displayName || c.email}
                        {c.uid === currentCoach.uid && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--accent-gold-soft)', color: 'var(--accent-gold)', padding: '2px 6px', borderRadius: '4px' }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {c.email}
                      </div>
                    </div>
                    <span
                      className={`badge ${c.role === 'head_coach' ? 'badge-gold' : 'badge-green'}`}
                      style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px' }}
                    >
                      {c.role === 'head_coach' ? 'HEAD COACH' : 'ASSISTANT'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Generate Coach Invite Link */}
            {activeTab === 'invites' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '16px', border: '1px solid var(--border-gold)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-gold)', marginBottom: '8px' }}>
                    Generate Single-Use Coach Invite Link
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '14px' }}>
                    Generate a secure invitation link for a new coach. The invite assigns their pre-approved role upon registration.
                  </p>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SELECT ROLE</label>
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value as CoachRole)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-light)',
                        marginTop: '4px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="assistant_coach">Assistant Coach (Shared squad data; no head-coach private notes)</option>
                      <option value="head_coach">Head Coach (Full admin access & private notes)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={handleGenerateInvite}
                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <UserPlus size={16} /> GENERATE INVITE LINK
                  </button>

                  {/* Generated URL Box */}
                  {generatedInviteUrl && (
                    <div style={{ marginTop: '16px', background: 'var(--bg-surface-elevated)', border: '1px dashed var(--accent-gold)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 800, marginBottom: '4px' }}>
                        NEW INVITATION LINK GENERATED:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          readOnly
                          value={generatedInviteUrl}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '4px',
                            background: 'var(--bg-surface-card)',
                            color: '#fff',
                            border: '1px solid var(--border-light)',
                            fontSize: '0.75rem'
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-gold"
                          onClick={handleCopyLink}
                          style={{ width: 'auto', padding: '0 12px', height: '32px', fontSize: '0.75rem' }}
                        >
                          {copied ? <><Check size={14} /> COPIED</> : <><Copy size={14} /> COPY</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invites Log */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    RECENT INVITATION LINKS ({invites.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {invites.map(inv => (
                      <div
                        key={inv.id}
                        style={{
                          background: 'var(--bg-surface-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div>
                          <span className={`badge ${inv.role === 'head_coach' ? 'badge-gold' : 'badge-green'}`} style={{ fontSize: '0.65rem' }}>
                            {inv.role === 'head_coach' ? 'HEAD COACH' : 'ASSISTANT'}
                          </span>
                          <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Token: {inv.token.slice(0, 8)}... • Created {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`badge ${inv.used ? 'badge-grey' : 'badge-live'}`} style={{ fontSize: '0.65rem' }}>
                          {inv.used ? `USED BY ${inv.usedByEmail || 'USER'}` : 'ACTIVE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
