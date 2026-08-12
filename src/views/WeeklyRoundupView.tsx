import React, { useState, useEffect, useMemo } from 'react';
import type { ClubTeam, MatchReport } from '../types/cricket';
import { getClubTeams, getMatchReports } from '../modules/cricket/matchReportService';
import {
  filterReportsByDateRange,
  aggregateTagFrequencies,
  groupReportsByTeam,
  getTopRecurringIssues,
  getLatestReport
} from '../modules/cricket/roundupAggregation';
import { ClubTeamManager } from '../components/cricket/ClubTeamManager';
import { Calendar, Filter, CheckSquare, Square, FileText, RefreshCw, Users, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';

interface WeeklyRoundupViewProps {
  onApplyPrioritiesToSession: (priorities: string[]) => void;
}

export const WeeklyRoundupView: React.FC<WeeklyRoundupViewProps> = ({ onApplyPrioritiesToSession }) => {
  const [teams, setTeams] = useState<ClubTeam[]>([]);
  const [allReports, setAllReports] = useState<MatchReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [daysLimit, setDaysLimit] = useState<number>(7);
  const [feedback, setFeedback] = useState<string>('');
  const [isTeamManagerOpen, setIsTeamManagerOpen] = useState<boolean>(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

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
    setSelectedPriorities(current => current.includes(issue) ? current.filter(priority => priority !== issue) : [...current, issue]);
  };

  const handleApplyToSession = () => {
    if (selectedPriorities.length === 0) return;
    onApplyPrioritiesToSession(selectedPriorities);
    setFeedback(`${selectedPriorities.length} priorities added to training plan.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header & Date Range Filter */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ width: '20px', height: '20px', color: 'var(--accent-gold)' }} />
              WEEKLY CLUB ROUND-UP
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Common themes from match reports across the club.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <select
              aria-label="Report date range"
              value={daysLimit}
              onChange={e => setDaysLimit(Number(e.target.value))}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                padding: '6px 10px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              type="button"
              onClick={loadData}
              className="btn btn-secondary"
              aria-label="Refresh reports"
              style={{ width: 'auto', minHeight: '34px', padding: '0 8px' }}
            >
              <RefreshCw style={{ width: '14px', height: '14px' }} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="card" role="status" style={{ padding: '10px 14px', color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>
          ✓ {feedback}
        </div>
      )}

      {/* Top Recurring Issues */}
      <div className="card" style={{
        border: '1px solid var(--border-gold)',
        background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.08) 0%, rgba(20, 28, 24, 0.9) 100%)',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '18px', height: '18px', color: 'var(--accent-gold)' }} />
              TOP RECURRING ISSUES
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Select key issues to take into training.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-gold"
            disabled={selectedPriorities.length === 0}
            onClick={handleApplyToSession}
            style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.8rem' }}
          >
            Add Priorities to Training ({selectedPriorities.length})
          </button>
        </div>

        {topRecurringIssues.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
            No recurring themes yet. As more match reviews are completed, common coaching priorities will appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {tagFrequencies.slice(0, 5).map(tf => {
              const selected = selectedPriorities.includes(tf.tag);
              return (
                <button
                  type="button"
                  key={tf.tag}
                  onClick={() => handleTogglePriority(tf.tag)}
                  className={`roundup-issue-btn ${selected ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selected ? (
                      <CheckSquare style={{ width: '16px', height: '16px', color: 'var(--accent-gold)' }} />
                    ) : (
                      <Square style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {tf.tag}
                    </span>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                    Reported by {tf.count} {tf.count === 1 ? 'team' : 'teams'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reports Grouped by Team as Compact Expandable Rows */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ width: '18px', height: '18px', color: 'var(--primary-green-light)' }} />
            Reports by team
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{teamGroups.length} teams</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Loading club themes...
          </div>
        ) : teamGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No club teams defined. Please add club teams below.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {teamGroups.map(({ team, reports }) => {
              const isExpanded = expandedTeamId === team.id;
              const latestReport = getLatestReport(reports);

              return (
                <div key={team.id} className="card" style={{ padding: '12px', background: 'var(--bg-surface-card)', marginBottom: 0 }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{team.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {reports.length} match note{reports.length === 1 ? '' : 's'} · {latestReport ? `Last submitted ${new Date(latestReport.createdAt).toLocaleDateString()}` : 'No report'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${reports.length > 0 ? 'badge-green' : 'badge-warning'}`}>
                        {reports.length > 0 ? 'SUBMITTED' : 'AWAITING'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reports.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No match reports submitted for {team.name} in this period.
                        </div>
                      ) : (
                        reports.map(rep => (
                          <div key={rep.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.75rem', marginBottom: '4px' }}>
                              <span>Captain {rep.submittedBy}</span>
                              <span>{rep.opponent ? `vs ${rep.opponent}` : ''}</span>
                            </div>
                            {rep.taggedIssues && rep.taggedIssues.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                {rep.taggedIssues.map((tag, idx) => (
                                  <span key={idx} className="badge badge-green" style={{ fontSize: '0.65rem' }}>{tag}</span>
                                ))}
                              </div>
                            )}
                            {rep.freeTextNotes && (
                              <div style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>"{rep.freeTextNotes}"</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Club Teams & Captain Links Entry */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users style={{ width: '16px', height: '16px', color: 'var(--accent-gold)' }} />
            Club Teams & Captain Links
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage team submission links for captains.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsTeamManagerOpen(true)}
          style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.8rem' }}
        >
          Manage teams ({teams.length})
        </button>
      </div>

      {isTeamManagerOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsTeamManagerOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Club teams management"
            className="bottom-sheet-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button onClick={() => setIsTeamManagerOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <ClubTeamManager reports={allReports} />
          </div>
        </div>
      )}
    </div>
  );
};
