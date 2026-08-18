import React, { useState, useMemo } from 'react';
import type { Player, ClubTeam, Observation } from '../../types/cricket';
import { getRoleBadgeLabel } from '../../modules/cricket/taxonomy';
import { Shield, Share2, Copy, Check, X, Sparkles, AlertTriangle } from 'lucide-react';

interface SelectionBoardProps {
  players: Player[];
  clubTeams: ClubTeam[];
  observations?: Observation[];
  onUpdatePlayerTeam: (playerId: string, targetTeamId: string) => void;
}

interface TeamSheetConfig {
  team: ClubTeam;
  opposition: string;
  venue: string;
  meetTime: string;
  matchTime: string;
  format: string;
  clothing: string;
  captainPlayerId?: string;
  keeperPlayerId?: string;
  notes: string;
}

export const SelectionBoard: React.FC<SelectionBoardProps> = ({
  players,
  clubTeams,
  observations = [],
  onUpdatePlayerTeam
}) => {
  const [selectedTeamForSheet, setSelectedTeamForSheet] = useState<ClubTeam | null>(null);
  const [sheetConfig, setSheetConfig] = useState<TeamSheetConfig | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Map observations to player IDs for quick badge lookup
  const playerObservationsMap = useMemo(() => {
    const map = new Map<string, Observation[]>();
    observations.forEach(obs => {
      const existing = map.get(obs.playerId) || [];
      existing.push(obs);
      map.set(obs.playerId, existing);
    });
    return map;
  }, [observations]);

  // Group players by primaryTeamId
  const teamPlayerMap = useMemo(() => {
    const map = new Map<string, Player[]>();
    clubTeams.forEach(t => map.set(t.id, []));

    players.forEach(p => {
      const teamId = p.primaryTeamId || clubTeams[0]?.id || 'ct-1';
      const list = map.get(teamId) || [];
      list.push(p);
      map.set(teamId, list);
    });
    return map;
  }, [players, clubTeams]);

  const handleOpenTeamSheetModal = (team: ClubTeam) => {
    const teamPlayers = teamPlayerMap.get(team.id) || [];
    const probableKeeper = teamPlayers.find(p => p.primaryRole === 'wicketkeeper' || p.wicketkeepingCapability === 'primary');
    const probableCaptain = teamPlayers[0];

    setSelectedTeamForSheet(team);
    setSheetConfig({
      team,
      opposition: 'Opposition CC',
      venue: 'Home Ground Oval 1',
      meetTime: '12:15 PM',
      matchTime: '1:00 PM',
      format: 'One-Day 45 Overs',
      clothing: 'Two-Piece Whites & Club Cap',
      captainPlayerId: probableCaptain?.id,
      keeperPlayerId: probableKeeper?.id,
      notes: 'Bring afternoon tea contribution and ensure spikes are clean.'
    });
    setCopiedFeedback(false);
  };

  const generateWhatsAppMessage = (config: TeamSheetConfig): string => {
    const teamPlayers = teamPlayerMap.get(config.team.id) || [];
    
    let text = `🏏 *${config.team.name.toUpperCase()} TEAM SELECTION*\n`;
    text += `🆚 *vs ${config.opposition}*\n`;
    text += `📍 *Venue:* ${config.venue}\n`;
    text += `⏰ *Meet Time:* ${config.meetTime} (Match Start: ${config.matchTime})\n`;
    text += `👕 *Attire:* ${config.clothing}\n`;
    text += `🏆 *Format:* ${config.format}\n\n`;
    text += `*SELECTED SQUAD (${teamPlayers.length}):*\n`;

    teamPlayers.forEach((p, idx) => {
      const isCap = p.id === config.captainPlayerId;
      const isWk = p.id === config.keeperPlayerId || p.primaryRole === 'wicketkeeper';
      const capTag = isCap ? ' (c)' : '';
      const wkTag = isWk ? ' (wk)' : '';
      text += `${idx + 1}. ${p.name}${capTag}${wkTag}\n`;
    });

    if (config.notes) {
      text += `\n📝 *Notes:* ${config.notes}\n`;
    }

    text += `\nReply with ✅ to confirm availability to your captain.`;
    return text;
  };

  const handleCopyWhatsAppText = () => {
    if (!sheetConfig) return;
    const msg = generateWhatsAppMessage(sheetConfig);
    navigator.clipboard.writeText(msg);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleOpenWhatsAppShare = () => {
    if (!sheetConfig) return;
    const msg = generateWhatsAppMessage(sheetConfig);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Selection Board Header */}
      <div className="flex-between">
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold, #f59e0b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} /> SATURDAY MATCH SELECTION
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
            5-Grade Club Selection Board
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Review Thursday training form notes, balance squad roles, and generate 1-click WhatsApp team sheets for all 5 senior grades.
          </div>
        </div>

        {/* Search */}
        <div style={{ maxWidth: '240px', width: '100%' }}>
          <input
            type="search"
            placeholder="Filter players by name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '6px 10px', height: '36px' }}
          />
        </div>
      </div>

      {/* 5-Grade Visual Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', alignItems: 'start' }}>
        {clubTeams.map(team => {
          const rawSquad = teamPlayerMap.get(team.id) || [];
          const squad = searchFilter.trim()
            ? rawSquad.filter(p => p.name.toLowerCase().includes(searchFilter.toLowerCase()))
            : rawSquad;

          // Role counts
          const batCount = squad.filter(p => p.primaryRole === 'top_order_batter' || p.primaryRole === 'middle_order_batter').length;
          const wkCount = squad.filter(p => p.primaryRole === 'wicketkeeper' || p.wicketkeepingCapability === 'primary').length;
          const arCount = squad.filter(p => p.primaryRole === 'all_rounder').length;
          const paceCount = squad.filter(p => p.primaryRole === 'pace_bowler').length;
          const spinCount = squad.filter(p => p.primaryRole === 'spin_bowler').length;

          return (
            <div key={team.id} className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Team Column Header */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {squad.length} Players Selected · {team.gradeOrDivision || team.ageGroup}
                    </div>
                  </div>

                  {/* 1-Click WhatsApp Team Sheet Button */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenTeamSheetModal(team)}
                    style={{ width: 'auto', padding: '0 10px', height: '30px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Generate WhatsApp Team Sheet"
                  >
                    <Share2 size={12} /> Team Sheet
                  </button>
                </div>

                {/* Squad Role Breakdown Pill Bar */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {batCount} Bat
                  </span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {wkCount} WK
                  </span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(168,85,247,0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {arCount} AR
                  </span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {paceCount} Pace
                  </span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(236,72,153,0.15)', color: '#f472b6', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {spinCount} Spin
                  </span>
                </div>
              </div>

              {/* Player Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflowY: 'auto' }}>
                {squad.map((player, idx) => {
                  const pObs = playerObservationsMap.get(player.id) || [];
                  const latestObs = pObs[pObs.length - 1];

                  return (
                    <div
                      key={player.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div className="flex-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, width: '16px' }}>
                            {idx + 1}.
                          </span>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>
                            {player.name}
                          </div>
                        </div>

                        {/* Grade Switcher Dropdown */}
                        <div style={{ position: 'relative' }}>
                          <select
                            value={team.id}
                            onChange={(e) => onUpdatePlayerTeam(player.id, e.target.value)}
                            style={{
                              background: '#1e293b',
                              color: '#94a3b8',
                              border: '1px solid #334155',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Reassign player to another grade"
                          >
                            {clubTeams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Role & Specs */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                          {getRoleBadgeLabel(player.primaryRole)}
                        </span>
                        <span>·</span>
                        <span>{player.battingHand} bat</span>
                        {player.bowlingStyle !== 'does_not_bowl' && (
                          <>
                            <span>·</span>
                            <span>{player.bowlingStyle.replace(/_/g, ' ')}</span>
                          </>
                        )}
                      </div>

                      {/* Captain Standout / Injury Badges from Thursday Training */}
                      {latestObs && (
                        <div style={{ marginTop: '2px', padding: '3px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.68rem', color: '#fde047', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={10} color="#f59e0b" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {latestObs.textNote}
                          </span>
                        </div>
                      )}

                      {player.workloadRestriction?.restrictedBowler && (
                        <div style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.65rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={10} color="#ef4444" /> Restricted ({player.workloadRestriction.maxDeliveries || 24} balls)
                        </div>
                      )}
                    </div>
                  );
                })}

                {squad.length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    No players assigned to {team.name}. Select players from other grades to promote/move here.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Team Sheet Modal */}
      {selectedTeamForSheet && sheetConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#111827', border: '1px solid #374151', padding: '24px' }}>
            
            {/* Header */}
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold, #f59e0b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Share2 size={14} /> WHATSAPP TEAM ANNOUNCEMENT
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '2px' }}>
                  {sheetConfig.team.name} Team Sheet
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeamForSheet(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Config Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>OPPOSITION:</label>
                <input
                  type="text"
                  value={sheetConfig.opposition}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, opposition: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>VENUE / GROUND:</label>
                <input
                  type="text"
                  value={sheetConfig.venue}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, venue: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>MEET TIME:</label>
                <input
                  type="text"
                  value={sheetConfig.meetTime}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, meetTime: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>MATCH START:</label>
                <input
                  type="text"
                  value={sheetConfig.matchTime}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, matchTime: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>CAPTAIN (C):</label>
                <select
                  value={sheetConfig.captainPlayerId || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, captainPlayerId: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                >
                  {(teamPlayerMap.get(sheetConfig.team.id) || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>WICKETKEEPER (WK):</label>
                <select
                  value={sheetConfig.keeperPlayerId || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, keeperPlayerId: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#fff' }}
                >
                  {(teamPlayerMap.get(sheetConfig.team.id) || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* WhatsApp Text Preview Box */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                WHATSAPP MESSAGE PREVIEW:
              </label>
              <pre
                style={{
                  background: '#0a0f1d',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #1e293b',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}
              >
                {generateWhatsAppMessage(sheetConfig)}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTeamForSheet(null)}
                style={{ width: 'auto', padding: '0 16px' }}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyWhatsAppText}
                  style={{ width: 'auto', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copiedFeedback ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  {copiedFeedback ? 'Copied!' : 'Copy Text'}
                </button>

                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleOpenWhatsAppShare}
                  style={{ width: 'auto', padding: '0 18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Share2 size={14} /> Open in WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
