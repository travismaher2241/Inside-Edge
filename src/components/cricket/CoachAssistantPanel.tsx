// Coach Assistant — open Q&A panel. The coach types any question in their own
// words; a deterministic classifier (no LLM) routes it to a grounded answer
// pulled straight from squad, session, observation, and competition-rule
// data. Anything it can't confidently match, it says so — never a guess.

import React, { useEffect, useRef, useState } from 'react';
import type { Player, ClubTrainingSession, DevelopmentFocus, Observation, MatchReport, ActiveScope } from '../../types/cricket';
import { getMatchReports } from '../../modules/cricket/matchReportService';
import {
  findPlayersWithoutRecentBatting,
  getPlayerCurrentFocuses,
  findPlayersWithWorkloadRestrictions,
  findFocusesDueForReview,
  getWeeklyTrainingPriorities,
  findPlayersWithoutRecentObservations,
  answerCompetitionRuleQuery,
  classifyCoachAssistantQuestion,
  type CoachAssistantIntent
} from '../../modules/cricket/coachAssistantQueries';
import { MessageCircleQuestion, X, Send, RotateCcw } from 'lucide-react';

interface CoachAssistantPanelProps {
  players: Player[];
  sessions: ClubTrainingSession[];
  focuses: DevelopmentFocus[];
  observations: Observation[];
  activeScope?: ActiveScope;
  onClose: () => void;
}

interface AskedEntry {
  id: string;
  questionText: string;
  intent: CoachAssistantIntent;
}

const SUGGESTIONS: string[] = [
  "Who hasn't batted in the last 7 days?",
  "What's Ben Harris working on?",
  'Who has a workload restriction?',
  "This week's top training priorities",
  'How many overs can a bowler send down?'
];

export const CoachAssistantPanel: React.FC<CoachAssistantPanelProps> = ({
  players,
  sessions,
  focuses,
  observations,
  activeScope,
  onClose
}) => {
  const [questionText, setQuestionText] = useState('');
  const [history, setHistory] = useState<AskedEntry[]>([]);
  const [reports, setReports] = useState<MatchReport[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMatchReports().then(setReports).catch(err => console.error('Failed to load match reports for Coach Assistant:', err));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const ask = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const intent = classifyCoachAssistantQuestion(trimmed, players);
    setHistory(prev => [{ id: `${Date.now()}-${prev.length}`, questionText: trimmed, intent }, ...prev]);
    setQuestionText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(questionText);
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-assistant-title"
        className="bottom-sheet-content"
        style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageCircleQuestion size={14} /> COACH ASSISTANT
            </div>
            <div id="coach-assistant-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Ask anything</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Answers are read straight from your squad, sessions, observations and approved competition rules — nothing is generated or guessed.
            </div>
          </div>
          <button type="button" aria-label="Close coach assistant" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            ref={inputRef}
            type="text"
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            placeholder="e.g. Who hasn't batted this week?"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', color: 'var(--text-main)', fontSize: '0.88rem' }}
          />
          <button
            type="submit"
            className="btn btn-gold"
            disabled={!questionText.trim()}
            style={{ width: 'auto', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', opacity: questionText.trim() ? 1 : 0.5 }}
          >
            <Send size={15} /> Ask
          </button>
        </form>

        {history.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="filter-pill-btn"
                style={{ fontSize: '0.75rem' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setHistory([])}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', marginBottom: '10px' }}
          >
            <RotateCcw size={12} /> Clear conversation
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map(entry => (
            <div key={entry.id}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>{entry.questionText}</div>
              <IntentAnswer
                intent={entry.intent}
                players={players}
                sessions={sessions}
                focuses={focuses}
                observations={observations}
                reports={reports}
                activeScope={activeScope}
                onAskSuggestion={ask}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const IntentAnswer: React.FC<{
  intent: CoachAssistantIntent;
  players: Player[];
  sessions: ClubTrainingSession[];
  focuses: DevelopmentFocus[];
  observations: Observation[];
  reports: MatchReport[];
  activeScope?: ActiveScope;
  onAskSuggestion: (question: string) => void;
}> = ({ intent, players, sessions, focuses, observations, reports, activeScope, onAskSuggestion }) => {
  switch (intent.type) {
    case 'no_recent_batting': {
      const gaps = findPlayersWithoutRecentBatting(players, sessions, 7);
      return (
        <AnswerCard>
          {gaps.length === 0
            ? <EmptyAnswer text="Every player has had a batting turn in the last 7 days." />
            : <NameList names={gaps.map(g => g.playerName)} />}
        </AnswerCard>
      );
    }

    case 'player_focus': {
      const playerFocuses = getPlayerCurrentFocuses(intent.playerId, focuses);
      return (
        <AnswerCard>
          {playerFocuses.length === 0
            ? <EmptyAnswer text={`No active development focus recorded for ${intent.playerName}.`} />
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
            )}
        </AnswerCard>
      );
    }

    case 'player_focus_unresolved':
      return (
        <AnswerCard>
          <EmptyAnswer text="I couldn't match a player name in that question. Try including their name, e.g. “What's Ben Harris working on?”" />
        </AnswerCard>
      );

    case 'workload_restrictions': {
      const flagged = findPlayersWithWorkloadRestrictions(players);
      return (
        <AnswerCard>
          {flagged.length === 0
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
            )}
        </AnswerCard>
      );
    }

    case 'focus_reviews_due': {
      const due = findFocusesDueForReview(players, focuses);
      return (
        <AnswerCard>
          {due.length === 0
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
            )}
        </AnswerCard>
      );
    }

    case 'weekly_priorities': {
      const priorities = getWeeklyTrainingPriorities(reports, 7, 3);
      return (
        <AnswerCard>
          {priorities.length === 0
            ? <EmptyAnswer text="No match reports have been submitted in the last 7 days yet." />
            : (
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {priorities.map((p, idx) => <li key={idx} style={{ fontWeight: 700 }}>{p}</li>)}
              </ol>
            )}
        </AnswerCard>
      );
    }

    case 'no_recent_observations': {
      const gaps = findPlayersWithoutRecentObservations(players, observations, 14);
      return (
        <AnswerCard>
          {gaps.length === 0
            ? <EmptyAnswer text="Every player has a recorded observation in the last 14 days." />
            : <NameList names={gaps.map(g => g.playerName)} />}
        </AnswerCard>
      );
    }

    case 'competition_rule': {
      const result = answerCompetitionRuleQuery(
        { clubId: 'club-1', seasonId: '2026', teamId: activeScope?.mode === 'team' ? activeScope.teamId : undefined },
        intent.questionText
      );
      return (
        <AnswerCard>
          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{result.answer}</div>
          {result.isRuleSourced && (
            <div style={{ marginTop: '8px' }}>
              <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Sourced from approved rules</span>
            </div>
          )}
        </AnswerCard>
      );
    }

    case 'unrecognised':
    default:
      return (
        <AnswerCard>
          <EmptyAnswer text="I don't have a grounded answer for that yet." />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>Try asking about:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onAskSuggestion(s)}
                className="filter-pill-btn"
                style={{ fontSize: '0.72rem' }}
              >
                {s}
              </button>
            ))}
          </div>
        </AnswerCard>
      );
  }
};

const AnswerCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="card" style={{ padding: '12px 14px', background: 'var(--bg-surface-elevated)' }}>
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
