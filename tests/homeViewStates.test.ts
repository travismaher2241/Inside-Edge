import { describe, it, expect } from 'vitest';
import { deriveHomeState } from '../src/views/HomeView';
import type { ClubTrainingSession, MatchRecord, Player, DevelopmentFocus, TrainingResource, Team } from '../src/types/cricket';

const mockTeam: Team = {
  id: 't-1',
  name: 'Senior Men',
  clubName: 'Warragul CC',
  ageGroup: 'Seniors',
  season: '2026',
  headCoachName: 'Dave Coach'
};

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('HomeView deriveHomeState acceptance tests', () => {
  it('STATE A: Clean Home screen with no session, no match, no alerts', () => {
    const state = deriveHomeState({
      team: mockTeam,
      players: [],
      focuses: [],
      resources: [],
      matches: [],
      sessions: []
    });

    expect(state.primaryContextType).toBe('NO_SESSION');
    expect(state.coachingNotes).toHaveLength(0);
    expect(state.playerFocusItems).toHaveLength(0);
    expect(state.upNextItems).toHaveLength(0);
    expect(state.recentActivityItems).toHaveLength(0);
  });

  it('STATE B: Training scheduled today becomes primary context', () => {
    const todayStr = getTodayStr();
    const todaySession: ClubTrainingSession = {
      id: 'sess-today',
      clubId: 'c1',
      title: 'Match Scenario Practice',
      date: todayStr,
      startTime: '18:00',
      finishTime: '19:30',
      venueFacilityId: 'f1',
      includedTeamIds: ['t-1'],
      availableResourceIds: [],
      expectedPlayerIds: ['p1'],
      confirmedAttendingPlayerIds: ['p1'],
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: ['Death bowling execution'],
      rotationDurationMinutes: 15,
      captainCoachAssignments: [],
      rotationPlan: [],
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 20 },
      blocks: [],
      activeBlockIndex: 0,
      activeRotationIndex: 0,
      status: 'planned',
      warnings: []
    };

    const state = deriveHomeState({
      team: mockTeam,
      session: todaySession,
      sessions: [todaySession],
      players: [],
      focuses: [],
      resources: [],
      matches: []
    });

    expect(state.primaryContextType).toBe('TRAINING_TODAY');
    expect(state.primarySession?.title).toBe('Match Scenario Practice');
  });

  it('STATE C: Training currently active surfaces CONTINUE SESSION primary CTA', () => {
    const todayStr = getTodayStr();
    const activeSession: ClubTrainingSession = {
      id: 'sess-live',
      clubId: 'c1',
      title: 'Live Net Session',
      date: todayStr,
      startTime: '18:00',
      finishTime: '19:30',
      venueFacilityId: 'f1',
      includedTeamIds: ['t-1'],
      availableResourceIds: [],
      expectedPlayerIds: ['p1'],
      confirmedAttendingPlayerIds: ['p1'],
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: [],
      rotationDurationMinutes: 15,
      captainCoachAssignments: [],
      rotationPlan: [],
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 20 },
      blocks: [],
      activeBlockIndex: 0,
      activeRotationIndex: 0,
      status: 'live',
      warnings: []
    };

    const state = deriveHomeState({
      team: mockTeam,
      session: activeSession,
      sessions: [activeSession],
      players: [],
      focuses: [],
      resources: [],
      matches: []
    });

    expect(state.primaryContextType).toBe('IN_PROGRESS');
    expect(state.primarySession?.id).toBe('sess-live');
  });

  it('STATE D: Upcoming match exists without review CTA if not completed', () => {
    const upcomingMatch: MatchRecord = {
      id: 'm-future',
      opponent: 'Drouin CC',
      date: '2099-12-31',
      venue: 'Western Park',
      format: 'T20',
      preMatchPlan: {
        teamObjectives: [],
        battingNotes: '',
        bowlingNotes: '',
        fieldingFocus: ''
      }
    };

    const state = deriveHomeState({
      team: mockTeam,
      matches: [upcomingMatch],
      players: [],
      focuses: [],
      resources: [],
      sessions: []
    });

    // Since no training is today, but future match exists
    expect(state.primaryContextType).toBe('NO_SESSION');
    expect(state.upNextItems).toHaveLength(1);
    expect(state.upNextItems[0].title).toContain('Drouin CC');
  });

  it('STATE E: Today is match day', () => {
    const todayStr = getTodayStr();
    const matchToday: MatchRecord = {
      id: 'm-today',
      opponent: 'Warragul CC',
      date: todayStr,
      venue: 'Western Park',
      format: 'One Day (40/50 Overs)',
      preMatchPlan: {
        teamObjectives: [],
        battingNotes: '',
        bowlingNotes: '',
        fieldingFocus: ''
      }
    };

    const state = deriveHomeState({
      team: mockTeam,
      matches: [matchToday],
      players: [],
      focuses: [],
      resources: [],
      sessions: []
    });

    expect(state.primaryContextType).toBe('MATCH_DAY');
    expect(state.primaryMatch?.opponent).toBe('Warragul CC');
  });

  it('STATE F: Completed match awaiting review is surfaced', () => {
    const pastMatch: MatchRecord = {
      id: 'm-past',
      opponent: 'Garfield CC',
      date: '2020-01-01',
      venue: 'Garfield Oval',
      format: 'T20',
      result: 'Won by 24 runs',
      preMatchPlan: {
        teamObjectives: [],
        battingNotes: '',
        bowlingNotes: '',
        fieldingFocus: ''
      }
    };

    const state = deriveHomeState({
      team: mockTeam,
      matches: [pastMatch],
      players: [],
      focuses: [],
      resources: [],
      sessions: []
    });

    expect(state.primaryContextType).toBe('MATCH_REVIEW');
    expect(state.primaryMatch?.opponent).toBe('Garfield CC');
  });

  it('STATE G: Player workload restriction surfaces in Player Focus & Coaching Notes with player name & reason', () => {
    const restrictedPlayer: Player = {
      id: 'p-1',
      name: 'Ryan Clarke',
      primaryRole: 'pace_bowler',
      secondaryRole: 'none',
      battingHand: 'right',
      bowlingStyle: 'right_arm_fast',
      wicketkeepingCapability: 'none',
      trainingAvailability: true,
      workloadRestriction: {
        restrictedBowler: true,
        maxDeliveries: 30,
        notes: '30 delivery max limit'
      },
      activeDevelopmentFocusIds: []
    };

    const state = deriveHomeState({
      team: mockTeam,
      players: [restrictedPlayer],
      focuses: [],
      resources: [],
      matches: [],
      sessions: []
    });

    expect(state.coachingNotes).toHaveLength(1);
    expect(state.coachingNotes[0].title).toBe('Ryan Clarke');
    expect(state.coachingNotes[0].description).toContain('Bowling workload');

    // Deduplicated: Player with workload in Worth a Look is excluded from Player Focus to prevent duplicate entry
    expect(state.playerFocusItems).toHaveLength(0);
  });

  it('STATE H: No coaching alerts -> sections are empty arrays so UI hides them completely', () => {
    const normalPlayer: Player = {
      id: 'p-2',
      name: 'Sam Batter',
      primaryRole: 'top_order_batter',
      secondaryRole: 'none',
      battingHand: 'left',
      bowlingStyle: 'does_not_bowl',
      wicketkeepingCapability: 'none',
      trainingAvailability: true,
      activeDevelopmentFocusIds: []
    };

    const state = deriveHomeState({
      team: mockTeam,
      players: [normalPlayer],
      focuses: [],
      resources: [],
      matches: [],
      sessions: []
    });

    expect(state.coachingNotes).toHaveLength(0);
    expect(state.playerFocusItems).toHaveLength(0);
  });
});
