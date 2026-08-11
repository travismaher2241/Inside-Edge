import React, { useState, useEffect } from 'react';
import type { ClubTeam } from '../../types/cricket';
import { getClubTeams, createClubTeam } from '../../modules/cricket/matchReportService';
import { isFirebaseConfigured } from '../../lib/firebase';
import { FirebaseNotConfiguredBanner } from './FirebaseNotConfiguredBanner';
import { Copy, Check, QrCode, Plus, ShieldAlert, Users, ExternalLink } from 'lucide-react';

export const ClubTeamManager: React.FC = () => {
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [teamName, setTeamName] = useState<string>('');
  const [ageGroup, setAgeGroup] = useState<string>('Seniors');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [qrModalTeam, setQrModalTeam] = useState<ClubTeam | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    setLoading(true);
    try {
      const fetched = await getClubTeams();
      setTeams(fetched);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    try {
      const created = await createClubTeam(teamName.trim(), ageGroup.trim());
      setTeams([...teams, created]);
      setTeamName('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const getSubmissionUrl = (token: string) => {
    const origin = window.location.origin;
    return `${origin}/report/${token}`;
  };

  const handleCopyLink = (token: string) => {
    const url = getSubmissionUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      {!isFirebaseConfigured && <FirebaseNotConfiguredBanner />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ width: '22px', height: '22px', color: 'var(--accent-gold)' }} />
            Club Teams & Captain Links
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage club teams and share public submission links with captains.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ width: 'auto', minHeight: '38px', padding: '0 12px', fontSize: '0.85rem' }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Team
        </button>
      </div>

      {/* Security Model Disclaimer */}
      <div style={{
        backgroundColor: 'rgba(229, 169, 60, 0.1)',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ShieldAlert style={{ width: '20px', height: '20px', color: 'var(--accent-gold)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-gold)', lineHeight: 1.4 }}>
          <strong>Access Security Model:</strong> Submission tokens act as link-based access control. <em>Anyone with this link can submit post-match notes for this team.</em> No captain login is required.
        </span>
      </div>

      {/* Create Team Form */}
      {showAddForm && (
        <form onSubmit={handleCreateTeam} style={{
          background: 'var(--bg-surface-elevated)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          border: '1px solid var(--border-light)'
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
            Register New Club Team
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. 1st XI or U15 Gold"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Age Group / Division
              </label>
              <input
                type="text"
                value={ageGroup}
                onChange={e => setAgeGroup(e.target.value)}
                placeholder="e.g. Seniors or U15"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddForm(false)}
              style={{ width: 'auto', minHeight: '34px', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              style={{ width: 'auto', minHeight: '34px', fontSize: '0.8rem' }}
            >
              Save Team
            </button>
          </div>
        </form>
      )}

      {/* Teams List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Loading club teams...
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No club teams registered yet. Click "Add Team" to generate a captain link.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {teams.map(t => {
            const isCopied = copiedToken === t.submissionToken;
            const linkUrl = getSubmissionUrl(t.submissionToken);

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.name}</span>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{t.ageGroup}</span>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {linkUrl}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(t.submissionToken)}
                    className="btn btn-secondary"
                    title="Copy Link for Captain"
                    style={{
                      width: 'auto',
                      minHeight: '34px',
                      padding: '0 10px',
                      fontSize: '0.78rem',
                      color: isCopied ? '#4ade80' : 'var(--text-main)'
                    }}
                  >
                    {isCopied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrModalTeam(t)}
                    className="btn btn-secondary"
                    title="Show QR Code"
                    style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.78rem' }}
                  >
                    <QrCode style={{ width: '14px', height: '14px' }} />
                  </button>

                  <a
                    href={`/report/${t.submissionToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    title="Open Form Preview"
                    style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    <ExternalLink style={{ width: '14px', height: '14px' }} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalTeam && (
        <div className="bottom-sheet-overlay" onClick={() => setQrModalTeam(null)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              {qrModalTeam.name} - Captain QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Have the captain scan this QR code on their phone after the match.
            </p>

            <div style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getSubmissionUrl(qrModalTeam.submissionToken))}`}
                alt={`QR code for ${qrModalTeam.name}`}
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px', wordBreak: 'break-all' }}>
              {getSubmissionUrl(qrModalTeam.submissionToken)}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQrModalTeam(null)}
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
