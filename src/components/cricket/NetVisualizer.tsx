// Net Visualizer Component showing active lanes, assigned players and utilization warnings

import React from 'react';
import type { RotationPlan, NetLane, Player } from '../../types/cricket';
import { Users, AlertTriangle } from 'lucide-react';
import { getRoleBadgeLabel, getBowlingStyleLabel } from '../../modules/cricket/taxonomy';

interface NetVisualizerProps {
  rotationPlan: RotationPlan;
  netLanes: NetLane[];
  players: Player[];
  onPlayerClick?: (player: Player) => void;
  onEditLane?: (laneId: string) => void;
}

export const NetVisualizer: React.FC<NetVisualizerProps> = ({
  rotationPlan,
  netLanes,
  players,
  onPlayerClick
}) => {
  const getPlayer = (id: string) => players.find(p => p.id === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {rotationPlan.lanes.map((laneAssign, idx) => {
        const laneDef = netLanes.find(l => l.id === laneAssign.laneId) || netLanes[idx];
        const batters = laneAssign.batterPlayerIds.map(getPlayer).filter(Boolean) as Player[];
        const bowlers = laneAssign.bowlerPlayerIds.map(getPlayer).filter(Boolean) as Player[];
        const keepers = laneAssign.keeperPlayerIds.map(getPlayer).filter(Boolean) as Player[];
        const feeders = laneAssign.feederPlayerIds.map(getPlayer).filter(Boolean) as Player[];

        return (
          <div key={laneAssign.laneId || idx} className="card" style={{ borderLeft: '4px solid var(--primary-green-light)', padding: '12px' }}>
            <div className="card-title" style={{ fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>NET {idx + 1}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{laneAssign.laneObjective}</span>
              </div>
              {laneAssign.coachAssigned && (
                <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                  Coach: {laneAssign.coachAssigned}
                </span>
              )}
            </div>

            {/* Batters Row */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>
                BATTERS ({batters.length}/{laneDef?.maxBatters || 2})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {batters.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onPlayerClick && onPlayerClick(p)}
                    style={{
                      background: 'rgba(229, 169, 60, 0.15)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({p.battingHand.toUpperCase()[0]}HB)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bowlers Row */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>
                BOWLERS ({bowlers.length}/{laneDef?.maxBowlers || 4})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {bowlers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onPlayerClick && onPlayerClick(p)}
                    style={{
                      background: 'rgba(96, 165, 250, 0.12)',
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {p.name}
                    <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.7 }}>
                      {getBowlingStyleLabel(p.bowlingStyle)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Keeper / Feeder if any */}
            {(keepers.length > 0 || feeders.length > 0) && (
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {keepers.length > 0 && <span>Keeper: <strong>{keepers.map(k => k.name).join(', ')}</strong> </span>}
                {feeders.length > 0 && <span>Feeder: <strong>{feeders.map(f => f.name).join(', ')}</strong></span>}
              </div>
            )}
          </div>
        );
      })}

      {/* Outfield / Unassigned Section */}
      {rotationPlan.outfieldPlayerIds.length > 0 && (
        <div className="card" style={{ background: 'rgba(38, 107, 87, 0.1)', border: '1px dashed var(--primary-green-light)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#4ade80' }}>
            <Users size={16} />
            OUTFIELD FIELDING & HIGH CATCHING POD ({rotationPlan.outfieldPlayerIds.length} players)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {rotationPlan.outfieldPlayerIds.map(id => {
              const p = getPlayer(id);
              if (!p) return null;
              return (
                <span key={p.id} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  {p.name} ({getRoleBadgeLabel(p.primaryRole)})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts */}
      {rotationPlan.alerts && rotationPlan.alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rotationPlan.alerts.map((alert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#f97316', background: 'var(--status-warning-bg)', padding: '6px 10px', borderRadius: '6px' }}>
              <AlertTriangle size={14} />
              {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
