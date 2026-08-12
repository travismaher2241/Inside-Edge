import React from 'react';
import type { ClubTrainingSession, DevelopmentFocus, MatchRecord, Player, TrainingResource, Team, ClubTeam, ActiveScope } from '../types/cricket';
import { ChevronRight, Dumbbell, Play, Sparkles, Trophy, Users, BookOpen, Shield, ShieldAlert } from 'lucide-react';
import { calculateSessionReadiness, getSessionDuration } from '../modules/cricket/sessionModel';
import { getPlayersForScope, groupPlayersByTeam } from '../modules/cricket/scopeHelpers';

export interface HomeViewProps {
  session?: ClubTrainingSession;
  match?: MatchRecord;
  matches?: MatchRecord[];
  sessions?: ClubTrainingSession[];
  players: Player[];
  focuses: DevelopmentFocus[];
  resources: TrainingResource[];
  team?: Team;
  clubTeams?: ClubTeam[];
  activeScope?: ActiveScope;
  onStartLiveSession: () => void;
  onNavigateToTrain: () => void;
  onNavigateToMatch: () => void;
  onNavigateToTeam: () => void;
  onNavigateToLibrary?: () => void;
}

export interface CoachingNoteItem {
  id: string;
  title: string;
  description: string;
  type: 'workload' | 'focus' | 'plan';
  target: 'team' | 'train' | 'match';
  targetPlayerId?: string;
}

export interface PlayerFocusItem {
  id: string;
  name: string;
  domain: string;
  focusStatement: string;
  playerId: string;
}

export interface UpNextItem {
  id: string;
  dayName: string;
  dayNum: string;
  title: string;
  subtext: string;
  type: 'session' | 'match';
}

export interface RecentActivityItem {
  id: string;
  title: string;
  meta: string;
  type: 'session' | 'match';
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: 'train' | 'drill' | 'match' | 'team';
  action: 'train' | 'library' | 'match' | 'team';
}

const getTodayIsoDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatShortDate = (dateStr: string, timeStr?: string) => {
  if (!dateStr) return '';
  const dateObj = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
  if (Number.isNaN(dateObj.getTime())) return `${dateStr}${timeStr ? ` · ${timeStr}` : ''}`;

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(timeStr ? { hour: 'numeric', minute: '2-digit' } : {})
  }).format(dateObj);
};

export const deriveHomeState = ({
  session,
  match,
  matches = [],
  sessions = [],
  players = [],
  focuses = [],
  resources = [],
  team,
  activeScope = { mode: 'team', teamId: 'ct-1' }
}: {
  session?: ClubTrainingSession;
  match?: MatchRecord;
  matches?: MatchRecord[];
  sessions?: ClubTrainingSession[];
  players?: Player[];
  focuses?: DevelopmentFocus[];
  resources?: TrainingResource[];
  team?: Team;
  activeScope?: ActiveScope;
}) => {
  const todayStr = getTodayIsoDate();
  const teamName = team?.name || 'Senior Men';
  const scopePlayers = getPlayersForScope(players, activeScope);

  const allMatches = [...matches];
  if (match && !allMatches.some(m => m.id === match.id)) {
    allMatches.push(match);
  }

  const allSessions = [...sessions];
  if (session && !allSessions.some(s => s.id === session.id)) {
    allSessions.unshift(session);
  }

  const activeLiveSession = allSessions.find(s => s.status === 'live' || (s.currentLiveState && !s.currentLiveState.isPaused));
  const todayMatch = allMatches.find(m => m.date === todayStr);
  const todaySession = allSessions.find(s => s.date === todayStr && s.status !== 'completed');
  const upcomingSession = allSessions
    .filter(s => s.status !== 'completed' && s.date >= todayStr && s.id !== todaySession?.id && s.id !== activeLiveSession?.id)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const recentMatchNeedingReview = allMatches.find(m =>
    (m.date < todayStr || Boolean(m.result)) && (!m.postMatchReview || !m.postMatchReview.reviewedDate)
  );

  let primaryContextType: 'IN_PROGRESS' | 'MATCH_DAY' | 'TRAINING_TODAY' | 'TRAINING_UPCOMING' | 'MATCH_REVIEW' | 'NO_SESSION' = 'NO_SESSION';
  let primarySession: ClubTrainingSession | undefined = undefined;
  let primaryMatch: MatchRecord | undefined = undefined;

  if (activeLiveSession) {
    primaryContextType = 'IN_PROGRESS';
    primarySession = activeLiveSession;
  } else if (todayMatch) {
    primaryContextType = 'MATCH_DAY';
    primaryMatch = todayMatch;
  } else if (todaySession) {
    primaryContextType = 'TRAINING_TODAY';
    primarySession = todaySession;
  } else if (upcomingSession) {
    primaryContextType = 'TRAINING_UPCOMING';
    primarySession = upcomingSession;
  } else if (recentMatchNeedingReview) {
    primaryContextType = 'MATCH_REVIEW';
    primaryMatch = recentMatchNeedingReview;
  } else if (session && session.status !== 'completed') {
    primaryContextType = 'TRAINING_UPCOMING';
    primarySession = session;
  } else {
    primaryContextType = 'NO_SESSION';
  }

  const coachingNotes: CoachingNoteItem[] = [];
  const playersWithAttention = new Set<string>();

  scopePlayers.forEach(p => {
    if (p.workloadRestriction?.restrictedBowler) {
      playersWithAttention.add(p.id);
      const playerFocuses = focuses.filter(f => f.playerId === p.id && (f.state === 'CURRENT' || f.state === 'DEVELOPING'));
      const focusText = playerFocuses.length > 0 ? ` · ${playerFocuses[0].domain}: ${playerFocuses[0].focusStatement}` : '';
      const limitText = p.workloadRestriction.maxDeliveries ? ` (${p.workloadRestriction.maxDeliveries} balls max)` : '';

      coachingNotes.push({
        id: `note-workload-${p.id}`,
        title: `${p.name}`,
        description: `Bowling workload limit${limitText}${focusText}`,
        type: 'workload',
        target: 'team',
        targetPlayerId: p.id
      });
    }
  });

  if (primarySession) {
    const readiness = calculateSessionReadiness(primarySession, resources);
    if (readiness.missing.length > 0) {
      coachingNotes.push({
        id: `note-readiness-${primarySession.id}`,
        title: 'Training plan alert',
        description: readiness.missing.slice(0, 2).join(' · '),
        type: 'plan',
        target: 'train'
      });
    }
  }

  const totalCoachingNotesCount = coachingNotes.length;
  const limitedCoachingNotes = coachingNotes.slice(0, 3);

  const playerFocusItems: PlayerFocusItem[] = [];
  scopePlayers.forEach(p => {
    if (playersWithAttention.has(p.id)) return;
    const playerFocuses = focuses.filter(f => f.playerId === p.id && (f.state === 'CURRENT' || f.state === 'DEVELOPING'));
    if (playerFocuses.length > 0) {
      playerFocusItems.push({
        id: `pf-${p.id}`,
        name: p.name,
        domain: playerFocuses[0].domain,
        focusStatement: playerFocuses[0].focusStatement,
        playerId: p.id
      });
    }
  });

  const totalPlayerFocusCount = playerFocusItems.length;
  const limitedPlayerFocusItems = playerFocusItems.slice(0, 3);

  let quickActions: QuickActionItem[] = [];
  if (primaryContextType === 'NO_SESSION') {
    quickActions = [
      { id: 'qa-drill', label: 'Create Drill', icon: 'drill', action: 'library' },
      { id: 'qa-match', label: 'Match Prep', icon: 'match', action: 'match' },
      { id: 'qa-team', label: 'Team', icon: 'team', action: 'team' },
      { id: 'qa-library', label: 'Drill Library', icon: 'drill', action: 'library' }
    ];
  } else {
    quickActions = [
      { id: 'qa-plan', label: 'Plan Training', icon: 'train', action: 'train' },
      { id: 'qa-drill', label: 'Create Drill', icon: 'drill', action: 'library' },
      { id: 'qa-match', label: 'Match Prep', icon: 'match', action: 'match' },
      { id: 'qa-team', label: 'Team', icon: 'team', action: 'team' }
    ];
  }

  const upNextItems: UpNextItem[] = [];
  allSessions
    .filter(s => s.status !== 'completed' && s.id !== primarySession?.id)
    .forEach(s => {
      const dateObj = new Date(`${s.date}T${s.startTime}:00`);
      if (!Number.isNaN(dateObj.getTime())) {
        upNextItems.push({
          id: `up-session-${s.id}`,
          dayName: dateObj.toLocaleDateString(undefined, { weekday: 'short' }),
          dayNum: dateObj.getDate().toString(),
          title: 'Training',
          subtext: `${s.startTime} · ${s.title}`,
          type: 'session'
        });
      }
    });

  allMatches
    .filter(m => m.date >= todayStr && m.id !== primaryMatch?.id)
    .forEach(m => {
      const dateObj = new Date(`${m.date}T12:00:00`);
      if (!Number.isNaN(dateObj.getTime())) {
        upNextItems.push({
          id: `up-match-${m.id}`,
          dayName: dateObj.toLocaleDateString(undefined, { weekday: 'short' }),
          dayNum: dateObj.getDate().toString(),
          title: `vs ${m.opponent}`,
          subtext: `1:00 PM · ${m.venue}`,
          type: 'match'
        });
      }
    });

  const recentActivityItems: RecentActivityItem[] = [];
  allSessions
    .filter(s => s.status === 'completed')
    .slice(0, 1)
    .forEach(s => {
      recentActivityItems.push({
        id: `recent-session-${s.id}`,
        title: `${s.title}`,
        meta: `${s.confirmedAttendingPlayerIds.length} players · ${s.blocks.length} activities completed`,
        type: 'session'
      });
    });

  allMatches
    .filter(m => m.date < todayStr || Boolean(m.result))
    .slice(0, 1)
    .forEach(m => {
      recentActivityItems.push({
        id: `recent-match-${m.id}`,
        title: `vs ${m.opponent}`,
        meta: m.result ? `Result: ${m.result}` : 'Match completed',
        type: 'match'
      });
    });

  return {
    teamName,
    primaryContextType,
    primarySession,
    primaryMatch,
    coachingNotes: limitedCoachingNotes,
    totalCoachingNotesCount,
    playerFocusItems: limitedPlayerFocusItems,
    totalPlayerFocusCount,
    quickActions,
    upNextItems: upNextItems.slice(0, 2),
    recentActivityItems: recentActivityItems.slice(0, 2)
  };
};

export const HomeView: React.FC<HomeViewProps> = ({
  session,
  match: _match,
  matches = [],
  sessions = [],
  players = [],
  focuses = [],
  resources: _resources,
  team: _team,
  clubTeams = [],
  activeScope = { mode: 'team', teamId: 'ct-1' },
  onStartLiveSession,
  onNavigateToTrain,
  onNavigateToMatch,
  onNavigateToTeam,
  onNavigateToLibrary
}) => {
  // Filter players according to current team context vs club context
  const scopePlayers = getPlayersForScope(players, activeScope);

  // Group teams for Club Overview
  const teamGroups = groupPlayersByTeam(clubTeams, players);

  const activeLiveSession = sessions.find(s => s.status === 'live' || (s.currentLiveState && !s.currentLiveState.isPaused));

  const isClubView = activeScope.mode === 'club';

  return (
    <div className="home-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ========================================================= */}
      {/* CLUB OVERVIEW CONTEXT HOME VIEW */}
      {/* ========================================================= */}
      {isClubView ? (
        <>
          {/* Club Header Hero */}
          <div className="home-primary-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
            <div className="home-primary-badge-row">
              <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={14} /> CLUB OVERVIEW
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>{clubTeams.length} Teams Registered</span>
            </div>
            <h2 className="home-primary-title">Inside Edge Cricket Club</h2>
            <div className="home-primary-meta">
              <span>{players.length} Total Players</span>
              <span>·</span>
              <span>{sessions.length} Planned Sessions</span>
              <span>·</span>
              <span>{matches.length} Match Records</span>
            </div>
            <div className="home-primary-actions" style={{ marginTop: '12px' }}>
              <button className="btn btn-gold" onClick={onNavigateToTrain}>
                <Dumbbell size={16} /> Plan Club Training
              </button>
              <button className="btn btn-secondary" onClick={onNavigateToTeam}>
                Manage Teams ({clubTeams.length})
              </button>
            </div>
          </div>

          {/* Teams Needing Attention (Summarised by Team) */}
          <section className="home-section">
            <div className="home-section-header">
              <span>TEAMS NEEDING ATTENTION</span>
              <Sparkles size={14} color="var(--accent-gold)" />
            </div>
            <div className="home-insight-card">
              {teamGroups.map(({ team: t, players: tPlayers, attentionCount }) => (
                <div
                  key={t.id}
                  className="home-insight-row gold-accent"
                  onClick={onNavigateToTeam}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div className="home-insight-info">
                    <div className="home-insight-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="var(--accent-gold)" /> {t.name}
                    </div>
                    <div className="home-insight-desc">
                      {attentionCount > 0
                        ? `${attentionCount} player${attentionCount === 1 ? '' : 's'} with workload restrictions or active focus`
                        : `${tPlayers.length} players · Squad in good order`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {attentionCount > 0 && <span className="badge badge-warning">{attentionCount} Issue{attentionCount === 1 ? '' : 's'}</span>}
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming Club Fixtures */}
          {matches.length > 0 && (
            <section className="home-section">
              <div className="home-section-header">
                <span>UPCOMING CLUB MATCHES</span>
                <Trophy size={14} color="var(--accent-gold)" />
              </div>
              <div className="up-next-card">
                {matches.slice(0, 3).map(m => (
                  <div key={m.id} className="up-next-row" onClick={onNavigateToMatch} style={{ cursor: 'pointer' }}>
                    <div className="up-next-left">
                      <div className="up-next-day">
                        <span className="day-name">MATCH</span>
                        <span className="day-num">1</span>
                      </div>
                      <div className="up-next-details">
                        <div className="up-next-title">vs {m.opponent}</div>
                        <div className="up-next-sub">{m.format} · {m.venue}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* ========================================================= */
        /* TEAM CONTEXT HOME VIEW (Strictly Team Scoped) */
        /* ========================================================= */
        <>
          {activeLiveSession && (
            <div className="home-primary-card" style={{ borderLeft: '4px solid var(--status-live)' }}>
              <div className="home-primary-badge-row">
                <span className="badge badge-live" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  SESSION IN PROGRESS
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getSessionDuration(activeLiveSession)} mins</span>
              </div>
              <h2 className="home-primary-title">{activeLiveSession.title}</h2>
              <div className="home-primary-actions" style={{ marginTop: '12px' }}>
                <button className="btn btn-live" onClick={onStartLiveSession}>
                  <Play size={18} /> CONTINUE SESSION
                </button>
                <button className="btn btn-secondary" onClick={onNavigateToTrain}>
                  VIEW SESSION
                </button>
              </div>
            </div>
          )}

          {!activeLiveSession && session && (
            <div className="home-primary-card">
              <div className="home-primary-badge-row">
                <span className="badge badge-green">NEXT TRAINING</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {formatShortDate(session.date, session.startTime)}
                </span>
              </div>
              <h2 className="home-primary-title">{session.title}</h2>
              <div className="home-primary-meta">
                <span>{scopePlayers.length} Team Players</span>
              </div>
              <div className="home-primary-actions" style={{ marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={onStartLiveSession}>
                  <Play size={18} /> START TRAINING
                </button>
                <button className="btn btn-secondary" onClick={onNavigateToTrain}>
                  VIEW PLAN
                </button>
              </div>
            </div>
          )}

          {!activeLiveSession && !session && (
            <div className="home-primary-card prompt-card">
              <div className="home-primary-badge-row">
                <span className="badge badge-gold">GET READY</span>
              </div>
              <h2 className="home-primary-title" style={{ fontSize: '1.1rem' }}>Plan next training</h2>
              <div className="home-primary-actions" style={{ marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={onNavigateToTrain}>
                  <Dumbbell size={16} /> Plan Training
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Grid */}
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={onNavigateToTrain}>
              <div className="quick-action-icon"><Dumbbell size={18} /></div>
              <span>Plan Session</span>
            </button>
            <button className="quick-action-btn" onClick={() => (onNavigateToLibrary || onNavigateToTrain)()}>
              <div className="quick-action-icon"><BookOpen size={18} /></div>
              <span>Drill Library</span>
            </button>
            <button className="quick-action-btn" onClick={onNavigateToMatch}>
              <div className="quick-action-icon"><Trophy size={18} /></div>
              <span>Match Prep</span>
            </button>
            <button className="quick-action-btn" onClick={onNavigateToTeam}>
              <div className="quick-action-icon"><Users size={18} /></div>
              <span>Roster ({scopePlayers.length})</span>
            </button>
          </div>

          {/* Player Workload & Attention for Team */}
          {scopePlayers.some(p => p.workloadRestriction?.restrictedBowler) && (
            <section className="home-section">
              <div className="home-section-header">
                <span>WORKLOAD RESTRICTIONS</span>
                <ShieldAlert size={14} color="#f97316" />
              </div>
              <div className="home-insight-card">
                {scopePlayers.filter(p => p.workloadRestriction?.restrictedBowler).map(p => (
                  <div key={p.id} className="home-insight-row gold-accent" onClick={onNavigateToTeam} style={{ cursor: 'pointer' }}>
                    <div className="home-insight-info">
                      <div className="home-insight-title">{p.name}</div>
                      <div className="home-insight-desc">{p.workloadRestriction?.notes || 'Bowling workload restriction active'}</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Player Focus Items for Team */}
          {scopePlayers.some(p => focuses.some(f => f.playerId === p.id && (f.state === 'CURRENT' || f.state === 'DEVELOPING'))) && (
            <section className="home-section">
              <div className="home-section-header">
                <span>PLAYER FOCUS</span>
                <Sparkles size={14} color="var(--accent-gold)" />
              </div>
              <div className="home-insight-card">
                {scopePlayers.filter(p => focuses.some(f => f.playerId === p.id && (f.state === 'CURRENT' || f.state === 'DEVELOPING'))).slice(0, 3).map(p => {
                  const pf = focuses.find(f => f.playerId === p.id && (f.state === 'CURRENT' || f.state === 'DEVELOPING'))!;
                  return (
                    <div key={p.id} className="home-insight-row green-accent" onClick={onNavigateToTeam} style={{ cursor: 'pointer' }}>
                      <div className="home-insight-info">
                        <div className="home-insight-title">{p.name}</div>
                        <div className="home-insight-desc">
                          <strong style={{ color: 'var(--accent-gold)' }}>{pf.domain}:</strong> {pf.focusStatement}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
