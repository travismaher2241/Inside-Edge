import { describe, it, expect } from 'vitest';
import {
  generateClubRotationPlan,
  resolveTrainingGroups,
  validateRotationPlan,
  getBattingCapacity
} from '../src/modules/cricket/clubRotationEngine';
import { SEED_TRAINING_RESOURCES, SEED_CLUB_TEAMS } from '../src/modules/cricket/seedData';
import type { Player, ClubTeam, PlayerAvailabilityRecord, StaffPlayerAssignment } from '../src/types/cricket';

/**
 * Outcome tests for the coach's real Thursday: five sides, three nets and a centre
 * wicket, ninety minutes.
 *
 * These assert what the session must *deliver*, not that the engine ran. The unit tests
 * around them all passed while the lower grades were getting one twelve-minute bat and
 * the fifth XI was getting none, so the requirement is written down here instead.
 */

const SENIOR_TEAM_IDS = ['ct-1', 'ct-2'];
const LOWER_TEAM_IDS = ['ct-3', 'ct-4', 'ct-5'];
const ALL_TEAM_IDS = [...SENIOR_TEAM_IDS, ...LOWER_TEAM_IDS];
const BLOCK_MINUTES = 12;

// Each side has a captain who can lead a lane — the club setup this app is built for.
const teams: ClubTeam[] = SEED_CLUB_TEAMS
  .filter(t => ALL_TEAM_IDS.includes(t.id))
  .map(t => ({ ...t, captainIds: [`${t.id}-p0`] }));
const resources = SEED_TRAINING_RESOURCES.filter(r =>
  ['res-1', 'res-2', 'res-3', 'res-4', 'res-5'].includes(r.id)
);

const roles = ['top_order_batter', 'middle_order_batter', 'pace_bowler', 'spin_bowler', 'all_rounder', 'wicketkeeper'] as const;

function buildSquad(playersPerTeam: number): Player[] {
  const squad: Player[] = [];
  ALL_TEAM_IDS.forEach((teamId, teamIndex) => {
    for (let i = 0; i < playersPerTeam; i++) {
      const role = roles[(teamIndex + i) % roles.length];
      squad.push({
        id: `${teamId}-p${i}`,
        name: `${teamId.toUpperCase()} Player ${i}`,
        primaryTeamId: teamId,
        primaryRole: role,
        battingHand: 'right',
        bowlingStyle:
          role === 'spin_bowler' ? 'right_arm_offspin'
            : role === 'pace_bowler' ? 'right_arm_fast_medium'
              : 'does_not_bowl',
        wicketkeepingCapability: role === 'wicketkeeper' ? 'primary' : 'none',
        trainingAvailability: true
      } as unknown as Player);
    }
  });
  return squad;
}

function planThursday(playersPerTeam: number) {
  const players = buildSquad(playersPerTeam);
  const availability: Record<string, PlayerAvailabilityRecord> = {};
  const staffAssignments: Record<string, StaffPlayerAssignment> = {};
  players.forEach(p => {
    availability[p.id] = {
      playerId: p.id, status: 'attending',
      expectedArrivalTime: '18:00', expectedDepartureTime: '19:30'
    };
    staffAssignments[p.id] = {
      playerId: p.id, trainingBattingRole: 'general_rotation',
      trainingBowlingRole: 'general_rotation', bowlingTrainingBand: 'band_1_primary'
    } as StaffPlayerAssignment;
  });

  const output = generateClubRotationPlan({
    resources, players, teams, availability, staffAssignments,
    sessionObjectives: ['Thursday club training'],
    rotationBlockDurationMinutes: BLOCK_MINUTES,
    sessionStartTime: '18:00', sessionFinishTime: '19:30',
    groupingStrategy: 'graded'
  });

  const battingMinutes = new Map<string, number>();
  players.forEach(p => battingMinutes.set(p.id, 0));
  const centreWicketTeamIds = new Set<string>();
  let crossCohortAreaBlocks = 0;
  let doubleBookedSlots = 0;
  let emptySelectedAreaBlocks = 0;

  output.rotationBlocks.forEach(block => {
    const appearances = new Map<string, number>();
    block.resourceAssignments.forEach(assignment => {
      const everyone = [
        ...assignment.batterPlayerIds, ...assignment.bowlerPodPlayerIds,
        ...assignment.fieldingPlayerIds, ...assignment.wicketkeeperPlayerIds,
        ...assignment.feederPlayerIds, ...assignment.restPlayerIds
      ];
      everyone.forEach(id => appearances.set(id, (appearances.get(id) || 0) + 1));

      assignment.batterPlayerIds.forEach(id =>
        battingMinutes.set(id, (battingMinutes.get(id) || 0) + block.durationMinutes));

      if (assignment.resourceId === 'res-4') {
        everyone.forEach(id => centreWicketTeamIds.add(id.split('-p')[0]));
      }

      // A fielding area is doing its job with nobody batting, so "empty" means nobody at all.
      if (everyone.length === 0) emptySelectedAreaBlocks++;

      const active = [...assignment.batterPlayerIds, ...assignment.bowlerPodPlayerIds];
      if (active.length > 0) {
        const cohorts = new Set(active.map(id =>
          SENIOR_TEAM_IDS.includes(id.split('-p')[0]) ? 'senior' : 'lower'));
        if (cohorts.size > 1) crossCohortAreaBlocks++;
      }
    });
    appearances.forEach(count => { if (count > 1) doubleBookedSlots++; });
  });

  const minutesFor = (teamIds: string[]) =>
    players.filter(p => teamIds.includes(p.primaryTeamId!)).map(p => battingMinutes.get(p.id)!);

  return {
    players, output, battingMinutes,
    seniorMinutes: minutesFor(SENIOR_TEAM_IDS),
    lowerMinutes: minutesFor(LOWER_TEAM_IDS),
    allMinutes: [...battingMinutes.values()],
    centreWicketTeamIds, crossCohortAreaBlocks, doubleBookedSlots, emptySelectedAreaBlocks
  };
}

describe('Thursday club training — what the session must deliver', () => {
  describe.each([
    { label: '40 players', perTeam: 8 },
    { label: '55 players', perTeam: 11 }
  ])('$label across five sides', ({ perTeam }) => {
    it('gives every attending player a bat', () => {
      const { allMinutes, players } = planThursday(perTeam);
      const withoutABat = allMinutes.filter(m => m === 0).length;
      expect(withoutABat, `${withoutABat} of ${players.length} players never batted`).toBe(0);
    });

    it('keeps batting time even inside each cohort', () => {
      const { seniorMinutes, lowerMinutes } = planThursday(perTeam);
      // Nobody should get more than two extra rotations' worth of batting over a team-mate.
      const cap = BLOCK_MINUTES * 2;
      expect(Math.max(...seniorMinutes) - Math.min(...seniorMinutes)).toBeLessThanOrEqual(cap);
      expect(Math.max(...lowerMinutes) - Math.min(...lowerMinutes)).toBeLessThanOrEqual(cap);
    });

    it('does not favour the top grades over the lower grades', () => {
      const { seniorMinutes, lowerMinutes } = planThursday(perTeam);
      const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
      const seniorMean = mean(seniorMinutes);
      const lowerMean = mean(lowerMinutes);
      // The 3rds/4ths/5ths are the reason this app exists. Their average batting time
      // must stay within a quarter of what the 1sts and 2nds get.
      expect(lowerMean).toBeGreaterThanOrEqual(seniorMean * 0.75);
    });

    it('lets every side use the centre wicket at some point', () => {
      const { centreWicketTeamIds } = planThursday(perTeam);
      ALL_TEAM_IDS.forEach(teamId => {
        expect(centreWicketTeamIds.has(teamId), `${teamId} never reached the centre wicket`).toBe(true);
      });
    });

    it('never puts two grades in the same net, and never books a player twice', () => {
      const { crossCohortAreaBlocks, doubleBookedSlots } = planThursday(perTeam);
      expect(crossCohortAreaBlocks).toBe(0);
      expect(doubleBookedSlots).toBe(0);
    });

    it('leaves no selected area standing empty', () => {
      const { emptySelectedAreaBlocks } = planThursday(perTeam);
      expect(emptySelectedAreaBlocks).toBe(0);
    });

    it('produces a launchable plan', () => {
      const { output, players } = planThursday(perTeam);
      const validation = validateRotationPlan({
        rotationBlocks: output.rotationBlocks, resources, players, teams
      });
      expect(validation.hardErrors).toHaveLength(0);
      expect(validation.canLaunch).toBe(true);
    });
  });

  it('shares the batting areas out in proportion to squad size, not grade', () => {
    const players = buildSquad(8); // 16 seniors, 24 lower grades
    const groups = resolveTrainingGroups({ teams, resources, players, groupingStrategy: 'graded' });

    const slotsPerPlayer = groups.map(group => {
      const slots = group.resourceIds.reduce((total, id) => {
        const resource = resources.find(r => r.id === id);
        return total + (resource ? getBattingCapacity(resource) : 0);
      }, 0);
      const headcount = players.filter(p => group.teamIds.includes(p.primaryTeamId!)).length;
      return slots / headcount;
    });

    // Before this was fixed the top two sides held 8 batting slots for 16 players while
    // the three lower sides shared 2 between 24 — a six-fold difference.
    const spread = Math.max(...slotsPerPlayer) / Math.min(...slotsPerPlayer);
    expect(spread).toBeLessThanOrEqual(1.25);
  });

  it('hands a cohort with nobody in it no areas at all', () => {
    // Only the 1sts and 2nds turned up; the lower grades should not be holding nets.
    const players = buildSquad(8).filter(p => SENIOR_TEAM_IDS.includes(p.primaryTeamId!));
    const groups = resolveTrainingGroups({ teams, resources, players, groupingStrategy: 'graded' });
    const lowerGroup = groups.find(g => g.teamIds.includes('ct-3'));
    expect(lowerGroup?.resourceIds ?? []).toHaveLength(0);
  });
});
