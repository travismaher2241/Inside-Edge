import React, { useState, useEffect } from 'react';
import type { TrainingSession, Player, Facility } from '../types/cricket';
import { Play, Pause, SkipForward, ArrowLeft, Users, CheckCircle2, Target } from 'lucide-react';
import { NetVisualizer } from '../components/cricket/NetVisualizer';
import { CaptainPlanMode } from '../components/cricket/tactics/CaptainPlanMode';

interface LiveModeViewProps {
  session: TrainingSession;
  players: Player[];
  facility: Facility;
  matchId?: string;
  onExitLive: () => void;
  onOpenQuickObservation: (player: Player) => void;
  onCompleteSession: () => void;
}

export const LiveModeView: React.FC<LiveModeViewProps> = ({
  session,
  players,
  facility,
  matchId = 'match-1',
  onExitLive,
  onOpenQuickObservation,
  onCompleteSession
}) => {
  const [activeBlockIdx, setActiveBlockIdx] = useState<number>(session.activeBlockIndex || 0);
  const [activeRotationIdx, setActiveRotationIdx] = useState<number>(session.activeRotationIndex || 0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(12 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isCaptainModeOpen, setIsCaptainModeOpen] = useState<boolean>(false);

  const currentBlock = session.blocks[activeBlockIdx] || session.blocks[0];
  const isRotationBlock = currentBlock.blockType === 'rotation';
  const rotationPlan = isRotationBlock ? currentBlock.rotationPlan : undefined;

  // Countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextAction = () => {
    if (isRotationBlock && activeRotationIdx < 2) {
      // Cycle next net rotation within rotation block
      setActiveRotationIdx(prev => prev + 1);
      setSecondsRemaining(12 * 60);
    } else if (activeBlockIdx < session.blocks.length - 1) {
      // Advance to next session block
      const nextBlock = session.blocks[activeBlockIdx + 1];
      setActiveBlockIdx(prev => prev + 1);
      setActiveRotationIdx(0);
      setSecondsRemaining((nextBlock?.durationMinutes || 15) * 60);
    } else {
      // Session finished
      onCompleteSession();
    }
  };

  const isLastBlock = activeBlockIdx === session.blocks.length - 1;

  return (
    <div className="live-viewport">
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onExitLive}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={18} /> Exit Live Mode
        </button>
        <button
          onClick={() => setIsCaptainModeOpen(true)}
          style={{ background: 'var(--accent-gold-soft)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Target size={14} /> CAPTAIN PLANS
        </button>
        <span className="badge badge-live">● LIVE SESSION</span>
      </div>

      {isCaptainModeOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsCaptainModeOpen(false)}>
          <div className="bottom-sheet-content" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <CaptainPlanMode matchId={matchId} players={players} onClose={() => setIsCaptainModeOpen(false)} />
          </div>
        </div>
      )}

      {/* Hero Timer Display */}
      <div className="live-timer-hero">
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          BLOCK {activeBlockIdx + 1}/{session.blocks.length}: {currentBlock.title} {isRotationBlock && `• ROTATION ${activeRotationIdx + 1}/3`}
        </div>

        <div className="live-timer-digits">
          {formatTime(secondsRemaining)}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
          📍 {currentBlock.location} • Objective: {currentBlock.objective}
        </div>
      </div>

      {/* Active Net Assignments or Block Overview (Zero Scroll Focus) */}
      <div style={{ flex: 1, overflowY: 'auto', margin: '12px 0' }}>
        {isRotationBlock && rotationPlan ? (
          <NetVisualizer
            rotationPlan={rotationPlan}
            netLanes={facility.netLanes}
            players={players}
            onPlayerClick={onOpenQuickObservation}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '24px', borderLeft: '4px solid var(--accent-gold)' }}>
            <Users size={36} color="var(--accent-gold)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{currentBlock.title}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{currentBlock.objective}</p>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginTop: '12px', fontWeight: 700 }}>
              Location: {currentBlock.location} • Duration: {currentBlock.durationMinutes} Mins
            </div>
          </div>
        )}
      </div>

      {/* Touch Control Buttons */}
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '6px' }}>
          TAP ANY PLAYER CARD ABOVE FOR FAST OBS LOGGING (≤4S)
        </div>
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
            onClick={handleNextAction}
          >
            {isLastBlock ? <CheckCircle2 size={18} /> : <SkipForward size={18} />}
            {isLastBlock ? 'COMPLETE SESSION' : isRotationBlock ? `ROTATION ${activeRotationIdx + 1} ➔ NEXT` : 'NEXT BLOCK ➔'}
          </button>
        </div>
      </div>
    </div>
  );
};
