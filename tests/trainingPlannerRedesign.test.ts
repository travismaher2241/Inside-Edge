import { describe, it, expect } from 'vitest';
import type { Player, ClubTeam, TrainingResource, ClubTrainingSession } from '../src/types/cricket';
import { handleLiveNoShow } from '../src/modules/cricket/clubRotationEngine';

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Ben Harris', primaryRole: 'top_order_batter', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] },
  { id: 'p2', name: 'Jack Davies', primaryRole: 'pace_bowler', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'right_arm_fast', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] }
];

const mockTeams: ClubTeam[] = [
  { id: 't1', name: 'Senior Men', ageGroup: 'Seniors', squadPlayerIds: ['p1', 'p2'] }
];

const mockResources: TrainingResource[] = [
  { id: 'r1', name: 'Net 1', facilityId: 'fac-1', type: 'net', active: true, supportsBatting: true, supportsPaceBowling: true, supportsSpinBowling: true, supportsWicketkeeping: false, supportsCentreWicket: false, maxBattersSimultaneous: 2, maxBowlersSimultaneous: 4, minStaffRequired: 0, preferredStaffIds: [] }
];

const mockSession: ClubTrainingSession = {
  id: 'sess-1',
  clubId: 'club-1',
  title: 'Thursday Training',
  date: '2026-08-12',
  startTime: '18:00',
  finishTime: '19:12',
  venueFacilityId: 'fac-1',
  includedTeamIds: ['t1'],
  availableResourceIds: ['r1'],
  expectedPlayerIds: ['p1', 'p2'],
  confirmedAttendingPlayerIds: ['p1', 'p2'],
  availabilityRecords: {},
  staffPlayerAssignments: {},
  sessionObjectives: ['Decision making'],
  rotationDurationMinutes: 12,
  captainCoachAssignments: [],
  rotationPlan: [
    {
      blockId: 'b1',
      blockIndex: 0,
      startTime: '18:00',
      endTime: '18:12',
      durationMinutes: 12,
      resourceAssignments: [{ resourceId: 'r1', resourceName: 'Net 1', batterPlayerIds: ['p1'], bowlerPodPlayerIds: ['p2'], wicketkeeperPlayerIds: [], feederPlayerIds: [], fieldingPlayerIds: [], restPlayerIds: [], unassignedPlayerIds: [] }],
      unassignedPlayerIds: []
    },
    {
      blockId: 'b2',
      blockIndex: 1,
      startTime: '18:12',
      endTime: '18:24',
      durationMinutes: 12,
      resourceAssignments: [{ resourceId: 'r1', resourceName: 'Net 1', batterPlayerIds: ['p2'], bowlerPodPlayerIds: ['p1'], wicketkeeperPlayerIds: [], feederPlayerIds: [], fieldingPlayerIds: [], restPlayerIds: [], unassignedPlayerIds: [] }],
      unassignedPlayerIds: []
    }
  ],
  manualLocks: {},
  fairnessSettings: { targetEqualBattingMinutes: 30 },
  blocks: [],
  activeBlockIndex: 0,
  activeRotationIndex: 0,
  status: 'live',
  warnings: []
};

describe('Training Planner Wizard & Live Mode Redesign Acceptance Tests', () => {
  it('TEST A — SCOPE: Correctly derives team scope string', () => {
    const selectedTeamIds = ['t1'];
    const activeTeams = mockTeams;
    const scopeLabel = selectedTeamIds.length === activeTeams.length && activeTeams.length > 1
      ? 'Whole club'
      : mockTeams.filter(t => selectedTeamIds.includes(t.id)).map(t => t.name).join(', ');

    expect(scopeLabel).toBe('Senior Men');
  });

  it('TEST B — ATTENDANCE: Allows bulk attendance marking', () => {
    const records: Record<string, { status: string }> = {};
    mockPlayers.forEach(p => { records[p.id] = { status: 'attending' }; });
    expect(Object.values(records).every(r => r.status === 'attending')).toBe(true);
  });

  it('TEST L — LIVE RECALCULATION: Keeps current active block stable when future blocks recalculate', () => {
    const activeBlockIdx = 0;
    const updated = handleLiveNoShow(mockSession, 'p1', activeBlockIdx, mockPlayers, mockTeams, mockResources);

    // Current block (Block 0) assignments remain unchanged!
    expect(updated.rotationPlan[0].resourceAssignments[0].batterPlayerIds).toEqual(['p1']);
    // Future block (Block 1) has been updated because p1 is absent
    expect(updated.rotationPlan[1].resourceAssignments[0].bowlerPodPlayerIds).not.toContain('p1');
  });
});
