import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ClubTrainingSession, Player, ClubTeam, TrainingResource } from '../../../types/cricket';
import { handleLiveNoShow, handleLiveLateArrival, handleLiveInjury, handleManualSwap, recalculateFutureRotations } from '../../../modules/cricket/clubRotationEngine';
import { ResourceLeaderView } from './ResourceLeaderView';
import { Play, Pause, SkipForward, ArrowLeft, RefreshCw, Undo2, Settings2, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';

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
  onCompleteSession,
  onOpenQuickObservation
}) => {
  const [activeBlockIdx, setActiveBlockIdx] = useState<number>(session.currentLiveState?.activeRotationIndex ?? session.activeRotationIndex ?? 0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    session.currentLiveState?.secondsRemaining
      ?? (session.rotationPlan[session.activeRotationIndex ?? 0]?.durationMinutes || session.rotationDurationMinutes || 12) * 60
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(!session.currentLiveState?.isPaused);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [isLeaderViewActive, setIsLeaderViewActive] = useState<boolean>(false);

  const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
  const [changeType, setChangeType] = useState<LiveChangeType>('absent');

  const [selectedPlayerForChange, setSelectedPlayerForChange] = useState<string>('');
  const [arrivalTimeInput, setArrivalTimeInput] = useState<string>('18:30');
  const [injuryNotesInput, setInjuryNotesInput] = useState<string>('Hamstring tightness - no bowling');
  const [swapPlayerId, setSwapPlayerId] = useState<string>('');
  const [undoStack, setUndoStack] = useState<ClubTrainingSession[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [recalculatedFromBlock, setRecalculatedFromBlock] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator === 'undefined' || navigator.onLine);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const warnedAt = useRef<Set<number>>(new Set());
  const latestSessionRef = useRef(session);
  const latestUpdateRef = useRef(onUpdateSession);
  latestSessionRef.current = session;
  latestUpdateRef.current = onUpdateSession;
  const playerById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);

  const currentBlockPlan = session.rotationPlan[activeBlockIdx] || session.rotationPlan[0];
  const activeResourceAssignments = currentBlockPlan?.resourceAssignments || [];

  // Active selected resource assignment or first
  const currentResourceAssignment = selectedResourceId
    ? activeResourceAssignments.find(r => r.resourceId === selectedResourceId) || activeResourceAssignments[0]
    : activeResourceAssignments[0];

  const currentResourceDef = resources.find(r => r.id === currentResourceAssignment?.resourceId);

  // Timer Countdown Effect
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
    const currentSession = latestSessionRef.current;
    setSaveState('saving');
    latestUpdateRef.current({
      ...currentSession,
      activeRotationIndex: activeBlockIdx,
      currentLiveState: {
        activeBlockIndex: currentSession.activeBlockIndex,
        activeRotationIndex: activeBlockIdx,
        secondsRemaining: 0,
        isPaused: true,
        updatedAt: new Date().toISOString()
      }
    });
    setSaveState('saved');
  }, [secondsRemaining, activeBlockIdx, isTimerRunning]);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    if (![60, 0].includes(secondsRemaining) || warnedAt.current.has(secondsRemaining)) return;
    warnedAt.current.add(secondsRemaining);
    if (vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(secondsRemaining === 0 ? [200, 100, 200] : 150);
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
      } catch { /* Browser may require a prior user gesture. */ }
    }
    if (secondsRemaining === 0) setFeedback({ kind: 'success', message: 'Block complete. Timer paused—advance when ready.' });
  }, [secondsRemaining, soundEnabled, vibrationEnabled]);

  useEffect(() => {
    if (!isTimerRunning || secondsRemaining <= 0 || secondsRemaining % 15 !== 0) return;
    setSaveState('saving');
    const currentSession = latestSessionRef.current;
    latestUpdateRef.current({ ...currentSession, activeRotationIndex: activeBlockIdx, currentLiveState: { activeBlockIndex: currentSession.activeBlockIndex, activeRotationIndex: activeBlockIdx, secondsRemaining, isPaused: false, updatedAt: new Date().toISOString() } });
    setSaveState('saved');
  }, [secondsRemaining, activeBlockIdx, isTimerRunning]);

  const persistLiveState = (updates: Partial<NonNullable<ClubTrainingSession['currentLiveState']>> = {}) => {
    onUpdateSession({
      ...session,
      activeRotationIndex: updates.activeRotationIndex ?? activeBlockIdx,
      activeBlockIndex: updates.activeBlockIndex ?? session.activeBlockIndex,
      currentLiveState: {
        activeBlockIndex: updates.activeBlockIndex ?? session.activeBlockIndex,
        activeRotationIndex: updates.activeRotationIndex ?? activeBlockIdx,
        secondsRemaining: updates.secondsRemaining ?? secondsRemaining,
        isPaused: updates.isPaused ?? !isTimerRunning,
        updatedAt: new Date().toISOString()
      }
    });
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextRotation = () => {
    if (activeBlockIdx < session.rotationPlan.length - 1) {
      setActiveBlockIdx(prev => prev + 1);
      const nextBlock = session.rotationPlan[activeBlockIdx + 1];
      const nextSeconds = (nextBlock?.durationMinutes || session.rotationDurationMinutes || 12) * 60;
      setSecondsRemaining(nextSeconds);
      setIsTimerRunning(false);
      warnedAt.current.clear();
      setFeedback({ kind: 'success', message: `Advanced to block ${activeBlockIdx + 2}. Timer is paused.` });
      persistLiveState({ activeRotationIndex: activeBlockIdx + 1, secondsRemaining: nextSeconds, isPaused: true });
    } else {
      onCompleteSession();
    }
  };

  const commitChange = (updated: ClubTrainingSession, message: string, marksRecalculation = true) => {
    setUndoStack(stack => [...stack.slice(-9), session]);
    setSaveState('saving');
    onUpdateSession(updated);
    setSaveState('saved');
    setFeedback({ kind: 'success', message });
    if (marksRecalculation) setRecalculatedFromBlock(activeBlockIdx + 1);
    setShowChangeModal(false);
    setSelectedPlayerForChange('');
    setSwapPlayerId('');
  };

  const handleUndo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    onUpdateSession(previous);
    setUndoStack(stack => stack.slice(0, -1));
    setFeedback({ kind: 'success', message: 'Last live change undone.' });
    setRecalculatedFromBlock(null);
  };

  // Live Action Handlers (strictly future-only recalculation)
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

  const handleForceRecalculateFuture = () => {
    const updated = recalculateFutureRotations(session, activeBlockIdx, players, teams, resources);
    commitChange(updated, 'Future blocks recalculated successfully.');
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
    const toMinutes = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
    const toTime = (minutes: number) => `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
    const rotationPlan = session.rotationPlan.map((block, index) => index < activeBlockIdx ? block : index === activeBlockIdx
      ? { ...block, durationMinutes: nextDuration, endTime: toTime(toMinutes(block.endTime) + appliedDelta) }
      : { ...block, startTime: toTime(toMinutes(block.startTime) + appliedDelta), endTime: toTime(toMinutes(block.endTime) + appliedDelta) });
    setSecondsRemaining(value => Math.max(0, value + appliedDelta * 60));
    commitChange({ ...session, rotationPlan, finishTime: rotationPlan.at(-1)?.endTime || session.finishTime }, `Current block ${appliedDelta > 0 ? 'extended' : 'shortened'} by ${Math.abs(appliedDelta)} minutes.`, false);
  };

  const isLastBlock = activeBlockIdx === session.rotationPlan.length - 1;
  const getPlayer = (id: string) => playerById.get(id);

  return (
    <div className="live-viewport" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onExitLive}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={18} /> Exit Live Mode
        </button>
        <button
          onClick={() => setIsLeaderViewActive(!isLeaderViewActive)}
          style={{
            background: isLeaderViewActive ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
            border: '1px solid var(--accent-gold)',
            color: isLeaderViewActive ? '#000' : 'var(--accent-gold)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 800,
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
        >
          {isLeaderViewActive ? 'SHOW COORDINATOR VIEW' : 'RESOURCE LEADER VIEW'}
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className={`badge ${isOnline ? 'badge-green' : 'badge-warning'}`}>{isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}{isOnline ? saveState === 'saving' ? 'Saving…' : 'Saved' : 'Offline'}</span>
          <button aria-label={soundEnabled ? 'Disable audible warnings' : 'Enable audible warnings'} className="btn btn-secondary" onClick={() => setSoundEnabled(value => !value)} style={{ width: '44px', padding: 0 }}>{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
          <span className="badge badge-live">Live</span>
        </div>
      </div>

      {/* Hero Timer Display */}
      <div className="live-timer-hero">
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          ROTATION BLOCK {activeBlockIdx + 1} OF {session.rotationPlan.length} ({currentBlockPlan?.startTime || '18:00'} - {currentBlockPlan?.endTime || '18:12'})
        </div>

        <div className="live-timer-digits">
          {formatTime(secondsRemaining)}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
          📍 {activeResourceAssignments.length} Active Resources • {session.expectedPlayerIds.length} Players Attending
        </div>
      </div>

      {/* Resource Tab Selector */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {activeResourceAssignments.map(res => (
          <button
            key={res.resourceId}
            onClick={() => setSelectedResourceId(res.resourceId)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: (currentResourceAssignment?.resourceId === res.resourceId) ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
              background: (currentResourceAssignment?.resourceId === res.resourceId) ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
              color: (currentResourceAssignment?.resourceId === res.resourceId) ? 'var(--accent-gold)' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {res.resourceName} ({res.batterPlayerIds.length}B / {res.bowlerPodPlayerIds.length}W)
          </button>
        ))}
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLeaderViewActive && currentResourceAssignment ? (
          <ResourceLeaderView
            assignment={currentResourceAssignment}
            resourceDef={currentResourceDef}
            players={players}
            blockTitle={`Block ${activeBlockIdx + 1}`}
            blockTimeStr={`${currentBlockPlan?.startTime} - ${currentBlockPlan?.endTime}`}
            onPlayerClick={onOpenQuickObservation}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeResourceAssignments.map(resAssign => {
              const batters = resAssign.batterPlayerIds.map(getPlayer).filter(Boolean) as Player[];
              const bowlers = resAssign.bowlerPodPlayerIds.map(getPlayer).filter(Boolean) as Player[];

              return (
                <div key={resAssign.resourceId} className="card" style={{ padding: '12px', borderLeft: '4px solid var(--primary-green-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
                      {resAssign.resourceName}
                    </div>
                    <span className={`badge ${recalculatedFromBlock !== null && activeBlockIdx >= recalculatedFromBlock ? 'badge-warning' : 'badge-green'}`}>{recalculatedFromBlock !== null && activeBlockIdx >= recalculatedFromBlock ? 'Recalculated' : 'Preserved'}</span>
                  </div>

                  {/* Batters */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>
                    BATTERS: {batters.map(b => b.name).join(', ') || 'None'}
                  </div>

                  {/* Bowlers */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa' }}>
                    BOWLING POD: {bowlers.map(b => b.name).join(', ') || 'None'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Adjustment Action Bar */}
      <div className="card" style={{ padding: '8px', background: 'var(--bg-surface-elevated)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textAlign: 'center' }}>
          LIVE SESSION CHANGE CONTROLS (FUTURE BLOCKS RECALCULATE ONLY)
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          <button className="btn btn-secondary" onClick={() => setShowChangeModal(true)} style={{ width: 'auto' }}><Settings2 size={14} /> Change</button>
          <button className="btn btn-secondary" onClick={handleUndo} disabled={undoStack.length === 0} style={{ width: 'auto' }}><Undo2 size={14} /> Undo</button>

          <button className="btn btn-secondary" onClick={() => adjustActiveDuration(2)} style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem' }}>+2 MINS</button>
          <button className="btn btn-secondary" onClick={() => adjustActiveDuration(-2)} style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem' }}>-2 MINS</button>

          <button
            className="btn btn-secondary"
            onClick={handleForceRecalculateFuture}
            style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem', color: 'var(--accent-gold)' }}
          >
            <RefreshCw size={12} /> RECALCULATE FUTURE
          </button>
        </div>
      </div>

      {feedback && <div role="status" className="card" style={{ padding: '8px 12px', margin: 0, color: feedback.kind === 'error' ? '#f97316' : 'var(--primary-green-light)' }}>{feedback.message}</div>}

      {/* Sticky Bottom Play Controls */}
      <div className="live-action-grid">
        <button
          className="btn btn-secondary live-action-btn"
          onClick={() => {
            const nextRunning = !isTimerRunning;
            setIsTimerRunning(nextRunning);
            persistLiveState({ isPaused: !nextRunning });
          }}
        >
          {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
          {isTimerRunning ? 'PAUSE TIMER' : 'RESUME TIMER'}
        </button>

        <button
          className="btn btn-gold live-action-btn"
          onClick={handleNextRotation}
        >
          <SkipForward size={18} />
          {isLastBlock ? 'FINISH SESSION' : `ADVANCE TO BLOCK ${activeBlockIdx + 2}`}
        </button>
      </div>

      {showChangeModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowChangeModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="live-change-title" className="bottom-sheet-content" onClick={event => event.stopPropagation()}>
            <h2 id="live-change-title">Change live session</h2>
            <label>Change type<select value={changeType} onChange={event => setChangeType(event.target.value as LiveChangeType)}><option value="absent">Absent / no-show</option><option value="late">Late arrival</option><option value="injury">Injury or restriction</option><option value="swap">Swap future allocations</option></select></label>
            <label>Player<select value={selectedPlayerForChange} onChange={event => setSelectedPlayerForChange(event.target.value)}><option value="">Choose player</option>{players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
            {changeType === 'late' && <label>Updated arrival time<input type="time" value={arrivalTimeInput} onChange={event => setArrivalTimeInput(event.target.value)} /></label>}
            {changeType === 'injury' && <label>Restriction notes<input value={injuryNotesInput} onChange={event => setInjuryNotesInput(event.target.value)} /></label>}
            {changeType === 'swap' && <label>Swap with<select value={swapPlayerId} onChange={event => setSwapPlayerId(event.target.value)}><option value="">Choose player</option>{players.filter(player => player.id !== selectedPlayerForChange).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>}
            <label style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}><input type="checkbox" checked={vibrationEnabled} onChange={event => setVibrationEnabled(event.target.checked)} /> Vibration warnings</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}><button className="btn btn-secondary" onClick={() => setShowChangeModal(false)}>Cancel</button><button className="btn btn-gold" disabled={!selectedPlayerForChange || (changeType === 'swap' && !swapPlayerId)} onClick={() => { if (changeType === 'absent') handleMarkNoShow(); else if (changeType === 'late') handleMarkLateArrival(); else if (changeType === 'injury') handleMarkInjury(); else handleSwapPlayers(); }}>Apply change</button></div>
          </div>
        </div>
      )}

    </div>
  );
};
