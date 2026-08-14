// Coach Assistant — template-based Q&A panel. Every answer is computed from
// data already loaded in the app (no LLM call), matching the deterministic
// pattern the rest of the planner uses.

import React, { useEffect, useMemo, useState } from 'react';
import type { Player, ClubTrainingSession, DevelopmentFocus, Observation, MatchReport } from '../../types/cricket';
import { getMatchReports } from '../../modules/cricket/matchReportService';
import {
  findPlayersWithoutRecentBatting,
  getPlayerCurrentFocuses,
  findPlayersWithWorkloadRestrictions,
  findFocusesDueForReview,
  getWeeklyTrainingPriorities,
  findPlayersWithoutRecentObservations
} from '../../modules/cricket/coachAssistantQueries';
import { MessageCircleQuestion, X, ChevronRight } from 'lucide-react';

interface CoachAssistantPanelProps {
  players: Player[];
  sessions: ClubTrainingSession[];
  focuses: DevelopmentFocus[];
  observations: Observation[];
  onClose: () => void;
}

type QuestionId =
  | 'no_recent_batting'
  | 'player_focus'
  | 'workload_restrictions'
  | 'focus_reviews_due'
  | 'weekly_priorities'
  | 'no_recent_observations';

const QUESTIONS: { id: QuestionId; label: string }[] = [
  { id: 'no_recent_batting', label: "Who hasn't batted in the last 7 days?" },
  { id: 'player_focus', label: "What's a player's current focus?" },
  { id: 'workload_restrictions', label: 'Who has a workload restriction?' },
  { id: 'focus_reviews_due', label: 'Which focuses are due for review?' },
  { id: 'weekly_priorities', label: "This week's top training priorities" },
  { id: 'no_recent_observations', label: "Who hasn't had an observation logged recently?" }
];

export const CoachAssistantPanel: React.FC<CoachAssistantPanelProps> = ({
  players,
  sessions,
  focuses,
  observations,
  onClose
}) => {
  const [activeQuestion, setActiveQuestion] = useState<QuestionId | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id ?? '');
  const [reports, setReports] = useState<MatchReport[]>([]);

  useEffect(() => {
    getMatchReports().then(setReports).catch(err => console.error('Failed to load match reports for Coach Assistant:', err));
  }, []);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-assistant-title"
        className="bottom-sheet-content"
        style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageCircleQuestion size={14} /> COACH ASSISTANT
            </div>
            <div id="coach-assistant-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Quick Answers</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Answers are read straight from your squad, sessions and observations — nothing is generated or guessed.
            </div>
          </div>
          <button type="button" aria-label="Close coach assistant" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {!activeQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {QUESTIONS.map(q => (
              <button
                key={q.id}
                type="button"
                className="home-insight-row"
                onClick={() => setActiveQuestion(q.id)}
                style={{ cursor: 'pointer', textAlign: 'left', width: '100%', border: 'none' }}
              >
                <div className="home-insight-info">
                  <div className="home-insight-title">{q.label}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        )}

        {activeQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveQuestion(null)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: 'fit-content' }}
            >
              ← All questions
            </button>

            {activeQuestion === 'no_recent_batting' && (
              <AnswerCard title="Who hasn't batted in the last 7 days?">
                {(() => {
                  const gaps = findPlayersWithoutRecentBatting(players, sessions, 7);
                  return gaps.length === 0
                    ? <EmptyAnswer text="Every player has had a batting turn in the last 7 days." />
                    : <NameList names={gaps.map(g => g.playerName)} />;
                })()}
              </AnswerCard>
            )}

            {activeQuestion === 'player_focus' && (
              <AnswerCard title="What's a player's current focus?">
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '10px' }}
                >
                  {sortedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {(() => {
                  const playerFocuses = getPlayerCurrentFocuses(selectedPlayerId, focuses);
                  return playerFocuses.length === 0
                    ? <EmptyAnswer text="No active development focus recorded for this player." />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {playerFocuses.map((f, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem' }}>
                            <span className="badge badge-gold" style={{ fontSize: '0.65rem', marginRight: '6px' }}>{f.domain}</span>
                            <span style={{ fontWeight: 700 }}>{f.focusStatement}</span>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>{f.state} — {f.why}</div>
                          </div>
                        ))}
                      </div>
                    );
                })()}
              </AnswerCard>
            )}

            {activeQuestion === 'workload_restrictions' && (
              <AnswerCard title="Who has a workload restriction?">
                {(() => {
                  const flagged = findPlayersWithWorkloadRestrictions(players);
                  return flagged.length === 0
                    ? <EmptyAnswer text="No players currently have a workload restriction on file." />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {flagged.map(f => (
                          <div key={f.playerId} style={{ fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700 }}>{f.playerName}</span>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
                              {f.notes || (f.maxDeliveries ? `Bowling workload restriction active — max ${f.maxDeliveries} deliveries` : 'Bowling workload restriction active')}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                })()}
              </AnswerCard>
            )}

            {activeQuestion === 'focus_reviews_due' && (
              <AnswerCard title="Which focuses are due for review?">
                {(() => {
                  const due = findFocusesDueForReview(players, focuses);
                  return due.length === 0
                    ? <EmptyAnswer text="No development focuses are due for review right now." />
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {due.map((d, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700 }}>{d.playerName}</span> — {d.focusStatement}
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
                              Review date: {new Date(d.reviewDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                })()}
              </AnswerCard>
            )}

            {activeQuestion === 'weekly_priorities' && (
              <AnswerCard title="This week's top training priorities">
                {(() => {
                  const priorities = getWeeklyTrainingPriorities(reports, 7, 3);
                  return priorities.length === 0
                    ? <EmptyAnswer text="No match reports have been submitted in the last 7 days yet." />
                    : (
                      <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {priorities.map((p, idx) => <li key={idx} style={{ fontWeight: 700 }}>{p}</li>)}
                      </ol>
                    );
                })()}
              </AnswerCard>
            )}

            {activeQuestion === 'no_recent_observations' && (
              <AnswerCard title="Who hasn't had an observation logged recently?">
                {(() => {
                  const gaps = findPlayersWithoutRecentObservations(players, observations, 14);
                  return gaps.length === 0
                    ? <EmptyAnswer text="Every player has a recorded observation in the last 14 days." />
                    : <NameList names={gaps.map(g => g.playerName)} />;
                })()}
              </AnswerCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AnswerCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-elevated)' }}>
    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
      {title}
    </div>
    {children}
  </div>
);

const EmptyAnswer: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{text}</div>
);

const NameList: React.FC<{ names: string[] }> = ({ names }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {names.map(name => (
      <span key={name} className="badge badge-gold" style={{ fontSize: '0.75rem' }}>{name}</span>
    ))}
  </div>
);
