import React, { useState, useMemo } from 'react';
import type { TrainingSession, Facility, Player, NetLane } from '../types/cricket';
import { NetVisualizer } from '../components/cricket/NetVisualizer';
import { SessionCreationModal } from '../components/cricket/SessionCreationModal';
import { adjustNetCount, calculateUtilisation } from '../modules/cricket/rotationEngine';
import { Play, Clock, Layers, AlertTriangle, Lightbulb, Plus, X, Check } from 'lucide-react';

interface TrainViewProps {
  session: TrainingSession;
  facility: Facility;
  players: Player[];
  onUpdateSession: (session: TrainingSession) => void;
  onStartLiveSession: () => void;
  onOpenQuickObservation: (player: Player) => void;
}

export const TrainView: React.FC<TrainViewProps> = ({
  session,
  facility,
  players,
  onUpdateSession,
  onStartLiveSession,
  onOpenQuickObservation
}) => {
  const [activeTab, setActiveTab] = useState<'blocks' | 'nets'>('nets');
  const [isConfirmNewSessionOpen, setIsConfirmNewSessionOpen] = useState<boolean>(false);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState<boolean>(false);

  const rotationBlockIndex = session.blocks.findIndex(b => b.blockType === 'rotation');
  const rotationBlock = session.blocks[rotationBlockIndex];
  const rotationPlan = rotationBlock?.rotationPlan;

  const [netLanes, setNetLanes] = useState<NetLane[]>(facility.netLanes);

  const totalBlockDuration = session.blocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  // Derive session-scoped player availability array
  const sessionScopedPlayers = useMemo(() => {
    if (!session.expectedPlayerIds) return players;
    return players.map(p => ({
      ...p,
      trainingAvailability: session.expectedPlayerIds.includes(p.id)
    }));
  }, [players, session.expectedPlayerIds]);

  const handleAdjustNetCount = (newCount: number) => {
    let updatedLanes: NetLane[] = [];
    if (newCount === 2) {
      updatedLanes = facility.netLanes.slice(0, 2);
    } else if (newCount === 3) {
      updatedLanes = facility.netLanes;
    } else if (newCount === 4) {
      updatedLanes = [
        ...facility.netLanes,
        {
          id: 'lane-4',
          name: 'Net 4 - Technical Free Net',
          laneType: 'standard',
          laneObjective: 'Free net technical repetition & side-arm',
          maxBatters: 2,
          maxBowlers: 3
        }
      ];
    }
    setNetLanes(updatedLanes);

    if (rotationPlan && rotationBlockIndex !== -1) {
      const revisedPlan = adjustNetCount(rotationPlan, updatedLanes, sessionScopedPlayers);
      const updatedBlocks = [...session.blocks];
      updatedBlocks[rotationBlockIndex] = {
        ...rotationBlock,
        rotationPlan: revisedPlan
      };
      onUpdateSession({
        ...session,
        blocks: updatedBlocks
      });
    }
  };

  const handleOpenNewSessionFlow = () => {
    // If current session is non-empty, prompt confirmation before proceeding
    if (session.blocks.length > 0) {
      setIsConfirmNewSessionOpen(true);
    } else {
      setIsCreationModalOpen(true);
    }
  };

  const handleConfirmDiscardAndCreate = () => {
    setIsConfirmNewSessionOpen(false);
    setIsCreationModalOpen(true);
  };

  const utilisation = rotationPlan ? calculateUtilisation(rotationPlan, sessionScopedPlayers) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>TRAINING PLANNER</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{session.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-secondary" onClick={handleOpenNewSessionFlow} style={{ width: 'auto', padding: '0 10px', height: '36px', fontSize: '0.75rem' }}>
            <Plus size={14} /> NEW SESSION
          </button>
          <button className="btn btn-live" onClick={onStartLiveSession} style={{ width: 'auto', padding: '0 12px', height: '36px' }}>
            <Play size={16} /> LIVE MODE
          </button>
        </div>
      </div>

      {/* Duration Warning if exceeded */}
      {totalBlockDuration > 75 && (
        <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.4)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={16} />
          <span>Duration alert: Total blocks sum to {totalBlockDuration} mins (exceeds 75 min target).</span>
        </div>
      )}

      {/* Session Metadata Pill Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} /> {totalBlockDuration} MINS TOTAL
        </span>
        <span className="badge badge-green">👥 {session.expectedPlayerIds.length} PLAYERS EXPECTED</span>
        <span className="badge badge-gold">📍 {facility.name}</span>
      </div>

      {/* Tab Switcher: Session Blocks vs Net Manager */}
      <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '10px', padding: '4px' }}>
        <button
          onClick={() => setActiveTab('nets')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'nets' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'nets' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          NET MANAGER & ROTATIONS
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'blocks' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'blocks' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          SESSION BLOCKS ({session.blocks.length})
        </button>
      </div>

      {/* Net Manager Tab View */}
      {activeTab === 'nets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Net Count Adjuster Bar */}
          <div className="card" style={{ padding: '12px', background: 'var(--bg-surface-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>ACTIVE NET LANES</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Adjust facility lane count</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  onClick={() => handleAdjustNetCount(count)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: netLanes.length === count ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: netLanes.length === count ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                    color: netLanes.length === count ? 'var(--accent-gold)' : 'var(--text-main)',
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

          {/* Utilisation Summary Dashboard */}
          {utilisation && (
            <div className="card" style={{ background: 'var(--bg-surface-elevated)', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>UTILISATION & SQUAD ALLOCATION</span>
                <span style={{ color: utilisation.unassignedPlayersCount > 0 ? '#f97316' : '#4ade80' }}>
                  {utilisation.allocatedPlayersCount} / {utilisation.totalExpectedPlayers} Allocated
                </span>
              </div>

              {utilisation.warnings.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {utilisation.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Net Visualizer */}
          {rotationPlan ? (
            <NetVisualizer
              rotationPlan={rotationPlan}
              netLanes={netLanes}
              players={players}
              onPlayerClick={onOpenQuickObservation}
            />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <Layers size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
              <div>No rotation plan added yet.</div>
            </div>
          )}

          {/* Why this plan? Rationale Panel */}
          {session.rationale && (
            <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)', background: 'rgba(229, 169, 60, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                <Lightbulb size={16} /> WHY THIS PLAN?
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: 1.4 }}>
                {session.rationale}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Blocks Tab View */}
      {activeTab === 'blocks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {session.blocks.map((block, idx) => (
            <div key={block.id} className="card" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>BLOCK {idx + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{block.title}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 800 }}>{block.durationMinutes} MINS</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                📍 {block.location} • Objective: {block.objective}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm New Session — replacing the current session discards its edits */}
      {isConfirmNewSessionOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsConfirmNewSessionOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Start a New Session?</div>
              <button onClick={() => setIsConfirmNewSessionOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              This replaces "<strong style={{ color: 'var(--text-main)' }}>{session.title}</strong>" ({session.blocks.length} blocks, {totalBlockDuration} mins) with a new session draft. In-progress edits will be cleared.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsConfirmNewSessionOpen(false)} style={{ flex: 1 }}>
                CANCEL
              </button>
              <button className="btn btn-gold" onClick={handleConfirmDiscardAndCreate} style={{ flex: 1 }}>
                <Check size={16} /> DISCARD & START NEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Creation Wizard Modal */}
      {isCreationModalOpen && (
        <SessionCreationModal
          facility={facility}
          players={players}
          recentObjectives={session.primaryObjectives}
          onClose={() => setIsCreationModalOpen(false)}
          onSaveSession={onUpdateSession}
        />
      )}
    </div>
  );
};
