// Interactive Session Creation Wizard Modal for Inside Edge (FR-003, FR-005, FR-009, AC-01)

import React, { useState, useMemo } from 'react';
import type { Player, Facility, TrainingSession, NetLane, SessionBlock } from '../../types/cricket';
import { generateRotationPlan, calculateUtilisation } from '../../modules/cricket/rotationEngine';
import { Calendar, Clock, AlertTriangle, Check, X, Plus, Trash2, Sparkles } from 'lucide-react';

interface SessionCreationModalProps {
  facility: Facility;
  players: Player[];
  recentObjectives?: string[];
  onClose: () => void;
  onSaveSession: (session: TrainingSession) => void;
}

const PRESET_OBJECTIVES = [
  'New-ball decision making',
  'Catching under pressure',
  'Death bowling & yorker execution',
  'Strike rotation against spin',
  'Short ball control & hooks',
  'Inner ring fielding & sharp pickups'
];

export const SessionCreationModal: React.FC<SessionCreationModalProps> = ({
  facility,
  players,
  recentObjectives = [],
  onClose,
  onSaveSession
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [title, setTitle] = useState<string>('Thursday Training Session');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(75);

  // Per-session availability state: defaults to all players with trainingAvailability = true
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
    players.filter(p => p.trainingAvailability).map(p => p.id)
  );

  // Net count choice: 2, 3, or 4 lanes
  const [netCount, setNetCount] = useState<number>(facility.netLanes.length || 3);

  // Primary Objectives (1-3)
  const [objectives, setObjectives] = useState<string[]>([
    'New-ball decision making',
    'Catching under pressure'
  ]);
  const [newObjectiveText, setNewObjectiveText] = useState<string>('');

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derive net lanes based on selected count
  const selectedLanes = useMemo<NetLane[]>(() => {
    if (netCount === 2) {
      return facility.netLanes.slice(0, 2);
    } else if (netCount === 3) {
      return facility.netLanes;
    } else {
      const lane4: NetLane = {
        id: 'lane-4',
        name: 'Net 4 - Technical Free Net',
        laneType: 'standard',
        laneObjective: 'Free net technical repetition & side-arm',
        maxBatters: 2,
        maxBowlers: 3
      };
      return [...facility.netLanes, lane4];
    }
  }, [facility.netLanes, netCount]);

  // Session-scoped player array for generator
  const sessionScopedPlayers = useMemo<Player[]>(() => {
    return players.map(p => ({
      ...p,
      trainingAvailability: selectedPlayerIds.includes(p.id)
    }));
  }, [players, selectedPlayerIds]);

  // Preview generated rotation plan & utilisation metrics
  const generatedRotationPlan = useMemo(() => {
    if (selectedPlayerIds.length === 0 || selectedLanes.length === 0) return null;
    const rotationBlockDuration = Math.max(20, durationMinutes - 20);
    return generateRotationPlan(sessionScopedPlayers, selectedLanes, 0, rotationBlockDuration);
  }, [sessionScopedPlayers, selectedLanes, durationMinutes, selectedPlayerIds.length]);

  const utilisationMetrics = useMemo(() => {
    if (!generatedRotationPlan) return null;
    return calculateUtilisation(generatedRotationPlan, sessionScopedPlayers);
  }, [generatedRotationPlan, sessionScopedPlayers]);

  // Toggle single player availability
  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPlayerIds.length === players.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(players.map(p => p.id));
    }
  };

  // Objective management
  const handleAddObjective = (obj: string) => {
    const trimmed = obj.trim();
    if (!trimmed) return;
    if (objectives.length >= 3) {
      setErrorMessage('Maximum 3 primary objectives allowed per session.');
      return;
    }
    if (objectives.includes(trimmed)) return;
    setObjectives([...objectives, trimmed]);
    setNewObjectiveText('');
    setErrorMessage(null);
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlayerIds.length === 0) {
      setErrorMessage('Please select at least 1 available player for this session.');
      return;
    }

    if (objectives.length === 0) {
      setErrorMessage('Please select or enter at least 1 primary session objective.');
      return;
    }

    if (!generatedRotationPlan) {
      setErrorMessage('Failed to generate rotation plan. Check player selection and net lane configuration.');
      return;
    }

    const warmupDuration = 10;
    const reviewDuration = 5;
    const rotationDuration = Math.max(15, durationMinutes - warmupDuration - reviewDuration);

    const updatedRotationPlan = {
      ...generatedRotationPlan,
      durationMinutes: rotationDuration
    };

    const blocks: SessionBlock[] = [
      {
        id: `b-warmup-${Date.now()}`,
        title: 'Movement & Throwing Activation',
        blockType: 'warmup',
        durationMinutes: warmupDuration,
        location: 'Outfield',
        objective: 'Shoulder mobility, dynamic warm-up & fielding activation'
      },
      {
        id: `b-rotation-${Date.now()}`,
        title: `Net Rotations (${selectedLanes.length} Nets)`,
        blockType: 'rotation',
        durationMinutes: rotationDuration,
        location: `Nets 1-${selectedLanes.length}`,
        objective: objectives[0] || 'Main net rotation block',
        rotationPlan: updatedRotationPlan
      },
      {
        id: `b-review-${Date.now()}`,
        title: 'Session Debrief & Key Learnings',
        blockType: 'review',
        durationMinutes: reviewDuration,
        location: 'Outfield',
        objective: 'Review key player observations and development progress'
      }
    ];

    const newSession: TrainingSession = {
      id: `sess-${Date.now()}`,
      title: title.trim() || 'New Training Session',
      date,
      startTime,
      durationMinutes,
      status: 'planned',
      expectedPlayerIds: selectedPlayerIds,
      facilityId: facility.id,
      primaryObjectives: objectives,
      blocks,
      activeBlockIndex: 0,
      activeRotationIndex: 0,
      rationale: `Generated session for ${selectedPlayerIds.length} expected players across ${selectedLanes.length} net lanes. Objectives: ${objectives.join('; ')}.`
    };

    onSaveSession(newSession);
    onClose();
  };

  const availableCount = selectedPlayerIds.length;

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        className="bottom-sheet-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: '20px' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.5px' }}>
              SESSION CREATION WIZARD
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Session</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '8px',
              border: 'none',
              background: step === 1 ? 'var(--primary-green)' : 'transparent',
              color: step === 1 ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            1. DETAILS
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '8px',
              border: 'none',
              background: step === 2 ? 'var(--primary-green)' : 'transparent',
              color: step === 2 ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            2. PLAYERS ({availableCount}/{players.length})
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '8px',
              border: 'none',
              background: step === 3 ? 'var(--primary-green)' : 'transparent',
              color: step === 3 ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            3. NETS & OBJECTIVES
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.4)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span style={{ flex: 1 }}>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Basic Details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  SESSION TITLE
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Thursday Pre-Match Training"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <Calendar size={14} /> DATE
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <Clock size={14} /> START TIME
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  SESSION DURATION ({durationMinutes} MINUTES)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[60, 75, 90, 120].map(mins => (
                    <button
                      type="button"
                      key={mins}
                      onClick={() => setDurationMinutes(mins)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: durationMinutes === mins ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        background: durationMinutes === mins ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                        color: durationMinutes === mins ? 'var(--accent-gold)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {mins} MINS
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
                style={{ marginTop: '12px' }}
              >
                {'NEXT: PLAYER AVAILABILITY \u2192'}
              </button>
            </div>
          )}

          {/* STEP 2: Player Availability Step */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>EXPECTED SQUAD AVAILABILITY</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Toggle players available for this specific session ({availableCount} of {players.length} selected)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--accent-gold)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {selectedPlayerIds.length === players.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Roster Selection Grid */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                {players.map(player => {
                  const isSelected = selectedPlayerIds.includes(player.id);
                  const roleLabel = player.primaryRole.replace(/_/g, ' ');
                  return (
                    <div
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(38, 107, 87, 0.2)' : 'var(--bg-surface-elevated)',
                        border: isSelected ? '1px solid var(--primary-green-light)' : '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: isSelected ? 'none' : '2px solid var(--text-muted)',
                          background: isSelected ? 'var(--primary-green-light)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelected && <Check size={14} color="#fff" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                            {player.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {roleLabel} {player.workloadRestriction?.restrictedBowler && '• Restricted'}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${isSelected ? 'badge-green' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {isSelected ? 'AVAILABLE' : 'ABSENT'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                  style={{ flex: 1 }}
                >
                  {'\u2190 BACK'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (selectedPlayerIds.length === 0) {
                      setErrorMessage('Please select at least 1 available player for this session.');
                      return;
                    }
                    setErrorMessage(null);
                    setStep(3);
                  }}
                  style={{ flex: 1 }}
                >
                  {'NEXT: NETS & OBJECTIVES \u2192'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Net Lanes & Objectives + Live Utilisation Preview */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Net Count Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)', display: 'block', marginBottom: '6px' }}>
                  ACTIVE NET LANES
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[2, 3, 4].map(count => (
                    <button
                      type="button"
                      key={count}
                      onClick={() => setNetCount(count)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: netCount === count ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        background: netCount === count ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                        color: netCount === count ? 'var(--accent-gold)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {count} NETS
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Objectives Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    PRIMARY OBJECTIVES (1-3)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {objectives.length}/3 selected
                  </span>
                </div>

                {/* Active Selected Objectives */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {objectives.map((obj, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-gold)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <span>🎯 {obj}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjective(i)}
                        style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Preset Chips */}
                {objectives.length < 3 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      QUICK ADD PRESETS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[...new Set([...PRESET_OBJECTIVES, ...recentObjectives])].map((preset, idx) => {
                        if (objectives.includes(preset)) return null;
                        return (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => handleAddObjective(preset)}
                            style={{
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-main)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            + {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add Custom Objective Input */}
                {objectives.length < 3 && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={newObjectiveText}
                      onChange={e => setNewObjectiveText(e.target.value)}
                      placeholder="Add custom objective..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddObjective(newObjectiveText);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddObjective(newObjectiveText)}
                      disabled={!newObjectiveText.trim()}
                      className="btn btn-secondary"
                      style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} /> ADD
                    </button>
                  </div>
                )}
              </div>

              {/* Real-time Rotation & Utilisation Engine Preview (Satisfying AC-01 & FR-009) */}
              {utilisationMetrics && (
                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-active)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-gold)' }}>
                      <Sparkles size={14} /> ENGINE UTILISATION PREVIEW
                    </span>
                    <span style={{ color: utilisationMetrics.unassignedPlayersCount > 0 ? '#f97316' : '#4ade80' }}>
                      {utilisationMetrics.allocatedPlayersCount} / {utilisationMetrics.totalExpectedPlayers} Allocated
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                    <span>📍 {selectedLanes.length} Active Nets</span>
                    <span>👥 {availableCount} Expected Players</span>
                  </div>

                  {utilisationMetrics.warnings.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {utilisationMetrics.warnings.map((w, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(2)}
                  style={{ flex: 1 }}
                >
                  {'\u2190 BACK'}
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  style={{ flex: 2 }}
                >
                  <Check size={16} /> GENERATE & SAVE SESSION
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
