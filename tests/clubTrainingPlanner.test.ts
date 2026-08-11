import { describe, expect, it } from 'vitest';
import type { ClubTeam, ClubTrainingSession, Player, PlayerAvailabilityRecord, StaffPlayerAssignment, TrainingResource } from '../src/types/cricket';
import {
  calculateSessionFeasibility,
  completeSessionWithFairness,
  generateClubRotationPlan,
  handleLiveNoShow,
  handleManualSwap,
  updateRollingFairnessLedger
} from '../src/modules/cricket/clubRotationEngine';

const player = (index: number): Player => ({
  id: `p-${index}`,
  name: `Player ${index}`,
  primaryRole: index % 8 === 0 ? 'wicketkeeper' : index % 3 === 0 ? 'pace_bowler' : 'middle_order_batter',
  secondaryRole: 'none',
  battingHand: index % 2 ? 'right' : 'left',
  bowlingStyle: index % 4 === 0 ? 'right_arm_off_spin' : index % 3 === 0 ? 'right_arm_fast_medium' : 'does_not_bowl',
  wicketkeepingCapability: index % 8 === 0 ? 'primary' : 'none',
  trainingAvailability: true,
  activeDevelopmentFocusIds: []
});

const resource = (index: number, type: TrainingResource['type'] = 'standard_net'): TrainingResource => ({
  id: `r-${index}`,
  facilityId: 'facility-1',
  name: `Resource ${index}`,
  type,
  active: true,
  maxBatters: type === 'centre_wicket' ? 4 : 2,
  minBowlers: type === 'fielding_area' ? 0 : 1,
  maxBowlers: type === 'centre_wicket' ? 5 : 3,
  maxTotalParticipants: type === 'centre_wicket' ? 14 : type === 'fielding_area' ? 20 : 6,
  requiresCoachOrLeader: true,
  supportsLiveBatting: type !== 'fielding_area',
  supportsCentreWicket: type === 'centre_wicket'
});

function inputs(count = 24, resources: TrainingResource[] = [resource(1), resource(2), resource(3, 'centre_wicket')]) {
  const players = Array.from({ length: count }, (_, index) => player(index + 1));
  const team: ClubTeam = { id: 'team-1', name: 'Club XI', ageGroup: 'Senior', submissionToken: 'token', createdAt: '2026-01-01', active: true, squadPlayerIds: players.map(item => item.id), captainIds: ['p-1'] };
  const availability: Record<string, PlayerAvailabilityRecord> = {};
  const staffAssignments: Record<string, StaffPlayerAssignment> = {};
  players.forEach(item => {
    availability[item.id] = { playerId: item.id, status: 'attending', expectedArrivalTime: '18:00', expectedDepartureTime: '19:30' };
    staffAssignments[item.id] = { playerId: item.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: item.bowlingStyle === 'does_not_bowl' ? 'none' : 'general_rotation', bowlingTrainingBand: 'band_1_primary' };
  });
  return { players, teams: [team], resources, availability, staffAssignments };
}

describe('Club Training Planner engine', () => {
  it('calculates capacity dynamically', () => {
    const data = inputs(12, [resource(1), resource(2)]);
    const result = calculateSessionFeasibility({ availableResources: data.resources, attendingPlayers: data.players, staffAssignments: data.staffAssignments, availabilityRecords: data.availability, sessionDurationMinutes: 60, rotationBlockDurationMinutes: 10 });
    expect(result.totalNetBattingCapacityMinutes).toBe(240);
    expect(result.fairBattingMinutesPerPlayer).toBe(20);
    expect(result.isFeasible).toBe(true);
  });

  it('scales beyond 100 players without double booking or exceeding capacities', () => {
    const resources = [...Array.from({ length: 6 }, (_, index) => resource(index + 1)), resource(7, 'centre_wicket'), resource(8, 'centre_wicket'), resource(9, 'fielding_area')];
    const data = inputs(120, resources);
    data.availability['p-1'].expectedArrivalTime = '18:30';
    const output = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '19:30' });
    expect(output.rotationBlocks).toHaveLength(9);
    output.rotationBlocks.forEach(block => {
      const seen = new Set<string>();
      block.resourceAssignments.forEach(assignment => {
        const ids = [...assignment.batterPlayerIds, ...assignment.bowlerPodPlayerIds, ...assignment.wicketkeeperPlayerIds, ...assignment.feederPlayerIds, ...assignment.fieldingPlayerIds, ...assignment.restPlayerIds];
        expect(ids.length).toBeLessThanOrEqual(resources.find(item => item.id === assignment.resourceId)!.maxTotalParticipants);
        ids.forEach(id => { expect(seen.has(id)).toBe(false); seen.add(id); });
      });
      if (block.startTime < '18:30') expect(seen.has('p-1')).toBe(false);
    });
  });

  it('separates theoretical, staffable, allocated and unused capacity', () => {
    const staffed = resource(1);
    const unstaffed = { ...resource(2), id: 'unstaffed', name: 'Unstaffed net' };
    const data = inputs(8, [staffed, unstaffed]);
    data.teams[0].captainIds = ['p-1'];
    const output = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '18:20' });
    expect(output.capacityMetrics.theoreticalCapacityMinutes).toBe(80);
    expect(output.capacityMetrics.staffableCapacityMinutes).toBeLessThanOrEqual(output.capacityMetrics.theoreticalCapacityMinutes);
    expect(output.capacityMetrics.actuallyAllocatedCapacityMinutes).toBeLessThanOrEqual(output.capacityMetrics.theoreticalCapacityMinutes);
    expect(output.capacityMetrics.unusedCapacityMinutes).toBeGreaterThanOrEqual(0);
  });

  it('keeps player requests non-binding until staff explicitly assign priority', () => {
    const data = inputs(20);
    data.availability['p-10'].requestComment = 'Give me every batting turn';
    data.availability['p-10'].requestApprovedByStaff = false;
    const requested = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '19:00' });
    delete data.availability['p-10'].requestComment;
    const baseline = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '19:00' });
    expect(requested.rotationBlocks).toEqual(baseline.rotationBlocks);
  });

  it('gives every centre-wicket participant an explicit role', () => {
    const data = inputs(18, [resource(1, 'centre_wicket')]);
    const output = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 12, sessionStartTime: '18:00', sessionFinishTime: '18:24' });
    output.rotationBlocks.forEach(block => block.resourceAssignments.forEach(assignment => {
      const scenario = assignment.centreWicketScenario;
      if (!scenario) return;
      const participants = new Set([...assignment.batterPlayerIds, ...assignment.bowlerPodPlayerIds, ...assignment.wicketkeeperPlayerIds, ...assignment.fieldingPlayerIds]);
      expect(new Set(scenario.assignments.map(item => item.playerId))).toEqual(participants);
    }));
  });

  it('preserves completed and active blocks during no-show recalculation', () => {
    const data = inputs(20);
    const output = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '19:00' });
    const session: ClubTrainingSession = { id: 'session-1', clubId: 'club-1', title: 'Training', date: '2026-08-11', startTime: '18:00', finishTime: '19:00', venueFacilityId: 'facility-1', includedTeamIds: ['team-1'], availableResourceIds: data.resources.map(item => item.id), expectedPlayerIds: data.players.map(item => item.id), confirmedAttendingPlayerIds: data.players.map(item => item.id), availabilityRecords: data.availability, staffPlayerAssignments: data.staffAssignments, sessionObjectives: [], rotationDurationMinutes: 10, captainCoachAssignments: [], rotationPlan: output.rotationBlocks, manualLocks: {}, fairnessSettings: { targetEqualBattingMinutes: 10 }, blocks: [], activeBlockIndex: 0, activeRotationIndex: 0, status: 'live', warnings: [] };
    const updated = handleLiveNoShow(session, 'p-5', 1, data.players, data.teams, data.resources);
    expect(updated.rotationPlan).toHaveLength(session.rotationPlan.length);
    expect(updated.rotationPlan.slice(0, 2)).toEqual(session.rotationPlan.slice(0, 2));
    updated.rotationPlan.slice(2).forEach(block => block.resourceAssignments.forEach(assignment => expect([...assignment.batterPlayerIds, ...assignment.bowlerPodPlayerIds, ...assignment.fieldingPlayerIds]).not.toContain('p-5')));
  });

  it('only applies manual swaps to future blocks and records locks', () => {
    const data = inputs(20);
    const output = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '19:00' });
    const session = { id: 's', clubId: 'c', title: 't', date: '2026-08-11', startTime: '18:00', finishTime: '19:00', venueFacilityId: 'f', includedTeamIds: ['team-1'], availableResourceIds: data.resources.map(item => item.id), expectedPlayerIds: data.players.map(item => item.id), confirmedAttendingPlayerIds: data.players.map(item => item.id), availabilityRecords: data.availability, staffPlayerAssignments: data.staffAssignments, sessionObjectives: [], rotationDurationMinutes: 10, captainCoachAssignments: [], rotationPlan: output.rotationBlocks, manualLocks: {}, fairnessSettings: { targetEqualBattingMinutes: 10 }, status: 'live' as const, warnings: [] };
    const swapped = handleManualSwap(session, 'p-1', 'p-2', 0);
    expect(swapped.rotationPlan[0]).toEqual(session.rotationPlan[0]);
    expect(Object.keys(swapped.manualLocks).length).toBeGreaterThan(0);
  });

  it('accumulates missed-turn fairness credit', () => {
    const ledger = updateRollingFairnessLedger([], [{ sessionId: 's', date: '2026-08-11', playerId: 'p-1', plannedBattingMinutes: 5, actualBattingMinutes: 5, extraBattingMinutesGranted: 0, deliveriesBowled: 12, centreWicketOvers: 0, missedOrShortenedMinutes: 7 }]);
    expect(ledger[0].accumulatedFairnessCreditMinutes).toBe(7);
  });

  it('applies completion fairness exactly once', () => {
    const data = inputs(12, [resource(1)]);
    const output = generateClubRotationPlan({ ...data, sessionObjectives: [], rotationBlockDurationMinutes: 10, sessionStartTime: '18:00', sessionFinishTime: '18:20' });
    const session: ClubTrainingSession = { id: 'complete-once', clubId: 'club', title: 'Training', date: '2026-08-11', startTime: '18:00', finishTime: '18:20', venueFacilityId: 'f', includedTeamIds: ['team-1'], availableResourceIds: ['r-1'], expectedPlayerIds: data.players.map(item => item.id), confirmedAttendingPlayerIds: data.players.map(item => item.id), availabilityRecords: data.availability, staffPlayerAssignments: data.staffAssignments, sessionObjectives: [], rotationDurationMinutes: 10, captainCoachAssignments: [], rotationPlan: output.rotationBlocks, manualLocks: {}, fairnessSettings: { targetEqualBattingMinutes: 10 }, blocks: [], activeBlockIndex: 0, activeRotationIndex: 0, status: 'live', warnings: [] };
    const first = completeSessionWithFairness(session, data.players, []);
    const second = completeSessionWithFairness(first.session, data.players, first.ledger);
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.ledger).toEqual(first.ledger);
  });
});
