import React from 'react';
import type { ClubTrainingSession, DevelopmentFocus, MatchRecord, Player, TrainingResource } from '../types/cricket';
import { AlertCircle, CheckCircle2, ChevronRight, Play, ShieldAlert, Target } from 'lucide-react';
import { calculateSessionReadiness, getSessionDuration } from '../modules/cricket/sessionModel';

interface HomeViewProps {
  session?: ClubTrainingSession;
  match?: MatchRecord;
  players: Player[];
  focuses: DevelopmentFocus[];
  resources: TrainingResource[];
  onStartLiveSession: () => void;
  onNavigateToTrain: () => void;
  onNavigateToMatch: () => void;
  onNavigateToTeam: () => void;
}

const formatSessionDate = (session: ClubTrainingSession) => {
  const value = new Date(`${session.date}T${session.startTime}:00`);
  return Number.isNaN(value.getTime()) ? `${session.date} ${session.startTime}` : new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
  }).format(value);
};

export const HomeView: React.FC<HomeViewProps> = ({ session, match, players, focuses, resources, onStartLiveSession, onNavigateToTrain, onNavigateToMatch, onNavigateToTeam }) => {
  const restrictedBowlers = players.filter(player => player.workloadRestriction?.restrictedBowler);
  const activeFocuses = focuses.filter(focus => focus.state === 'Current Focus' || focus.state === 'Developing');
  const readiness = session ? calculateSessionReadiness(session, resources) : undefined;
  const matchDate = match ? new Date(`${match.date}T00:00:00`) : undefined;
  const today = new Date().setHours(0, 0, 0, 0);
  const isUpcomingMatch = Boolean(matchDate && !Number.isNaN(matchDate.getTime()) && matchDate.getTime() >= today);
  const daysUntilMatch = isUpcomingMatch && matchDate
    ? Math.ceil((matchDate.getTime() - today) / 86400000)
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)' }}>COACH DASHBOARD</div><h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0' }}>Inside Edge</h1></div>

      {session ? (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span className="badge badge-gold">NEXT TRAINING</span><span>{readiness?.score}% ready</span></div>
          <h2 style={{ fontSize: '1.15rem', marginTop: '8px' }}>{session.title}</h2>
          <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{formatSessionDate(session)} · {session.confirmedAttendingPlayerIds.length} attending · {getSessionDuration(session)} mins</div>
          {readiness && readiness.missing.length > 0 && <div style={{ color: '#f97316', marginTop: '8px' }}>{readiness.missing.slice(0, 2).join(' · ')}</div>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-live" onClick={onStartLiveSession} disabled={!session.rotationPlan.length}><Play size={18} /> Start live</button>
            <button className="btn btn-secondary" onClick={onNavigateToTrain}>Edit plan</button>
          </div>
        </div>
      ) : <div className="card"><h2>No session planned</h2><p style={{ color: 'var(--text-secondary)' }}>Create a club session to coordinate teams, resources, and attendance.</p><button className="btn btn-gold" onClick={onNavigateToTrain}>Plan training</button></div>}

      <div className="card">
        <div className="card-title"><span><Target size={18} /> Next match</span><button className="btn btn-secondary" onClick={onNavigateToMatch}>Review match <ChevronRight size={14} /></button></div>
        {match && isUpcomingMatch ? <p>v {match.opponent} · {match.date}{daysUntilMatch !== undefined ? ` · ${daysUntilMatch} day${daysUntilMatch === 1 ? '' : 's'} until` : ''}</p> : <p style={{ color: 'var(--text-secondary)' }}>No upcoming match.</p>}
      </div>

      <div className="card">
        <div className="card-title"><span><AlertCircle size={18} /> Actions required</span></div>
        {session?.sessionObjectives.map((objective, index) => <div key={`${objective}-${index}`} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}><CheckCircle2 size={16} color="var(--primary-green-light)" />{objective}</div>)}
        {!session?.sessionObjectives.length && <p style={{ color: 'var(--text-secondary)' }}>No training objectives set.</p>}
      </div>

      <div className="card">
        <div className="card-title"><span><ShieldAlert size={18} /> Players needing attention</span><button className="btn btn-secondary" onClick={onNavigateToTeam}>All players</button></div>
        <p>{restrictedBowlers.length} workload restriction{restrictedBowlers.length === 1 ? '' : 's'} · {activeFocuses.length} active development focus{activeFocuses.length === 1 ? '' : 'es'}</p>
      </div>
    </div>
  );
};
