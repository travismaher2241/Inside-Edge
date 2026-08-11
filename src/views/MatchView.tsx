import React, { useState, lazy, Suspense } from 'react';
import type { MatchRecord, MatchObservation, Player, MatchSquad, OppositionBatter, CompetitionRulesProfile, SavedTacticalPlan } from '../types/cricket';
import type { TacticalContext, FieldSpot, BowlingPlan } from '../modules/cricket/tactics/types';
import { deriveTrainingPriorities } from '../modules/cricket/matchHelpers';
import { getMatchWorkflowStatus } from '../modules/cricket/matchWorkflow';
import { StorageEngine } from '../storage/db';
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles, Plus, Trash2, X, Check, Save, Calendar, Trophy, Shield, Users, User, Target } from 'lucide-react';

import { MatchSquadSelector } from '../components/cricket/tactics/MatchSquadSelector';
import { OppositionBatterManager } from '../components/cricket/tactics/OppositionBatterManager';
import { RulesProfileSelector } from '../components/cricket/tactics/RulesProfileSelector';
import { BowlingPlanGenerator } from '../components/cricket/tactics/BowlingPlanGenerator';
import { FieldBoardModal } from '../components/cricket/FieldBoardModal';

const WeeklyRoundupView = lazy(() => import('./WeeklyRoundupView').then(m => ({ default: m.WeeklyRoundupView })));
const MatchCreationModal = lazy(() => import('../components/cricket/MatchCreationModal').then(m => ({ default: m.MatchCreationModal })));

interface MatchViewProps {
  matches: MatchRecord[];
  players?: Player[];
  selectedMatchId?: string;
  onSelectMatch: (matchId: string) => void;
  onAddMatch: (match: MatchRecord) => void;
  onUpdateMatch: (match: MatchRecord) => void;
  onApplyPrioritiesToSession: (priorities: string[]) => void;
}

export const MatchView: React.FC<MatchViewProps> = ({
  matches,
  players = [],
  selectedMatchId,
  onSelectMatch,
  onAddMatch,
  onUpdateMatch,
  onApplyPrioritiesToSession
}) => {
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

  // Derived Training Priorities state (local editing buffer for the selected match)
  const [derivedPriorities, setDerivedPriorities] = useState<string[]>(
    currentMatch?.postMatchReview?.trainingPrioritiesDerived || []
  );
  const [newPriorityInput, setNewPriorityInput] = useState<string>('');


  // Pre-Match Opposition Tactical Planning State
  const [tacticalStage, setTacticalStage] = useState<1 | 2 | 3 | 4>(1);

  // Scoped Data State for Current Match
  const matchId = currentMatch?.id || 'match-1';
  const [matchSquad, setMatchSquad] = useState<MatchSquad | undefined>(() => StorageEngine.getMatchSquad(matchId));
  const [oppositionBatters, setOppositionBatters] = useState<OppositionBatter[]>(() => StorageEngine.getOppositionBatters(matchId));
  const [rulesProfiles] = useState<CompetitionRulesProfile[]>(() => StorageEngine.getRulesProfiles());
  const [selectedRulesProfileId, setSelectedRulesProfileId] = useState<string>('rules-t20-default');
  const [savedTacticalPlans, setSavedTacticalPlans] = useState<SavedTacticalPlan[]>(() => StorageEngine.getSavedTacticalPlans(matchId));

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

  // Keep derivedPriorities buffer in sync when switching match
  const handleSelectMatch = (matchId: string) => {
    onSelectMatch(matchId);
    const target = matches.find(m => m.id === matchId);
    setDerivedPriorities(target?.postMatchReview?.trainingPrioritiesDerived || []);
    setMatchResultText(target?.result || '');
    setIsAddObservationOpen(false);

    // Sync tactical state for newly selected match
    setMatchSquad(StorageEngine.getMatchSquad(matchId));
    setOppositionBatters(StorageEngine.getOppositionBatters(matchId));
    setSavedTacticalPlans(StorageEngine.getSavedTacticalPlans(matchId));
    setTacticalContext(previous => ({
      ...previous,
      format: target?.format === 'Two Day' ? 'multi_day' : target?.format === 'T20' ? 't20' : 'one_day',
      localRulesConfirmed: false,
      isJunior: target?.format === 'Junior 20 Overs'
    }));
    setTacticalStage(1);
    setIsPrepWizardOpen(false);
  };

  // A newly created match isn't in the `matches` prop yet (parent state update is
  // async), so reset the buffer from the match object itself rather than looking it
  // up — this is also what prevents the previously-selected match's priorities from
  // bleeding into the new one.
  const handleCreateMatch = (match: MatchRecord) => {
    onAddMatch(match);
    onSelectMatch(match.id);
    setDerivedPriorities(match.postMatchReview?.trainingPrioritiesDerived || []);
    setMatchResultText(match.result || '');
    setIsAddObservationOpen(false);
  };

  // Save new observation to current match
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

    // Recalculate derived priorities by combining newly suggested priority
    const autoDerived = deriveTrainingPriorities(updatedObservations);
    const updatedPriorities = [...new Set([...derivedPriorities, ...autoDerived])];

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
    setDerivedPriorities(updatedPriorities);
    setObsText('');
    setObsSuggestedPriority('');
    setIsAddObservationOpen(false);
  };

  // Add a priority manually
  const handleAddPriority = () => {
    const trimmed = newPriorityInput.trim();
    if (!trimmed) return;
    if (derivedPriorities.includes(trimmed)) return;
    const updated = [...derivedPriorities, trimmed];
    setDerivedPriorities(updated);
    setNewPriorityInput('');

    // Persist to match
    saveUpdatedPriorities(updated);
  };

  // Remove a priority
  const handleRemovePriority = (index: number) => {
    const updated = derivedPriorities.filter((_, i) => i !== index);
    setDerivedPriorities(updated);
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
    if (derivedPriorities.length === 0) return;
    onApplyPrioritiesToSession(derivedPriorities);
  };

  if (!currentMatch) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2>No matches available</h2>
        <button className="btn btn-gold" onClick={() => setIsAddMatchOpen(true)} style={{ marginTop: '16px' }}>
          <Plus size={16} /> ADD FIRST MATCH FIXTURE
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

  const isReviewed = Boolean(currentMatch.postMatchReview && currentMatch.postMatchReview.observations.length > 0);
  const workflowStatus = getMatchWorkflowStatus(matchSquad, oppositionBatters, tacticalContext.localRulesConfirmed, selectedRulesProfileId, savedTacticalPlans);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* View Mode Toggle: Match Fixtures vs Weekly Round-Up */}
      <div style={{ display: 'flex', background: 'var(--bg-surface-card)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setViewMode('fixtures')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: viewMode === 'fixtures' ? 'var(--primary-green)' : 'transparent',
            color: viewMode === 'fixtures' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Trophy size={16} /> MATCH FIXTURES & REVIEW
        </button>
        <button
          onClick={() => setViewMode('roundup')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            background: viewMode === 'roundup' ? 'var(--accent-gold-soft)' : 'transparent',
            color: viewMode === 'roundup' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            border: viewMode === 'roundup' ? '1px solid var(--border-gold)' : '1px solid transparent',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} /> WEEKLY CLUB ROUND-UP
        </button>
      </div>

      {viewMode === 'roundup' ? (
        <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Weekly Round-Up...</div>}>
          <WeeklyRoundupView onApplyPrioritiesToSession={onApplyPrioritiesToSession} />
        </Suspense>
      ) : (

        <>
          {/* Header & New Match Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>MATCH COACHING MODULE</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Matches ({matches.length})</h1>
            </div>
            <button className="btn btn-gold" onClick={() => setIsAddMatchOpen(true)} style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
              <Plus size={16} /> NEW MATCH
            </button>
          </div>

      {/* Match Horizontal Selector Bar (Mirroring TeamView.tsx pattern) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {matches.map(m => {
          const isSelected = m.id === currentMatch.id;
          const hasReview = Boolean(m.postMatchReview?.observations.length);
          return (
            <button
              key={m.id}
              onClick={() => handleSelectMatch(m.id)}
              style={{
                minWidth: '120px',
                padding: '10px',
                borderRadius: '10px',
                border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                background: isSelected ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                color: isSelected ? 'var(--accent-gold)' : 'var(--text-main)',
                textAlign: 'left',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>v {m.opponent}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{m.date.slice(5)}</span>
                <span className={`badge ${hasReview ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.6rem' }}>
                  {hasReview ? 'REVIEWED' : 'UPCOMING'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Match Card Info */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>v {currentMatch.opponent} ({currentMatch.format})</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              📍 {currentMatch.venue} • 📅 {currentMatch.date}
            </div>
          </div>
          <span className={`badge ${currentMatch.result ? 'badge-live' : 'badge-gold'}`}>
            {currentMatch.result || 'Upcoming Fixture'}
          </span>
        </div>
      </div>

      <div className="match-section-tabs" role="tablist" aria-label="Match sections">
        {([
          ['overview', 'Overview'],
          ['plan', 'Plan'],
          ['review', `Review ${currentMatch.postMatchReview?.observations.length || 0}`]
        ] as const).map(([section, label]) => (
          <button
            key={section}
            role="tab"
            aria-selected={activeSection === section}
            onClick={() => setActiveSection(section)}
            className={activeSection === section ? 'active' : ''}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <div className="card-title">
              <span>Match preparation</span>
              <button className="btn btn-secondary" onClick={() => setIsPrepWizardOpen(true)} style={{ width: 'auto', padding: '0 12px', height: '32px', fontSize: '0.75rem' }}>
                Open match prep {workflowStatus.completedCount}/4 <ArrowRight size={14} />
              </button>
            </div>
            <div className="match-progress-grid">
              {([
                ['Squad selected', workflowStatus.squad, 1],
                ['Opponents entered', workflowStatus.opposition, 2],
                ['Conditions confirmed', workflowStatus.conditions, 3],
                ['Plans generated', workflowStatus.plans, 4]
              ] as const).map(([label, complete, stage]) => (
                <button key={label} className="match-progress-card" onClick={() => { setTacticalStage(stage); setIsPrepWizardOpen(true); }}>
                  {complete ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{label}</span>
                  <strong>{complete ? 'Complete' : 'Needs attention'}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title">At a glance</div>
            <div className="match-overview-grid">
              <div><span>Fixture</span><strong>{currentMatch.date} · {currentMatch.venue}</strong></div>
              <div><span>Format</span><strong>{currentMatch.format}</strong></div>
              <div><span>Team objectives</span><strong>{currentMatch.preMatchPlan.teamObjectives.length}</strong></div>
              <div><span>Review</span><strong>{isReviewed ? 'Started' : 'Not started'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Post Match Review Tab */}
      {activeSection === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Match Result Input Bar */}
          <div className="card" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>MATCH RESULT</span>
              {isReviewed && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Reviewed on {currentMatch.postMatchReview?.reviewedDate}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={matchResultText}
                onChange={e => setMatchResultText(e.target.value)}
                placeholder="e.g. Won by 14 runs / Lost by 3 wickets"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
              <button
                onClick={() => saveUpdatedPriorities(derivedPriorities)}
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.75rem' }}
              >
                <Save size={14} /> SAVE
              </button>
            </div>
          </div>

          {/* Key Observations List & Add Action */}
          <div className="card">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <span>POST-MATCH COACH OBSERVATIONS ({currentMatch.postMatchReview?.observations.length || 0})</span>
              <button
                onClick={() => setIsAddObservationOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> ADD OBSERVATION
              </button>
            </div>

            {/* Observations List */}
            {currentMatch.postMatchReview?.observations && currentMatch.postMatchReview.observations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {currentMatch.postMatchReview.observations.map(obs => (
                  <div key={obs.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-gold">{obs.area}</span>
                      {obs.suggestedPriority && (
                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700 }}>
                          → Priority: {obs.suggestedPriority}
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-main)', marginTop: '6px', lineHeight: 1.4 }}>
                      {obs.observationText}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No post-match observations recorded yet for v {currentMatch.opponent}. Click "+ ADD OBSERVATION" to record match insights.
              </div>
            )}
          </div>

          {/* Add Observation Form Drawer / Modal */}
          {isAddObservationOpen && (
            <div className="card" style={{ border: '1px solid var(--border-gold)', background: 'var(--bg-surface-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>NEW MATCH OBSERVATION</span>
                <button aria-label="Close observation form" onClick={() => setIsAddObservationOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OBSERVATION AREA</label>
                  <select
                    value={obsArea}
                    onChange={e => setObsArea(e.target.value as MatchObservation['area'])}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '2px', fontSize: '0.8rem' }}
                  >
                    <option value="Batting">Batting</option>
                    <option value="Bowling">Bowling</option>
                    <option value="Fielding">Fielding</option>
                    <option value="Team / Tactical">Team / Tactical</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OBSERVATION NOTE</label>
                  <textarea
                    rows={2}
                    value={obsText}
                    onChange={e => setObsText(e.target.value)}
                    placeholder="e.g. Conceded 42 runs in final 3 overs due to missed yorker length."
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '2px', fontSize: '0.8rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SUGGESTED SESSION PRIORITY (Optional)</label>
                  <input
                    type="text"
                    value={obsSuggestedPriority}
                    onChange={e => setObsSuggestedPriority(e.target.value)}
                    placeholder="e.g. Death bowling & yorker execution"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '2px', fontSize: '0.8rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsAddObservationOpen(false)} style={{ flex: 1, height: '36px', fontSize: '0.75rem' }}>
                    CANCEL
                  </button>
                  <button className="btn btn-gold" onClick={handleAddObservation} style={{ flex: 1, height: '36px', fontSize: '0.75rem' }}>
                    <Check size={14} /> SAVE OBSERVATION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Derived Training Priorities & Session Handoff (Blueprint §13.4) */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)', background: 'linear-gradient(135deg, #1d2822 0%, #141c18 100%)' }}>
            <div className="card-title" style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} /> DERIVED NEXT TRAINING PRIORITIES
            </div>
            <div className="card-subtitle">
              Coach can accept, add, remove, or edit training priorities before applying to session:
            </div>

            {/* Priorities List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {derivedPriorities.map((priority, i) => (
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

            {/* Add Custom Priority Input */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <input
                type="text"
                value={newPriorityInput}
                onChange={e => setNewPriorityInput(e.target.value)}
                placeholder="Add custom practice priority..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPriority();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface-card)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
              <button
                onClick={handleAddPriority}
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}
              >
                <Plus size={14} /> ADD
              </button>
            </div>

            <button
              className="btn btn-gold"
              onClick={handleApplyPriorities}
              disabled={derivedPriorities.length === 0}
              style={{ marginTop: '16px', opacity: derivedPriorities.length === 0 ? 0.5 : 1 }}
            >
              APPLY TO THURSDAY SESSION PLAN <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Pre-Match Plan section */}
      {activeSection === 'plan' && (
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>PRE-MATCH STRATEGY PLAN</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>v {currentMatch.opponent}</span>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>Team Objectives</div>
              <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {currentMatch.preMatchPlan.teamObjectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>Batting Strategy</div>
              <p style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', lineHeight: 1.4 }}>
                {currentMatch.preMatchPlan.battingNotes}
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>Bowling Strategy</div>
              <p style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', lineHeight: 1.4 }}>
                {currentMatch.preMatchPlan.bowlingNotes}
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>Fielding Focus</div>
              <p style={{ color: 'var(--text-main)', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', lineHeight: 1.4 }}>
                {currentMatch.preMatchPlan.fieldingFocus}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Match Prep Wizard — its own overlay, not a tab nested inside the section tabs */}
      {isPrepWizardOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsPrepWizardOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="match-prep-wizard-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>MATCH PREPARATION</div>
                <h2 id="match-prep-wizard-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>v {currentMatch.opponent} — {workflowStatus.completedCount}/4 stages complete</h2>
              </div>
              <button aria-label="Close match prep" onClick={() => setIsPrepWizardOpen(false)} className="btn btn-secondary" style={{ width: 'auto', padding: '0 10px', height: '32px' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
              {[
                { stage: 1, label: '1. Selected XI', icon: Users },
                { stage: 2, label: '2. Opposition', icon: User },
                { stage: 3, label: '3. Conditions', icon: Shield },
                { stage: 4, label: '4. Bowling Plans', icon: Target },
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
                  StorageEngine.saveMatchSquad(squadData);
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
                  StorageEngine.saveOppositionBatter(batterData);
                  setOppositionBatters(StorageEngine.getOppositionBatters(matchId));
                }}
                onDeleteBatter={id => {
                  StorageEngine.deleteOppositionBatter(id);
                  setOppositionBatters(StorageEngine.getOppositionBatters(matchId));
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
                  StorageEngine.saveTacticalPlan(planData);
                  setSavedTacticalPlans(StorageEngine.getSavedTacticalPlans(matchId));
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
            StorageEngine.saveTacticalPlan(planToSave);
            setSavedTacticalPlans(StorageEngine.getSavedTacticalPlans(matchId));
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
