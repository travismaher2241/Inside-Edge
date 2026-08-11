// Net Rotation & Allocation Engine for Inside Edge

import type { Player, NetLane, RotationPlan, LaneAssignment } from '../../types/cricket';

export interface UtilisationMetrics {
  totalExpectedPlayers: number;
  allocatedPlayersCount: number;
  unassignedPlayersCount: number;
  activeNetCount: number;
  idlePlayerNames: string[];
  warnings: string[];
}

export function generateRotationPlan(
  players: Player[],
  lanes: NetLane[],
  rotationIndex: number = 0,
  durationMinutes: number = 12
): RotationPlan {
  const availablePlayers = players.filter(p => p.trainingAvailability);
  const unassignedPlayerIds: string[] = [];
  const outfieldPlayerIds: string[] = [];
  const alerts: string[] = [];

  const batters = availablePlayers.filter(p => p.primaryRole === 'top_order_batter' || p.primaryRole === 'middle_order_batter');
  const paceBowlers = availablePlayers.filter(p => p.primaryRole === 'pace_bowler');
  const spinBowlers = availablePlayers.filter(p => p.primaryRole === 'spin_bowler');
  const keepers = availablePlayers.filter(p => p.wicketkeepingCapability === 'primary' || p.wicketkeepingCapability === 'backup');
  const allRounders = availablePlayers.filter(p => p.primaryRole === 'all_rounder');

  const bowlerPool = [...paceBowlers, ...spinBowlers, ...allRounders];
  const batterPool = [...batters];

  const laneAssignments: LaneAssignment[] = lanes.map((lane, index) => {
    const batterCount = Math.min(lane.maxBatters, batterPool.length);
    const assignedBatters: Player[] = [];
    for (let i = 0; i < batterCount; i++) {
      const playerIdx = (rotationIndex + index * 2 + i) % Math.max(1, batterPool.length);
      if (batterPool[playerIdx] && !assignedBatters.includes(batterPool[playerIdx])) {
        assignedBatters.push(batterPool[playerIdx]);
      }
    }

    const assignedBowlers: Player[] = [];
    let targetBowlers = bowlerPool;
    if (lane.laneType === 'spin') {
      targetBowlers = spinBowlers.length > 0 ? spinBowlers : bowlerPool;
    } else if (lane.laneType === 'standard' || lane.laneType === 'machine') {
      targetBowlers = paceBowlers.length > 0 ? paceBowlers : bowlerPool;
    }

    const bowlerCount = Math.min(lane.maxBowlers, targetBowlers.length);
    for (let i = 0; i < bowlerCount; i++) {
      const bIdx = (rotationIndex * 2 + index + i) % Math.max(1, targetBowlers.length);
      const bPlayer = targetBowlers[bIdx];
      if (bPlayer && !assignedBowlers.includes(bPlayer) && !assignedBatters.map(b => b.id).includes(bPlayer.id)) {
        assignedBowlers.push(bPlayer);
      }
    }

    const assignedKeepers: Player[] = [];
    if (keepers.length > 0 && index === 1) {
      const keeper = keepers[rotationIndex % keepers.length];
      if (keeper && !assignedBatters.concat(assignedBowlers).map(p => p.id).includes(keeper.id)) {
        assignedKeepers.push(keeper);
      }
    }

    return {
      laneId: lane.id,
      laneObjective: lane.laneObjective || `${lane.name} Practice`,
      batterPlayerIds: assignedBatters.map(b => b.id),
      bowlerPlayerIds: assignedBowlers.map(b => b.id),
      keeperPlayerIds: assignedKeepers.map(k => k.id),
      feederPlayerIds: [],
      coachAssigned: lane.assignedCoach
    };
  });

  const assignedIds = new Set<string>();
  laneAssignments.forEach(la => {
    la.batterPlayerIds.forEach(id => assignedIds.add(id));
    la.bowlerPlayerIds.forEach(id => assignedIds.add(id));
    la.keeperPlayerIds.forEach(id => assignedIds.add(id));
    la.feederPlayerIds.forEach(id => assignedIds.add(id));
  });

  availablePlayers.forEach(player => {
    if (!assignedIds.has(player.id)) {
      outfieldPlayerIds.push(player.id);
    }
  });

  availablePlayers.forEach(p => {
    if (p.workloadRestriction?.restrictedBowler) {
      alerts.push(`${p.name}: Restricted bowler (${p.workloadRestriction.notes || 'Max delivery count enforced'})`);
    }
  });

  if (outfieldPlayerIds.length > 0) {
    alerts.push(`${outfieldPlayerIds.length} player(s) allocated to Outfield Fielding & Ground Work.`);
  }

  return {
    id: `rot-${rotationIndex + 1}`,
    rotationIndex,
    durationMinutes,
    lanes: laneAssignments,
    outfieldPlayerIds,
    unassignedPlayerIds,
    alerts
  };
}

export function adjustNetCount(
  currentPlan: RotationPlan,
  newLanes: NetLane[],
  players: Player[]
): RotationPlan {
  const updatedLanes: LaneAssignment[] = newLanes.map(lane => {
    const existing = currentPlan.lanes.find(l => l.laneId === lane.id);
    if (existing) {
      return {
        ...existing,
        laneObjective: lane.laneObjective || existing.laneObjective
      };
    } else {
      return {
        laneId: lane.id,
        laneObjective: lane.laneObjective || lane.name,
        batterPlayerIds: [],
        bowlerPlayerIds: [],
        keeperPlayerIds: [],
        feederPlayerIds: [],
        coachAssigned: lane.assignedCoach
      };
    }
  });

  const activeIds = new Set<string>();
  updatedLanes.forEach(l => {
    l.batterPlayerIds.forEach(id => activeIds.add(id));
    l.bowlerPlayerIds.forEach(id => activeIds.add(id));
    l.keeperPlayerIds.forEach(id => activeIds.add(id));
    l.feederPlayerIds.forEach(id => activeIds.add(id));
  });

  const availablePlayerIds = players.filter(p => p.trainingAvailability).map(p => p.id);
  const outfieldPlayerIds = availablePlayerIds.filter(id => !activeIds.has(id));

  const alerts = [...currentPlan.alerts];
  alerts.push(`Facility updated to ${newLanes.length} active net lanes.`);

  return {
    ...currentPlan,
    lanes: updatedLanes,
    outfieldPlayerIds,
    alerts
  };
}

export function calculateUtilisation(
  plan: RotationPlan,
  players: Player[]
): UtilisationMetrics {
  const availablePlayers = players.filter(p => p.trainingAvailability);
  const allocatedIds = new Set<string>();

  plan.lanes.forEach(l => {
    l.batterPlayerIds.forEach(id => allocatedIds.add(id));
    l.bowlerPlayerIds.forEach(id => allocatedIds.add(id));
    l.keeperPlayerIds.forEach(id => allocatedIds.add(id));
    l.feederPlayerIds.forEach(id => allocatedIds.add(id));
  });
  plan.outfieldPlayerIds.forEach(id => allocatedIds.add(id));

  const unassigned = availablePlayers.filter(p => !allocatedIds.has(p.id));
  const idleNames = unassigned.map(p => p.name);

  const warnings: string[] = [];
  if (unassigned.length > 0) {
    warnings.push(`Warning: ${unassigned.length} player(s) are unassigned: ${idleNames.join(', ')}.`);
  }

  plan.lanes.forEach((l, idx) => {
    if (!l.coachAssigned) {
      warnings.push(`Net ${idx + 1} has no assigned coach.`);
    }
  });

  return {
    totalExpectedPlayers: availablePlayers.length,
    allocatedPlayersCount: allocatedIds.size,
    unassignedPlayersCount: unassigned.length,
    activeNetCount: plan.lanes.length,
    idlePlayerNames: idleNames,
    warnings
  };
}
