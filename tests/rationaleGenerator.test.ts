import { describe, expect, it } from 'vitest';
import type { ClubTeam, Player, PlayerAvailabilityRecord, StaffPlayerAssignment, TrainingResource } from '../src/types/cricket';
import {
  generateClubRotationPlan,
  generateSessionRationale,
  getPlanBalanceLabel
} from '../src/modules/cricket/clubRotationEngine';

const player = (index: number): Player => ({
  id: `p-${index}`,
  name: `Player ${index}`,
  primaryRole: index % 3 === 0 ? 'pace_bowler' : 'middle_order_batter',
  secondaryRole: 'none',
  battingHand: index % 2 ? 'right' : 'left',
  bowlingStyle: index % 3 === 0 ? 'right_arm_fast_medium' : 'does_not_bowl',
  wicketkeepingCapability: 'none',
  trainingAvailability: true,
  activeDevelopmentFocusIds: []
});

const resource = (id: string, name: string, type: TrainingResource['type'] = 'standard_net'): TrainingResource => ({
  id,
  facilityId: 'facility-1',
  name,
  type,
  active: true,
  maxBatters: 2,
  minBowlers: 1,
  maxBowlers: 3,
  maxTotalParticipants: 6,
  requiresCoachOrLeader: true,
  supportsLiveBatting: true,
  supportsCentreWicket: false
});

function buildInputs(resources: TrainingResource[], count = 12) {
  const players = Array.from({ length: count }, (_, index) => player(index + 1));
  const team: ClubTeam = { id: 'team-1', name: 'Club XI', ageGroup: 'Senior', submissionToken: 'token', createdAt: '2026-01-01', active: true, squadPlayerIds: players.map(p => p.id), captainIds: ['p-1'] };
  const availability: Record<string, PlayerAvailabilityRecord> = {};
  const staffAssignments: Record<string, StaffPlayerAssignment> = {};
  players.forEach(p => {
    availability[p.id] = { playerId: p.id, status: 'attending', expectedArrivalTime: '18:00', expectedDepartureTime: '19:30' };
    staffAssignments[p.id] = { playerId: p.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: p.bowlingStyle === 'does_not_bowl' ? 'none' : 'general_rotation', bowlingTrainingBand: 'band_1_primary' };
  });
  return { players, teams: [team], resources, availability, staffAssignments };
}

describe('generateSessionRationale', () => {
  it('describes lane objectives and session focus in plain English', () => {
    const resources = [
      resource('r-1', 'Net 1 - New Ball Seam'),
      resource('r-2', 'Net 2 - Spin & Strike Rotation'),
      resource('r-3', 'Net 3 - Death Bowling & Machine')
    ];
    const data = buildInputs(resources);
    const objectives = ['New-ball decision making', 'Death bowling & yorkers'];
    const output = generateClubRotationPlan({
      ...data,
      sessionObjectives: objectives,
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '18:00',
      sessionFinishTime: '19:30'
    });

    const rationale = generateSessionRationale(output, objectives);

    expect(rationale).toContain('new-ball decision making');
    expect(rationale).toContain('The plan allocates');
    expect(rationale).toMatch(/Net 1 to new-ball decision making/);
    expect(rationale).toMatch(/Net 2 to spin & strike rotation/);
    expect(rationale).toMatch(/Net 3 to death bowling/);
  });

  it('falls back to a plain message when there are no active rotation blocks', () => {
    const rationale = generateSessionRationale(
      { rotationBlocks: [], explainablePlanScore: 0, warnings: [], unsatisfiedSoftConstraints: [], capacityMetrics: { theoreticalCapacityMinutes: 0, staffableCapacityMinutes: 0, actuallyAllocatedCapacityMinutes: 0, unusedCapacityMinutes: 0 } },
      []
    );
    expect(rationale).toBe('No training areas were active, so no rotation plan could be generated.');
  });

  it('surfaces the top unsatisfied soft constraint when present', () => {
    const resources = [resource('r-1', 'Net 1 - New Ball Seam')];
    const data = buildInputs(resources, 20);
    const output = generateClubRotationPlan({
      ...data,
      sessionObjectives: [],
      rotationBlockDurationMinutes: 10,
      sessionStartTime: '18:00',
      sessionFinishTime: '18:20'
    });

    const rationale = generateSessionRationale(output, []);
    if (output.unsatisfiedSoftConstraints.length > 0) {
      expect(rationale).toContain(output.unsatisfiedSoftConstraints[0]);
    }
  });
});

describe('getPlanBalanceLabel', () => {
  it('labels high scores as good balance', () => {
    expect(getPlanBalanceLabel(95)).toMatch(/Good balance/);
  });

  it('labels mid scores as fair balance', () => {
    expect(getPlanBalanceLabel(75)).toMatch(/Fair balance/);
  });

  it('labels low scores as needing attention', () => {
    expect(getPlanBalanceLabel(40)).toMatch(/Needs attention/);
  });
});
