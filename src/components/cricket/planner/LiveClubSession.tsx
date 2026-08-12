import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ClubTrainingSession, Player, ClubTeam, TrainingResource } from '../../../types/cricket';
import { handleLiveNoShow, handleLiveLateArrival, handleLiveInjury, handleManualSwap } from '../../../modules/cricket/clubRotationEngine';
import { Play, Pause, SkipForward, ArrowLeft, Undo2, Settings2, Volume2, VolumeX, ChevronDown, ChevronUp, X } from 'lucide-react';

type LiveChangeType = 'absent' | 'late' | 'injury' | 'swap';

interface LiveClubSessionProps {
  session: ClubTrainingSession;
  players: Player[];
  teams: ClubTeam[];
  resources: TrainingResource[];
  onUpdateSession: (session: ClubTrainingSession) => void;
  onExitLive: () => void;
  onCompleteSession: () => void;
  onOpenQuickObservation?: (player: Player) => void;
}

export const LiveClubSession: React.FC<LiveClubSessionProps> = ({
  session,
  players,
  teams,
  resources,
  onUpdateSession,
  onExitLive,
  onCompleteSession
}) => {
  const [activeBlockIdx, setActiveBlockIdx] = useState<number>(session.currentLiveState?.activeRotationIndex ?? session.activeRotationIndex ?? 0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    session.currentLiveState?.secondsRemaining
      ?? (session.rotationPlan[session.activeRotationIndex ?? 0]?.durationMinutes || session.rotationDurationMinutes || 12) * 60
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(!session.currentLiveState?.isPaused);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [showNextPreview, setShowNextPreview] = useState<boolean>(false);

  // Live Change Modal
  const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
  const [changeType, setChangeType] = useState<LiveChangeType>('absent');
  const [selectedPlayerForChange, setSelectedPlayerForChange] = useState<string>('');
  const [arrivalTimeInput, setArrivalTimeInput] = useState<string>('18:30');
  const [injuryNotesInput, setInjuryNotesInput] = useState<string>('Shoulder tightness');
  const [swapPlayerId, setSwapPlayerId] = useState<string>('');
  const [undoStack, setUndoStack] = useState<ClubTrainingSession[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const warnedAt = useRef<Set<number>>(new Set());
  const playerById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);

  const currentBlockPlan = session.rotationPlan[activeBlockIdx] || session.rotationPlan[0];
  const nextBlockPlan = session.rotationPlan[activeBlockIdx + 1];
  const activeResourceAssignments = currentBlockPlan?.resourceAssignments || [];

  // Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (secondsRemaining !== 0 || !isTimerRunning) return;
    setIsTimerRunning(false);
    onUpdateSession({
      ...session,
      activeRotationIndex: activeBlockIdx,
      currentLiveState: {
        activeBlockIndex: session.activeBlockIndex,
        activeRotationIndex: activeBlockIdx,
        secondsRemaining: 0,
        isPaused: true,
        updatedAt: new Date().toISOString()
      }
    });
  }, [secondsRemaining, activeBlockIdx, isTimerRunning, session, onUpdateSession]);

  useEffect(() => {
    if (![60, 0].includes(secondsRemaining) || warnedAt.current.has(secondsRemaining)) return;
    warnedAt.current.add(secondsRemaining);
    if (soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          oscillator.connect(context.destination);
          oscillator.frequency.value = secondsRemaining === 0 ? 880 : 660;
          oscillator.onended = () => { void context.close(); };
          oscillator.start();
          oscillator.stop(context.currentTime + 0.15);
        }
      } catch { /* AudioContext fallback */ }
    }
    if (secondsRemaining === 0) setFeedback('Block complete. Timer paused—advance when ready.');
  }, [secondsRemaining, soundEnabled]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextRotation = () => {
    if (activeBlockIdx < session.rotationPlan.length - 1) {
      const nextIdx = activeBlockIdx + 1;
      setActiveBlockIdx(nextIdx);
      const nextBlock = session.rotationPlan[nextIdx];
      const nextSeconds = (nextBlock?.durationMinutes || session.rotationDurationMinutes || 12) * 60;
      setSecondsRemaining(nextSeconds);
      setIsTimerRunning(false);
      warnedAt.current.clear();
      setFeedback(`Advanced to Block ${nextIdx + 1}.`);
      onUpdateSession({
        ...session,
        activeRotationIndex: nextIdx,
        currentLiveState: {
          activeBlockIndex: session.activeBlockIndex,
          activeRotationIndex: nextIdx,
          secondsRemaining: nextSeconds,
          isPaused: true,
          updatedAt: new Date().toISOString()
        }
      });
    } else {
      onCompleteSession();
    }
  };

  const commitChange = (updated: ClubTrainingSession, message: string) => {
    setUndoStack(stack => [...stack.slice(-9), session]);
    onUpdateSession(updated);
    setFeedback(message);
    setShowChangeModal(false);
    setSelectedPlayerForChange('');
    setSwapPlayerId('');
  };

  const handleUndo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    onUpdateSession(previous);
    setUndoStack(stack => stack.slice(0, -1));
    setFeedback('Last live change undone.');
  };

  const handleMarkNoShow = () => {
    if (!selectedPlayerForChange) return;
    const updated = handleLiveNoShow(session, selectedPlayerForChange, activeBlockIdx, players, teams, resources);
    commitChange(updated, 'Player marked absent. Future blocks recalculated.');
  };

  const handleMarkLateArrival = () => {
    if (!selectedPlayerForChange) return;
    const updated = handleLiveLateArrival(session, selectedPlayerForChange, arrivalTimeInput, activeBlockIdx, players, teams, resources);
    commitChange(updated, 'Arrival time updated. Future blocks recalculated.');
  };

  const handleMarkInjury = () => {
    if (!selectedPlayerForChange) return;
    const updated = handleLiveInjury(session, selectedPlayerForChange, injuryNotesInput, activeBlockIdx, players, teams, resources);
    commitChange(updated, 'Restriction applied. Future blocks recalculated.');
  };

  const handleSwapPlayers = () => {
    if (!selectedPlayerForChange || !swapPlayerId || selectedPlayerForChange === swapPlayerId) return;
    commitChange(handleManualSwap(session, selectedPlayerForChange, swapPlayerId, activeBlockIdx), 'Players swapped in future blocks.');
  };

  const adjustActiveDuration = (deltaMinutes: number) => {
    const active = session.rotationPlan[activeBlockIdx];
    if (!active) return;
    const nextDuration = Math.max(5, active.durationMinutes + deltaMinutes);
    const appliedDelta = nextDuration - active.durationMinutes;
    if (appliedDelta === 0) return;
    const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
    const toTime = (m: number) => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
    const rotationPlan = session.rotationPlan.map((block, index) => index < activeBlockIdx ? block : index === activeBlockIdx
      ? { ...block, durationMinutes: nextDuration, endTime: toTime(toMinutes(block.endTime) + appliedDelta) }
      : { ...block, startTime: toTime(toMinutes(block.startTime) + appliedDelta), endTime: toTime(toMinutes(block.endTime) + appliedDelta) });
    setSecondsRemaining(val => Math.max(0, val + appliedDelta * 60));
    commitChange({ ...session, rotationPlan, finishTime: rotationPlan.at(-1)?.endTime || session.finishTime }, `Block ${appliedDelta > 0 ? 'extended' : 'shortened'} by ${Math.abs(appliedDelta)} mins.`);
  };

  const isLastBlock = activeBlockIdx === session.rotationPlan.length - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onExitLive}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={18} /> Exit Live Mode
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            aria-label="Toggle sound alerts"
            className="btn btn-secondary"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ width: 'auto', padding: '0 8px', height: '30px' }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <span className="badge badge-live">LIVE</span>
        </div>
      </div>

      {/* Hero Timer Display */}
      <div className="live-timer-hero-v2">
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
          BLOCK {activeBlockIdx + 1} OF {session.rotationPlan.length} ({currentBlockPlan?.startTime || '18:00'}–{currentBlockPlan?.endTime || '18:12'})
        </div>

        <div className="live-timer-digits-v2">
          {formatTime(secondsRemaining)}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {activeResourceAssignments.length} areas · {session.expectedPlayerIds.length} players
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="card" role="status" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, margin: 0 }}>
          ✓ {feedback}
        </div>
      )}

      {/* Current Block Training Areas List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          CURRENT BLOCK
        </div>

        {activeResourceAssignments.map(resAssign => {
          const isExpanded = expandedAreaId === resAssign.resourceId;
          const batters = resAssign.batterPlayerIds.map(id => playerById.get(id)?.name).filter(Boolean);
          const bowlers = resAssign.bowlerPodPlayerIds.map(id => playerById.get(id)?.name).filter(Boolean);

          const batterSummary = batters.length > 0 ? `${batters.slice(0, 2).join(' + ')} batting` : '';
          const bowlerSummary = bowlers.length > 0 ? `${bowlers.length} bowler${bowlers.length === 1 ? '' : 's'}` : '';
          const summaryParts = [batterSummary, bowlerSummary].filter(Boolean).join(' · ');

          return (
            <div
              key={resAssign.resourceId}
              className="live-area-card-v2"
              onClick={() => setExpandedAreaId(isExpanded ? null : resAssign.resourceId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
                  {resAssign.resourceName}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {summaryParts && (
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {summaryParts}
                </div>
              )}

              {isExpanded && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                  {batters.length > 0 && (
                    <div><strong style={{ color: 'var(--accent-gold)' }}>Batting:</strong> {batters.join(', ')}</div>
                  )}
                  {bowlers.length > 0 && (
                    <div><strong style={{ color: '#60a5fa' }}>Bowling:</strong> {bowlers.join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Up Next Preview */}
        {nextBlockPlan && (
          <div className="card" style={{ padding: '12px', background: 'var(--bg-surface-elevated)', marginTop: '6px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowNextPreview(!showNextPreview)}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>UP NEXT</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Block {activeBlockIdx + 2} ({nextBlockPlan.durationMinutes} min)</div>
              </div>
              {showNextPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {showNextPreview && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {nextBlockPlan.resourceAssignments.map(r => (
                  <div key={r.resourceId}><strong>{r.resourceName}:</strong> {r.batterPlayerIds.length} bat · {r.bowlerPodPlayerIds.length} bowl</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjust Session Sub-Bar */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0' }}>
        <button className="btn btn-secondary" onClick={() => setShowChangeModal(true)} style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem', flexShrink: 0 }}>
          <Settings2 size={14} /> Adjust Session
        </button>
        <button className="btn btn-secondary" onClick={handleUndo} disabled={undoStack.length === 0} style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.75rem', flexShrink: 0 }}>
          <Undo2 size={14} /> Undo
        </button>
        <button className="btn btn-secondary" onClick={() => adjustActiveDuration(2)} style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.75rem', flexShrink: 0 }}>
          +2 min
        </button>
        <button className="btn btn-secondary" onClick={() => adjustActiveDuration(-2)} style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.75rem', flexShrink: 0 }}>
          -2 min
        </button>
      </div>

      {/* Primary Live Sticky Actions */}
      <div className="live-sticky-actions-v2">
        <button
          className="btn btn-secondary"
          onClick={() => {
            const nextRunning = !isTimerRunning;
            setIsTimerRunning(nextRunning);
          }}
          style={{ flex: 1, height: '44px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
          {isTimerRunning ? 'Pause' : 'Resume'}
        </button>

        <button
          className="btn btn-gold"
          onClick={handleNextRotation}
          style={{ flex: 2, height: '44px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <SkipForward size={18} />
          {isLastBlock ? 'Finish Session' : `Advance to Block ${activeBlockIdx + 2}`}
        </button>
      </div>

      {/* Adjust Session Bottom Sheet */}
      {showChangeModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowChangeModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="live-change-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 id="live-change-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                ADJUST TRAINING
              </h3>
              <button onClick={() => setShowChangeModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WHAT CHANGED?</label>
                <select
                  value={changeType}
                  onChange={e => setChangeType(e.target.value as LiveChangeType)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.85rem' }}
                >
                  <option value="absent">Player unavailable / no-show</option>
                  <option value="late">Player arrived late</option>
                  <option value="injury">Player injured / restricted</option>
                  <option value="swap">Swap player groups</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PLAYER</label>
                <select
                  value={selectedPlayerForChange}
                  onChange={e => setSelectedPlayerForChange(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.85rem' }}
                >
                  <option value="">Choose player...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {changeType === 'late' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ARRIVAL TIME</label>
                  <input type="time" value={arrivalTimeInput} onChange={e => setArrivalTimeInput(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px' }} />
                </div>
              )}

              {changeType === 'injury' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>RESTRICTION NOTES</label>
                  <input type="text" value={injuryNotesInput} onChange={e => setInjuryNotesInput(e.target.value)} placeholder="e.g. Shoulder tightness - no bowling" style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px' }} />
                </div>
              )}

              {changeType === 'swap' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SWAP WITH</label>
                  <select
                    value={swapPlayerId}
                    onChange={e => setSwapPlayerId(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.85rem' }}
                  >
                    <option value="">Choose player...</option>
                    {players.filter(p => p.id !== selectedPlayerForChange).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <button
                className="btn btn-gold"
                disabled={!selectedPlayerForChange || (changeType === 'swap' && !swapPlayerId)}
                onClick={() => {
                  if (changeType === 'absent') handleMarkNoShow();
                  else if (changeType === 'late') handleMarkLateArrival();
                  else if (changeType === 'injury') handleMarkInjury();
                  else handleSwapPlayers();
                }}
                style={{ marginTop: '8px' }}
              >
                Apply Changes to Future Rotations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
