import { describe, it, expect } from 'vitest';
import {
  generateClubRotationPlan,
  calculateSessionFeasibility,
  validateRotationPlan,
  getBattingCapacity,
  resolveTrainingGroups
} from '../src/modules/cricket/clubRotationEngine';
import {
  SEED_CLUB_TEAMS,
  SEED_TRAINING_RESOURCES,
  SEED_PLAYERS,
  SEED_SAVED_TEMPLATES
} from '../src/modules/cricket/seedData';
import type { Player, TrainingResource, RollingFairnessLedger, CentreWicketScenario } from '../src/types/cricket';

describe('Club Training Planner Milestone 1 Regression & Correctness Suite', () => {
  const fiveTeams = SEED_CLUB_TEAMS.filter(t => ['ct-1', 'ct-2', 'ct-3', 'ct-4', 'ct-5'].includes(t.id));
  const threeNetsAndCentreAndOutfield = SEED_TRAINING_RESOURCES.filter(r =>
    ['res-1', 'res-2', 'res-3', 'res-4', 'res-5'].includes(r.id)
  );

  // 1. Capacity & Feasibility Calculations
  describe('Capacity and Resource Batting Definitions', () => {
    it('returns 0 batting capacity for fielding and fitness resources', () => {
      const fieldingArea: TrainingResource = {
        id: 'res-field',
        name: 'Main Outfield',
        type: 'fielding_area',
        facilityId: 'fac-1',
        supportsBowling: false,
        supportsBatting: false,
        maxBatters: 0,
        maxBowlers: 16,
        active: true
      };
      expect(getBattingCapacity(fieldingArea)).toBe(0);
    });

    it('returns exact maxBatters for standard and pace nets', () => {
      const net1 = SEED_TRAINING_RESOURCES.find(r => r.id === 'res-1')!;
      expect(getBattingCapacity(net1)).toBe(net1.maxBatters || 1);
    });

    it('calculates realistic session feasibility without phantom batting minutes from outfield', () => {
      const players40: Player[] = [];
      for (let i = 0; i < 40; i++) {
        const base = SEED_PLAYERS[i % SEED_PLAYERS.length];
        players40.push({
          ...base,
          id: `p-feas-${i + 1}`,
          name: `${base.name} (${i + 1})`,
          primaryTeamId: `ct-${(i % 5) + 1}`,
          primaryRole: 'top_order_batter'
        });
      }

      const feasibility = calculateSessionFeasibility({
        availableResources: threeNetsAndCentreAndOutfield,
        attendingPlayers: players40,
        sessionDurationMinutes: 90,
        rotationBlockDurationMinutes: 12
      });

      // 3 nets (2 batters each = 6) + 1 centre wicket (4 batters = 4) = 10 total batting spots
      // Outfield (res-5) provides 0 batting spots.
      // Total batting capacity in 90 mins = 10 spots * 90 mins = 900 batting minutes.
      // For 40 players, fair target = 900 / 40 = 22.5 mins.
      expect(feasibility.totalNetBattingCapacityMinutes).toBe(900);
      expect(feasibility.fairBattingMinutesPerPlayer).toBe(22.5);
    });
  });

  // 2. Graded Training Group Separation (1sts/2nds vs 3rds/4ths/5ths)
  describe('Graded Separation and Template Rules', () => {
    it('partitions teams into Seniors (1sts/2nds) and Lower Grades (3rds/4ths/5ths)', () => {
      const groups = resolveTrainingGroups({
        teams: fiveTeams,
        resources: threeNetsAndCentreAndOutfield,
        groupingStrategy: 'graded',
        templateGroupRules: SEED_SAVED_TEMPLATES[0].teamGroupRules // tmpl-1
      });

      expect(groups.length).toBe(2);
      const topGroup = groups.find(g => g.name.includes('Top') || g.teamIds.includes('ct-1'));
      const lowerGroup = groups.find(g => g.name.includes('Lower') || g.teamIds.includes('ct-3'));

      expect(topGroup?.teamIds).toEqual(expect.arrayContaining(['ct-1', 'ct-2']));
      expect(topGroup?.teamIds).not.toContain('ct-3');
      expect(lowerGroup?.teamIds).toEqual(expect.arrayContaining(['ct-3', 'ct-4', 'ct-5']));
      expect(lowerGroup?.teamIds).not.toContain('ct-1');
    });

    it('keeps 1sts/2nds and 3rds/4ths/5ths separated in assigned lanes under graded strategy', () => {
      const gradedPlayers: Player[] = Array.from({ length: 30 }, (_, index) => ({
        ...SEED_PLAYERS[index % SEED_PLAYERS.length],
        id: `p-graded-${index + 1}`,
        name: `Graded Player ${index + 1}`,
        primaryTeamId: `ct-${(index % 5) + 1}`
      }));
      const topSquadIds = new Set(
        gradedPlayers.filter(p => p.primaryTeamId === 'ct-1' || p.primaryTeamId === 'ct-2').map(p => p.id)
      );
      const lowerSquadIds = new Set(
        gradedPlayers.filter(p => ['ct-3', 'ct-4', 'ct-5'].includes(p.primaryTeamId)).map(p => p.id)
      );
      expect(topSquadIds.size).toBeGreaterThan(0);
      expect(lowerSquadIds.size).toBeGreaterThan(0);

      const gradedTeams = fiveTeams.map((team, index) => ({ ...team, captainIds: [`p-graded-${index + 1}`] }));

      const output = generateClubRotationPlan({
        resources: threeNetsAndCentreAndOutfield,
        players: gradedPlayers,
        teams: gradedTeams,
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '19:30',
        groupingStrategy: 'graded',
        templateGroupRules: SEED_SAVED_TEMPLATES[0].teamGroupRules
      });

      expect(output.rotationBlocks.length).toBeGreaterThanOrEqual(7);
      let seniorAssignments = 0;
      let lowerAssignments = 0;

      // Check each block: senior net resources should contain topSquad players, lower resources should contain lower squad players
      for (const block of output.rotationBlocks) {
        for (const assignment of block.resourceAssignments) {
          const allAssigned = [
            ...assignment.batterPlayerIds,
            ...assignment.bowlerPodPlayerIds,
            ...assignment.wicketkeeperPlayerIds,
            ...assignment.feederPlayerIds,
            ...assignment.fieldingPlayerIds
          ];
          if (allAssigned.length === 0) continue;

          const hasSenior = allAssigned.some(id => topSquadIds.has(id));
          const hasLower = allAssigned.some(id => lowerSquadIds.has(id));

          // In partitioned lane mode, an individual net or centre wicket does not mix senior and lower grades
          expect(hasSenior && hasLower).toBe(false);
          if (hasSenior) seniorAssignments += 1;
          if (hasLower) lowerAssignments += 1;
        }
      }
      expect(seniorAssignments).toBeGreaterThan(0);
      expect(lowerAssignments).toBeGreaterThan(0);
    });

    it('allows mixed training when groupingStrategy is explicitly set to mixed', () => {
      const groups = resolveTrainingGroups({
        teams: fiveTeams,
        resources: threeNetsAndCentreAndOutfield,
        groupingStrategy: 'mixed'
      });

      expect(groups.length).toBe(1);
      expect(groups[0].teamIds).toHaveLength(5);
      expect(SEED_SAVED_TEMPLATES.find(template => template.id === 'tmpl-3')?.groupingStrategy).toBe('mixed');
    });

    it('routes lower grades to nets in the senior centre-wicket template', () => {
      const template = SEED_SAVED_TEMPLATES.find(item => item.id === 'tmpl-2')!;
      expect(template.teamGroupRules.find(rule => rule.teamQuery === 'first_seconds')?.allocatedResourceType).toBe('centre_wicket');
      expect(template.teamGroupRules.find(rule => rule.teamQuery === 'remaining')?.allocatedResourceType).toBe('standard_net');
    });
  });

  // 3. Plan Generation across 15, 40, and 55 players
  describe('Scalable Generation & Validation across Squad Sizes', () => {
    it('successfully plans for 15 players with 0 double bookings and valid validation', () => {
      const players15: Player[] = [];
      for (let i = 0; i < 15; i++) {
        const base = SEED_PLAYERS[i % SEED_PLAYERS.length];
        players15.push({
          ...base,
          id: `p-15-${i + 1}`,
          name: `${base.name} (${i + 1})`,
          primaryTeamId: `ct-${(i % 5) + 1}`
        });
      }

      const testTeams = fiveTeams.map((t, idx) => ({
        ...t,
        captainIds: [`p-15-${idx + 1}`]
      }));

      const output = generateClubRotationPlan({
        resources: threeNetsAndCentreAndOutfield,
        players: players15,
        teams: testTeams,
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '19:30',
        groupingStrategy: 'graded'
      });

      expect(output.rotationBlocks.length).toBe(8);
      const validation = validateRotationPlan({
        blocks: output.rotationBlocks,
        players: players15,
        teams: testTeams,
        resources: threeNetsAndCentreAndOutfield
      });

      expect(validation.isValid).toBe(true);
      expect(validation.canLaunch).toBe(true);
      expect(validation.hardErrors).toHaveLength(0);
    });

    it('successfully plans for 40 players giving broad batting opportunity', () => {
      const players40: Player[] = [];
      for (let i = 0; i < 40; i++) {
        const base = SEED_PLAYERS[i % SEED_PLAYERS.length];
        players40.push({
          ...base,
          id: `p-40-${i + 1}`,
          name: `${base.name} (${i + 1})`,
          primaryTeamId: `ct-${(i % 5) + 1}`,
          primaryRole: i % 3 === 0 ? 'top_order_batter' : i % 3 === 1 ? 'pace_bowler' : 'all_rounder'
        });
      }

      const testTeams = fiveTeams.map((t, idx) => ({
        ...t,
        captainIds: [`p-40-${idx + 1}`]
      }));

      const output = generateClubRotationPlan({
        resources: threeNetsAndCentreAndOutfield,
        players: players40,
        teams: testTeams,
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '19:30',
        groupingStrategy: 'graded'
      });

      expect(output.rotationBlocks.length).toBe(8);
      const validation = validateRotationPlan({
        blocks: output.rotationBlocks,
        players: players40,
        teams: testTeams,
        resources: threeNetsAndCentreAndOutfield
      });

      expect(validation.hardErrors).toHaveLength(0);
      expect(validation.canLaunch).toBe(true);
      expect(validation.metrics.totalAttendingPlayers).toBe(40);
      expect(validation.metrics.zeroBattingPlayerCount).toBe(0);
      expect(validation.metrics.medianBattingMinutes).toBeGreaterThanOrEqual(12);
    });

    it('handles 55 players without throwing errors or creating double bookings', () => {
      // Create 55 players from seed
      const players55: Player[] = [];
      for (let i = 0; i < 55; i++) {
        const base = SEED_PLAYERS[i % SEED_PLAYERS.length];
        players55.push({
          ...base,
          id: `p-scale-${i + 1}`,
          name: `${base.name} (${i + 1})`,
          primaryTeamId: `ct-${(i % 5) + 1}`
        });
      }

      const testTeams = fiveTeams.map((t, idx) => ({
        ...t,
        captainIds: [`p-scale-${idx + 1}`]
      }));

      const output = generateClubRotationPlan({
        resources: threeNetsAndCentreAndOutfield,
        players: players55,
        teams: testTeams,
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '19:30',
        groupingStrategy: 'graded'
      });

      expect(output.rotationBlocks.length).toBe(8);
      const validation = validateRotationPlan({
        blocks: output.rotationBlocks,
        players: players55,
        teams: testTeams,
        resources: threeNetsAndCentreAndOutfield
      });

      expect(validation.hardErrors).toHaveLength(0);
      expect(validation.canLaunch).toBe(true);
      expect(validation.metrics.zeroBattingPlayerCount).toBe(0);
    });
  });

  // 4. Centre-Wicket Fairness & Custom Scenarios
  describe('Centre-Wicket Scenario & Fairness Queue', () => {
    it('applies custom centre-wicket scenario as upfront constraint without emptying other nets', () => {
      const players40: Player[] = [];
      for (let i = 0; i < 40; i++) {
        const base = SEED_PLAYERS[i % SEED_PLAYERS.length];
        players40.push({
          ...base,
          id: `p-cw-${i + 1}`,
          name: `${base.name} (${i + 1})`,
          primaryTeamId: `ct-${(i % 5) + 1}`
        });
      }

      const customScenario: CentreWicketScenario = {
        scenarioId: 'cws-test',
        name: 'Death Overs 24 off 18',
        targetRuns: 24,
        targetOversOrBalls: 18,
        wicketsRemaining: 4,
        battingPairs: [{ pairPlayerIds: [players40[0].id, players40[1].id], allocatedOversOrBalls: 18 }],
        bowlingSpells: [{ bowlerPlayerId: players40[2].id, oversOrDeliveries: 18 }],
        namedLeaderId: players40[0].id,
        assignments: [
          { playerId: players40[0].id, role: 'batter' },
          { playerId: players40[1].id, role: 'batter' },
          { playerId: players40[2].id, role: 'bowler' },
          { playerId: players40[3].id, role: 'wicketkeeper' }
        ]
      };

      const output = generateClubRotationPlan({
        resources: threeNetsAndCentreAndOutfield,
        players: players40,
        teams: fiveTeams,
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '19:30',
        groupingStrategy: 'graded',
        centreWicketScenario: customScenario
      });

      // Check block 0
      const block0 = output.rotationBlocks[0];
      const centreAssignment = block0.resourceAssignments.find(r => r.resourceId === 'res-4');
      expect(centreAssignment).toBeDefined();
      expect(centreAssignment?.batterPlayerIds).toEqual(expect.arrayContaining([players40[0].id, players40[1].id]));

      // Verify that other net lanes (res-1, res-2, res-3) still have batters assigned
      const net1 = block0.resourceAssignments.find(r => r.resourceId === 'res-1');
      const net2 = block0.resourceAssignments.find(r => r.resourceId === 'res-2');
      const net3 = block0.resourceAssignments.find(r => r.resourceId === 'res-3');

      expect(net1?.batterPlayerIds.length).toBeGreaterThan(0);
      expect(net2?.batterPlayerIds.length).toBeGreaterThan(0);
      expect(net3?.batterPlayerIds.length).toBeGreaterThan(0);

      const laterCentreAssignments = output.rotationBlocks.slice(1).map(block =>
        block.resourceAssignments.find(assignment => assignment.resourceId === 'res-4')
      );
      expect(laterCentreAssignments.every(assignment => assignment?.centreWicketScenario?.scenarioId !== customScenario.scenarioId)).toBe(true);
    });

    it('prioritizes players with lower historical centre-wicket time in centre-wicket queue', () => {
      const topOrderBatters: Player[] = [0, 1].map(index => ({
        ...SEED_PLAYERS[index],
        id: `cw-fair-${index + 1}`,
        name: `CW Batter ${index + 1}`,
        primaryTeamId: 'ct-1',
        primaryRole: 'top_order_batter'
      }));
      const supportPlayers: Player[] = Array.from({ length: 10 }, (_, index) => ({
        ...SEED_PLAYERS[(index + 2) % SEED_PLAYERS.length],
        id: `cw-support-${index + 1}`,
        name: `CW Support ${index + 1}`,
        primaryTeamId: 'ct-1'
      }));
      
      const ledger: RollingFairnessLedger[] = [
        {
          playerId: topOrderBatters[0].id,
          totalSessionsAttended: 5,
          totalBattingMinutes: 60,
          totalDeliveriesBowled: 0,
          totalCentreWicketOvers: 10, // Has had lots of centre-wicket time
          accumulatedFairnessCreditMinutes: 0
        },
        {
          playerId: topOrderBatters[1].id,
          totalSessionsAttended: 5,
          totalBattingMinutes: 30,
          totalDeliveriesBowled: 0,
          totalCentreWicketOvers: 0, // Has had NO centre-wicket time
          accumulatedFairnessCreditMinutes: 20
        }
      ];

      const output = generateClubRotationPlan({
        resources: threeNetsAndCentreAndOutfield,
        players: [...topOrderBatters, ...supportPlayers],
        teams: [{ ...fiveTeams[0], captainIds: [supportPlayers[0].id] }],
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '19:30',
        rollingFairnessLedger: ledger,
        groupingStrategy: 'mixed'
      });

      // Find first block where centre wicket is used
      const centreWicketBlocks = output.rotationBlocks.filter(b =>
        b.resourceAssignments.some(r => r.resourceId === 'res-4' && r.batterPlayerIds.length > 0)
      );
      expect(centreWicketBlocks.length).toBeGreaterThan(0);

      const firstCentreBatterIds = centreWicketBlocks[0].resourceAssignments.find(r => r.resourceId === 'res-4')!.batterPlayerIds;
      expect(firstCentreBatterIds).toContain(topOrderBatters[1].id);
      expect(firstCentreBatterIds).not.toContain(topOrderBatters[0].id);
    });
  });

  // 5. Safety Compatibility Verification
  describe('Safety Compatibility Integration', () => {
    it('blocks a dangerous pace pairing in the generated allocation and selects a compatible bowler', () => {
      const premierFastBowler: Player = {
        ...SEED_PLAYERS[0],
        id: 'fast-1',
        name: 'Express Quick',
        primaryRole: 'pace_bowler',
        bowlingStyle: 'right_arm_fast',
        capabilities: ['high_pace']
      };
      const developingBatter: Player = {
        ...SEED_PLAYERS[1],
        id: 'dev-1',
        name: 'Young Junior',
        ageGroup: 'U14',
        primaryRole: 'top_order_batter',
        workloadRestriction: { restrictedBowler: true }
      };
      const secondBatter: Player = {
        ...developingBatter,
        id: 'dev-2',
        name: 'Second Junior'
      };
      const compatibleSpinner: Player = {
        ...SEED_PLAYERS[2],
        id: 'spin-safe-1',
        name: 'Compatible Spinner',
        primaryRole: 'spin_bowler',
        bowlingStyle: 'right_arm_off_spin'
      };
      const singleNet = [SEED_TRAINING_RESOURCES.find(resource => resource.id === 'res-1')!];
      const singleTeam = [{ ...fiveTeams[0], captainIds: [compatibleSpinner.id] }];
      const output = generateClubRotationPlan({
        resources: singleNet,
        players: [developingBatter, secondBatter, premierFastBowler, compatibleSpinner],
        teams: singleTeam,
        rotationBlockDurationMinutes: 12,
        sessionStartTime: '18:00',
        sessionFinishTime: '18:12',
        groupingStrategy: 'mixed'
      });

      const assignment = output.rotationBlocks[0].resourceAssignments[0];
      expect(assignment.batterPlayerIds).toContain(developingBatter.id);
      expect(assignment.bowlerPodPlayerIds).toContain(compatibleSpinner.id);
      expect(assignment.bowlerPodPlayerIds).not.toContain(premierFastBowler.id);
    });

    it('pure validateRotationPlan detects hard errors when double booking exists', () => {
      const player1 = SEED_PLAYERS[0];
      const invalidBlock = {
        blockId: 'block-err-1',
        blockIndex: 0,
        startTime: '18:00',
        endTime: '18:12',
        durationMinutes: 12,
        resourceAssignments: [
          {
            resourceId: 'res-1',
            resourceName: 'Net 1',
            batterPlayerIds: [player1.id],
            bowlerPodPlayerIds: [],
            wicketkeeperPlayerIds: [],
            feederPlayerIds: [],
            fieldingPlayerIds: [],
            restPlayerIds: []
          },
          {
            resourceId: 'res-2',
            resourceName: 'Net 2',
            batterPlayerIds: [player1.id], // Double booked!
            bowlerPodPlayerIds: [],
            wicketkeeperPlayerIds: [],
            feederPlayerIds: [],
            fieldingPlayerIds: [],
            restPlayerIds: []
          }
        ],
        unassignedPlayerIds: []
      };

      const validation = validateRotationPlan({
        blocks: [invalidBlock],
        players: SEED_PLAYERS.slice(0, 10),
        resources: threeNetsAndCentreAndOutfield
      });

      expect(validation.isValid).toBe(false);
      expect(validation.canLaunch).toBe(false);
      expect(validation.hardErrors.some(e => e.code === 'PLAYER_DOUBLE_BOOKED')).toBe(true);
    });
  });
});
