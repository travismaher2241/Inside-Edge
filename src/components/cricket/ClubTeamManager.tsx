import React, { useState, useEffect } from 'react';
import type { ClubTeam, MatchReport } from '../../types/cricket';
import { getClubTeams, createClubTeam } from '../../modules/cricket/matchReportService';
import { getLatestReport } from '../../modules/cricket/roundupAggregation';
import { isFirebaseConfigured } from '../../lib/firebase';
import { FirebaseNotConfiguredBanner } from './FirebaseNotConfiguredBanner';
import { Copy, Check, QrCode, Plus, ShieldAlert, Users, ExternalLink, Share2, Link2 } from 'lucide-react';

interface ClubTeamManagerProps {
  reports?: MatchReport[];
}

export const ClubTeamManager: React.FC<ClubTeamManagerProps> = ({ reports = [] }) => {
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [teamName, setTeamName] = useState<string>('');
  const [ageGroup, setAgeGroup] = useState<string>('Seniors');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [qrModalTeam, setQrModalTeam] = useState<ClubTeam | null>(null);
  const [feedback, setFeedback] = useState<string>('');

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
      setTeams(current => [...current, created]);
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

  const handleCopyLink = async (token: string) => {
    const url = getSubmissionUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setFeedback('Captain link copied.');
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      setFeedback('Could not copy the link. Open the form and copy its address instead.');
    }
  };

  const handleShareLink = async (team: ClubTeam) => {
    const url = getSubmissionUrl(team.submissionToken);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${team.name} captain report`, text: `Submit the ${team.name} post-match report`, url });
        setFeedback(`Captain link shared for ${team.name}.`);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await handleCopyLink(team.submissionToken);
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

      {feedback && <div role="status" style={{ marginBottom: '12px', color: feedback.startsWith('Could not') ? '#f97316' : '#4ade80', fontSize: '0.85rem' }}>{feedback}</div>}

      <details style={{
        backgroundColor: 'rgba(229, 169, 60, 0.1)',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        marginBottom: '16px',
        color: 'var(--text-gold)'
      }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}><ShieldAlert style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '6px' }} />How captain-link access works</summary>
        <p style={{ fontSize: '0.78rem', lineHeight: 1.4, marginTop: '8px' }}>Anyone with a team’s link can submit post-match notes for that team. No captain login is required, so share links only with the intended captain or coach.</p>
      </details>

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
            const latestReport = getLatestReport(reports.filter(report => report.teamId === t.id));

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
                  gap: '12px',
                  flexWrap: 'wrap'
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}><Link2 size={12} style={{ verticalAlign: 'middle' }} /> {latestReport ? `Last report ${new Date(latestReport.createdAt).toLocaleString()}` : 'No report received'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                    onClick={() => void handleShareLink(t)}
                    className="btn btn-secondary"
                    aria-label={`Share captain link for ${t.name}`}
                    style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.78rem' }}
                  >
                    <Share2 style={{ width: '14px', height: '14px' }} /> Share
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrModalTeam(t)}
                    className="btn btn-secondary"
                    aria-label={`Show QR code for ${t.name}`}
                    style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.78rem' }}
                  >
                    <QrCode style={{ width: '14px', height: '14px' }} />
                  </button>

                  <a
                    href={`/report/${t.submissionToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    aria-label={`Open captain form for ${t.name}`}
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
          <div role="dialog" aria-modal="true" aria-labelledby="captain-qr-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 id="captain-qr-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
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
