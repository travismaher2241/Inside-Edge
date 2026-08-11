import React, { useState, useEffect, useMemo } from 'react';
import type { ClubTeam, MatchReport } from '../types/cricket';
import { getClubTeams, getMatchReports } from '../modules/cricket/matchReportService';
import {
  filterReportsByDateRange,
  aggregateTagFrequencies,
  groupReportsByTeam,
  getTopRecurringIssues
} from '../modules/cricket/roundupAggregation';
import { ClubTeamManager } from '../components/cricket/ClubTeamManager';
import { isFirebaseConfigured } from '../lib/firebase';
import { FirebaseNotConfiguredBanner } from '../components/cricket/FirebaseNotConfiguredBanner';
import { Calendar, Filter, Zap, CheckSquare, Square, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface WeeklyRoundupViewProps {
  onApplyPrioritiesToSession: (priorities: string[]) => void;
}

export const WeeklyRoundupView: React.FC<WeeklyRoundupViewProps> = ({ onApplyPrioritiesToSession }) => {
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [allReports, setAllReports] = useState<MatchReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [daysLimit, setDaysLimit] = useState<number>(7);

  // Selected recurring issues to apply to session
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [fetchedTeams, fetchedReports] = await Promise.all([
        getClubTeams(),
        getMatchReports()
      ]);
      setTeams(fetchedTeams);
      setAllReports(fetchedReports);
    } catch (err) {
      console.error('Failed to load roundup data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter reports by selected date range
  const reportsInRange = useMemo(() => {
    return filterReportsByDateRange(allReports, daysLimit);
  }, [allReports, daysLimit]);

  // Aggregate tag frequencies
  const tagFrequencies = useMemo(() => {
    return aggregateTagFrequencies(reportsInRange);
  }, [reportsInRange]);

  // Top 5 recurring issues
  const topRecurringIssues = useMemo(() => {
    return getTopRecurringIssues(tagFrequencies, 5);
  }, [tagFrequencies]);

  // Update selectedPriorities whenever topRecurringIssues changes initially
  useEffect(() => {
    if (topRecurringIssues.length > 0) {
      setSelectedPriorities(topRecurringIssues);
    } else {
      setSelectedPriorities([]);
    }
  }, [topRecurringIssues]);

  // Group reports by team
  const teamGroups = useMemo(() => {
    return groupReportsByTeam(teams, reportsInRange);
  }, [teams, reportsInRange]);

  const handleTogglePriority = (issue: string) => {
    if (selectedPriorities.includes(issue)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== issue));
    } else {
      setSelectedPriorities([...selectedPriorities, issue]);
    }
  };

  const handleApplyToSession = () => {
    if (selectedPriorities.length === 0) return;
    onApplyPrioritiesToSession(selectedPriorities);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!isFirebaseConfigured && <FirebaseNotConfiguredBanner />}

      {/* Header & Date Range Filter */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: '24px', height: '24px', color: 'var(--accent-gold)' }} />
              Weekly Post-Match Round-Up
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Collated captain reports across all club teams & recurring training priorities.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
            <select
              value={daysLimit}
              onChange={e => setDaysLimit(Number(e.target.value))}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                padding: '6px 12px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <option value={7}>Most Recent 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
            <button
              type="button"
              onClick={loadData}
              className="btn btn-secondary"
              title="Refresh Reports"
              style={{ width: 'auto', minHeight: '34px', padding: '0 10px' }}
            >
              <RefreshCw style={{ width: '14px', height: '14px' }} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Recurring Issues & Session Priority Generator */}
      <div className="card" style={{
        border: '1px solid var(--border-gold)',
        background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.08) 0%, rgba(20, 28, 24, 0.9) 100%)',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap style={{ width: '20px', height: '20px', color: 'var(--accent-gold)' }} />
              Top Recurring Club Issues ({daysLimit} Days)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Drawn deterministically from captain reports. Select priorities for next session objectives.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-gold"
            disabled={selectedPriorities.length === 0}
            onClick={handleApplyToSession}
            style={{ width: 'auto', minHeight: '40px', padding: '0 16px', fontSize: '0.85rem' }}
          >
            Apply ({selectedPriorities.length}) to Thursday Session Plan
          </button>
        </div>

        {topRecurringIssues.length === 0 ? (
          <div style={{ padding: '16px', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            No tagged issues found in the selected date range ({daysLimit} days).
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {tagFrequencies.slice(0, 5).map(tf => {
              const selected = selectedPriorities.includes(tf.tag);
              return (
                <div
                  key={tf.tag}
                  onClick={() => handleTogglePriority(tf.tag)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selected ? 'var(--accent-gold-soft)' : 'var(--bg-surface)',
                    border: selected ? '1px solid var(--border-gold)' : '1px solid var(--border-light)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selected ? (
                      <CheckSquare style={{ width: '18px', height: '18px', color: 'var(--accent-gold)' }} />
                    ) : (
                      <Square style={{ width: '18px', height: '18px', color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {tf.tag}
                    </span>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                    {tf.count} {tf.count === 1 ? 'Report' : 'Reports'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reports List Grouped by Team */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText style={{ width: '20px', height: '20px', color: 'var(--primary-green-light)' }} />
          Team Post-Match Reports
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            Loading match reports...
          </div>
        ) : teamGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No club teams defined. Please add club teams below.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {teamGroups.map(({ team, reports }) => (
              <div
                key={team.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{team.name}</h3>
                    <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>{team.ageGroup}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {reports.length} {reports.length === 1 ? 'Submission' : 'Submissions'}
                  </span>
                </div>

                {reports.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}>
                    <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                    No report submitted this week.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reports.map(rep => (
                      <div
                        key={rep.id}
                        style={{
                          backgroundColor: 'var(--bg-surface-card)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 14px',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            Submitted by Captain {rep.submittedBy}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {rep.opponent ? `vs ${rep.opponent} • ` : ''}{new Date(rep.matchDate || rep.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {rep.taggedIssues && rep.taggedIssues.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {rep.taggedIssues.map((tag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-pill)',
                                  backgroundColor: 'rgba(27, 77, 62, 0.4)',
                                  color: '#4ade80',
                                  border: '1px solid rgba(74, 222, 128, 0.3)',
                                  fontSize: '0.73rem',
                                  fontWeight: 600
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {rep.freeTextNotes && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4, fontStyle: 'italic', background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                            "{rep.freeTextNotes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Club Teams Management Section */}
      <ClubTeamManager />
    </div>
  );
};
