import { describe, it, expect } from 'vitest';
import { generateRotationPlan, adjustNetCount, calculateUtilisation } from '../src/modules/cricket/rotationEngine';
import { SEED_PLAYERS, SEED_FACILITY } from '../src/modules/cricket/seedData';
import type { NetLane, Player } from '../src/types/cricket';

describe('Rotation Engine & Net Manager', () => {
  it('should generate a valid rotation plan allocating batters and bowlers to lanes', () => {
    const plan = generateRotationPlan(SEED_PLAYERS, SEED_FACILITY.netLanes, 0, 12);
    
    expect(plan).toBeDefined();
    expect(plan.lanes.length).toBe(SEED_FACILITY.netLanes.length);
    expect(plan.lanes[0].batterPlayerIds.length).toBeGreaterThan(0);
    expect(plan.lanes[0].bowlerPlayerIds.length).toBeGreaterThan(0);
  });

  it('should calculate utilisation and report unassigned or outfield players', () => {
    const plan = generateRotationPlan(SEED_PLAYERS, SEED_FACILITY.netLanes, 0, 12);
    const metrics = calculateUtilisation(plan, SEED_PLAYERS);

    expect(metrics.totalExpectedPlayers).toBe(SEED_PLAYERS.length);
    expect(metrics.allocatedPlayersCount).toBe(SEED_PLAYERS.length);
    expect(metrics.unassignedPlayersCount).toBe(0);
  });

  it('should adjust plan smoothly when net count changes from 3 to 2 without losing draft', () => {
    const plan = generateRotationPlan(SEED_PLAYERS, SEED_FACILITY.netLanes, 0, 12);
    const twoLanes = SEED_FACILITY.netLanes.slice(0, 2);
    
    const revised = adjustNetCount(plan, twoLanes, SEED_PLAYERS);

    expect(revised.lanes.length).toBe(2);
    expect(revised.alerts.some(a => a.includes('2 active net lanes'))).toBe(true);
  });

  it('satisfies AC-01: 16 players, 3 nets, 75 minutes, produces a complete editable plan where every player is allocated or explicitly flagged', () => {
    expect(SEED_PLAYERS.length).toBe(16);
    expect(SEED_FACILITY.netLanes.length).toBe(3);

    const plan = generateRotationPlan(SEED_PLAYERS, SEED_FACILITY.netLanes, 0, 50);
    const metrics = calculateUtilisation(plan, SEED_PLAYERS);

    expect(metrics.totalExpectedPlayers).toBe(16);
    expect(metrics.activeNetCount).toBe(3);
    expect(metrics.allocatedPlayersCount).toBe(16);
    expect(metrics.unassignedPlayersCount).toBe(0);
  });

  it('should generate plan from a custom player subset (12 of 16 players) and 2 nets, reflecting exact inputs', () => {
    const subsetIds = SEED_PLAYERS.slice(0, 12).map(p => p.id);
    const customPlayers: Player[] = SEED_PLAYERS.map(p => ({
      ...p,
      trainingAvailability: subsetIds.includes(p.id)
    }));
    const twoLanes: NetLane[] = SEED_FACILITY.netLanes.slice(0, 2);

    const plan = generateRotationPlan(customPlayers, twoLanes, 0, 45);
    const metrics = calculateUtilisation(plan, customPlayers);

    expect(metrics.totalExpectedPlayers).toBe(12);
    expect(metrics.activeNetCount).toBe(2);
    expect(metrics.allocatedPlayersCount).toBe(12);

    // Verify none of the 4 absent players are included in lane assignments or outfield
    const absentIds = SEED_PLAYERS.slice(12).map(p => p.id);
    plan.lanes.forEach(lane => {
      lane.batterPlayerIds.forEach(id => expect(absentIds.includes(id)).toBe(false));
      lane.bowlerPlayerIds.forEach(id => expect(absentIds.includes(id)).toBe(false));
      lane.keeperPlayerIds.forEach(id => expect(absentIds.includes(id)).toBe(false));
    });
    plan.outfieldPlayerIds.forEach(id => expect(absentIds.includes(id)).toBe(false));
  });

  it('satisfies AC-03: removing one player from availability reflects immediately without dropping players silently', () => {
    const initialPlayers = [...SEED_PLAYERS];
    const initialPlan = generateRotationPlan(initialPlayers, SEED_FACILITY.netLanes, 0, 12);
    expect(calculateUtilisation(initialPlan, initialPlayers).totalExpectedPlayers).toBe(16);

    // Remove 1 player from availability
    const reducedPlayers = SEED_PLAYERS.map((p, idx) => ({
      ...p,
      trainingAvailability: idx !== 0 // player 0 removed
    }));
    const updatedPlan = generateRotationPlan(reducedPlayers, SEED_FACILITY.netLanes, 0, 12);
    const updatedMetrics = calculateUtilisation(updatedPlan, reducedPlayers);

    expect(updatedMetrics.totalExpectedPlayers).toBe(15);
    expect(updatedMetrics.allocatedPlayersCount).toBe(15);
    expect(updatedPlan.lanes.some(l => l.batterPlayerIds.includes(SEED_PLAYERS[0].id))).toBe(false);
  });
});
