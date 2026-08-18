import type { ClubTrainingSession } from '../src/types/cricket';

export function makeStationSession(overrides: Partial<ClubTrainingSession> = {}): ClubTrainingSession {
  return {
    id: 'sess-station-test-1',
    clubId: 'club-1',
    title: 'Thursday Pre-Season Rotation',
    date: '2026-10-15',
    startTime: '18:00',
    finishTime: '19:30',
    venueFacilityId: 'fac-1',
    includedTeamIds: ['ct-1', 'ct-2', 'ct-3'],
    availableResourceIds: ['res-4'],
    expectedPlayerIds: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'],
    confirmedAttendingPlayerIds: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'],
    availabilityRecords: {},
    staffPlayerAssignments: {},
    sessionObjectives: ['Death overs execution', 'Pace bowling accuracy'],
    rotationDurationMinutes: 12,
    captainCoachAssignments: [],
    rotationPlan: [{
      blockId: 'blk-1',
      blockIndex: 0,
      startTime: '18:00',
      endTime: '18:12',
      durationMinutes: 12,
      unassignedPlayerIds: [],
      resourceAssignments: [{
        resourceId: 'res-4',
        resourceName: 'Centre Wicket - Main Oval',
        leaderId: 'p-1',
        batterPlayerIds: ['p-1', 'p-2'],
        bowlerPodPlayerIds: ['p-3', 'p-4'],
        wicketkeeperPlayerIds: ['p-5'],
        feederPlayerIds: [],
        fieldingPlayerIds: [],
        restPlayerIds: [],
        centreWicketScenario: {
          scenarioId: 'cws-1',
          name: 'Death Overs 24 off 18',
          inningsPhase: 'death',
          targetRuns: 24,
          targetOversOrBalls: 18,
          wicketsRemaining: 4,
          batterPlayerIds: ['p-1', 'p-2'],
          bowlerPlayerIds: ['p-3', 'p-4'],
          fieldingTeamPlayerIds: ['p-5'],
          rules: [],
          outcomeFocus: ['Execution'],
          safetyRequirements: []
        }
      }]
    }],
    manualLocks: {},
    fairnessSettings: { targetEqualBattingMinutes: 12 },
    blocks: [],
    activeBlockIndex: 0,
    activeRotationIndex: 0,
    status: 'planned',
    warnings: [],
    planningVersion: 1,
    rsvps: {},
    liveAttendance: {},
    ...overrides
  };
}
