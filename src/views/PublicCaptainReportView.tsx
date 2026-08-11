import React, { useState, useEffect } from 'react';
import { DEVELOPMENT_DOMAINS } from '../modules/cricket/taxonomy';
import { getTeamByToken, submitMatchReport } from '../modules/cricket/matchReportService';
import { isFirebaseConfigured } from '../lib/firebase';
import { FirebaseNotConfiguredBanner } from '../components/cricket/FirebaseNotConfiguredBanner';
import type { ClubTeam } from '../types/cricket';
import { AlertTriangle, CheckCircle2, RefreshCw, Send, ShieldAlert } from 'lucide-react';

interface PublicCaptainReportViewProps {
  token: string;
}

export const PublicCaptainReportView: React.FC<PublicCaptainReportViewProps> = ({ token }) => {
  const [team, setTeam] = useState<ClubTeam | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [invalidToken, setInvalidToken] = useState<boolean>(false);

  // Form State
  const [captainName, setCaptainName] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [matchDate, setMatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [freeTextNotes, setFreeTextNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Batting');

  // Submit Status State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeam() {
      setLoading(true);
      setInvalidToken(false);
      try {
        const foundTeam = await getTeamByToken(token);
        if (foundTeam) {
          setTeam(foundTeam);
        } else {
          setInvalidToken(true);
        }
      } catch (err) {
        console.error('Error fetching team token:', err);
        setInvalidToken(true);
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, [token]);

  const handleToggleTag = (subArea: string) => {
    setSelectedTags(prev =>
      prev.includes(subArea) ? prev.filter(t => t !== subArea) : [...prev, subArea]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    if (!captainName.trim()) {
      setErrorMessage('Please enter your name as Captain.');
      return;
    }

    if (selectedTags.length === 0 && !freeTextNotes.trim()) {
      setErrorMessage('Please select at least one issue or type post-match notes.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await submitMatchReport({
        teamId: team.id,
        teamName: team.name,
        submissionToken: token,
        matchDate,
        opponent: opponent.trim() || undefined,
        submittedBy: captainName.trim(),
        freeTextNotes: freeTextNotes.trim(),
        taggedIssues: selectedTags
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error('Submit report failed:', err);
      setErrorMessage(err.message || 'Submission failed due to network issue. Your notes are safe! Tap retry below.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: 'var(--text-main)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--accent-gold)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Match Report Form...</h2>
        </div>
      </div>
    );
  }

  if (invalidToken || !team) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div className="card" style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          borderColor: 'var(--status-live)',
          padding: '32px 20px'
        }}>
          <ShieldAlert style={{ width: '56px', height: '56px', color: 'var(--status-live)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
            Invalid Submission Link
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '20px' }}>
            This post-match submission link is not recognized or may have expired. Please request an updated submission link from your club head coach.
          </p>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            padding: '10px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)'
          }}>
            Token: <code style={{ color: 'var(--accent-gold)' }}>{token}</code>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div className="card" style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          borderColor: 'var(--status-success)',
          padding: '32px 20px'
        }}>
          <CheckCircle2 style={{ width: '64px', height: '64px', color: '#4ade80', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
            Report Submitted!
          </h2>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '16px' }}>
            {team.name} ({team.ageGroup})
          </p>
          {isFirebaseConfigured ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
              Thank you, Captain {captainName}. Your post-match notes and tagged priorities have been sent directly to the club coaching team for this week's training roundup.
            </p>
          ) : (
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <FirebaseNotConfiguredBanner />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Thank you, Captain {captainName} — but this app isn't connected to the club's
                shared database right now, so your notes were only saved on this device. Please
                also message your coach directly so nothing gets lost.
              </p>
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSubmitSuccess(false);
              setFreeTextNotes('');
              setSelectedTags([]);
            }}
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-app)',
      padding: '16px 12px 40px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Header Banner - High Outdoor Contrast */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1b4d3e 0%, #141c18 100%)',
        border: '1px solid var(--border-gold)',
        marginBottom: '16px',
        padding: '20px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>Captain Match Report</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No Login Required</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
          {team.name}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-gold)', fontWeight: 600 }}>
          {team.ageGroup} Division
        </p>
      </div>

      {!isFirebaseConfigured && <FirebaseNotConfiguredBanner />}

      <form onSubmit={handleSubmit}>
        {/* Error / Retry Alert */}
        {errorMessage && (
          <div style={{
            background: 'var(--status-warning-bg)',
            border: '1px solid var(--status-warning)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertTriangle style={{ width: '22px', height: '22px', color: '#f97316', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#f97316', fontSize: '0.95rem', marginBottom: '4px' }}>
                Submission Error
              </div>
              <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                {errorMessage}
              </div>
            </div>
          </div>
        )}

        {/* Basic Match Meta */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Captain Name *
              </label>
              <input
                type="text"
                value={captainName}
                onChange={e => setCaptainName(e.target.value)}
                placeholder="e.g. David Warner"
                required
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Match Date *
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Opponent (Optional)
            </label>
            <input
              type="text"
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              placeholder="e.g. St George District"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-main)',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>

        {/* Tagged Issues - Domain Taxonomy Selector */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Tagged Issues / Priorities
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
              {selectedTags.length} Selected
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Select key areas that cost runs or wickets during today's match.
          </p>

          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '6px',
            paddingBottom: '8px',
            marginBottom: '12px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {DEVELOPMENT_DOMAINS.map(d => {
              const active = d.domain === activeCategory;
              return (
                <button
                  key={d.domain}
                  type="button"
                  onClick={() => setActiveCategory(d.domain)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: active ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    backgroundColor: active ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                    color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    minHeight: '38px'
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Chips Grid for Active Category */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {DEVELOPMENT_DOMAINS.find(d => d.domain === activeCategory)?.subAreas.map(subArea => {
              const selected = selectedTags.includes(subArea);
              return (
                <button
                  key={subArea}
                  type="button"
                  onClick={() => handleToggleTag(subArea)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: selected ? 700 : 500,
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: selected ? '1px solid #4ade80' : '1px solid var(--border-light)',
                    backgroundColor: selected ? 'rgba(38, 107, 87, 0.4)' : 'var(--bg-surface-elevated)',
                    color: selected ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {selected && <CheckCircle2 style={{ width: '16px', height: '16px', color: '#4ade80' }} />}
                  {subArea}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free Text Notes */}
        <div className="card" style={{ padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            Captain's Free-Text Notes
          </label>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Detail key match moments, catches dropped, bowling lengths, or team discipline.
          </p>
          <textarea
            value={freeTextNotes}
            onChange={e => setFreeTextNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Dropped 3 catches in the slips and missed 2 simple run outs. Bowled far too short for the whole innings and an inconsistent line."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              lineHeight: '1.4',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-gold"
          style={{
            minHeight: '52px',
            fontSize: '1rem',
            boxShadow: '0 4px 16px rgba(229, 169, 60, 0.3)',
            marginTop: '8px'
          }}
        >
          {submitting ? (
            <>
              <RefreshCw className="animate-spin" style={{ width: '20px', height: '20px' }} />
              Submitting Report...
            </>
          ) : (
            <>
              <Send style={{ width: '20px', height: '20px' }} />
              Submit Post-Match Report
            </>
          )}
        </button>
      </form>
    </div>
  );
};
