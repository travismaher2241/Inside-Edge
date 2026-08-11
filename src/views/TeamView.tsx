// Team Roster & Player Development View for Inside Edge (Supports FR-002 & FR-013)

import React, { useState } from 'react';
import type { Player, DevelopmentFocus, Observation, DevelopmentDomain, FocusState, PrimaryRole, BowlingStyle, TrainingSession } from '../types/cricket';
import { getRoleBadgeLabel, getBowlingStyleLabel, DEVELOPMENT_DOMAINS, FOCUS_STATES } from '../modules/cricket/taxonomy';
import { ShieldAlert, Plus, X, Check } from 'lucide-react';
import { BowlingProfileEditor } from '../components/cricket/tactics/BowlingProfileEditor';
import { StorageEngine } from '../storage/db';

interface TeamViewProps {
  players: Player[];
  focuses: DevelopmentFocus[];
  observations: Observation[];
  session?: TrainingSession;
  onUpdateSession?: (session: TrainingSession) => void;
  onOpenQuickObservation: (player: Player) => void;
  onAddDevelopmentFocus: (focus: DevelopmentFocus) => void;
  onUpdateDevelopmentFocusState: (focusId: string, newState: FocusState) => void;
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer?: (player: Player) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  players,
  focuses,
  observations,
  session,
  onUpdateSession,
  onOpenQuickObservation,
  onAddDevelopmentFocus,
  onUpdateDevelopmentFocusState,
  onAddPlayer,
  onUpdatePlayer
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(players[0] || null);

  const [isAddFocusOpen, setIsAddFocusOpen] = useState<boolean>(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState<boolean>(false);

  const [focusDomain, setFocusDomain] = useState<DevelopmentDomain>('Batting');
  const [focusStatement, setFocusStatement] = useState<string>('');
  const [focusWhy, setFocusWhy] = useState<string>('');

  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPrimaryRole, setNewPrimaryRole] = useState<PrimaryRole>('top_order_batter');
  const [newBowlingStyle, setNewBowlingStyle] = useState<BowlingStyle>('does_not_bowl');
  const [newBattingHand, setNewBattingHand] = useState<'right' | 'left'>('right');

  const playerFocuses = selectedPlayer
    ? focuses.filter(f => f.playerId === selectedPlayer.id)
    : [];

  const playerObservations = selectedPlayer
    ? observations.filter(o => o.playerId === selectedPlayer.id)
    : [];

  const handleCreateFocus = () => {
    if (!selectedPlayer || !focusStatement) return;
    const newFocus: DevelopmentFocus = {
      id: `focus-${Date.now()}`,
      playerId: selectedPlayer.id,
      domain: focusDomain,
      focusStatement,
      state: 'Current Focus',
      why: focusWhy || 'Identified by coach during training',
      startDate: new Date().toISOString().split('T')[0],
      reviewDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      evidenceObservationIds: [],
      coachSummary: 'Initial focus created.'
    };
    onAddDevelopmentFocus(newFocus);
    setFocusStatement('');
    setFocusWhy('');
    setIsAddFocusOpen(false);
  };

  const handleCreatePlayer = () => {
    if (!newPlayerName) return;
    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: newPlayerName,
      preferredName: newPlayerName.split(' ')[0],
      primaryRole: newPrimaryRole,
      secondaryRole: 'none',
      battingHand: newBattingHand,
      bowlingStyle: newBowlingStyle,
      wicketkeepingCapability: 'none',
      trainingAvailability: true,
      activeDevelopmentFocusIds: []
    };
    onAddPlayer(newPlayer);
    setSelectedPlayer(newPlayer);
    setNewPlayerName('');
    setIsAddPlayerOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Add Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>SQUAD & DEVELOPMENT</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Squad Roster ({players.length})</h1>
        </div>
        <button className="btn btn-gold" onClick={() => setIsAddPlayerOpen(true)} style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
          <Plus size={16} /> ADD PLAYER
        </button>
      </div>

      {/* Player Horizontal Scroll List */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayer(p)}
            style={{
              minWidth: '100px',
              padding: '10px',
              borderRadius: '10px',
              border: selectedPlayer?.id === p.id ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
              background: selectedPlayer?.id === p.id ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
              color: selectedPlayer?.id === p.id ? 'var(--accent-gold)' : 'var(--text-main)',
              textAlign: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.preferredName || p.name.split(' ')[0]}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {getRoleBadgeLabel(p.primaryRole)}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Player Detail Card */}
      {selectedPlayer && (
        <div className="card" style={{ borderLeft: '4px solid var(--primary-green-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedPlayer.name}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-gold">{getRoleBadgeLabel(selectedPlayer.primaryRole)}</span>
                <span className="badge badge-green">{selectedPlayer.battingHand.toUpperCase()[0]}HB</span>
                <span className="badge badge-gold">{getBowlingStyleLabel(selectedPlayer.bowlingStyle)}</span>
                {session && onUpdateSession && (
                  <button
                    onClick={() => {
                      const currentExpected = session.expectedPlayerIds || [];
                      const isAvailable = currentExpected.includes(selectedPlayer.id);
                      const updatedExpected = isAvailable
                        ? currentExpected.filter((id: string) => id !== selectedPlayer.id)
                        : [...currentExpected, selectedPlayer.id];
                      onUpdateSession({
                        ...session,
                        expectedPlayerIds: updatedExpected
                      });
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span className={`badge ${(session.expectedPlayerIds || []).includes(selectedPlayer.id) ? 'badge-green' : 'badge-warning'}`} style={{ cursor: 'pointer' }}>
                      Session: {(session.expectedPlayerIds || []).includes(selectedPlayer.id) ? '✓ Available' : '✗ Absent'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <button className="btn btn-secondary" onClick={() => onOpenQuickObservation(selectedPlayer)} style={{ width: 'auto', height: '36px', fontSize: '0.75rem' }}>
              + OBSERVE
            </button>
          </div>

          {/* Workload Warning if restricted */}
          {selectedPlayer.workloadRestriction?.restrictedBowler && (
            <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.3)', padding: '8px 12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} />
              <span>{selectedPlayer.workloadRestriction.notes}</span>
            </div>
          )}

          {/* Bowling Tactical Profile Section */}
          <BowlingProfileEditor
            player={selectedPlayer}
            onSavePlayer={updated => {
              StorageEngine.updatePlayer(updated);
              setSelectedPlayer(updated);
              if (onUpdatePlayer) onUpdatePlayer(updated);
            }}
          />

          {/* Active Development Focus Section (FR-013) */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>DEVELOPMENT FOCUSES</span>
              <button
                onClick={() => setIsAddFocusOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> NEW FOCUS
              </button>
            </div>

            {playerFocuses.length > 0 ? (
              playerFocuses.map(f => (
                <div key={f.id} style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-gold">[{f.domain}]</span>
                    {/* State Transition Selector */}
                    <select
                      value={f.state}
                      onChange={e => onUpdateDevelopmentFocusState(f.id, e.target.value as FocusState)}
                      style={{
                        background: 'var(--bg-surface-card)',
                        border: '1px solid var(--border-gold)',
                        color: 'var(--accent-gold)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {FOCUS_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '6px' }}>{f.focusStatement}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Why: {f.why}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                No active development focus set for {selectedPlayer.name}.
              </div>
            )}
          </div>

          {/* Player Observation History Timeline */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px' }}>
              OBSERVATION EVIDENCE TIMELINE ({playerObservations.length})
            </div>

            {playerObservations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {playerObservations.map(obs => (
                  <div key={obs.id} style={{ background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                      <span className="badge badge-green">{obs.tag} ({obs.source.toUpperCase()})</span>
                      <span>{new Date(obs.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div style={{ marginTop: '4px', fontWeight: 600 }}>{obs.textNote}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No observations recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Add Focus Modal */}
      {isAddFocusOpen && selectedPlayer && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddFocusOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create Focus: {selectedPlayer.name}</div>
              <button onClick={() => setIsAddFocusOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DOMAIN</label>
              <select
                value={focusDomain}
                onChange={e => setFocusDomain(e.target.value as DevelopmentDomain)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              >
                {DEVELOPMENT_DOMAINS.map(d => (
                  <option key={d.domain} value={d.domain}>{d.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>FOCUS STATEMENT</label>
              <input
                type="text"
                placeholder="e.g. Leave corridor decision outside off stump"
                value={focusStatement}
                onChange={e => setFocusStatement(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WHY (REASON / EVIDENCE)</label>
              <input
                type="text"
                placeholder="e.g. Dismissed 3 times driving away from body"
                value={focusWhy}
                onChange={e => setFocusWhy(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <button className="btn btn-gold" onClick={handleCreateFocus}>
              <Check size={16} /> SAVE DEVELOPMENT FOCUS
            </button>
          </div>
        </div>
      )}

      {/* Add Player Modal (FR-002) */}
      {isAddPlayerOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddPlayerOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Squad Player</div>
              <button onClick={() => setIsAddPlayerOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PLAYER NAME</label>
              <input
                type="text"
                placeholder="e.g. Travis Head"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTING HAND</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => setNewBattingHand('right')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: newBattingHand === 'right' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: newBattingHand === 'right' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                    color: newBattingHand === 'right' ? 'var(--accent-gold)' : '#fff',
                    fontWeight: 700
                  }}
                >
                  RIGHT HAND
                </button>
                <button
                  onClick={() => setNewBattingHand('left')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: newBattingHand === 'left' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: newBattingHand === 'left' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                    color: newBattingHand === 'left' ? 'var(--accent-gold)' : '#fff',
                    fontWeight: 700
                  }}
                >
                  LEFT HAND
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PRIMARY CRICKET ROLE</label>
              <select
                value={newPrimaryRole}
                onChange={e => setNewPrimaryRole(e.target.value as PrimaryRole)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              >
                <option value="top_order_batter">Top Order Batter</option>
                <option value="middle_order_batter">Middle Order Batter</option>
                <option value="all_rounder">All Rounder</option>
                <option value="pace_bowler">Pace Bowler</option>
                <option value="spin_bowler">Spin Bowler</option>
                <option value="wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BOWLING STYLE</label>
              <select
                value={newBowlingStyle}
                onChange={e => setNewBowlingStyle(e.target.value as BowlingStyle)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              >
                <option value="does_not_bowl">Does Not Bowl</option>
                <option value="right_arm_fast_medium">Right Arm Fast Medium</option>
                <option value="right_arm_off_spin">Right Arm Off Spin</option>
                <option value="right_arm_leg_spin">Right Arm Leg Spin</option>
                <option value="left_arm_fast_medium">Left Arm Fast Medium</option>
                <option value="left_arm_orthodox">Left Arm Orthodox Spin</option>
              </select>
            </div>

            <button className="btn btn-gold" onClick={handleCreatePlayer}>
              <Check size={16} /> ADD PLAYER TO SQUAD
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
