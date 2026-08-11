import React, { useState } from 'react';
import type { Player, CentreWicketScenario, CentreWicketRoleAssignment } from '../../../types/cricket';
import { Target, Users, Check } from 'lucide-react';

interface CentreWicketScenarioBuilderProps {
  attendingPlayers: Player[];
  scenario?: CentreWicketScenario;
  onSaveScenario: (scenario: CentreWicketScenario) => void;
  onClose?: () => void;
}

export const CentreWicketScenarioBuilder: React.FC<CentreWicketScenarioBuilderProps> = ({
  attendingPlayers,
  scenario,
  onSaveScenario,
  onClose
}) => {
  const [name, setName] = useState<string>(scenario?.name || 'Middle Overs Chase (42 from 36 balls)');
  const [targetRuns, setTargetRuns] = useState<number>(scenario?.targetRuns || 42);
  const [targetOversOrBalls, setTargetOversOrBalls] = useState<number>(scenario?.targetOversOrBalls || 36);
  const [wicketsRemaining, setWicketsRemaining] = useState<number>(scenario?.wicketsRemaining || 4);

  // Selected batters (pair 1)
  const [batter1Id, setBatter1Id] = useState<string>(
    scenario?.battingPairs[0]?.pairPlayerIds[0] || attendingPlayers[0]?.id || ''
  );
  const [batter2Id, setBatter2Id] = useState<string>(
    scenario?.battingPairs[0]?.pairPlayerIds[1] || attendingPlayers[1]?.id || ''
  );

  // Wicketkeeper
  const [keeperId, setKeeperId] = useState<string>(
    scenario?.wicketkeeperId || attendingPlayers.find(p => p.wicketkeepingCapability !== 'none')?.id || attendingPlayers[2]?.id || ''
  );

  // Leader
  const [leaderId, setLeaderId] = useState<string>(scenario?.namedLeaderId || attendingPlayers[0]?.id || '');

  // Bowlers (up to 4)
  const [bowlerIds, setBowlerIds] = useState<string[]>(
    scenario?.bowlingSpells.map(s => s.bowlerPlayerId) ||
    attendingPlayers.filter(p => p.bowlingStyle !== 'does_not_bowl' && p.id !== batter1Id && p.id !== batter2Id).slice(0, 4).map(p => p.id)
  );

  const toggleBowler = (id: string) => {
    if (bowlerIds.includes(id)) {
      setBowlerIds(bowlerIds.filter(b => b !== id));
    } else {
      if (bowlerIds.length >= 6) return;
      setBowlerIds([...bowlerIds, id]);
    }
  };

  const handleSave = () => {
    if (!batter1Id || !batter2Id) return;

    const assignedIds = new Set<string>([batter1Id, batter2Id, keeperId, ...bowlerIds]);

    const assignments: CentreWicketRoleAssignment[] = [
      { playerId: batter1Id, role: 'batter' },
      { playerId: batter2Id, role: 'batter' }
    ];

    if (keeperId) {
      assignments.push({ playerId: keeperId, role: 'wicketkeeper' });
    }

    bowlerIds.forEach(bId => {
      assignments.push({ playerId: bId, role: 'bowler' });
    });

    // Assign remaining participants to fielding positions so 100% have a role!
    const fielders = attendingPlayers.filter(p => !assignedIds.has(p.id));
    fielders.forEach((f, idx) => {
      let role: CentreWicketRoleAssignment['role'] = 'ring_fielder';
      if (idx === 0) role = 'close_fielder';
      else if (idx === 1) role = 'next_bowler';
      else if (idx === 2 || idx === 3) role = 'next_batting_pair';
      else if (idx >= 6) role = 'boundary_fielder';
      assignments.push({ playerId: f.id, role });
    });

    const newScenario: CentreWicketScenario = {
      scenarioId: scenario?.scenarioId || `cw-scen-${Date.now()}`,
      name,
      targetRuns,
      targetOversOrBalls,
      wicketsRemaining,
      battingPairs: [
        {
          pairPlayerIds: [batter1Id, batter2Id],
          allocatedOversOrBalls: Math.ceil(targetOversOrBalls / 6)
        }
      ],
      bowlingSpells: bowlerIds.map(bId => ({ bowlerPlayerId: bId, oversOrDeliveries: 1 })),
      wicketkeeperId: keeperId,
      namedLeaderId: leaderId,
      assignments
    };

    onSaveScenario(newScenario);
    if (onClose) onClose();
  };

  return (
    <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-gold)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={18} /> Centre-Wicket Scenario Builder
        </h3>
        {onClose && (
          <button onClick={onClose} className="btn btn-secondary" style={{ width: 'auto', height: '30px', fontSize: '0.75rem' }}>
            Cancel
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SCENARIO TITLE</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TARGET RUNS</label>
            <input
              type="number"
              value={targetRuns}
              onChange={e => setTargetRuns(Number(e.target.value))}
              style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BALLS / OVERS</label>
            <input
              type="number"
              value={targetOversOrBalls}
              onChange={e => setTargetOversOrBalls(Number(e.target.value))}
              style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WICKETS LEFT</label>
            <input
              type="number"
              value={wicketsRemaining}
              onChange={e => setWicketsRemaining(Number(e.target.value))}
              style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            />
          </div>
        </div>

        {/* Batting Pair Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>BATTER 1</label>
            <select
              value={batter1Id}
              onChange={e => setBatter1Id(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            >
              {attendingPlayers.filter(p => p.id !== batter2Id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>BATTER 2</label>
            <select
              value={batter2Id}
              onChange={e => setBatter2Id(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            >
              {attendingPlayers.filter(p => p.id !== batter1Id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Wicketkeeper & Named Leader */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WICKETKEEPER</label>
            <select
              value={keeperId}
              onChange={e => setKeeperId(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            >
              {attendingPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.wicketkeepingCapability !== 'none' ? ' (Keeper)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NAMED LEADER / COACH</label>
            <select
              value={leaderId}
              onChange={e => setLeaderId(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
            >
              {attendingPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bowling Spells Selector */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', marginBottom: '6px', display: 'block' }}>
            BOWLING SPELLS (Select 2 to 6 Bowlers)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {attendingPlayers.filter(p => p.id !== batter1Id && p.id !== batter2Id).map(p => {
              const isSelected = bowlerIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleBowler(p.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #60a5fa' : '1px solid var(--border-light)',
                    background: isSelected ? 'rgba(96, 165, 250, 0.2)' : 'var(--bg-surface-elevated)',
                    color: isSelected ? '#60a5fa' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isSelected ? '✓ ' : '+ '}{p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Coverage Guarantee Indicator */}
        <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} color="var(--primary-green-light)" />
          <span>Every assigned participant ({attendingPlayers.length} total) will receive an explicit role (batter, bowler, keeper, close/ring/boundary fielder, next up, rest).</span>
        </div>

        <button className="btn btn-gold" onClick={handleSave} style={{ marginTop: '8px' }}>
          <Check size={16} /> SAVE CENTRE-WICKET SCENARIO
        </button>
      </div>
    </div>
  );
};
