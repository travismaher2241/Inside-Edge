// Context-driven Home Screen View for Inside Edge

import React from 'react';
import type { TrainingSession, MatchRecord, Player, DevelopmentFocus } from '../types/cricket';
import { AlertCircle, Play, ChevronRight, CheckCircle2, Target, ShieldAlert } from 'lucide-react';

interface HomeViewProps {
  session: TrainingSession;
  match: MatchRecord;
  players: Player[];
  focuses: DevelopmentFocus[];
  onStartLiveSession: () => void;
  onNavigateToTrain: () => void;
  onNavigateToMatch: () => void;
  onNavigateToTeam: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  session,
  match,
  players,
  focuses,
  onStartLiveSession,
  onNavigateToTrain,
  onNavigateToMatch,
  onNavigateToTeam
}) => {
  const restrictedBowlers = players.filter(p => p.workloadRestriction?.restrictedBowler);
  const activeFocuses = focuses.filter(f => f.state === 'Current Focus' || f.state === 'Developing');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Greeting Header */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '1px' }}>
          GOOD EVENING, COACH
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0' }}>Training Week 4</h1>
      </div>

      {/* Next Up Session Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)', background: 'linear-gradient(135deg, #19261f 0%, #121a15 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="badge badge-gold">NEXT UP</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>3 days until v {match.opponent}</span>
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{session.title}</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px' }}>
          <span>📅 Thursday 6:00 PM</span>
          <span>👥 {session.expectedPlayerIds.length} Expected</span>
          <span>⏱️ {session.durationMinutes} mins</span>
        </div>

        {/* Primary Action Button */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-live" onClick={onStartLiveSession} style={{ flex: 1 }}>
            <Play size={18} /> START LIVE SESSION NOW
          </button>
          <button className="btn btn-secondary" onClick={onNavigateToTrain} style={{ width: 'auto' }}>
            EDIT PLAN
          </button>
        </div>
      </div>

      {/* This Week's Focus Card */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={18} color="var(--accent-gold)" />
            <span>THIS WEEK'S FOCUS</span>
          </div>
          <button
            onClick={onNavigateToMatch}
            style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            Review Match <ChevronRight size={14} />
          </button>
        </div>
        <div className="card-subtitle">Based on last match v {match.opponent} + coach observations</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {session.primaryObjectives.map((obj, i) => (
            <div key={i} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} color="var(--primary-green-light)" />
              <span style={{ fontWeight: 600 }}>{obj}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Continue Planning Progress */}
      <div className="card" style={{ background: 'var(--bg-surface-elevated)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>CONTINUE PLANNING</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 800 }}>62% Ready</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: '62%', height: '100%', background: 'linear-gradient(90deg, #1b4d3e, #e5a93c)' }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Warmup, Fielding, 3 Net Rotations and Scenario block configured.
        </div>
      </div>

      {/* Players to Watch & Workload Alerts */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={18} color="#e76f51" />
            <span>PLAYERS TO WATCH</span>
          </div>
          <button
            onClick={onNavigateToTeam}
            style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            All Players <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {restrictedBowlers.map(p => (
            <div key={p.id} style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={14} /> {p.name} — Workload Restricted
              </div>
              <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>{p.workloadRestriction?.notes}</div>
            </div>
          ))}

          {activeFocuses.slice(0, 2).map(f => {
            const player = players.find(p => p.id === f.playerId);
            if (!player) return null;
            return (
              <div key={f.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{player.name} — Focus Review Due</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>"{f.focusStatement}"</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
