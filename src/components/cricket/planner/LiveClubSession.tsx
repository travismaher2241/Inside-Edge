import React, { useState, useEffect } from 'react';
import type { ClubTrainingSession, Player, ClubTeam, TrainingResource } from '../../../types/cricket';
import { handleLiveNoShow, handleLiveLateArrival, handleLiveInjury, handleManualSwap, recalculateFutureRotations } from '../../../modules/cricket/clubRotationEngine';
import { ResourceLeaderView } from './ResourceLeaderView';
import { Play, Pause, SkipForward, ArrowLeft, UserX, Clock, Activity, RefreshCw, Shuffle } from 'lucide-react';

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
  const [activeBlockIdx, setActiveBlockIdx] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    (session.rotationDurationMinutes || 12) * 60
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [isLeaderViewActive, setIsLeaderViewActive] = useState<boolean>(false);

  // Live Adjustment Modals
  const [showNoShowModal, setShowNoShowModal] = useState<boolean>(false);
  const [showLateArrivalModal, setShowLateArrivalModal] = useState<boolean>(false);
  const [showInjuryModal, setShowInjuryModal] = useState<boolean>(false);
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);

  const [selectedPlayerForChange, setSelectedPlayerForChange] = useState<string>('');
  const [arrivalTimeInput, setArrivalTimeInput] = useState<string>('18:30');
  const [injuryNotesInput, setInjuryNotesInput] = useState<string>('Hamstring tightness - no bowling');
  const [swapPlayerId, setSwapPlayerId] = useState<string>('');

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

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextRotation = () => {
    if (activeBlockIdx < session.rotationPlan.length - 1) {
      setActiveBlockIdx(prev => prev + 1);
      const nextBlock = session.rotationPlan[activeBlockIdx + 1];
      setSecondsRemaining((nextBlock?.durationMinutes || session.rotationDurationMinutes || 12) * 60);
    } else {
      onCompleteSession();
    }
  };

  // Live Action Handlers (strictly future-only recalculation)
  const handleMarkNoShow = () => {
    if (!selectedPlayerForChange) return;
    const updated = handleLiveNoShow(session, selectedPlayerForChange, activeBlockIdx, players, teams, resources);
    onUpdateSession(updated);
    setShowNoShowModal(false);
    setSelectedPlayerForChange('');
  };

  const handleMarkLateArrival = () => {
    if (!selectedPlayerForChange) return;
    const updated = handleLiveLateArrival(session, selectedPlayerForChange, arrivalTimeInput, activeBlockIdx, players, teams, resources);
    onUpdateSession(updated);
    setShowLateArrivalModal(false);
    setSelectedPlayerForChange('');
  };

  const handleMarkInjury = () => {
    if (!selectedPlayerForChange) return;
    const updated = handleLiveInjury(session, selectedPlayerForChange, injuryNotesInput, activeBlockIdx, players, teams, resources);
    onUpdateSession(updated);
    setShowInjuryModal(false);
    setSelectedPlayerForChange('');
  };

  const handleForceRecalculateFuture = () => {
    const updated = recalculateFutureRotations(session, activeBlockIdx, players, teams, resources);
    onUpdateSession(updated);
  };

  const handleSwapPlayers = () => {
    if (!selectedPlayerForChange || !swapPlayerId || selectedPlayerForChange === swapPlayerId) return;
    onUpdateSession(handleManualSwap(session, selectedPlayerForChange, swapPlayerId, activeBlockIdx));
    setShowSwapModal(false);
    setSelectedPlayerForChange('');
    setSwapPlayerId('');
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
    onUpdateSession({ ...session, rotationPlan, finishTime: rotationPlan.at(-1)?.endTime || session.finishTime });
  };

  const isLastBlock = activeBlockIdx === session.rotationPlan.length - 1;
  const getPlayer = (id: string) => players.find(p => p.id === id);

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
        <span className="badge badge-live">● LIVE TRAINING</span>
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
          <button
            className="btn btn-secondary"
            onClick={() => setShowNoShowModal(true)}
            style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem' }}
          >
            <UserX size={12} /> MARK ABSENT
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowLateArrivalModal(true)}
            style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem' }}
          >
            <Clock size={12} /> LATE ARRIVAL
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowInjuryModal(true)}
            style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem' }}
          >
            <Activity size={12} /> INJURY / RESTRICT
          </button>

          <button className="btn btn-secondary" onClick={() => setShowSwapModal(true)} style={{ width: 'auto', padding: '0 8px', height: '32px', fontSize: '0.7rem' }}>
            <Shuffle size={12} /> SWAP PLAYERS
          </button>

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

      {/* Sticky Bottom Play Controls */}
      <div className="live-action-grid">
        <button
          className="btn btn-secondary live-action-btn"
          onClick={() => setIsTimerRunning(!isTimerRunning)}
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

      {/* No Show Modal */}
      {showNoShowModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowNoShowModal(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '10px' }}>Mark Absent / No-Show</h3>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SELECT PLAYER</label>
            <select
              value={selectedPlayerForChange}
              onChange={e => setSelectedPlayerForChange(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', marginBottom: '14px' }}
            >
              <option value="">-- Choose Player --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button className="btn btn-gold" onClick={handleMarkNoShow} disabled={!selectedPlayerForChange}>
              CONFIRM ABSENT & RECALCULATE FUTURE
            </button>
          </div>
        </div>
      )}

      {/* Late Arrival Modal */}
      {showLateArrivalModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowLateArrivalModal(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '10px' }}>Mark Late Arrival</h3>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SELECT PLAYER</label>
            <select
              value={selectedPlayerForChange}
              onChange={e => setSelectedPlayerForChange(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', marginBottom: '10px' }}
            >
              <option value="">-- Choose Player --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>UPDATED ARRIVAL TIME</label>
            <input
              type="time"
              value={arrivalTimeInput}
              onChange={e => setArrivalTimeInput(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', marginBottom: '14px' }}
            />
            <button className="btn btn-gold" onClick={handleMarkLateArrival} disabled={!selectedPlayerForChange}>
              UPDATE ARRIVAL & RECALCULATE FUTURE
            </button>
          </div>
        </div>
      )}

      {/* Injury Modal */}
      {showInjuryModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowInjuryModal(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '10px' }}>Mark Live Injury / Restriction</h3>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SELECT PLAYER</label>
            <select
              value={selectedPlayerForChange}
              onChange={e => setSelectedPlayerForChange(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', marginBottom: '10px' }}
            >
              <option value="">-- Choose Player --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>INJURY / RESTRICTION NOTES</label>
            <input
              type="text"
              value={injuryNotesInput}
              onChange={e => setInjuryNotesInput(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', marginBottom: '14px' }}
            />
            <button className="btn btn-gold" onClick={handleMarkInjury} disabled={!selectedPlayerForChange}>
              APPLY RESTRICTION & RECALCULATE FUTURE
            </button>
          </div>
        </div>
      )}

      {showSwapModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="bottom-sheet-content" onClick={event => event.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '10px' }}>Swap Future Allocations</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>The active and completed blocks stay unchanged. Future placements are locked after the swap.</p>
            {[{ value: selectedPlayerForChange, set: setSelectedPlayerForChange, label: 'FIRST PLAYER' }, { value: swapPlayerId, set: setSwapPlayerId, label: 'SECOND PLAYER' }].map(field => (
              <label key={field.label} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                {field.label}
                <select value={field.value} onChange={event => field.set(event.target.value)} style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}>
                  <option value="">-- Choose Player --</option>
                  {players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
              </label>
            ))}
            <button className="btn btn-gold" onClick={handleSwapPlayers} disabled={!selectedPlayerForChange || !swapPlayerId || selectedPlayerForChange === swapPlayerId}>SWAP FUTURE BLOCKS</button>
          </div>
        </div>
      )}
    </div>
  );
};
