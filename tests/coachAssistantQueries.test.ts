import { describe, expect, it } from 'vitest';
import type { ClubTrainingSession, DevelopmentFocus, MatchReport, Observation, Player } from '../src/types/cricket';
import {
  findPlayersWithoutRecentBatting,
  getPlayerCurrentFocuses,
  findPlayersWithWorkloadRestrictions,
  findFocusesDueForReview,
  getWeeklyTrainingPriorities,
  findPlayersWithoutRecentObservations
} from '../src/modules/cricket/coachAssistantQueries';

const player = (id: string, name: string): Player => ({
  id,
  name,
  primaryRole: 'middle_order_batter',
  secondaryRole: 'none',
  battingHand: 'right',
  bowlingStyle: 'does_not_bowl',
  wicketkeepingCapability: 'none',
  trainingAvailability: true,
  activeDevelopmentFocusIds: []
});

const NOW = new Date('2026-08-14T12:00:00Z');

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('findPlayersWithoutRecentBatting', () => {
  const players = [player('p-1', 'Ben Harris'), player('p-2', 'Jack Davies')];

  const sessionWithBatter = (playerId: string, daysAgo: number): ClubTrainingSession => ({
    id: `sess-${daysAgo}`,
    clubId: 'club-1',
    title: 'Session',
    date: daysAgoIso(daysAgo).split('T')[0],
    startTime: '18:00',
    finishTime: '19:30',
    venueFacilityId: 'fac-1',
    includedTeamIds: [],
    availableResourceIds: [],
    expectedPlayerIds: [],
    confirmedAttendingPlayerIds: [],
    availabilityRecords: {},
    staffPlayerAssignments: {},
    sessionObjectives: [],
    rotationDurationMinutes: 12,
    captainCoachAssignments: [],
    rotationPlan: [{
      blockId: 'b-1',
      blockIndex: 0,
      durationMinutes: 12,
      startTime: '18:00',
      endTime: '18:12',
      resourceAssignments: [{
        resourceId: 'r-1',
        resourceName: 'Net 1',
        batterPlayerIds: [playerId],
        bowlerPodPlayerIds: [],
        wicketkeeperPlayerIds: [],
        feederPlayerIds: [],
        fieldingPlayerIds: [],
        restPlayerIds: []
      }],
      unassignedPlayerIds: [],
      alerts: []
    }],
    manualLocks: {},
    fairnessSettings: { targetEqualBattingMinutes: 0 },
    defaultGroupingStrategy: 'graded',
    planningVersion: 1,
    rsvps: {},
    liveAttendance: {},
    blocks: [],
    activeBlockIndex: 0,
    activeRotationIndex: 0,
    status: 'planned',
    warnings: []
  });

  it('excludes players who batted within the lookback window', () => {
    const sessions = [sessionWithBatter('p-1', 2)];
    const gaps = findPlayersWithoutRecentBatting(players, sessions, 7, NOW);
    expect(gaps.map(g => g.playerId)).toEqual(['p-2']);
  });

  it('includes a player whose only batting session is outside the lookback window', () => {
    const sessions = [sessionWithBatter('p-1', 10)];
    const gaps = findPlayersWithoutRecentBatting(players, sessions, 7, NOW);
    expect(gaps.map(g => g.playerId).sort()).toEqual(['p-1', 'p-2']);
  });
});

describe('getPlayerCurrentFocuses', () => {
  const focus = (overrides: Partial<DevelopmentFocus>): DevelopmentFocus => ({
    id: 'f-1',
    playerId: 'p-1',
    domain: 'Batting',
    focusStatement: 'Decision-making outside off',
    state: 'CURRENT',
    why: '3 dismissals in last 2 matches',
    startDate: '2026-08-01',
    history: [],
    coachSummary: '',
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: false },
    ...overrides
  });

  it('returns only non-archived focuses for the given player', () => {
    const focuses = [
      focus({ id: 'f-1', playerId: 'p-1', state: 'CURRENT' }),
      focus({ id: 'f-2', playerId: 'p-1', state: 'ARCHIVED' }),
      focus({ id: 'f-3', playerId: 'p-2', state: 'CURRENT' })
    ];
    const result = getPlayerCurrentFocuses('p-1', focuses);
    expect(result).toHaveLength(1);
    expect(result[0].focusStatement).toBe('Decision-making outside off');
  });

  it('returns an empty list when the player has no focuses', () => {
    expect(getPlayerCurrentFocuses('p-nobody', [])).toEqual([]);
  });
});

describe('findPlayersWithWorkloadRestrictions', () => {
  it('flags only players with an active bowling workload restriction', () => {
    const players = [
      { ...player('p-1', 'Jack Davies'), workloadRestriction: { restrictedBowler: true, notes: 'Managing shoulder strain', maxDeliveries: 36 } },
      player('p-2', 'Ben Harris')
    ];
    const flagged = findPlayersWithWorkloadRestrictions(players);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].playerName).toBe('Jack Davies');
    expect(flagged[0].maxDeliveries).toBe(36);
  });
});

describe('findFocusesDueForReview', () => {
  it('returns focuses whose review date has passed, sorted earliest first', () => {
    const players = [player('p-1', 'Ben Harris')];
    const focuses: DevelopmentFocus[] = [
      { id: 'f-1', playerId: 'p-1', domain: 'Batting', focusStatement: 'Focus A', state: 'CURRENT', why: '', startDate: '2026-07-01', reviewDate: '2026-08-10', history: [], coachSummary: '', access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: false } },
      { id: 'f-2', playerId: 'p-1', domain: 'Bowling', focusStatement: 'Focus B', state: 'DEVELOPING', why: '', startDate: '2026-07-01', reviewDate: '2026-09-01', history: [], coachSummary: '', access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: false } }
    ];
    const due = findFocusesDueForReview(players, focuses, NOW);
    expect(due).toHaveLength(1);
    expect(due[0].focusStatement).toBe('Focus A');
  });
});

describe('getWeeklyTrainingPriorities', () => {
  it('reuses the same aggregation as the Weekly Club Round-Up to rank recent issues', () => {
    const reports: MatchReport[] = [
      { id: 'r-1', teamId: 't-1', submissionToken: 'tok', captainName: 'C', matchDate: daysAgoIso(2).split('T')[0], opponent: 'X', taggedIssues: ['New-ball batting', 'New-ball batting'], notes: '', createdAt: daysAgoIso(2) },
      { id: 'r-2', teamId: 't-1', submissionToken: 'tok', captainName: 'C', matchDate: daysAgoIso(3).split('T')[0], opponent: 'Y', taggedIssues: ['Catching under pressure'], notes: '', createdAt: daysAgoIso(3) }
    ];
    const priorities = getWeeklyTrainingPriorities(reports, 7, 3, NOW);
    expect(priorities[0]).toBe('New-ball batting');
    expect(priorities).toContain('Catching under pressure');
  });
});

describe('findPlayersWithoutRecentObservations', () => {
  it('excludes players with an observation inside the lookback window', () => {
    const players = [player('p-1', 'Ben Harris'), player('p-2', 'Jack Davies')];
    const observations: Observation[] = [
      { id: 'o-1', operationId: 'op-1', playerId: 'p-1', source: 'training', tags: ['Technique'], textNote: '', linkedFocusIds: [], access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: false }, createdAt: daysAgoIso(3), createdByUserId: 'u-1', baseRevision: 0, revision: 1 }
    ];
    const gaps = findPlayersWithoutRecentObservations(players, observations, 14, NOW);
    expect(gaps.map(g => g.playerId)).toEqual(['p-2']);
  });
});
