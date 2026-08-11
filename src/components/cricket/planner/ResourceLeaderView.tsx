import React from 'react';
import type { AllocationResourceAssignment, Player, TrainingResource } from '../../../types/cricket';
import { Clock, ShieldAlert, Target, User } from 'lucide-react';

interface ResourceLeaderViewProps {
  assignment: AllocationResourceAssignment;
  resourceDef?: TrainingResource;
  players: Player[];
  blockTitle: string;
  blockTimeStr: string;
  onPlayerClick?: (player: Player) => void;
}

export const ResourceLeaderView: React.FC<ResourceLeaderViewProps> = ({
  assignment,
  resourceDef,
  players,
  blockTitle,
  blockTimeStr,
  onPlayerClick
}) => {
  const getPlayer = (id: string) => players.find(p => p.id === id);

  const batters = assignment.batterPlayerIds.map(getPlayer).filter(Boolean) as Player[];
  const bowlers = assignment.bowlerPodPlayerIds.map(getPlayer).filter(Boolean) as Player[];
  const keepers = assignment.wicketkeeperPlayerIds.map(getPlayer).filter(Boolean) as Player[];
  const feeders = assignment.feederPlayerIds.map(getPlayer).filter(Boolean) as Player[];
  const fielders = assignment.fieldingPlayerIds.map(getPlayer).filter(Boolean) as Player[];
  const leader = assignment.leaderId ? getPlayer(assignment.leaderId) : null;

  return (
    <div className="card" style={{ padding: '16px', borderLeft: '6px solid var(--accent-gold)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>RESOURCE LEADER VIEW</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>{assignment.resourceName}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{blockTitle}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> {blockTimeStr}
          </div>
        </div>
      </div>

      {leader && (
        <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={14} /> Assigned Leader / Coach: {leader.name}
        </div>
      )}

      {/* Safety / Equipment Notes */}
      {resourceDef?.safetyNotes && (
        <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.3)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#f97316', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={14} />
          <span>Safety: {resourceDef.safetyNotes}</span>
        </div>
      )}

      {/* Priority Matchup Alert if active */}
      {assignment.priorityMatchups && assignment.priorityMatchups.length > 0 && (
        <div style={{ background: 'rgba(229, 169, 60, 0.15)', border: '1px solid var(--border-gold)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Target size={14} /> ACTIVE PRIORITY MATCHUP
          </div>
          {assignment.priorityMatchups.map(m => {
            const batter = getPlayer(m.batterPlayerId);
            return (
              <div key={m.id} style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '4px' }}>
                Batter: <strong>{batter?.name}</strong> facing <strong>{m.targetBowlerStyleOrId.replace(/_/g, ' ')}</strong> ({m.durationMinutes} mins)
              </div>
            );
          })}
        </div>
      )}

      {/* Centre Wicket Scenario details if applicable */}
      {assignment.centreWicketScenario && (
        <div style={{ background: 'rgba(96, 165, 250, 0.12)', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60a5fa' }}>
            🎯 {assignment.centreWicketScenario.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px' }}>
            Target: <strong>{assignment.centreWicketScenario.targetRuns} runs</strong> off <strong>{assignment.centreWicketScenario.targetOversOrBalls} balls</strong> ({assignment.centreWicketScenario.wicketsRemaining} wickets in hand)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Role Breakdown: {assignment.centreWicketScenario.assignments.length} assigned participants on field.
          </div>
        </div>
      )}

      {/* Batters */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px' }}>
          BATTERS ({batters.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {batters.map(p => (
            <button
              key={p.id}
              onClick={() => onPlayerClick && onPlayerClick(p)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-gold)',
                background: 'rgba(229, 169, 60, 0.2)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🏏 {p.name} ({p.battingHand.toUpperCase()[0]}HB)
            </button>
          ))}
        </div>
      </div>

      {/* Bowlers */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', marginBottom: '6px' }}>
          BOWLING POD ({bowlers.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {bowlers.map(p => (
            <button
              key={p.id}
              onClick={() => onPlayerClick && onPlayerClick(p)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                background: 'rgba(96, 165, 250, 0.15)',
                color: '#fff',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ⚾ {p.name} ({p.bowlingStyle.replace(/_/g, ' ')})
            </button>
          ))}
        </div>
      </div>

      {/* Keepers, Feeders, Fielders */}
      {(keepers.length > 0 || feeders.length > 0 || fielders.length > 0) && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {keepers.length > 0 && (
            <div>🧤 Wicketkeeper: <strong>{keepers.map(k => k.name).join(', ')}</strong></div>
          )}
          {feeders.length > 0 && (
            <div>⚙️ Feeder: <strong>{feeders.map(f => f.name).join(', ')}</strong></div>
          )}
          {fielders.length > 0 && (
            <div>🏃 Fielders ({fielders.length}): <strong>{fielders.map(f => f.name).join(', ')}</strong></div>
          )}
        </div>
      )}
    </div>
  );
};
