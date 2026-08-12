// Team Roster & Player Profile View for Inside Edge (Supports Team vs Club Context)
import React, { useState } from 'react';
import type { Player, DevelopmentFocus, Observation, DevelopmentDomain, FocusLifecycleState, PrimaryRole, BowlingStyle, ClubTrainingSession, ClubTeam, ActiveScope } from '../types/cricket';
import { getRoleBadgeLabel, DEVELOPMENT_DOMAINS, FOCUS_STATES } from '../modules/cricket/taxonomy';
import { getPlayersForScope, groupPlayersByTeam } from '../modules/cricket/scopeHelpers';
import { Plus, X, Check, ChevronRight, ArrowLeft, ShieldAlert, Filter, Search, ChevronLeft, MessageSquare, Users, Shield } from 'lucide-react';
import { BowlingProfileEditor } from '../components/cricket/tactics/BowlingProfileEditor';
import { StorageEngine } from '../storage/db';

interface TeamViewProps {
  players: Player[];
  clubTeams?: ClubTeam[];
  activeScope?: ActiveScope;
  focuses: DevelopmentFocus[];
  observations: Observation[];
  session?: ClubTrainingSession;
  onUpdateSession?: (session: ClubTrainingSession) => void;
  onOpenQuickObservation: (player: Player) => void;
  onAddDevelopmentFocus: (focus: DevelopmentFocus) => void;
  onUpdateDevelopmentFocusState: (focusId: string, newState: FocusLifecycleState) => void;
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer?: (player: Player) => void;
}

const ROLES: Array<{ value: PrimaryRole | 'all'; label: string }> = [
  { value: 'all', label: 'All roles' },
  { value: 'top_order_batter', label: 'Top-order batter' },
  { value: 'middle_order_batter', label: 'Middle-order batter' },
  { value: 'all_rounder', label: 'All-rounder' },
  { value: 'pace_bowler', label: 'Pace bowler' },
  { value: 'spin_bowler', label: 'Spin bowler' },
  { value: 'wicketkeeper', label: 'Wicketkeeper' }
];

export const TeamView: React.FC<TeamViewProps> = ({
  players,
  clubTeams = [],
  activeScope = { mode: 'team', teamId: 'ct-1' },
  focuses,
  observations,
  session: _session,
  onUpdateSession: _onUpdateSession,
  onOpenQuickObservation,
  onAddDevelopmentFocus,
  onUpdateDevelopmentFocusState,
  onAddPlayer,
  onUpdatePlayer
}) => {
  // Drilled Team inside Club View (if user tapped a team in Club View)
  const [drilledTeamId, setDrilledTeamId] = useState<string | null>(null);

  // Level 1 vs Level 2 View State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'development' | 'observations' | 'skills'>('overview');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<PrimaryRole | 'all'>('all');
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState<boolean>(false);

  // Modals
  const [isAddFocusOpen, setIsAddFocusOpen] = useState<boolean>(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState<boolean>(false);
  const [isTeamTransferOpen, setIsTeamTransferOpen] = useState<boolean>(false);

  // Focus Form State
  const [focusDomain, setFocusDomain] = useState<DevelopmentDomain>('Batting');
  const [focusStatement, setFocusStatement] = useState<string>('');
  const [focusWhy, setFocusWhy] = useState<string>('');

  // Add Player Form State
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPrimaryRole, setNewPrimaryRole] = useState<PrimaryRole>('top_order_batter');
  const [newBowlingStyle, setNewBowlingStyle] = useState<BowlingStyle>('does_not_bowl');
  const [newBattingHand, setNewBattingHand] = useState<'right' | 'left'>('right');

  // Effective working scope: if user drilled into a specific team in Club view, use that teamId
  const effectiveScope: ActiveScope = drilledTeamId
    ? { mode: 'team', teamId: drilledTeamId }
    : activeScope;

  const isClubView = activeScope.mode === 'club' && !drilledTeamId && !searchQuery.trim();

  // Players filtered by current team or global scope
  const scopePlayers = getPlayersForScope(players, effectiveScope);

  const visiblePlayers = scopePlayers.filter(player =>
    (roleFilter === 'all' || player.primaryRole === roleFilter) &&
    (!searchQuery.trim() || `${player.name} ${player.preferredName || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  // Club View Team Groupings
  const clubTeamGroups = groupPlayersByTeam(clubTeams, players);

  // Selected Player Related Data
  const playerFocuses = selectedPlayer
    ? focuses.filter(f => f.playerId === selectedPlayer.id)
    : [];

  const playerObservations = selectedPlayer
    ? observations.filter(o => o.playerId === selectedPlayer.id)
    : [];

  // Prev / Next Player Navigation inside Profile
  const currentIdx = selectedPlayer ? visiblePlayers.findIndex(p => p.id === selectedPlayer.id) : -1;
  const prevPlayer = currentIdx > 0 ? visiblePlayers[currentIdx - 1] : null;
  const nextPlayer = currentIdx >= 0 && currentIdx < visiblePlayers.length - 1 ? visiblePlayers[currentIdx + 1] : null;

  const handleCreateFocus = () => {
    if (!selectedPlayer || !focusStatement) return;
    const now = new Date().toISOString();
    const newFocus: DevelopmentFocus = {
      id: `focus-${Date.now()}`,
      playerId: selectedPlayer.id,
      domain: focusDomain,
      focusStatement,
      state: 'CURRENT',
      why: focusWhy || 'Identified by coach during training',
      startDate: now.split('T')[0],
      reviewDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      history: [{ fromState: null, toState: 'CURRENT', changedAt: now, changedByUserId: 'coach_head_1' }],
      coachSummary: 'Initial focus created.',
      access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: false }
    };
    onAddDevelopmentFocus(newFocus);
    setFocusStatement('');
    setFocusWhy('');
    setIsAddFocusOpen(false);
  };

  const handleCreatePlayer = () => {
    if (!newPlayerName.trim()) return;
    const targetTeamId = effectiveScope.teamId || clubTeams[0]?.id || 'ct-1';
    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      preferredName: newPlayerName.trim().split(' ')[0],
      primaryTeamId: targetTeamId,
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

  const handleTransferTeam = (newTeamId: string) => {
    if (!selectedPlayer || !onUpdatePlayer) return;
    const updated = { ...selectedPlayer, primaryTeamId: newTeamId };
    onUpdatePlayer(updated);
    setSelectedPlayer(updated);
    setIsTeamTransferOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ========================================================= */}
      {/* CLUB CONTEXT VIEW (TEAMS FIRST) */}
      {/* ========================================================= */}
      {isClubView && !selectedPlayer && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={14} /> CLUB SQUADS
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
                {clubTeams.length} Teams · {players.length} Players
              </h1>
            </div>
            <button
              className="btn btn-gold"
              onClick={() => setIsAddPlayerOpen(true)}
              style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}
            >
              <Plus size={16} /> Add Player
            </button>
          </div>

          {/* Club-Wide Player Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="search"
              placeholder="Search all players across club..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '32px',
                minHeight: '40px',
                fontSize: '0.85rem'
              }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '16px', pointerEvents: 'none' }} />
          </div>

          {/* Teams Summary Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {clubTeamGroups.map(({ team, players: tPlayers, attentionCount }) => (
              <div
                key={team.id}
                className="card"
                onClick={() => setDrilledTeamId(team.id)}
                style={{ cursor: 'pointer', padding: '14px', background: 'var(--bg-surface-card)', marginBottom: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color="var(--accent-gold)" />
                      {team.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {tPlayers.length} player{tPlayers.length === 1 ? '' : 's'} · {team.gradeOrDivision || team.ageGroup}
                    </div>
                    {attentionCount > 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#f97316', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldAlert size={12} />
                        <span>{attentionCount} player{attentionCount === 1 ? '' : 's'} needing attention</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '4px' }}>
                        ✓ No current squad issues
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>{tPlayers.length} Players</span>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* TEAM CONTEXT VIEW OR DRILLED TEAM ROSTER */}
      {/* ========================================================= */}
      {(!isClubView || searchQuery.trim()) && !selectedPlayer && (
        <>
          {/* Header & Back Button if Drilled */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {drilledTeamId && (
                <button
                  onClick={() => setDrilledTeamId(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}
                >
                  <ArrowLeft size={14} /> Back to All Teams
                </button>
              )}
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {drilledTeamId ? (clubTeams.find(t => t.id === drilledTeamId)?.name || 'Team Roster') : 'Squad Roster'}
              </h1>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {visiblePlayers.length} players shown
              </div>
            </div>
            <button
              className="btn btn-gold"
              onClick={() => setIsAddPlayerOpen(true)}
              style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}
            >
              <Plus size={16} /> Add Player
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="search"
                placeholder={activeScope.mode === 'club' ? "Search all club players..." : "Search team players..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '32px',
                  minHeight: '40px',
                  fontSize: '0.85rem'
                }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '16px', pointerEvents: 'none' }} />
            </div>

            {roleFilter === 'all' ? (
              <button
                className="btn btn-secondary"
                onClick={() => setIsRoleSheetOpen(true)}
                style={{ width: 'auto', padding: '0 12px', height: '40px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <Filter size={14} /> All roles
              </button>
            ) : (
              <button
                className="btn btn-gold"
                onClick={() => setRoleFilter('all')}
                style={{ width: 'auto', padding: '0 10px', height: '40px', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Click to clear filter"
              >
                {ROLES.find(r => r.value === roleFilter)?.label} <X size={14} />
              </button>
            )}
          </div>

          {/* Roster List */}
          <div className="roster-list-container">
            {visiblePlayers.map(p => {
              const activeFocus = focuses.find(f => f.playerId === p.id && (f.state === 'CURRENT' || f.state === 'DEVELOPING'));
              const isRestricted = Boolean(p.workloadRestriction?.restrictedBowler);
              const playerTeam = clubTeams.find(t => t.id === p.primaryTeamId);

              return (
                <div
                  key={p.id}
                  className="roster-row-card"
                  onClick={() => {
                    setSelectedPlayer(p);
                    setProfileTab('overview');
                  }}
                >
                  <div className="roster-row-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="roster-row-name">{p.name}</div>
                      {activeScope.mode === 'club' && playerTeam && (
                        <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>{playerTeam.name}</span>
                      )}
                    </div>
                    <div className="roster-row-role">
                      {getRoleBadgeLabel(p.primaryRole)} · {p.battingHand.toUpperCase()[0]}HB
                    </div>

                    {isRestricted ? (
                      <div className="roster-row-note warning">
                        <ShieldAlert size={12} />
                        <span>{p.workloadRestriction?.notes || 'Workload restriction active'}</span>
                      </div>
                    ) : activeFocus ? (
                      <div className="roster-row-note focus">
                        <span>{activeFocus.domain} focus active</span>
                      </div>
                    ) : (
                      <div className="roster-row-note normal">
                        <span>No active coaching notes</span>
                      </div>
                    )}
                  </div>

                  <div className="roster-row-right">
                    <button
                      className="btn-mini-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQuickObservation(p);
                      }}
                      title="Quick Note"
                    >
                      + Note
                    </button>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}

            {visiblePlayers.length === 0 && (
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No players match these filters.
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* LEVEL 2: DEDICATED PLAYER PROFILE */}
      {/* ========================================================= */}
      {selectedPlayer && (
        <div className="player-profile-view">
          {/* Top Profile Navigation Bar */}
          <div className="player-profile-nav-bar">
            <button className="btn-back-squad" onClick={() => setSelectedPlayer(null)}>
              <ArrowLeft size={14} /> Back to Roster
            </button>

            {/* Prev / Next Player Switcher */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                disabled={!prevPlayer}
                onClick={() => prevPlayer && setSelectedPlayer(prevPlayer)}
                style={{ padding: '4px 8px', minHeight: '32px', height: '32px', fontSize: '0.75rem' }}
                title={prevPlayer ? `Previous: ${prevPlayer.name}` : ''}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentIdx + 1} / {visiblePlayers.length}
              </span>
              <button
                className="btn btn-secondary"
                disabled={!nextPlayer}
                onClick={() => nextPlayer && setSelectedPlayer(nextPlayer)}
                style={{ padding: '4px 8px', minHeight: '32px', height: '32px', fontSize: '0.75rem' }}
                title={nextPlayer ? `Next: ${nextPlayer.name}` : ''}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Profile Header Hero Card */}
          <div className="player-profile-header-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{selectedPlayer.name}</h2>
                  <button
                    onClick={() => setIsTeamTransferOpen(true)}
                    className="badge badge-gold"
                    style={{ cursor: 'pointer', border: 'none' }}
                    title="Change Primary Team"
                  >
                    {clubTeams.find(t => t.id === selectedPlayer.primaryTeamId)?.name || 'Senior Men'} ▾
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {getRoleBadgeLabel(selectedPlayer.primaryRole)} · {selectedPlayer.battingHand.toUpperCase()[0]}HB
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => onOpenQuickObservation(selectedPlayer)}
                  style={{ width: 'auto', height: '36px', fontSize: '0.75rem' }}
                >
                  <MessageSquare size={14} /> + Note
                </button>
              </div>
            </div>

            {/* Workload Warning Pill if restricted */}
            {selectedPlayer.workloadRestriction?.restrictedBowler && (
              <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.3)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} />
                <span>{selectedPlayer.workloadRestriction.notes || 'Bowling workload restriction active'}</span>
              </div>
            )}
          </div>

          {/* Profile Navigation Tabs */}
          <div className="player-profile-tabs">
            <button
              className={`player-profile-tab-btn ${profileTab === 'overview' ? 'active' : ''}`}
              onClick={() => setProfileTab('overview')}
            >
              OVERVIEW
            </button>
            <button
              className={`player-profile-tab-btn ${profileTab === 'development' ? 'active' : ''}`}
              onClick={() => setProfileTab('development')}
            >
              DEVELOPMENT ({playerFocuses.length})
            </button>
            <button
              className={`player-profile-tab-btn ${profileTab === 'observations' ? 'active' : ''}`}
              onClick={() => setProfileTab('observations')}
            >
              OBSERVATIONS ({playerObservations.length})
            </button>
            <button
              className={`player-profile-tab-btn ${profileTab === 'skills' ? 'active' : ''}`}
              onClick={() => setProfileTab('skills')}
            >
              SKILLS
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {profileTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  PRIMARY TEAM & MEMBERSHIP
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                  {clubTeams.find(t => t.id === selectedPlayer.primaryTeamId)?.name || 'Senior Men'}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsTeamTransferOpen(true)}
                  style={{ width: 'auto', height: '28px', fontSize: '0.72rem', marginTop: '6px' }}
                >
                  Transfer to another team
                </button>
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  CURRENT FOCUS
                </div>
                {playerFocuses.length > 0 ? (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{playerFocuses[0].focusStatement}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Why: {playerFocuses[0].why}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No active development focus set.</div>
                )}
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  RESTRICTIONS & WORKLOAD
                </div>
                {selectedPlayer.workloadRestriction?.restrictedBowler ? (
                  <div style={{ color: '#f97316', fontSize: '0.85rem', fontWeight: 700 }}>
                    ⚠ {selectedPlayer.workloadRestriction.notes || 'Bowling workload restriction active'}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>No active physical or bowling restrictions.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DEVELOPMENT */}
          {profileTab === 'development' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)' }}>DEVELOPMENT FOCUSES</span>
                <button
                  className="btn btn-gold"
                  onClick={() => setIsAddFocusOpen(true)}
                  style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem' }}
                >
                  <Plus size={14} /> Add Focus
                </button>
              </div>

              {playerFocuses.length > 0 ? (
                playerFocuses.map(f => (
                  <div key={f.id} className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-gold">[{f.domain}]</span>
                      <select
                        value={f.state}
                        onChange={e => onUpdateDevelopmentFocusState(f.id, e.target.value as FocusLifecycleState)}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-gold)',
                          color: 'var(--accent-gold)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          minHeight: '28px',
                          width: 'auto'
                        }}
                      >
                        {FOCUS_STATES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '8px' }}>{f.focusStatement}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Why: {f.why}</div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No development focuses recorded for {selectedPlayer.name}.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OBSERVATIONS */}
          {profileTab === 'observations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)' }}>OBSERVATIONS EVIDENCE</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => onOpenQuickObservation(selectedPlayer)}
                  style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem' }}
                >
                  <MessageSquare size={14} /> + Add Note
                </button>
              </div>

              {playerObservations.length > 0 ? (
                playerObservations.map(obs => (
                  <div key={obs.id} className="card" style={{ padding: '12px', background: 'var(--bg-surface-card)', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span className="badge badge-green">{obs.tags.join(', ')}</span>
                      <span>{new Date(obs.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{obs.textNote}</div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No observations recorded yet for {selectedPlayer.name}.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SKILLS */}
          {profileTab === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  BATTING & ROLE
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{selectedPlayer.battingHand === 'right' ? 'Right-Hand Batter (RHB)' : 'Left-Hand Batter (LHB)'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Primary role: {getRoleBadgeLabel(selectedPlayer.primaryRole)}
                </div>
              </div>

              {selectedPlayer.bowlingStyle !== 'does_not_bowl' ? (
                <BowlingProfileEditor
                  key={selectedPlayer.id}
                  player={selectedPlayer}
                  onSavePlayer={updated => {
                    StorageEngine.updatePlayer(updated);
                    setSelectedPlayer(updated);
                    if (onUpdatePlayer) onUpdatePlayer(updated);
                  }}
                />
              ) : (
                <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    BOWLING PROFILE
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Does not bowl</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Role Filter Sheet */}
      {isRoleSheetOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsRoleSheetOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>FILTER BY ROLE</h3>
              <button onClick={() => setIsRoleSheetOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {ROLES.map(role => (
                <button
                  key={role.value}
                  className={`role-filter-sheet-item ${roleFilter === role.value ? 'selected' : ''}`}
                  onClick={() => {
                    setRoleFilter(role.value);
                    setIsRoleSheetOpen(false);
                  }}
                >
                  <span>{role.label}</span>
                  {roleFilter === role.value && <Check size={16} color="var(--accent-gold)" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Focus Sheet */}
      {isAddFocusOpen && selectedPlayer && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddFocusOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="focus-dialog-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div id="focus-dialog-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                ADD DEVELOPMENT FOCUS
              </div>
              <button aria-label="Close dialog" onClick={() => setIsAddFocusOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>AREA</label>
              <select
                value={focusDomain}
                onChange={e => setFocusDomain(e.target.value as DevelopmentDomain)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              >
                {DEVELOPMENT_DOMAINS.map(d => (
                  <option key={d.domain} value={d.domain}>{d.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WHAT ARE WE WORKING ON?</label>
              <input
                type="text"
                placeholder="e.g. Decision-making outside off stump against seam"
                value={focusStatement}
                onChange={e => setFocusStatement(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WHY?</label>
              <input
                type="text"
                placeholder="e.g. 3 dismissals driving away from body in last 2 matches"
                value={focusWhy}
                onChange={e => setFocusWhy(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <button className="btn btn-gold" onClick={handleCreateFocus}>
              <Check size={16} /> Save Focus
            </button>
          </div>
        </div>
      )}

      {/* Add Player Sheet */}
      {isAddPlayerOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddPlayerOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-player-dialog-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div id="add-player-dialog-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Squad Player</div>
              <button aria-label="Close dialog" onClick={() => setIsAddPlayerOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PLAYER NAME</label>
              <input
                type="text"
                placeholder="e.g. Travis Head"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTING HAND</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
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
                  type="button"
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

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PRIMARY ROLE</label>
              <select
                value={newPrimaryRole}
                onChange={e => setNewPrimaryRole(e.target.value as PrimaryRole)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              >
                <option value="top_order_batter">Top Order Batter</option>
                <option value="middle_order_batter">Middle Order Batter</option>
                <option value="all_rounder">All Rounder</option>
                <option value="pace_bowler">Pace Bowler</option>
                <option value="spin_bowler">Spin Bowler</option>
                <option value="wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BOWLING STYLE</label>
              <select
                value={newBowlingStyle}
                onChange={e => setNewBowlingStyle(e.target.value as BowlingStyle)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
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
              <Check size={16} /> Add Player
            </button>
          </div>
        </div>
      )}

      {/* Team Transfer Modal */}
      {isTeamTransferOpen && selectedPlayer && (
        <div className="bottom-sheet-overlay" onClick={() => setIsTeamTransferOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '12px' }}>
              CHANGE PRIMARY TEAM — {selectedPlayer.name}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              All development focuses, observations, workload, and skills follow {selectedPlayer.name} intact across teams.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {clubTeams.map(t => {
                const isCurrent = selectedPlayer.primaryTeamId === t.id;
                return (
                  <button
                    key={t.id}
                    className={`role-filter-sheet-item ${isCurrent ? 'selected' : ''}`}
                    onClick={() => handleTransferTeam(t.id)}
                  >
                    <span>{t.name} ({t.gradeOrDivision || t.ageGroup})</span>
                    {isCurrent && <Check size={16} color="var(--accent-gold)" />}
                  </button>
                );
              })}
            </div>

            <button className="btn btn-secondary" onClick={() => setIsTeamTransferOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
