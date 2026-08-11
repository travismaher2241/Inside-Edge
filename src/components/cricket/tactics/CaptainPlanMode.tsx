import React, { useState } from 'react';
import type { Player, OppositionBatter, SavedTacticalPlan } from '../../../types/cricket';
import { StorageEngine } from '../../../storage/db';
import { BOWLING_PLAN_LIBRARY } from '../../../modules/cricket/tactics/planLibrary';
import { TACTICAL_FIELD_PRESETS } from '../../../modules/cricket/tactics/fieldPresets';
import { TacticalFieldPreview } from './TacticalFieldPreview';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface CaptainPlanModeProps {
  matchId: string;
  players: Player[];
  onClose?: () => void;
}

export const CaptainPlanMode: React.FC<CaptainPlanModeProps> = ({ matchId, players, onClose }) => {
  const [batters] = useState<OppositionBatter[]>(() => StorageEngine.getOppositionBatters(matchId));
  const [plans, setPlans] = useState<SavedTacticalPlan[]>(() => StorageEngine.getSavedTacticalPlans(matchId));
  const [selectedBatterId, setSelectedBatterId] = useState<string>(batters[0]?.id || '');
  const [expandedBowlerId, setExpandedBowlerId] = useState<string | null>(null);

  const activeBatter = batters.find(b => b.id === selectedBatterId) || batters[0];
  const batterPlans = plans.filter(p => p.matchId === matchId && p.batterId === activeBatter?.id);

  const handleUpdateStatus = (plan: SavedTacticalPlan, newStatus: SavedTacticalPlan['status']) => {
    const updated: SavedTacticalPlan = {
      ...plan,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    StorageEngine.saveTacticalPlan(updated);
    setPlans(StorageEngine.getSavedTacticalPlans(matchId));
  };

  if (!activeBatter || batters.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <h3>No Opposition Batters Logged</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Log opposition batters in Pre-Match Plan to enable Captain Match-Day Mode.
        </p>
        {onClose && (
          <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '12px' }}>
            CLOSE CAPTAIN MODE
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
            OUTDOOR CAPTAIN MODE
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Opposition Plans</h2>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Opposition Batter Selector Bar */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {batters.map(b => {
          const isSel = b.id === activeBatter.id;
          return (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBatterId(b.id);
                setExpandedBowlerId(null);
              }}
              style={{
                minWidth: '110px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: isSel ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                background: isSel ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                color: isSel ? 'var(--accent-gold)' : 'var(--text-main)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                flexShrink: 0,
              }}
            >
              <div>{b.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{b.battingHand.toUpperCase()[0]}HB</div>
            </button>
          );
        })}
      </div>

      {/* Planned Bowlers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {batterPlans.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            No bowling plans saved for {activeBatter.name} yet. Save plans in Stage 4 of Pre-Match.
          </div>
        ) : (
          batterPlans.map(saved => {
            const bowler = players.find(p => p.id === saved.bowlerId);
            const planDef = BOWLING_PLAN_LIBRARY.find(p => p.id === saved.planId);
            const isExpanded = expandedBowlerId === saved.id;
            const preset = TACTICAL_FIELD_PRESETS.find(p => p.id === saved.fieldPresetId) || TACTICAL_FIELD_PRESETS[0];

            const statusBadgeClass =
              saved.status === 'working' ? 'badge-green' :
              saved.status === 'adjust' ? 'badge-warning' :
              saved.status === 'abandon' ? 'badge-live' : 'badge-gold';

            return (
              <div
                key={saved.id}
                style={{
                  background: 'var(--bg-surface-card)',
                  border: isExpanded ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Compact Card Bar */}
                <div
                  onClick={() => setExpandedBowlerId(isExpanded ? null : saved.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{bowler?.name || 'Bowler'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, marginTop: '2px' }}>
                      {planDef?.title || saved.planId}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      {saved.status}
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Always Prominent Line, Length & Dangerous Miss */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.78rem' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '6px 8px', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>LINE: </span>
                    <span style={{ fontWeight: 600 }}>{planDef?.line || 'Fourth stump'}</span>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '6px 8px', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>LENGTH: </span>
                    <span style={{ fontWeight: 600 }}>{planDef?.length || 'Good length'}</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(231, 111, 81, 0.15)', border: '1px solid rgba(231, 111, 81, 0.4)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#f97316' }}>
                  <strong>DANGEROUS MISS: </strong>{planDef?.executionRisk || 'Slot length / wide down leg'}
                </div>

                {/* Quick Status Buttons */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); handleUpdateStatus(saved, 'working'); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      background: saved.status === 'working' ? 'var(--primary-green)' : 'var(--bg-surface-elevated)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ WORKING
                  </button>

                  <button
                    onClick={e => { e.stopPropagation(); handleUpdateStatus(saved, 'adjust'); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      background: saved.status === 'adjust' ? '#f59e0b' : 'var(--bg-surface-elevated)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ ADJUST
                  </button>

                  <button
                    onClick={e => { e.stopPropagation(); handleUpdateStatus(saved, 'abandon'); }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      background: saved.status === 'abandon' ? '#ef4444' : 'var(--bg-surface-elevated)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✗ ABANDON
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && planDef && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                      <strong>Sequence: </strong>{planDef.sequence.join(' → ')}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                      <strong>Dismissal Routes: </strong>{planDef.dismissalRoutes.join(' • ')}
                    </div>

                    {saved.captainNotes && (
                      <div style={{ background: 'var(--bg-surface-elevated)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                        <strong>Captain Note: </strong>{saved.captainNotes}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface-elevated)', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        FIELD: {preset.name}
                      </span>
                      <TacticalFieldPreview positions={saved.positions} batterHand={activeBatter.battingHand} width={80} height={80} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
