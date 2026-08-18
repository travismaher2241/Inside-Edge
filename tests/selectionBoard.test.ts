import { describe, it, expect } from 'vitest';
import type { ClubTeam, Player, Observation, ClubTrainingSession, TrainingResource } from '../src/types/cricket';
import { generateNextWeeklySession } from '../src/modules/cricket/clubRotationEngine';

describe('5-Grade Selection Board & Recurring Weekly Practice Cloner Tests', () => {
  const mockTeams: ClubTeam[] = [
    { id: 'ct-1', name: '1st XI', ageGroup: 'Seniors', submissionToken: 'tok-1', createdAt: '2026-08-18', gradeOrDivision: '1st Grade' },
    { id: 'ct-2', name: '2nd XI', ageGroup: 'Seniors', submissionToken: 'tok-2', createdAt: '2026-08-18', gradeOrDivision: '2nd Grade' },
    { id: 'ct-3', name: '3rd XI', ageGroup: 'Seniors', submissionToken: 'tok-3', createdAt: '2026-08-18', gradeOrDivision: '3rd Grade' },
    { id: 'ct-4', name: '4th XI', ageGroup: 'Seniors', submissionToken: 'tok-4', createdAt: '2026-08-18', gradeOrDivision: '4th Grade' },
    { id: 'ct-5', name: '5th XI', ageGroup: 'Seniors', submissionToken: 'tok-5', createdAt: '2026-08-18', gradeOrDivision: '5th Grade' }
  ];

  const mockPlayers: Player[] = [
    { id: 'p-1', name: 'Marcus Harris', primaryTeamId: 'ct-1', primaryRole: 'top_order_batter', secondaryRole: 'none', battingHand: 'left', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] },
    { id: 'p-2', name: 'Peter Handscomb', primaryTeamId: 'ct-1', primaryRole: 'wicketkeeper', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'primary', trainingAvailability: true, activeDevelopmentFocusIds: [] },
    { id: 'p-3', name: 'Scott Boland', primaryTeamId: 'ct-1', primaryRole: 'pace_bowler', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'right_arm_fast', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] },
    { id: 'p-4', name: 'Travis Maher', primaryTeamId: 'ct-2', primaryRole: 'all_rounder', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'right_arm_fast_medium', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] }
  ];

  const mockResources: TrainingResource[] = [
    { id: 'res-1', facilityId: 'fac-1', name: 'Net 1 - Pace', type: 'pace_new_ball_net', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 4, maxTotalParticipants: 8, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false },
    { id: 'res-2', facilityId: 'fac-1', name: 'Net 2 - Spin', type: 'spin_net', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 4, maxTotalParticipants: 8, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false },
    { id: 'res-3', facilityId: 'fac-1', name: 'Net 3 - Standard', type: 'standard_net', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 4, maxTotalParticipants: 8, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false },
    { id: 'res-4', facilityId: 'fac-1', name: 'Centre Wicket', type: 'centre_wicket', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 6, maxTotalParticipants: 16, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: true }
  ];

  it('generates next weekly Thursday training session (+7 days) automatically', () => {
    const currentSession: ClubTrainingSession = {
      id: 'sess-current',
      clubId: 'club-1',
      title: 'Thursday Practice - 2026-10-15',
      date: '2026-10-15',
      startTime: '17:30',
      finishTime: '19:30',
      venueFacilityId: 'fac-1',
      sessionObjectives: ['Match Simulation'],
      status: 'completed',
      includedTeamIds: ['ct-1', 'ct-2', 'ct-3', 'ct-4', 'ct-5'],
      availableResourceIds: ['res-1', 'res-2', 'res-3', 'res-4'],
      expectedPlayerIds: ['p-1', 'p-2', 'p-3', 'p-4'],
      confirmedAttendingPlayerIds: ['p-1', 'p-2', 'p-3', 'p-4'],
      availabilityRecords: {},
      staffPlayerAssignments: {},
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: [],
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 12 },
      blocks: [],
      activeBlockIndex: 0,
      activeRotationIndex: 0
    };

    const nextSession = generateNextWeeklySession({
      currentSession,
      allPlayers: mockPlayers,
      allResources: mockResources,
      clubTeams: mockTeams,
      rollingFairnessLedger: [
        { playerId: 'p-1', totalBattingMinutes: 12, totalBowlingOvers: 0, deficitCredits: 12, lastSessionDate: '2026-10-15' }
      ]
    });

    expect(nextSession.id).not.toBe('sess-current');
    expect(nextSession.date).toBe('2026-10-22'); // Exactly +7 days
    expect(nextSession.status).toBe('draft');
    expect(nextSession.rotationPlan.length).toBeGreaterThan(0);
  });
});
