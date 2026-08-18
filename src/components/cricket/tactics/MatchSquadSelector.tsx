import React, { useState, useEffect } from 'react';
import type { Player, MatchSquad } from '../../../types/cricket';
import { getRoleBadgeLabel, getBowlingStyleLabel } from '../../../modules/cricket/taxonomy';
import { CheckCircle2, ShieldAlert, AlertTriangle, Save } from 'lucide-react';

interface MatchSquadSelectorProps {
  matchId: string;
  players: Player[];
  savedSquad?: MatchSquad;
  onSaveSquad: (squad: MatchSquad) => void;
}

export const MatchSquadSelector: React.FC<MatchSquadSelectorProps> = ({
  matchId,
  players,
  savedSquad,
  onSaveSquad,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keeperId, setKeeperId] = useState<string>('');

  useEffect(() => {
    if (savedSquad && savedSquad.selectedPlayerIds.length === 11) {
      setSelectedIds(savedSquad.selectedPlayerIds);
      setKeeperId(savedSquad.wicketkeeperId || '');
    } else {
      // Pre-select up to first 11 available players
      const initial11 = players.slice(0, 11).map(p => p.id);
      setSelectedIds(initial11);
      const defaultKeeper = players.find(p => p.primaryRole === 'wicketkeeper' || p.wicketkeepingCapability !== 'none');
      setKeeperId(defaultKeeper ? defaultKeeper.id : initial11[0] || '');
    }
  }, [matchId, savedSquad, players]);

  const togglePlayerSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(pId => pId !== id);
        if (keeperId === id) {
          setKeeperId('');
        }
        return next;
      }
      if (prev.length >= 11) return prev;
      return [...prev, id];
    });
  };

  const isKeeperInSelectedXI = selectedIds.includes(keeperId);
  const isSquadComplete = selectedIds.length === 11;
  const hasKeeperWarning = !keeperId || !isKeeperInSelectedXI;

  const handleSave = () => {
    if (selectedIds.length !== 11) return;
    onSaveSquad({
      matchId,
      selectedPlayerIds: selectedIds,
      wicketkeeperId: keeperId,
    });
  };

  const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
  const bowlersInXI = selectedPlayers.filter(p => p.bowlingStyle !== 'does_not_bowl');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Status */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div className="flex-between">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>STAGE 1: PLAYING XI SELECTION</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              Selected Playing XI ({selectedIds.length}/11)
            </h2>
          </div>
          <span className={`badge ${isSquadComplete ? 'badge-green' : 'badge-gold'}`}>
            {isSquadComplete ? '11 SELECTED' : `SELECT ${11 - selectedIds.length} MORE`}
          </span>
        </div>

        {/* Warnings */}
        {hasKeeperWarning && (
          <div style={{ background: 'rgba(231, 111, 81, 0.15)', border: '1px solid #f97316', padding: '10px 12px', borderRadius: '8px', marginTop: '12px', color: '#f97316', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>Warning: The selected XI lacks an assigned Wicketkeeper in the 11.</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Available Bowlers: </span>
            <span style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>{bowlersInXI.length}</span>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Designated Keeper: </span>
            <span style={{ fontWeight: 800, color: '#fff' }}>
              {players.find(p => p.id === keeperId)?.name || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Wicketkeeper Designation Dropdown */}
      <div className="card" style={{ padding: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>DESIGNATE WICKETKEEPER FOR MATCH</label>
        <select
          value={keeperId}
          onChange={e => setKeeperId(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.85rem' }}
        >
          <option value="">-- Select Wicketkeeper from XI --</option>
          {selectedPlayers.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({getRoleBadgeLabel(p.primaryRole)}) {p.wicketkeepingCapability !== 'none' ? `[WK: ${p.wicketkeepingCapability}]` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Player Selection Roster Grid */}
      <div className="card">
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <span>SQUAD ROSTER SELECTION ({players.length})</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tap player to toggle in/out of XI</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginTop: '10px' }}>
          {players.map(p => {
            const isSelected = selectedIds.includes(p.id);
            const isKeeper = keeperId === p.id;
            const hasRestriction = p.workloadRestriction?.restrictedBowler;

            return (
              <div
                key={p.id}
                onClick={() => togglePlayerSelection(p.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                  background: isSelected ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative'
                }}
              >
                <div className="flex-between">
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? 'var(--accent-gold)' : '#fff' }}>
                    {p.name}
                  </div>
                  {isSelected && <CheckCircle2 size={16} color="var(--accent-gold)" />}
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{getRoleBadgeLabel(p.primaryRole)}</span>
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{getBowlingStyleLabel(p.bowlingStyle)}</span>
                  {isKeeper && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>🧤 KEEPER</span>}
                </div>

                {/* Workload Warning */}
                {hasRestriction && (
                  <div style={{ fontSize: '0.7rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <ShieldAlert size={12} />
                    <span>{p.workloadRestriction?.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          className="btn btn-gold"
          onClick={handleSave}
          disabled={!isSquadComplete}
          style={{ marginTop: '16px', opacity: isSquadComplete ? 1 : 0.5 }}
        >
          <Save size={16} /> CONFIRM MATCH SQUAD ({selectedIds.length}/11)
        </button>
      </div>
    </div>
  );
};
