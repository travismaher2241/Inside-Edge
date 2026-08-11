import React from 'react';
import type { Player, SessionFairnessRecord, RollingFairnessLedger } from '../../../types/cricket';
import { Scale, AlertTriangle, TrendingUp } from 'lucide-react';

interface FairnessReviewPanelProps {
  players: Player[];
  sessionRecords?: SessionFairnessRecord[];
  rollingLedger: RollingFairnessLedger[];
  fairnessScore?: number;
  unsatisfiedSoftConstraints?: string[];
}

export const FairnessReviewPanel: React.FC<FairnessReviewPanelProps> = ({
  players,
  sessionRecords = [],
  rollingLedger,
  fairnessScore = 95,
  unsatisfiedSoftConstraints = []
}) => {
  const getPlayer = (id: string) => players.find(p => p.id === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Score Header */}
      <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)', borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>FAIRNESS & ALLOCATION AUDIT</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Explainable Session Score</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: fairnessScore >= 80 ? '#4ade80' : '#f97316' }}>
              {fairnessScore}/100
            </span>
          </div>
        </div>

        {unsatisfiedSoftConstraints.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {unsatisfiedSoftConstraints.map((constraint, idx) => (
              <div key={idx} style={{ fontSize: '0.75rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> {constraint}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Planned Session Fairness Table */}
      {sessionRecords.length > 0 && (
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={16} /> TONIGHT'S PLANNED ALLOCATION
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: 'var(--text-main)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Player</th>
                  <th style={{ padding: '6px 8px' }}>Batting Mins</th>
                  <th style={{ padding: '6px 8px' }}>Deliveries</th>
                  <th style={{ padding: '6px 8px' }}>Extra Allocation Reason</th>
                </tr>
              </thead>
              <tbody>
                {sessionRecords.map(rec => {
                  const p = getPlayer(rec.playerId);
                  if (!p) return null;
                  return (
                    <tr key={rec.playerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge ${rec.plannedBattingMinutes > 0 ? 'badge-green' : 'badge-warning'}`}>
                          {rec.plannedBattingMinutes} mins
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>{rec.deliveriesBowled} balls</td>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                        {rec.extraBattingReason ? (
                          <span style={{ color: 'var(--accent-gold)' }}>★ {rec.extraBattingReason}</span>
                        ) : rec.plannedBattingMinutes === 0 ? (
                          <span style={{ color: '#f97316' }}>No batting turn (bowling/fielding focus)</span>
                        ) : (
                          'Standard rotation'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rolling Multi-Session Fairness Ledger */}
      <div className="card" style={{ padding: '14px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} /> ROLLING MULTI-SESSION FAIRNESS LEDGER
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: 'var(--text-main)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Player</th>
                <th style={{ padding: '6px 8px' }}>Sessions</th>
                <th style={{ padding: '6px 8px' }}>Total Batting</th>
                <th style={{ padding: '6px 8px' }}>Deliveries</th>
                <th style={{ padding: '6px 8px' }}>Fairness Credit</th>
              </tr>
            </thead>
            <tbody>
              {rollingLedger.map(l => {
                const p = getPlayer(l.playerId);
                if (!p) return null;
                const credit = Math.round(l.accumulatedFairnessCreditMinutes * 10) / 10;
                return (
                  <tr key={l.playerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '8px' }}>{l.totalSessionsAttended}</td>
                    <td style={{ padding: '8px' }}>{l.totalBattingMinutes} mins</td>
                    <td style={{ padding: '8px' }}>{l.totalDeliveriesBowled} balls</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge ${credit > 0 ? 'badge-gold' : credit < 0 ? 'badge-warning' : 'badge-green'}`}>
                        {credit > 0 ? `+${credit}m (Owed turn)` : credit < 0 ? `${credit}m (Received extra)` : 'Balanced'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
