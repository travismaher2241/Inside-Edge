import React, { useState, useEffect } from 'react';
import type { ClubTeam, MatchReport } from '../../types/cricket';
import { getClubTeams, createClubTeam } from '../../modules/cricket/matchReportService';
import { getLatestReport } from '../../modules/cricket/roundupAggregation';
import { CloudStorageEngine } from '../../modules/cricket/cloudStorageEngine';
import { isFirebaseConfigured } from '../../lib/firebase';
import { FirebaseNotConfiguredBanner } from './FirebaseNotConfiguredBanner';
import { Copy, Plus, Users, Share2, MoreVertical, ChevronDown, ChevronUp, Eye, EyeOff, Baby } from 'lucide-react';

interface ClubTeamManagerProps {
  reports?: MatchReport[];
}

export const ClubTeamManager: React.FC<ClubTeamManagerProps> = ({ reports = [] }) => {
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [teamName, setTeamName] = useState<string>('');
  const [ageGroup, setAgeGroup] = useState<string>('Seniors');
  const [juniorModeOnCreate, setJuniorModeOnCreate] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [visibleUrlToken, setVisibleUrlToken] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
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
      const withJuniorMode = juniorModeOnCreate ? { ...created, juniorMode: true } : created;
      if (juniorModeOnCreate) {
        try {
          await CloudStorageEngine.saveClubTeam(withJuniorMode);
        } catch (err) {
          console.error('Failed to save junior mode flag:', err);
        }
      }
      setTeams(current => [...current, withJuniorMode]);
      setTeamName('');
      setJuniorModeOnCreate(false);
      setShowAddForm(false);
      setFeedback(`${created.name} added. Captain report link ready.`);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  const handleToggleJuniorMode = async (t: ClubTeam) => {
    const updated: ClubTeam = { ...t, juniorMode: !t.juniorMode };
    setTeams(current => current.map(item => item.id === t.id ? updated : item));
    try {
      await CloudStorageEngine.saveClubTeam(updated);
      setFeedback(`${t.name} is now ${updated.juniorMode ? 'a Junior Team' : 'a Senior Team'}.`);
    } catch (err) {
      console.error('Failed to update junior mode:', err);
      setTeams(current => current.map(item => item.id === t.id ? t : item));
      setFeedback('Could not update junior mode — please try again.');
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
      setFeedback('Could not copy link to clipboard.');
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

      {/* Header & Add Team CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ width: '22px', height: '22px', color: 'var(--accent-gold)' }} />
            CLUB TEAMS
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage teams and match-report access.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ width: 'auto', minHeight: '38px', padding: '0 12px', fontSize: '0.82rem' }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Team
        </button>
      </div>

      {feedback && (
        <div role="status" style={{ marginBottom: '12px', color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>
          ✓ {feedback}
        </div>
      )}

      {/* How Captain Links Work (Collapsible Callout) */}
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          How do captain links work? {showHowItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showHowItWorks && (
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', padding: '10px 12px', borderRadius: '8px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Each team gets a private link. Send the link to the team's captain or coach so they can submit match notes without needing full account access. Reports then contribute directly to the Club Round-Up.
          </div>
        )}
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
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', color: 'var(--accent-gold)' }}>
            ADD CLUB TEAM
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. 3rd XI or Under 16"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-card)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Grade / Division
              </label>
              <input
                type="text"
                value={ageGroup}
                onChange={e => setAgeGroup(e.target.value)}
                placeholder="e.g. Seniors or Under 16"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-card)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={juniorModeOnCreate}
              onChange={e => setJuniorModeOnCreate(e.target.checked)}
            />
            Junior Team — shorter default blocks, age-appropriate activities, guardian sharing on by default
          </label>
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
              Add Team
            </button>
          </div>
        </form>
      )}

      {/* Compact Team Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Loading club teams...
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No club teams added yet. Click "+ Add Team" to create a team.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {teams.map(t => {
            const isCopied = copiedToken === t.submissionToken;
            const isUrlVisible = visibleUrlToken === t.submissionToken;
            const isMenuOpen = activeMenuId === t.id;
            const linkUrl = getSubmissionUrl(t.submissionToken);
            const latestReport = getLatestReport(reports.filter(report => report.teamId === t.id));

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-surface-card)',
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
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>{t.name}</span>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{t.ageGroup}</span>
                    <button
                      type="button"
                      onClick={() => void handleToggleJuniorMode(t)}
                      className={t.juniorMode ? 'badge badge-gold' : 'badge'}
                      style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px', border: t.juniorMode ? undefined : '1px solid var(--border-light)', cursor: 'pointer' }}
                      title="Click to toggle Junior Mode for this team"
                    >
                      <Baby size={11} /> {t.juniorMode ? 'Junior Team' : 'Mark as Junior'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Captain report link active {latestReport ? `· Last report ${new Date(latestReport.createdAt).toLocaleDateString()}` : ''}
                  </div>
                  {isUrlVisible && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', marginTop: '4px', wordBreak: 'break-all' }}>
                      {linkUrl}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => void handleShareLink(t)}
                    className="btn btn-gold"
                    aria-label={`Share captain link for ${t.name}`}
                    style={{ width: 'auto', minHeight: '34px', padding: '0 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Share2 style={{ width: '14px', height: '14px' }} /> Share Link
                  </button>

                  <div className="overflow-menu-container">
                    <button
                      type="button"
                      className="btn-icon-overflow"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : t.id)}
                      aria-label="More team actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div className="overflow-menu-dropdown" onClick={() => setActiveMenuId(null)}>
                        <button
                          className="overflow-menu-item"
                          onClick={() => handleCopyLink(t.submissionToken)}
                        >
                          <Copy size={14} /> {isCopied ? 'Copied' : 'Copy Link'}
                        </button>
                        <button
                          className="overflow-menu-item"
                          onClick={() => setVisibleUrlToken(isUrlVisible ? null : t.submissionToken)}
                        >
                          {isUrlVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          {isUrlVisible ? 'Hide URL' : 'View Link URL'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
