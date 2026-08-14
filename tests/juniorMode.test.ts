import { describe, expect, it } from 'vitest';
import type { Activity, ClubTeam, Player, PlayerAvailabilityRecord, StaffPlayerAssignment, TrainingResource } from '../src/types/cricket';
import { generateClubRotationPlan } from '../src/modules/cricket/clubRotationEngine';

describe('Activity Library age-suitability filtering', () => {
  const activities: Activity[] = [
    {
      id: 'a-junior',
      name: 'Junior Friendly Drill',
      purpose: 'Safe, fun, high-participation warm-up',
      category: 'Team',
      minPlayers: 4,
      maxPlayers: 12,
      durationMinutes: 10,
      spaceRequired: 'outfield',
      equipment: [],
      setupSteps: ['Set up'],
      coachingPoints: ['Point'],
      constraints: [],
      progressions: [],
      participationDensity: 'High',
      tags: ['junior'],
      ageSuitability: 'junior'
    },
    {
      id: 'a-senior',
      name: 'Short Ball Pull Drill',
      purpose: 'Advanced back-foot judgment against genuine pace',
      category: 'Batting',
      minPlayers: 2,
      maxPlayers: 6,
      durationMinutes: 15,
      spaceRequired: 'net',
      equipment: [],
      setupSteps: ['Set up'],
      coachingPoints: ['Point'],
      constraints: [],
      progressions: [],
      participationDensity: 'High',
      tags: ['senior'],
      ageSuitability: 'senior'
    },
    {
      id: 'a-all',
      name: 'General Fielding Drill',
      purpose: 'Suitable for any age group',
      category: 'Fielding',
      minPlayers: 4,
      maxPlayers: 12,
      durationMinutes: 12,
      spaceRequired: 'outfield',
      equipment: [],
      setupSteps: ['Set up'],
      coachingPoints: ['Point'],
      constraints: [],
      progressions: [],
      participationDensity: 'High',
      tags: ['general']
      // no ageSuitability set -> defaults to 'all'
    }
  ];

  function filterByAgeSuitability(list: Activity[], filter: 'any' | 'junior' | 'senior') {
    if (filter === 'any') return list;
    return list.filter(activity => {
      const suitability = activity.ageSuitability ?? 'all';
      return suitability === 'all' || suitability === filter;
    });
  }

  it('shows junior-suitable and general activities under the junior filter, excludes senior-only', () => {
    const result = filterByAgeSuitability(activities, 'junior');
    expect(result.map(a => a.id).sort()).toEqual(['a-all', 'a-junior'].sort());
  });

  it('shows senior-suitable and general activities under the senior filter, excludes junior-only', () => {
    const result = filterByAgeSuitability(activities, 'senior');
    expect(result.map(a => a.id).sort()).toEqual(['a-all', 'a-senior'].sort());
  });

  it('shows every activity when no age filter is applied', () => {
    expect(filterByAgeSuitability(activities, 'any')).toHaveLength(3);
  });
});

describe('Junior Mode default rotation block length', () => {
  const player = (index: number): Player => ({
    id: `p-${index}`,
    name: `Player ${index}`,
    primaryRole: 'middle_order_batter',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  });

  const resource: TrainingResource = {
    id: 'r-1',
    facilityId: 'facility-1',
    name: 'Net 1',
    type: 'standard_net',
    active: true,
    maxBatters: 2,
    minBowlers: 1,
    maxBowlers: 3,
    maxTotalParticipants: 6,
    requiresCoachOrLeader: true,
    supportsLiveBatting: true,
    supportsCentreWicket: false
  };

  function buildTeamInputs(juniorMode: boolean) {
    const players = Array.from({ length: 8 }, (_, index) => player(index + 1));
    const team: ClubTeam = { id: 'team-1', name: 'Under 12s', ageGroup: 'Junior', submissionToken: 'token', createdAt: '2026-01-01', active: true, squadPlayerIds: players.map(p => p.id), juniorMode };
    const availability: Record<string, PlayerAvailabilityRecord> = {};
    const staffAssignments: Record<string, StaffPlayerAssignment> = {};
    players.forEach(p => {
      availability[p.id] = { playerId: p.id, status: 'attending', expectedArrivalTime: '17:00', expectedDepartureTime: '18:00' };
      staffAssignments[p.id] = { playerId: p.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: 'none', bowlingTrainingBand: 'band_1_primary' };
    });
    return { players, teams: [team], resources: [resource], availability, staffAssignments };
  }

  it('produces more, shorter rotation blocks for an 8-minute junior session than a 12-minute senior one over the same window', () => {
    const juniorData = buildTeamInputs(true);
    const juniorOutput = generateClubRotationPlan({
      ...juniorData,
      sessionObjectives: [],
      rotationBlockDurationMinutes: 8,
      sessionStartTime: '17:00',
      sessionFinishTime: '18:00'
    });

    const seniorData = buildTeamInputs(false);
    const seniorOutput = generateClubRotationPlan({
      ...seniorData,
      sessionObjectives: [],
      rotationBlockDurationMinutes: 12,
      sessionStartTime: '17:00',
      sessionFinishTime: '18:00'
    });

    expect(juniorOutput.rotationBlocks[0].durationMinutes).toBe(8);
    expect(seniorOutput.rotationBlocks[0].durationMinutes).toBe(12);
    expect(juniorOutput.rotationBlocks.length).toBeGreaterThan(seniorOutput.rotationBlocks.length);
  });
});
