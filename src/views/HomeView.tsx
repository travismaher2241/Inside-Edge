import React from 'react';
import type { ClubTrainingSession, DevelopmentFocus, MatchRecord, Player, TrainingResource, Team } from '../types/cricket';
import { ChevronRight, Dumbbell, Play, Sparkles, Trophy, Users, BookOpen, Clock } from 'lucide-react';
import { calculateSessionReadiness, getSessionDuration } from '../modules/cricket/sessionModel';

export interface HomeViewProps {
  session?: ClubTrainingSession;
  match?: MatchRecord;
  matches?: MatchRecord[];
  sessions?: ClubTrainingSession[];
  players: Player[];
  focuses: DevelopmentFocus[];
  resources: TrainingResource[];
  team?: Team;
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
  team
}: {
  session?: ClubTrainingSession;
  match?: MatchRecord;
  matches?: MatchRecord[];
  sessions?: ClubTrainingSession[];
  players?: Player[];
  focuses?: DevelopmentFocus[];
  resources?: TrainingResource[];
  team?: Team;
}) => {
  const todayStr = getTodayIsoDate();
  const teamName = team?.name || 'Senior Men';

  // Consolidate match records
  const allMatches = [...matches];
  if (match && !allMatches.some(m => m.id === match.id)) {
    allMatches.push(match);
  }

  // Consolidate session records
  const allSessions = [...sessions];
  if (session && !allSessions.some(s => s.id === session.id)) {
    allSessions.unshift(session);
  }

  // 1. Determine Primary Context Card State
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

  // 2. Derive Coaching Notes ("Worth a Look") — HIGH PRIORITY & DEDUPLICATED
  const coachingNotes: CoachingNoteItem[] = [];
  const playersWithAttention = new Set<string>();

  // Workload restriction & high priority player notes
  players.forEach(p => {
    if (p.workloadRestriction?.restrictedBowler) {
      playersWithAttention.add(p.id);
      const playerFocuses = focuses.filter(f => f.playerId === p.id && (f.state === 'Current Focus' || f.state === 'Developing'));
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

  // Session readiness notes
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

  // 3. Derive Player Focus items — NORMAL PRIORITY & EXCLUDES PLAYERS ALREADY IN WORTH A LOOK
  const playerFocusItems: PlayerFocusItem[] = [];
  players.forEach(p => {
    // DO NOT duplicate players who already appear in Worth a Look!
    if (playersWithAttention.has(p.id)) return;

    const playerFocuses = focuses.filter(f => f.playerId === p.id && (f.state === 'Current Focus' || f.state === 'Developing'));

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

  // 4. Adapt Quick Actions to Context (Prevent duplicate Plan Training CTA)
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

  // 5. Derive Up Next items (max 2)
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

  const limitedUpNextItems = upNextItems.slice(0, 2);

  // 6. Derive Recent Activity (max 1-2)
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
    upNextItems: limitedUpNextItems,
    recentActivityItems: recentActivityItems.slice(0, 2)
  };
};

export const HomeView: React.FC<HomeViewProps> = ({
  session,
  match,
  matches = [],
  sessions = [],
  players = [],
  focuses = [],
  resources = [],
  team,
  onStartLiveSession,
  onNavigateToTrain,
  onNavigateToMatch,
  onNavigateToTeam,
  onNavigateToLibrary
}) => {
  const {
    teamName,
    primaryContextType,
    primarySession,
    primaryMatch,
    coachingNotes,
    totalCoachingNotesCount,
    playerFocusItems,
    totalPlayerFocusCount,
    quickActions,
    upNextItems,
    recentActivityItems
  } = deriveHomeState({
    session,
    match,
    matches,
    sessions,
    players,
    focuses,
    resources,
    team
  });

  const handleActionClick = (action: 'train' | 'library' | 'match' | 'team') => {
    if (action === 'train') onNavigateToTrain();
    else if (action === 'library') (onNavigateToLibrary || onNavigateToTrain)();
    else if (action === 'match') onNavigateToMatch();
    else onNavigateToTeam();
  };

  return (
    <div className="home-container">
      {/* 1. PRIMARY CONTEXT CARD */}
      {primaryContextType === 'IN_PROGRESS' && primarySession && (
        <div className="home-primary-card" style={{ borderLeft: '4px solid var(--status-live)' }}>
          <div className="home-primary-badge-row">
            <span className="badge badge-live" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              SESSION IN PROGRESS
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getSessionDuration(primarySession)} mins</span>
          </div>
          <h2 className="home-primary-title">{primarySession.title}</h2>
          <div className="home-primary-meta">
            <span>{teamName}</span>
            <span>·</span>
            <span>{primarySession.startTime}</span>
            <span>·</span>
            <span>{primarySession.confirmedAttendingPlayerIds.length} attending</span>
          </div>
          <div className="home-primary-actions">
            <button className="btn btn-live" onClick={onStartLiveSession}>
              <Play size={18} /> CONTINUE SESSION
            </button>
            <button className="btn btn-secondary" onClick={onNavigateToTrain}>
              VIEW SESSION
            </button>
          </div>
        </div>
      )}

      {primaryContextType === 'TRAINING_TODAY' && primarySession && (
        <div className="home-primary-card">
          <div className="home-primary-badge-row">
            <span className="badge badge-gold">TONIGHT'S TRAINING</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
              {primarySession.startTime}
            </span>
          </div>
          <h2 className="home-primary-title">{primarySession.title}</h2>
          <div className="home-primary-meta">
            <span>{teamName}</span>
            <span>·</span>
            <span>{primarySession.confirmedAttendingPlayerIds.length} players expected</span>
            {primarySession.sessionObjectives.length > 0 && (
              <>
                <span>·</span>
                <span>{primarySession.sessionObjectives[0]}</span>
              </>
            )}
          </div>
          <div className="home-primary-actions">
            <button
              className="btn btn-primary"
              onClick={onStartLiveSession}
              disabled={!primarySession.rotationPlan?.length && !primarySession.blocks?.length}
            >
              <Play size={18} /> START TRAINING
            </button>
            <button className="btn btn-secondary" onClick={onNavigateToTrain}>
              VIEW SESSION
            </button>
          </div>
        </div>
      )}

      {primaryContextType === 'MATCH_DAY' && primaryMatch && (
        <div className="home-primary-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <div className="home-primary-badge-row">
            <span className="badge badge-gold">MATCH DAY</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{primaryMatch.format}</span>
          </div>
          <h2 className="home-primary-title">{teamName} vs {primaryMatch.opponent}</h2>
          <div className="home-primary-meta">
            <span>1:00 PM</span>
            <span>·</span>
            <span>{primaryMatch.venue}</span>
          </div>
          <div className="home-primary-actions">
            <button className="btn btn-gold" onClick={onNavigateToMatch}>
              <Trophy size={18} /> MATCH CENTRE
            </button>
          </div>
        </div>
      )}

      {primaryContextType === 'TRAINING_UPCOMING' && primarySession && (
        <div className="home-primary-card">
          <div className="home-primary-badge-row">
            <span className="badge badge-green">NEXT TRAINING</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {formatShortDate(primarySession.date, primarySession.startTime)}
            </span>
          </div>
          <h2 className="home-primary-title">{primarySession.title}</h2>
          <div className="home-primary-meta">
            <span>{teamName}</span>
            {primarySession.sessionObjectives.length > 0 && (
              <>
                <span>·</span>
                <span>{primarySession.sessionObjectives.join(' + ')}</span>
              </>
            )}
          </div>
          <div className="home-primary-actions">
            <button className="btn btn-primary" onClick={onNavigateToTrain}>
              VIEW SESSION
            </button>
            <button className="btn btn-secondary" onClick={onNavigateToTrain}>
              EDIT PLAN
            </button>
          </div>
        </div>
      )}

      {primaryContextType === 'MATCH_REVIEW' && primaryMatch && (
        <div className="home-primary-card">
          <div className="home-primary-badge-row">
            <span className="badge badge-warning">MATCH COMPLETE</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{primaryMatch.date}</span>
          </div>
          <h2 className="home-primary-title">{teamName} vs {primaryMatch.opponent}</h2>
          <div className="home-primary-meta">
            <span>{primaryMatch.venue}</span>
            {primaryMatch.result && (
              <>
                <span>·</span>
                <span>{primaryMatch.result}</span>
              </>
            )}
          </div>
          <div className="home-primary-actions">
            <button className="btn btn-gold" onClick={onNavigateToMatch}>
              <Trophy size={18} /> REVIEW MATCH
            </button>
          </div>
        </div>
      )}

      {primaryContextType === 'NO_SESSION' && (
        <div className="home-primary-card prompt-card">
          <div className="home-primary-badge-row">
            <span className="badge badge-gold">GET READY</span>
          </div>
          <h2 className="home-primary-title" style={{ fontSize: '1.1rem' }}>Plan your next training</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            No training session is currently scheduled.
          </p>
          <div className="home-primary-actions" style={{ marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={onNavigateToTrain}>
              <Dumbbell size={16} /> Plan Training
            </button>
          </div>
        </div>
      )}

      {/* 2. ADAPTIVE QUICK ACTIONS (CONCISE & DEDUPLICATED) */}
      <div className="quick-actions-grid">
        {quickActions.map(qa => (
          <button key={qa.id} className="quick-action-btn" onClick={() => handleActionClick(qa.action)}>
            <div className="quick-action-icon">
              {qa.icon === 'train' && <Dumbbell size={18} />}
              {qa.icon === 'drill' && <BookOpen size={18} />}
              {qa.icon === 'match' && <Trophy size={18} />}
              {qa.icon === 'team' && <Users size={18} />}
            </div>
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* 3. WORTH A LOOK (HIGH PRIORITY — MAX 3, ENTIRE ROW TAPPABLE) */}
      {coachingNotes.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <span>WORTH A LOOK</span>
            {totalCoachingNotesCount > 3 ? (
              <button
                onClick={onNavigateToTeam}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                View all {totalCoachingNotesCount} <ChevronRight size={12} />
              </button>
            ) : (
              <Sparkles size={14} color="var(--accent-gold)" />
            )}
          </div>
          <div className="home-insight-card">
            {coachingNotes.map(note => (
              <div
                key={note.id}
                className={`home-insight-row ${note.type === 'workload' ? 'gold-accent' : note.type === 'plan' ? 'warning-accent' : 'green-accent'}`}
                onClick={note.target === 'team' ? onNavigateToTeam : note.target === 'match' ? onNavigateToMatch : onNavigateToTrain}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div className="home-insight-info">
                  <div className="home-insight-title">{note.title}</div>
                  <div className="home-insight-desc">{note.description}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '8px' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. PLAYER FOCUS (NORMAL DEVELOPMENT — MAX 3, DEDUPLICATED, ENTIRE ROW TAPPABLE) */}
      {playerFocusItems.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>PLAYER FOCUS</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{totalPlayerFocusCount} active</span>
            </div>
            <button
              onClick={onNavigateToTeam}
              style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="home-insight-card">
            {playerFocusItems.map(item => (
              <div
                key={item.id}
                className="home-insight-row green-accent"
                onClick={onNavigateToTeam}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div className="home-insight-info">
                  <div className="home-insight-title">{item.name}</div>
                  <div className="home-insight-desc">
                    <strong style={{ color: 'var(--accent-gold)' }}>{item.domain}:</strong> {item.focusStatement}
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '8px' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. UP NEXT (MAX 2 CHRONOLOGICAL UPCOMING ITEMS) */}
      {upNextItems.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <span>UP NEXT</span>
            <Clock size={14} color="var(--text-muted)" />
          </div>
          <div className="up-next-card">
            {upNextItems.map(item => (
              <div
                key={item.id}
                className="up-next-row"
                onClick={item.type === 'session' ? onNavigateToTrain : onNavigateToMatch}
                style={{ cursor: 'pointer' }}
              >
                <div className="up-next-left">
                  <div className="up-next-day">
                    <span className="day-name">{item.dayName}</span>
                    <span className="day-num">{item.dayNum}</span>
                  </div>
                  <div className="up-next-details">
                    <div className="up-next-title">{item.title}</div>
                    <div className="up-next-sub">{item.subtext}</div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '8px' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. RECENT ACTIVITY (MAX 1-2 ITEMS, ENTIRE ROW TAPPABLE) */}
      {recentActivityItems.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <span>RECENT ACTIVITY</span>
          </div>
          <div className="home-insight-card">
            {recentActivityItems.map(item => (
              <div
                key={item.id}
                className="home-insight-row"
                onClick={item.type === 'session' ? onNavigateToTrain : onNavigateToMatch}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div className="home-insight-info">
                  <div className="home-insight-title">{item.title}</div>
                  <div className="home-insight-desc">{item.meta}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '8px' }} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
