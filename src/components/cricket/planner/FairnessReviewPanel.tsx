import React, { useState } from 'react';
import type { Player, SessionFairnessRecord, RollingFairnessLedger } from '../../../types/cricket';
import { AlertTriangle, CheckCircle2, ChevronRight, HelpCircle, X } from 'lucide-react';

interface FairnessReviewPanelProps {
  players: Player[];
  sessionRecords?: SessionFairnessRecord[];
  rollingLedger: RollingFairnessLedger[];
  fairnessScore?: number;
  unsatisfiedSoftConstraints?: string[];
}

export interface PlayerFairnessStatus {
  player: Player;
  ledger?: RollingFairnessLedger;
  status: 'BALANCED' | 'NEEDS OPPORTUNITY' | 'HIGH WORKLOAD';
  reason: string;
  battingMins: number;
  bowlingBalls: number;
  sessionsAttended: number;
  creditMins: number;
}

export const deriveSquadBalanceData = (players: Player[], rollingLedger: RollingFairnessLedger[]) => {
  if (rollingLedger.length === 0) {
    return {
      statuses: players.map(p => ({
        player: p,
        status: 'BALANCED' as const,
        reason: 'No session history recorded yet',
        battingMins: 0,
        bowlingBalls: 0,
        sessionsAttended: 0,
        creditMins: 0
      })),
      needsAttention: [],
      balancedPlayers: players.map(p => ({
        player: p,
        status: 'BALANCED' as const,
        reason: 'No session history recorded yet',
        battingMins: 0,
        bowlingBalls: 0,
        sessionsAttended: 0,
        creditMins: 0
      }))
    };
  }

  // Calculate squad averages
  const totalBattingMins = rollingLedger.reduce((sum, l) => sum + l.totalBattingMinutes, 0);
  const totalDeliveries = rollingLedger.reduce((sum, l) => sum + l.totalDeliveriesBowled, 0);
  const avgBattingMins = rollingLedger.length ? totalBattingMins / rollingLedger.length : 0;
  const avgDeliveries = rollingLedger.length ? totalDeliveries / rollingLedger.length : 0;

  const statuses: PlayerFairnessStatus[] = players.map(p => {
    const l = rollingLedger.find(item => item.playerId === p.id);
    const battingMins = l?.totalBattingMinutes ?? 0;
    const bowlingBalls = l?.totalDeliveriesBowled ?? 0;
    const sessionsAttended = l?.totalSessionsAttended ?? 0;
    const creditMins = l?.accumulatedFairnessCreditMinutes ?? 0;

    let status: 'BALANCED' | 'NEEDS OPPORTUNITY' | 'HIGH WORKLOAD' = 'BALANCED';
    let reason = 'Balanced rotation across sessions';

    if (creditMins > 10 || (avgBattingMins > 0 && battingMins < avgBattingMins * 0.7)) {
      status = 'NEEDS OPPORTUNITY';
      reason = 'Batting opportunity below squad average';
    } else if (p.workloadRestriction?.restrictedBowler || (avgDeliveries > 0 && bowlingBalls > avgDeliveries * 1.35)) {
      status = 'HIGH WORKLOAD';
      reason = 'Bowling workload higher than squad average';
    }

    return {
      player: p,
      ledger: l,
      status,
      reason,
      battingMins,
      bowlingBalls,
      sessionsAttended,
      creditMins
    };
  });

  const needsAttention = statuses.filter(s => s.status !== 'BALANCED');
  const balancedPlayers = statuses.filter(s => s.status === 'BALANCED');

  return {
    statuses,
    needsAttention,
    balancedPlayers
  };
};

export const FairnessReviewPanel: React.FC<FairnessReviewPanelProps> = ({
  players,
  sessionRecords: _sessionRecords = [],
  rollingLedger,
  fairnessScore = 95,
  unsatisfiedSoftConstraints = []
}) => {
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
  const [selectedPlayerStatus, setSelectedPlayerStatus] = useState<PlayerFairnessStatus | null>(null);

  const { statuses, needsAttention } = deriveSquadBalanceData(players, rollingLedger);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. SQUAD FAIRNESS OVERVIEW */}
      <div className="card" style={{ padding: '16px', background: 'var(--bg-surface-card)', borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.5px' }}>
              SESSION FAIRNESS
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
              {fairnessScore >= 90 ? 'Excellent Balance' : fairnessScore >= 75 ? 'Good Balance' : 'Needs Adjustment'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Most players have received a similar share of batting and bowling opportunities.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: fairnessScore >= 80 ? '#4ade80' : '#f97316', lineHeight: 1 }}>
              {fairnessScore}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/100</span>
          </div>
        </div>

        {unsatisfiedSoftConstraints.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {unsatisfiedSoftConstraints.map((constraint, idx) => (
              <div key={idx} style={{ fontSize: '0.78rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> {constraint}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
          <button 
            onClick={() => setShowHowItWorks(true)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <HelpCircle size={14} /> How is this calculated?
          </button>
        </div>
      </div>

      {/* 2. NEEDS ATTENTION (PRIORITY EXCEPTIONS) */}
      <section className="home-section">
        <div className="home-section-header">
          <span>NEEDS ATTENTION</span>
          {needsAttention.length > 0 && (
            <span style={{ color: '#f97316', fontWeight: 800 }}>{needsAttention.length} players</span>
          )}
        </div>

        {needsAttention.length > 0 ? (
          <div className="home-insight-card">
            {needsAttention.map(item => (
              <div 
                key={item.player.id} 
                className="home-insight-row gold-accent"
                onClick={() => setSelectedPlayerStatus(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="home-insight-info">
                  <div className="home-insight-title">{item.player.name}</div>
                  <div className="home-insight-desc" style={{ color: '#f6d387' }}>{item.reason}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.battingMins} mins batting · {item.bowlingBalls} balls bowled
                  </div>
                </div>
                <button 
                  className="btn-mini-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayerStatus(item);
                  }}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, fontSize: '0.88rem' }}>
              <CheckCircle2 size={16} /> Squad balance looks good
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
              All active players are within current fairness targets.
            </p>
          </div>
        )}
      </section>

      {/* 3. SQUAD PLAYER FAIRNESS ROWS (COLLAPSIBLE) */}
      <section className="home-section">
        <div className="home-section-header">
          <span>SQUAD BALANCE ({statuses.length} players)</span>
          <button 
            onClick={() => setShowAllPlayers(!showAllPlayers)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            {showAllPlayers ? 'Collapse list' : `View all ${statuses.length}`}
          </button>
        </div>

        {showAllPlayers && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {statuses.map(item => (
              <div 
                key={item.player.id} 
                className="player-fairness-row"
                onClick={() => setSelectedPlayerStatus(item)}
              >
                <div className="player-fairness-left">
                  <div className="player-fairness-name">{item.player.name}</div>
                  <div className="player-fairness-stats">
                    <span>{item.sessionsAttended} session{item.sessionsAttended === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{item.battingMins} mins bat</span>
                    <span>·</span>
                    <span>{item.bowlingBalls} balls bowl</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${item.status === 'BALANCED' ? 'badge-green' : item.status === 'NEEDS OPPORTUNITY' ? 'badge-gold' : 'badge-warning'}`}>
                    {item.status}
                  </span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL 1: HOW IS THIS CALCULATED? */}
      {showHowItWorks && (
        <div className="bottom-sheet-overlay" onClick={() => setShowHowItWorks(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>How Session Fairness is Calculated</h3>
              <button onClick={() => setShowHowItWorks(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>1. Equal Opportunity Target</strong>
                <p>Inside Edge calculates total available net time and distributes batting rotation minutes evenly across all attending squad players.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>2. Rolling Fairness Credit</strong>
                <p>If a player gets fewer batting minutes or misses a session, the system carries forward fairness credit to prioritize them in the next session.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>3. Workload Limits</strong>
                <p>Bowler delivery caps are tracked to prevent injury and ensure pace bowlers aren't over-bowled.</p>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setShowHowItWorks(false)} style={{ marginTop: '16px' }}>
              Got It
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: PLAYER FAIRNESS DETAILS */}
      {selectedPlayerStatus && (
        <div className="bottom-sheet-overlay" onClick={() => setSelectedPlayerStatus(null)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{selectedPlayerStatus.player.name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {selectedPlayerStatus.player.primaryRole.replace(/_/g, ' ')}
                </div>
              </div>
              <button onClick={() => setSelectedPlayerStatus(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Batting</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{selectedPlayerStatus.battingMins} mins</div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Deliveries Bowled</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>{selectedPlayerStatus.bowlingBalls} balls</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Status</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {selectedPlayerStatus.reason}
              </div>
            </div>

            <button className="btn btn-secondary" onClick={() => setSelectedPlayerStatus(null)}>
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
