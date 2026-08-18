import { describe, it, expect } from 'vitest';
import {
  generateClubRotationPlan,
  handleLiveLateArrival,
  handleLiveEarlyDeparture,
  handleLiveNoShow,
  handleLiveInjury,
  handleManualSwap,
  completeSessionWithFairness,
  calculateSessionFairness,
  updateRollingFairnessLedger
} from '../src/modules/cricket/clubRotationEngine';
import { SEED_CLUB_TEAMS, SEED_PLAYERS, SEED_TRAINING_RESOURCES } from '../src/modules/cricket/seedData';
import { makeStationSession } from './stationTestFixtures';
import type { ClubTrainingSession, Player, ClubTeam, TrainingResource, RollingFairnessLedger } from '../src/types/cricket';

describe('Live Dynamic In-Session Rebalancing & Wrap-Up Tests', () => {
  const createMockResources = (): TrainingResource[] => [
    { id: 'res-1', facilityId: 'fac-1', name: 'Net 1 - Seam & Pace', type: 'pace_new_ball_net', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 4, maxTotalParticipants: 8, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false },
    { id: 'res-2', facilityId: 'fac-1', name: 'Net 2 - Spin & Variations', type: 'spin_net', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 4, maxTotalParticipants: 8, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false },
    { id: 'res-3', facilityId: 'fac-1', name: 'Net 3 - Standard Net', type: 'standard_net', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 4, maxTotalParticipants: 8, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false },
    { id: 'res-4', facilityId: 'fac-1', name: 'Centre Wicket', type: 'centre_wicket', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 8, maxTotalParticipants: 16, requiresCoachOrLeader: true, supportsLiveBatting: true, supportsCentreWicket: true },
    { id: 'res-5', facilityId: 'fac-1', name: 'Outfield Drills', type: 'open_field', active: true, maxBatters: 0, minBowlers: 0, maxBowlers: 0, maxTotalParticipants: 30, requiresCoachOrLeader: false, supportsLiveBatting: false, supportsCentreWicket: false }
  ];

  const createMockTeams = (): ClubTeam[] => [
    { id: 't-1', clubId: 'c-1', name: '1st XI', gradeLevel: 1, coachIds: ['p-1'], captainIds: ['p-2'] },
    { id: 't-2', clubId: 'c-1', name: '2nd XI', gradeLevel: 2, coachIds: [], captainIds: ['p-6'] },
    { id: 't-3', clubId: 'c-1', name: '3rd XI', gradeLevel: 3, coachIds: [], captainIds: ['p-11'] },
    { id: 't-4', clubId: 'c-1', name: '4th XI', gradeLevel: 4, coachIds: [], captainIds: ['p-16'] }
  ];

  const createMockPlayers = (count = 20): Player[] => {
    return Array.from({ length: count }, (_, i) => {
      const idx = i + 1;
      const teamId = idx <= 5 ? 't-1' : idx <= 10 ? 't-2' : idx <= 15 ? 't-3' : 't-4';
      return {
        id: `p-${idx}`,
        name: `Player ${idx}`,
        primaryTeamId: teamId,
        primaryRole: idx % 4 === 1 ? 'top_order_batter' : idx % 4 === 2 ? 'pace_bowler' : idx % 4 === 3 ? 'spin_bowler' : 'all_rounder',
        battingHand: idx % 2 === 0 ? 'right' : 'left',
        bowlingStyle: idx % 3 === 0 ? 'right_arm_fast' : idx % 3 === 1 ? 'right_arm_off_spin' : 'left_arm_fast_medium',
        wicketkeepingCapability: idx === 4 ? 'primary' : 'none',
        trainingAvailability: true,
        attendanceRate: 90
      };
    });
  };

  it('preserves completed/active blocks and incorporates late arrivals into future blocks', () => {
    const resources = createMockResources();
    const teams = createMockTeams();
    const players = createMockPlayers(20);

    // Initial plan without player p-20 (marked not attending initially)
    const availability: Record<string, { playerId: string; status: 'attending' | 'not_attending'; expectedArrivalTime?: string }> = {};
    players.forEach(p => {
      availability[p.id] = { playerId: p.id, status: p.id === 'p-20' ? 'not_attending' : 'attending' };
    });

    const initialOutput = generateClubRotationPlan({
      resources,
      players,
      teams,
      availability,
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '18:00',
      sessionFinishTime: '19:12' // 6 blocks
    });

    expect(initialOutput.rotationBlocks).toHaveLength(6);

    const session: ClubTrainingSession = {
      id: 'session-live-1',
      clubId: 'c-1',
      title: 'Thursday Club Practice',
      date: '2026-10-15',
      startTime: '18:00',
      finishTime: '19:12',
      venueFacilityId: 'fac-1',
      includedTeamIds: ['t-1', 't-2', 't-3', 't-4'],
      availableResourceIds: resources.map(r => r.id),
      expectedPlayerIds: players.map(p => p.id),
      confirmedAttendingPlayerIds: players.filter(p => p.id !== 'p-20').map(p => p.id),
      availabilityRecords: availability,
      staffPlayerAssignments: {},
      sessionObjectives: ['Death overs execution'],
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: initialOutput.rotationBlocks,
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 24 },
      status: 'live',
      warnings: []
    };

    // Late arrival at Block index 2 (18:24)
    const updated = handleLiveLateArrival(session, 'p-20', '18:24', 1, players, teams, resources);

    expect(updated.confirmedAttendingPlayerIds).toContain('p-20');
    expect(updated.liveAttendance['p-20']?.status).toBe('present');

    // Total blocks preserved
    expect(updated.rotationPlan).toHaveLength(6);
    // Blocks 0 and 1 remain 100% unchanged
    expect(updated.rotationPlan[0]).toEqual(session.rotationPlan[0]);
    expect(updated.rotationPlan[1]).toEqual(session.rotationPlan[1]);

    // Blocks 0 and 1 must NOT contain p-20
    const earlyParticipants = updated.rotationPlan.slice(0, 2).flatMap(b =>
      b.resourceAssignments.flatMap(r => [...r.batterPlayerIds, ...r.bowlerPodPlayerIds, ...r.fieldingPlayerIds])
    );
    expect(earlyParticipants).not.toContain('p-20');

    // Future blocks (2..5) must include p-20 in active or fielding/rest participation
    const futureAllIds = updated.rotationPlan.slice(2).flatMap(b => [
      ...b.resourceAssignments.flatMap(r => [...r.batterPlayerIds, ...r.bowlerPodPlayerIds, ...r.fieldingPlayerIds]),
      ...b.unassignedPlayerIds
    ]);
    expect(futureAllIds).toContain('p-20');
  });

  it('preserves completed blocks and removes no-shows from future blocks', () => {
    const resources = createMockResources();
    const teams = createMockTeams();
    const players = createMockPlayers(20);

    const initialOutput = generateClubRotationPlan({
      resources,
      players,
      teams,
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '18:00',
      sessionFinishTime: '19:12'
    });

    const session: ClubTrainingSession = {
      id: 'session-live-2',
      clubId: 'c-1',
      title: 'Thursday Practice',
      date: '2026-10-15',
      startTime: '18:00',
      finishTime: '19:12',
      venueFacilityId: 'fac-1',
      includedTeamIds: ['t-1', 't-2', 't-3', 't-4'],
      availableResourceIds: resources.map(r => r.id),
      expectedPlayerIds: players.map(p => p.id),
      confirmedAttendingPlayerIds: players.map(p => p.id),
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: [],
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: initialOutput.rotationBlocks,
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 24 },
      status: 'live',
      warnings: []
    };

    // p-3 leaves early / no-show during Block index 1
    const updated = handleLiveNoShow(session, 'p-3', 1, players, teams, resources);

    expect(updated.confirmedAttendingPlayerIds).not.toContain('p-3');
    expect(updated.liveAttendance['p-3']?.status).toBe('live_absent');

    expect(updated.rotationPlan).toHaveLength(6);
    expect(updated.rotationPlan[0]).toEqual(session.rotationPlan[0]);
    expect(updated.rotationPlan[1]).toEqual(session.rotationPlan[1]);

    // In future blocks (2..5), p-3 must never appear in any area
    updated.rotationPlan.slice(2).forEach(b => {
      b.resourceAssignments.forEach(r => {
        expect(r.batterPlayerIds).not.toContain('p-3');
        expect(r.bowlerPodPlayerIds).not.toContain('p-3');
        expect(r.fieldingPlayerIds).not.toContain('p-3');
      });
      expect(b.unassignedPlayerIds).not.toContain('p-3');
    });
  });

  it('restricts injured bowler and updates future blocks safely', () => {
    const resources = createMockResources();
    const teams = createMockTeams();
    const players = createMockPlayers(20);

    const initialOutput = generateClubRotationPlan({
      resources,
      players,
      teams,
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '18:00',
      sessionFinishTime: '19:12'
    });

    const session: ClubTrainingSession = {
      id: 'session-live-3',
      clubId: 'c-1',
      title: 'Thursday Practice',
      date: '2026-10-15',
      startTime: '18:00',
      finishTime: '19:12',
      venueFacilityId: 'fac-1',
      includedTeamIds: ['t-1', 't-2', 't-3', 't-4'],
      availableResourceIds: resources.map(r => r.id),
      expectedPlayerIds: players.map(p => p.id),
      confirmedAttendingPlayerIds: players.map(p => p.id),
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: [],
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: initialOutput.rotationBlocks,
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 24 },
      status: 'live',
      warnings: []
    };

    // p-2 (pace bowler) reports hamstring tightness during block 0
    const updated = handleLiveInjury(session, 'p-2', 'Hamstring tightness', 0, players, teams, resources);

    expect(updated.staffPlayerAssignments['p-2'].trainingBowlingRole).toBe('none');
    expect(updated.staffPlayerAssignments['p-2'].returnToPlayRestrictions).toBe('Hamstring tightness');

    // In future blocks (1..5), p-2 must not be assigned to bowl
    updated.rotationPlan.slice(1).forEach(b => {
      b.resourceAssignments.forEach(r => {
        expect(r.bowlerPodPlayerIds).not.toContain('p-2');
      });
    });
  });

  it('executes manual swap and locks the swapped assignments', () => {
    const resources = createMockResources();
    const teams = createMockTeams();
    const players = createMockPlayers(20);

    const initialOutput = generateClubRotationPlan({
      resources,
      players,
      teams,
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '18:00',
      sessionFinishTime: '19:12'
    });

    const session: ClubTrainingSession = {
      id: 'session-live-4',
      clubId: 'c-1',
      title: 'Thursday Practice',
      date: '2026-10-15',
      startTime: '18:00',
      finishTime: '19:12',
      venueFacilityId: 'fac-1',
      includedTeamIds: ['t-1', 't-2', 't-3', 't-4'],
      availableResourceIds: resources.map(r => r.id),
      expectedPlayerIds: players.map(p => p.id),
      confirmedAttendingPlayerIds: players.map(p => p.id),
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: [],
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: initialOutput.rotationBlocks,
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 24 },
      status: 'live',
      warnings: []
    };

    const swapped = handleManualSwap(session, 'p-1', 'p-10', 0);
    expect(swapped.rotationPlan[0]).toEqual(session.rotationPlan[0]);
    expect(Object.keys(swapped.manualLocks).length).toBeGreaterThan(0);
  });

  it('completes session and accumulates rolling fairness credit for late arrivals', () => {
    const resources = createMockResources();
    const teams = createMockTeams();
    const players = createMockPlayers(10);

    const initialOutput = generateClubRotationPlan({
      resources,
      players,
      teams,
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '18:00',
      sessionFinishTime: '18:24' // 2 blocks
    });

    const session: ClubTrainingSession = {
      id: 'session-live-5',
      clubId: 'c-1',
      title: 'Thursday Practice',
      date: '2026-10-15',
      startTime: '18:00',
      finishTime: '18:24',
      venueFacilityId: 'fac-1',
      includedTeamIds: ['t-1', 't-2'],
      availableResourceIds: resources.map(r => r.id),
      expectedPlayerIds: players.map(p => p.id),
      confirmedAttendingPlayerIds: players.map(p => p.id),
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: [],
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: initialOutput.rotationBlocks,
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 12 },
      status: 'live',
      warnings: []
    };

    const initialLedger: RollingFairnessLedger[] = [
      { playerId: 'p-1', totalSessionsAttended: 2, totalBattingMinutes: 24, totalDeliveriesBowled: 48, totalCentreWicketOvers: 2, accumulatedFairnessCreditMinutes: 0 }
    ];

    const result = completeSessionWithFairness(session, players, initialLedger);

    expect(result.applied).toBe(true);
    expect(result.session.status).toBe('completed');
    expect(result.ledger.length).toBeGreaterThanOrEqual(players.length);
    expect(result.session.actualParticipationOutcomes?.['p-1']).toBeDefined();

    // p-1 should have 3 sessions attended
    const p1Entry = result.ledger.find(l => l.playerId === 'p-1');
    expect(p1Entry?.totalSessionsAttended).toBe(3);
  });

  it('reconciles only session participants and credits attendees with zero batting time', () => {
    const session = makeStationSession();
    const records = calculateSessionFairness(session, SEED_PLAYERS);

    expect(records.map(record => record.playerId).sort()).toEqual(['p-1', 'p-2', 'p-3', 'p-4', 'p-5']);
    const wicketkeeper = records.find(record => record.playerId === 'p-5');
    expect(wicketkeeper?.actualBattingMinutes).toBe(0);
    expect(wicketkeeper?.missedOrShortenedMinutes).toBe(12);
  });

  it('does not create negative fairness debt when extra batting exceeds the missed amount', () => {
    const ledger = updateRollingFairnessLedger([], [{
      sessionId: 'session-credit-floor',
      date: '2026-10-15',
      playerId: 'p-1',
      plannedBattingMinutes: 24,
      actualBattingMinutes: 24,
      extraBattingMinutesGranted: 10,
      deliveriesBowled: 0,
      centreWicketOvers: 0,
      missedOrShortenedMinutes: 0
    }]);

    expect(ledger[0].accumulatedFairnessCreditMinutes).toBe(0);
  });

  it('does not award attendance or fairness credit to an explicitly absent player', () => {
    const session = makeStationSession({
      expectedPlayerIds: ['p-1', 'p-2'],
      confirmedAttendingPlayerIds: ['p-1'],
      availabilityRecords: {
        'p-1': { playerId: 'p-1', status: 'attending' },
        'p-2': { playerId: 'p-2', status: 'not_attending' }
      },
      liveAttendance: {
        'p-2': { playerId: 'p-2', status: 'live_absent' }
      }
    });

    const participantIds = calculateSessionFairness(session, SEED_PLAYERS).map(record => record.playerId);
    expect(participantIds).not.toContain('p-2');
    expect(participantIds).toContain('p-1');
  });

  it('preserves an early leaver as an attendee while removing them from future blocks', () => {
    const firstBlock = makeStationSession().rotationPlan[0];
    const session = makeStationSession({
      finishTime: '18:24',
      fairnessSettings: { targetEqualBattingMinutes: 24 },
      rotationPlan: [
        firstBlock,
        { ...firstBlock, blockId: 'blk-2', blockIndex: 1, startTime: '18:12', endTime: '18:24' }
      ]
    });

    const updated = handleLiveEarlyDeparture(
      session,
      'p-1',
      '18:12',
      0,
      SEED_PLAYERS,
      SEED_CLUB_TEAMS,
      SEED_TRAINING_RESOURCES
    );

    expect(updated.rotationPlan[0]).toEqual(session.rotationPlan[0]);
    expect(updated.liveAttendance['p-1']?.status).toBe('left_early');
    updated.rotationPlan.slice(1).forEach(block => {
      block.resourceAssignments.forEach(assignment => {
        expect([
          ...assignment.batterPlayerIds,
          ...assignment.bowlerPodPlayerIds,
          ...assignment.fieldingPlayerIds
        ]).not.toContain('p-1');
      });
    });
    expect(calculateSessionFairness(updated, SEED_PLAYERS).some(record => record.playerId === 'p-1')).toBe(true);
  });
});
