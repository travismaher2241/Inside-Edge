import React, { useState, lazy, Suspense } from 'react';
import type { MatchRecord, MatchObservation, Player, MatchSquad, OppositionBatter, CompetitionRulesProfile, SavedTacticalPlan } from '../types/cricket';
import type { TacticalContext, FieldSpot, BowlingPlan } from '../modules/cricket/tactics/types';
import { deriveTrainingPriorities } from '../modules/cricket/matchHelpers';
import { getMatchWorkflowStatus } from '../modules/cricket/matchWorkflow';
import { useRepository } from '../storage/RepositoryContext';
import { CheckCircle2, ArrowRight, Sparkles, Plus, Trash2, X, Check, Save, Calendar, Trophy, Shield, Users, User, Target, ChevronRight } from 'lucide-react';

import { MatchSquadSelector } from '../components/cricket/tactics/MatchSquadSelector';
import { OppositionBatterManager } from '../components/cricket/tactics/OppositionBatterManager';
import { RulesProfileSelector } from '../components/cricket/tactics/RulesProfileSelector';
import { BowlingPlanGenerator } from '../components/cricket/tactics/BowlingPlanGenerator';
import { FieldBoardModal } from '../components/cricket/FieldBoardModal';

const WeeklyRoundupView = lazy(() => import('./WeeklyRoundupView').then(m => ({ default: m.WeeklyRoundupView })));
const MatchCreationModal = lazy(() => import('../components/cricket/MatchCreationModal').then(m => ({ default: m.MatchCreationModal })));

import type { ClubTeam, ActiveScope } from '../types/cricket';

interface MatchViewProps {
  matches: MatchRecord[];
  players?: Player[];
  clubTeams?: ClubTeam[];
  activeScope?: ActiveScope;
  selectedMatchId?: string;
  onSelectMatch: (matchId: string) => void;
  onAddMatch: (match: MatchRecord) => void;
  onUpdateMatch: (match: MatchRecord) => void;
  onApplyPrioritiesToSession: (priorities: string[]) => void;
}

export const MatchView: React.FC<MatchViewProps> = ({
  matches,
  players = [],
  clubTeams: _clubTeams = [],
  activeScope: _activeScope = { mode: 'team', teamId: 'ct-1' },
  selectedMatchId,
  onSelectMatch,
  onAddMatch,
  onUpdateMatch,
  onApplyPrioritiesToSession
}) => {
  const repository = useRepository();
  const [viewMode, setViewMode] = useState<'fixtures' | 'roundup'>('fixtures');
  const currentMatch = matches.find(m => m.id === selectedMatchId) || matches[0];

  const [activeSection, setActiveSection] = useState<'overview' | 'plan' | 'review'>('overview');
  const [isAddMatchOpen, setIsAddMatchOpen] = useState<boolean>(false);
  const [isPrepWizardOpen, setIsPrepWizardOpen] = useState<boolean>(false);

  // Observation Form State
  const [isAddObservationOpen, setIsAddObservationOpen] = useState<boolean>(false);
  const [obsArea, setObsArea] = useState<MatchObservation['area']>('Batting');
  const [obsText, setObsText] = useState<string>('');
  const [obsSuggestedPriority, setObsSuggestedPriority] = useState<string>('');

  // Editable Match Result
  const [matchResultText, setMatchResultText] = useState<string>(currentMatch?.result || '');

  // Derived Training Priorities state (local editing buffer)
  const [trainingPriorities, setTrainingPriorities] = useState<string[]>(
    currentMatch?.postMatchReview?.trainingPrioritiesDerived || []
  );
  const [newPriorityInput, setNewPriorityInput] = useState<string>('');

  // Pre-Match Opposition Tactical Planning State
  const [tacticalStage, setTacticalStage] = useState<1 | 2 | 3 | 4>(1);

  // Scoped Data State for Current Match
  const matchId = currentMatch?.id || 'match-1';
  const [matchSquad, setMatchSquad] = useState<MatchSquad | undefined>(() => repository.getMatchSquad(matchId));
  const [oppositionBatters, setOppositionBatters] = useState<OppositionBatter[]>(() => repository.getOppositionBatters(matchId));
  const [rulesProfiles] = useState<CompetitionRulesProfile[]>(() => repository.getRulesProfiles());
  const [selectedRulesProfileId, setSelectedRulesProfileId] = useState<string>('rules-t20-default');
  const [savedTacticalPlans, setSavedTacticalPlans] = useState<SavedTacticalPlan[]>(() => repository.getSavedTacticalPlans(matchId));

  const [tacticalContext, setTacticalContext] = useState<TacticalContext>({
    batterHand: 'right',
    format: currentMatch?.format === 'Two Day' ? 'multi_day' : currentMatch?.format === 'T20' ? 't20' : 'one_day',
    phase: 'new_ball',
    maxFieldersOutsideCircle: 2,
    localRulesConfirmed: false,
    isJunior: currentMatch?.format === 'Junior 20 Overs',
  });

  const [fieldBoardModalData, setFieldBoardModalData] = useState<{
    isOpen: boolean;
    bowler?: Player;
    plan?: BowlingPlan;
    positions?: FieldSpot[];
  }>({ isOpen: false });

  const handleSelectMatch = (id: string) => {
    onSelectMatch(id);
    const target = matches.find(m => m.id === id);
    setTrainingPriorities(target?.postMatchReview?.trainingPrioritiesDerived || []);
    setMatchResultText(target?.result || '');
    setIsAddObservationOpen(false);

    setMatchSquad(repository.getMatchSquad(id));
    setOppositionBatters(repository.getOppositionBatters(id));
    setSavedTacticalPlans(repository.getSavedTacticalPlans(id));
    setTacticalContext(previous => ({
      ...previous,
      format: target?.format === 'Two Day' ? 'multi_day' : target?.format === 'T20' ? 't20' : 'one_day',
      localRulesConfirmed: false,
      isJunior: target?.format === 'Junior 20 Overs'
    }));
    setTacticalStage(1);
    setIsPrepWizardOpen(false);
  };

  const handleCreateMatch = (match: MatchRecord) => {
    onAddMatch(match);
    onSelectMatch(match.id);
    setTrainingPriorities(match.postMatchReview?.trainingPrioritiesDerived || []);
    setMatchResultText(match.result || '');
    setIsAddObservationOpen(false);
  };

  const handleAddObservation = () => {
    if (!obsText.trim() || !currentMatch) return;

    const newObs: MatchObservation = {
      id: `mobs-${Date.now()}`,
      area: obsArea,
      observationText: obsText.trim(),
      suggestedPriority: obsSuggestedPriority.trim() || undefined
    };

    const existingReview = currentMatch.postMatchReview;
    const updatedObservations = [...(existingReview?.observations || []), newObs];
    const autoDerived = deriveTrainingPriorities(updatedObservations);
    const updatedPriorities = [...new Set([...trainingPriorities, ...autoDerived])];

    const updatedMatch: MatchRecord = {
      ...currentMatch,
      result: matchResultText.trim() || currentMatch.result || 'Match Completed',
      postMatchReview: {
        observations: updatedObservations,
        trainingPrioritiesDerived: updatedPriorities,
        reviewedDate: new Date().toISOString().split('T')[0]
      }
    };

    onUpdateMatch(updatedMatch);
    setTrainingPriorities(updatedPriorities);
    setObsText('');
    setObsSuggestedPriority('');
    setIsAddObservationOpen(false);
  };

  const handleAddPriority = () => {
    const trimmed = newPriorityInput.trim();
    if (!trimmed || trainingPriorities.includes(trimmed)) return;
    const updated = [...trainingPriorities, trimmed];
    setTrainingPriorities(updated);
    setNewPriorityInput('');
    saveUpdatedPriorities(updated);
  };

  const handleRemovePriority = (index: number) => {
    const updated = trainingPriorities.filter((_, i) => i !== index);
    setTrainingPriorities(updated);
    saveUpdatedPriorities(updated);
  };

  const saveUpdatedPriorities = (priorities: string[]) => {
    if (!currentMatch) return;
    const updatedMatch: MatchRecord = {
      ...currentMatch,
      result: matchResultText.trim() || currentMatch.result,
      postMatchReview: {
        observations: currentMatch.postMatchReview?.observations || [],
        trainingPrioritiesDerived: priorities,
        reviewedDate: currentMatch.postMatchReview?.reviewedDate || new Date().toISOString().split('T')[0]
      }
    };
    onUpdateMatch(updatedMatch);
  };

  const handleApplyPriorities = () => {
    if (trainingPriorities.length === 0) return;
    onApplyPrioritiesToSession(trainingPriorities);
  };

  if (!currentMatch) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2>No matches available</h2>
        <button className="btn btn-gold" onClick={() => setIsAddMatchOpen(true)} style={{ marginTop: '16px' }}>
          <Plus size={16} /> Add First Match
        </button>
        {isAddMatchOpen && (
          <MatchCreationModal
            onClose={() => setIsAddMatchOpen(false)}
            onSaveMatch={handleCreateMatch}
          />
        )}
      </div>
    );
  }

  const isCompleted = Boolean(currentMatch.result || (currentMatch.date < new Date().toISOString().split('T')[0]));
  const isMatchDay = currentMatch.date === new Date().toISOString().split('T')[0];
  const workflowStatus = getMatchWorkflowStatus(matchSquad, oppositionBatters, tacticalContext.localRulesConfirmed, selectedRulesProfileId, savedTacticalPlans);
  const observationCount = currentMatch.postMatchReview?.observations.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Selector: Fixtures & Review vs Weekly Club Round-Up */}
      <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '4px', gap: '4px' }}>
        <button
          onClick={() => setViewMode('fixtures')}
          className={`train-tab-btn ${viewMode === 'fixtures' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Trophy size={14} /> MATCHES
        </button>
        <button
          onClick={() => setViewMode('roundup')}
          className={`train-tab-btn ${viewMode === 'roundup' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Calendar size={14} /> CLUB ROUND-UP
        </button>
      </div>

      {viewMode === 'roundup' ? (
        <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading club themes...</div>}>
          <WeeklyRoundupView onApplyPrioritiesToSession={onApplyPrioritiesToSession} />
        </Suspense>
      ) : (
        <>
          {/* Header & New Match Action */}
          <div className="flex-between">
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Matches</h1>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {matches.length} fixture{matches.length === 1 ? '' : 's'}
              </div>
            </div>
            <button className="btn btn-gold" onClick={() => setIsAddMatchOpen(true)} style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
              <Plus size={16} /> New Match
            </button>
          </div>

          {/* Primary Fixture Context Hero Card */}
          <div className="home-primary-card" style={{ borderLeft: isCompleted ? '4px solid var(--accent-gold)' : isMatchDay ? '4px solid var(--status-live)' : '4px solid var(--primary-green-light)' }}>
            <div className="home-primary-badge-row">
              <span className={`badge ${isMatchDay ? 'badge-live' : isCompleted ? 'badge-gold' : 'badge-green'}`}>
                {isMatchDay ? 'MATCH DAY' : isCompleted ? 'MATCH COMPLETE' : 'NEXT MATCH'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentMatch.format}</span>
            </div>

            <h2 className="home-primary-title">v {currentMatch.opponent}</h2>
            <div className="home-primary-meta">
              <span>{currentMatch.date}</span>
              <span>·</span>
              <span>{currentMatch.venue}</span>
              {currentMatch.result && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{currentMatch.result}</span>
                </>
              )}
            </div>

            <div className="home-primary-actions">
              {!isCompleted && !isMatchDay && (
                <button className="btn btn-primary" onClick={() => setIsPrepWizardOpen(true)}>
                  Prepare Match
                </button>
              )}
              {isMatchDay && (
                <button className="btn btn-live" onClick={() => setActiveSection('plan')}>
                  Open Match Day Plan
                </button>
              )}
              {isCompleted && (
                <button className="btn btn-gold" onClick={() => setActiveSection('review')}>
                  Review Match
                </button>
              )}
            </div>
          </div>

          {/* Compact Fixtures List Selector */}
          {matches.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 2px' }}>
                FIXTURES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matches.map(m => {
                  const isSel = m.id === currentMatch.id;
                  const mDone = Boolean(m.result || (m.date < new Date().toISOString().split('T')[0]));

                  return (
                    <div
                      key={m.id}
                      className={`fixture-compact-row ${isSel ? 'selected' : ''}`}
                      onClick={() => handleSelectMatch(m.id)}
                    >
                      <div className="fixture-compact-left">
                        <div className="fixture-compact-opponent">v {m.opponent}</div>
                        <div className="fixture-compact-meta">
                          {m.format} · {m.date} {m.result ? `· ${m.result}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${mDone ? 'badge-gold' : 'badge-green'}`} style={{ fontSize: '0.65rem' }}>
                          {mDone ? 'COMPLETED' : 'UPCOMING'}
                        </span>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Match Workflow Tabs */}
          <div className="train-tab-selector">
            <button
              className={`train-tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              OVERVIEW
            </button>
            <button
              className={`train-tab-btn ${activeSection === 'plan' ? 'active' : ''}`}
              onClick={() => setActiveSection('plan')}
            >
              GAME PLAN
            </button>
            <button
              className={`train-tab-btn ${activeSection === 'review' ? 'active' : ''}`}
              onClick={() => setActiveSection('review')}
            >
              REVIEW {observationCount > 0 ? `(${observationCount})` : ''}
            </button>
          </div>

          {/* TAB 1: OVERVIEW & MATCH PREP CHECKLIST */}
          {activeSection === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="prep-checklist-card">
                <div className="flex-between">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
                      {isCompleted
                        ? (currentMatch.postMatchReview ? 'MATCH REVIEWED' : 'MATCH COMPLETED')
                        : (workflowStatus.completedCount === 4 ? 'MATCH READY' : 'MATCH PREP')}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: isCompleted ? '#4ade80' : (workflowStatus.completedCount === 4 ? '#4ade80' : 'var(--text-secondary)'), marginTop: '2px', fontWeight: 700 }}>
                      {isCompleted
                        ? (currentMatch.result ? `Result: ${currentMatch.result}` : 'Fixture completed')
                        : `${workflowStatus.completedCount} of 4 ${workflowStatus.completedCount === 4 ? 'complete' : 'ready'}`}
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      if (isCompleted) {
                        setActiveSection(currentMatch.postMatchReview ? 'review' : 'plan');
                      } else {
                        setIsPrepWizardOpen(true);
                      }
                    }}
                    style={{ width: 'auto', padding: '0 12px', height: '34px', fontSize: '0.75rem' }}
                  >
                    {isCompleted
                      ? (currentMatch.postMatchReview ? 'View Review' : 'View Game Plan')
                      : (workflowStatus.completedCount === 4 ? 'View Game Plan' : 'Continue Preparation')} <ArrowRight size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {[
                    { label: 'Squad', complete: isCompleted || workflowStatus.squad, stage: 1 },
                    { label: 'Opponent', complete: isCompleted || workflowStatus.opposition, stage: 2 },
                    { label: 'Conditions', complete: isCompleted || workflowStatus.conditions, stage: 3 },
                    { label: 'Game Plan', complete: isCompleted || workflowStatus.plans, stage: 4 }
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`prep-checklist-item ${item.complete ? 'complete' : ''}`}
                      onClick={() => {
                        setTacticalStage(item.stage as any);
                        setIsPrepWizardOpen(true);
                      }}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{item.complete ? '✓ ' : '○ '}{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: item.complete ? '#4ade80' : 'var(--text-muted)' }}>
                          {item.complete ? 'Complete' : 'Not started'}
                        </span>
                        <ChevronRight size={14} color="var(--text-muted)" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-compact">
                <div className="section-label-gold">
                  FIXTURE AT A GLANCE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Opponent:</span> <strong>{currentMatch.opponent}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Format:</span> <strong>{currentMatch.format}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{currentMatch.date}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Venue:</span> <strong>{currentMatch.venue}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GAME PLAN */}
          {activeSection === 'plan' && (
            <div className="card" style={{ padding: '16px', background: 'var(--bg-surface-card)' }}>
              <div className="sheet-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>GAME PLAN</h3>
                <button className="btn btn-secondary" onClick={() => setIsPrepWizardOpen(true)} style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem' }}>
                  Edit Game Plan
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                <div>
                  <div className="section-label-gold">
                    TEAM OBJECTIVES
                  </div>
                  {currentMatch.preMatchPlan.teamObjectives.length > 0 ? (
                    <ul style={{ paddingLeft: '16px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {currentMatch.preMatchPlan.teamObjectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No team objectives set yet.</div>
                  )}
                </div>

                <div>
                  <div className="section-label-gold">
                    BATTING STRATEGY
                  </div>
                  <p style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', lineHeight: 1.4 }}>
                    {currentMatch.preMatchPlan.battingNotes || 'No specific batting strategy configured.'}
                  </p>
                </div>

                <div>
                  <div className="section-label-gold">
                    BOWLING STRATEGY
                  </div>
                  <p style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', lineHeight: 1.4 }}>
                    {currentMatch.preMatchPlan.bowlingNotes || 'No specific bowling strategy configured.'}
                  </p>
                </div>

                <div>
                  <div className="section-label-gold">
                    FIELDING FOCUS
                  </div>
                  <p style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', lineHeight: 1.4 }}>
                    {currentMatch.preMatchPlan.fieldingFocus || 'No specific fielding focus configured.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW & NEXT TRAINING PRIORITIES */}
          {activeSection === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Match Result Input Bar */}
              <div className="card card-compact">
                <div className="section-label-gold">
                  MATCH RESULT
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={matchResultText}
                    onChange={e => setMatchResultText(e.target.value)}
                    placeholder="e.g. Won by 14 runs / Lost by 3 wickets"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
                  />
                  <button onClick={() => saveUpdatedPriorities(trainingPriorities)} className="btn btn-secondary" style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.75rem' }}>
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>

              {/* Match Observations List */}
              <section className="home-section">
                <div className="home-section-header">
                  <span>POST-MATCH OBSERVATIONS ({observationCount})</span>
                  <button
                    onClick={() => setIsAddObservationOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Note
                  </button>
                </div>

                {currentMatch.postMatchReview?.observations && currentMatch.postMatchReview.observations.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentMatch.postMatchReview.observations.map(obs => (
                      <div key={obs.id} className="match-note-item">
                        <div className="match-note-header">
                          <span>{obs.area}</span>
                          {obs.suggestedPriority && <span>Next: {obs.suggestedPriority}</span>}
                        </div>
                        <div className="match-note-body">{obs.observationText}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No match observations recorded yet. Click "+ Add Note" to log key moments.
                  </div>
                )}
              </section>

              {/* Next Training Priorities */}
              <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)', background: 'linear-gradient(135deg, #1d2822 0%, #141c18 100%)', padding: '16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Sparkles size={16} /> NEXT TRAINING PRIORITIES
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Priorities identified from this match to focus on at next training session:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {trainingPriorities.map((priority, i) => (
                    <div key={i} style={{ background: 'var(--bg-surface-card)', border: '1px solid var(--border-gold)', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <CheckCircle2 size={16} color="var(--accent-gold)" />
                        <span style={{ fontWeight: 700 }}>{priority}</span>
                      </div>
                      <button
                        aria-label={`Remove priority ${priority}`}
                        onClick={() => handleRemovePriority(i)}
                        style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <input
                    type="text"
                    value={newPriorityInput}
                    onChange={e => setNewPriorityInput(e.target.value)}
                    placeholder="Add practice priority..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPriority();
                      }
                    }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
                  />
                  <button onClick={handleAddPriority} className="btn btn-secondary" style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                <button
                  className="btn btn-gold"
                  onClick={handleApplyPriorities}
                  disabled={trainingPriorities.length === 0}
                  style={{ marginTop: '14px', opacity: trainingPriorities.length === 0 ? 0.5 : 1 }}
                >
                  Take to Training Plan <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Add Observation Bottom Sheet */}
          {isAddObservationOpen && (
            <div className="bottom-sheet-overlay" onClick={() => setIsAddObservationOpen(false)}>
              <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                <div className="sheet-header">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>ADD MATCH NOTE</h3>
                  <button onClick={() => setIsAddObservationOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>AREA</label>
                    <select
                      value={obsArea}
                      onChange={e => setObsArea(e.target.value as MatchObservation['area'])}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px' }}
                    >
                      <option value="Batting">Batting</option>
                      <option value="Bowling">Bowling</option>
                      <option value="Fielding">Fielding</option>
                      <option value="Team / Tactical">Tactics</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WHAT HAPPENED?</label>
                    <textarea
                      rows={2}
                      value={obsText}
                      onChange={e => setObsText(e.target.value)}
                      placeholder="e.g. Conceded 42 runs in final 3 overs due to missed yorker length."
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NEXT TRAINING PRIORITY (Optional)</label>
                    <input
                      type="text"
                      value={obsSuggestedPriority}
                      onChange={e => setObsSuggestedPriority(e.target.value)}
                      placeholder="e.g. Death bowling & yorker execution"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px' }}
                    />
                  </div>

                  <button className="btn btn-gold" onClick={handleAddObservation} style={{ marginTop: '6px' }}>
                    <Check size={16} /> Save Match Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Match Prep Wizard Modal */}
          {isPrepWizardOpen && (
            <div className="bottom-sheet-overlay" onClick={() => setIsPrepWizardOpen(false)}>
              <div role="dialog" aria-modal="true" aria-labelledby="match-prep-wizard-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>MATCH PREPARATION</div>
                    <h2 id="match-prep-wizard-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>v {currentMatch.opponent} — {workflowStatus.completedCount}/4 ready</h2>
                  </div>
                  <button aria-label="Close match prep" onClick={() => setIsPrepWizardOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
                  {[
                    { stage: 1, label: '1. Squad', icon: Users },
                    { stage: 2, label: '2. Opponent', icon: User },
                    { stage: 3, label: '3. Conditions', icon: Shield },
                    { stage: 4, label: '4. Game Plan', icon: Target },
                  ].map(({ stage, label, icon: Icon }) => {
                    const isActive = tacticalStage === stage;
                    const complete = [workflowStatus.squad, workflowStatus.opposition, workflowStatus.conditions, workflowStatus.plans][stage - 1];
                    return (
                      <button
                        key={stage}
                        onClick={() => setTacticalStage(stage as 1 | 2 | 3 | 4)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '8px',
                          border: 'none',
                          background: isActive ? 'var(--primary-green)' : 'transparent',
                          color: isActive ? '#fff' : 'var(--text-secondary)',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          textAlign: 'center'
                        }}
                      >
                        <Icon size={14} />
                        <span>{complete ? '✓ ' : ''}{label}</span>
                      </button>
                    );
                  })}
                </div>

                {tacticalStage === 1 && (
                  <MatchSquadSelector
                    matchId={matchId}
                    players={players}
                    savedSquad={matchSquad}
                    onSaveSquad={squadData => {
                      repository.saveMatchSquad(squadData);
                      setMatchSquad(squadData);
                      setTacticalStage(2);
                    }}
                  />
                )}

                {tacticalStage === 2 && (
                  <OppositionBatterManager
                    matchId={matchId}
                    batters={oppositionBatters}
                    onSaveBatter={batterData => {
                      repository.saveOppositionBatter(batterData);
                      setOppositionBatters(repository.getOppositionBatters(matchId));
                    }}
                    onDeleteBatter={id => {
                      repository.deleteOppositionBatter(id);
                      setOppositionBatters(repository.getOppositionBatters(matchId));
                    }}
                  />
                )}

                {tacticalStage === 3 && (
                  <RulesProfileSelector
                    profiles={rulesProfiles}
                    selectedProfileId={selectedRulesProfileId}
                    onSelectProfileId={setSelectedRulesProfileId}
                    context={tacticalContext}
                    onUpdateContext={setTacticalContext}
                  />
                )}

                {tacticalStage === 4 && (
                  <BowlingPlanGenerator
                    matchId={matchId}
                    selectedXI={players.filter(p => matchSquad?.selectedPlayerIds.includes(p.id) || matchSquad === undefined)}
                    batters={oppositionBatters}
                    context={tacticalContext}
                    savedPlans={savedTacticalPlans}
                    onSavePlan={planData => {
                      repository.saveTacticalPlan(planData);
                      setSavedTacticalPlans(repository.getSavedTacticalPlans(matchId));
                    }}
                    onOpenFieldBoard={(bowler, plan, positions) => {
                      setFieldBoardModalData({
                        isOpen: true,
                        bowler,
                        plan,
                        positions,
                      });
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Interactive Field Board Modal Triggered from BowlerPlanCard */}
          {fieldBoardModalData.isOpen && fieldBoardModalData.bowler && fieldBoardModalData.plan && (
            <FieldBoardModal
              onClose={() => setFieldBoardModalData({ isOpen: false })}
              initialBatterHand={tacticalContext.batterHand}
              initialPresetId={fieldBoardModalData.plan.fieldPresetId}
              initialPositions={fieldBoardModalData.positions}
              bowlerName={fieldBoardModalData.bowler.name}
              planTitle={fieldBoardModalData.plan.title}
              maxOutsideCircle={tacticalContext.maxFieldersOutsideCircle}
              onSaveField={updatedPositions => {
                const activeBatterId = oppositionBatters[0]?.id || 'bat-1';
                const planToSave: SavedTacticalPlan = {
                  id: `plan-${Date.now()}-${fieldBoardModalData.bowler?.id}`,
                  matchId,
                  batterId: activeBatterId,
                  bowlerId: fieldBoardModalData.bowler!.id,
                  planId: fieldBoardModalData.plan!.id,
                  fieldPresetId: fieldBoardModalData.plan!.fieldPresetId,
                  positions: updatedPositions,
                  status: 'edited',
                  updatedAt: new Date().toISOString(),
                  warnings: [],
                };
                repository.saveTacticalPlan(planToSave);
                setSavedTacticalPlans(repository.getSavedTacticalPlans(matchId));
                setFieldBoardModalData({ isOpen: false });
              }}
            />
          )}

          {/* Match Creation Modal */}
          {isAddMatchOpen && (
            <Suspense fallback={null}>
              <MatchCreationModal
                onClose={() => setIsAddMatchOpen(false)}
                onSaveMatch={handleCreateMatch}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
};
