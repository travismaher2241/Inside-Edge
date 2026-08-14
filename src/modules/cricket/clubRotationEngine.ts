// Constraint-Based Club Training Allocation & Feasibility Engine for Inside Edge

import type {
  Player,
  ClubTeam,
  TrainingResource,
  PlayerAvailabilityRecord,
  StaffPlayerAssignment,
  RotationBlockPlan,
  AllocationResourceAssignment,
  CentreWicketScenario,
  RollingFairnessLedger,
  SessionFairnessRecord,
  PriorityMatchup,
  ClubTrainingSession,
  GroupingStrategy,
  PlayerTrainingProfile
} from '../../types/cricket';
import { buildBlockDurations } from './sessionModel';

export interface FeasibilityResult {
  totalNetBattingCapacityMinutes: number;
  totalBattingTurnsNeeded: number;
  fairBattingMinutesPerPlayer: number;
  isFeasible: boolean;
  feasibilityMessage: string;
  warnings: string[];
  recommendedAdjustments: string[];
}

export interface ClubRotationEngineOptions {
  resources: TrainingResource[];
  players: Player[];
  teams: ClubTeam[];
  availability: Record<string, PlayerAvailabilityRecord>;
  staffAssignments: Record<string, StaffPlayerAssignment>;
  sessionObjectives: string[];
  rotationBlockDurationMinutes: number;
  sessionStartTime: string; // e.g. "18:00"
  sessionFinishTime: string; // e.g. "19:30"
  manualLocks?: Record<string, boolean>;
  rollingFairnessLedger?: RollingFairnessLedger[];
  completedBlocks?: RotationBlockPlan[];
  groupingStrategy?: GroupingStrategy;
  playerTrainingProfiles?: Record<string, PlayerTrainingProfile>;
}

export interface ClubRotationEngineOutput {
  rotationBlocks: RotationBlockPlan[];
  explainablePlanScore: number;
  warnings: string[];
  unsatisfiedSoftConstraints: string[];
  capacityMetrics: {
    theoreticalCapacityMinutes: number;
    staffableCapacityMinutes: number;
    actuallyAllocatedCapacityMinutes: number;
    unusedCapacityMinutes: number;
  };
}

const battingCapacity = (resource: TrainingResource): number =>
  resource.type === 'centre_wicket' || resource.type === 'centre_wicket_half'
    ? resource.maxBatters || 2
    : ['standard_net', 'spin_net', 'pace_new_ball_net', 'bowling_machine_net'].includes(resource.type)
      ? resource.maxBatters
      : 0;

// Convert "HH:MM" to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert minutes from midnight to "HH:MM"
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// -------------------------------------------------------------------
// 1. Feasibility & Capacity Calculation
// -------------------------------------------------------------------

export function calculateSessionFeasibility(options: {
  availableResources: TrainingResource[];
  attendingPlayers: Player[];
  staffAssignments: Record<string, StaffPlayerAssignment>;
  availabilityRecords: Record<string, PlayerAvailabilityRecord>;
  sessionDurationMinutes: number;
  rotationBlockDurationMinutes: number;
}): FeasibilityResult {
  const {
    availableResources,
    attendingPlayers,
    staffAssignments,
    sessionDurationMinutes
  } = options;

  const activeNets = availableResources.filter(
    r => r.active && (r.type === 'standard_net' || r.type === 'spin_net' || r.type === 'pace_new_ball_net' || r.type === 'bowling_machine_net')
  );

  const activeCentreWickets = availableResources.filter(
    r => r.active && (r.type === 'centre_wicket' || r.type === 'centre_wicket_half')
  );

  // Capacity uses the full scheduled duration, including an explicit shortened final block.
  let totalNetBattingCapacityMinutes = 0;
  activeNets.forEach(net => {
    totalNetBattingCapacityMinutes += net.maxBatters * sessionDurationMinutes;
  });

  // Include centre-wicket batting capacity if present
  activeCentreWickets.forEach(cw => {
    totalNetBattingCapacityMinutes += (cw.maxBatters || 2) * sessionDurationMinutes;
  });

  // Filter players who require batting turns
  const battersNeedingTurns = attendingPlayers.filter(p => {
    const staffRole = staffAssignments[p.id]?.trainingBattingRole;
    return staffRole !== 'none' && staffRole !== 'limited_participation';
  });

  const totalBattingTurnsNeeded = battersNeedingTurns.length;

  if (totalBattingTurnsNeeded === 0) {
    return {
      totalNetBattingCapacityMinutes,
      totalBattingTurnsNeeded: 0,
      fairBattingMinutesPerPlayer: 0,
      isFeasible: true,
      feasibilityMessage: 'No batters scheduled for batting turns.',
      warnings: [],
      recommendedAdjustments: []
    };
  }

  // Calculate staffable capacity for feasibility check
  let staffableCapacityMinutes = 0;
  availableResources.filter(r => r.active).forEach(res => {
    const maxBatters = res.maxBatters || (res.type.includes('net') ? 2 : 2);
    staffableCapacityMinutes += maxBatters * sessionDurationMinutes;
  });

  const fairBattingMinutesPerPlayer = Math.round(
    (staffableCapacityMinutes / totalBattingTurnsNeeded) * 10
  ) / 10;

  const warnings: string[] = [];
  const recommendedAdjustments: string[] = [];

  let isFeasible = true;

  if (fairBattingMinutesPerPlayer < 8) {
    isFeasible = false;
    warnings.push(
      `Capacity alert: ${totalBattingTurnsNeeded} players require batting turns. ${availableResources.filter(r => r.active).length} active areas provide ${staffableCapacityMinutes} staffable batting minutes. Equal allocation would be approx ${fairBattingMinutesPerPlayer} mins each.`
    );
    recommendedAdjustments.push('Extend session duration or shorten block rotation lengths.');
    recommendedAdjustments.push('Move selected players into a centre-wicket scenario or fielding station.');
    recommendedAdjustments.push('Activate an additional net lane or bowling machine resource.');
    recommendedAdjustments.push('Designate specific specialist bowlers/keepers as bowling-focused for this session.');
  }

  const feasibilityMessage = `${totalBattingTurnsNeeded} players require batting opportunities. Active staffable resources provide ${staffableCapacityMinutes} usable batting minutes. Fully equal allocation is approx ${fairBattingMinutesPerPlayer} mins per player.`;

  return {
    totalNetBattingCapacityMinutes,
    totalBattingTurnsNeeded,
    fairBattingMinutesPerPlayer,
    isFeasible,
    feasibilityMessage,
    warnings,
    recommendedAdjustments
  };
}

// -------------------------------------------------------------------
// 2. Constraint-Based Plan Generator
// -------------------------------------------------------------------

export function generateClubRotationPlan(options: ClubRotationEngineOptions): ClubRotationEngineOutput {
  const {
    resources,
    players,
    availability,
    staffAssignments,
    rotationBlockDurationMinutes,
    sessionStartTime,
    sessionFinishTime,
    manualLocks: _manualLocks = {},
    rollingFairnessLedger = [],
    completedBlocks = []
  } = options;

  const startMins = timeToMinutes(sessionStartTime || '18:00');
  const finishMins = timeToMinutes(sessionFinishTime || '19:30');
  const totalMins = Math.max(15, finishMins - startMins);
  const blockMins = Math.max(5, rotationBlockDurationMinutes || 12);
  const blockDurations = buildBlockDurations(totalMins, blockMins);
  const totalBlocksCount = blockDurations.length;

  const activeResources = resources.filter(r => r.active);
  const leaderIds = new Set(options.teams.flatMap(team => [...(team.captainIds || []), ...(team.coachIds || [])]));
  const warnings: string[] = [];
  const unsatisfiedSoftConstraints: string[] = [];

  // Filter attending players based on player availability record (or default true)
  const attendingPlayers = players.filter(p => {
    const rec = availability[p.id];
    if (!rec) return p.trainingAvailability !== false;
    return rec.status !== 'not_attending';
  });

  if (activeResources.length === 0) {
    return {
      rotationBlocks: [],
      explainablePlanScore: 0,
      warnings: ['No active training resources configured. Please activate nets or centre wicket.'],
      unsatisfiedSoftConstraints: ['No active resources available.'],
      capacityMetrics: { theoreticalCapacityMinutes: 0, staffableCapacityMinutes: 0, actuallyAllocatedCapacityMinutes: 0, unusedCapacityMinutes: 0 }
    };
  }

  if (attendingPlayers.length === 0) {
    return {
      rotationBlocks: [],
      explainablePlanScore: 100,
      warnings: ['No attending players for this session.'],
      unsatisfiedSoftConstraints: [],
      capacityMetrics: { theoreticalCapacityMinutes: 0, staffableCapacityMinutes: 0, actuallyAllocatedCapacityMinutes: 0, unusedCapacityMinutes: 0 }
    };
  }

  // Map rolling fairness credit for sorting
  const fairnessCreditMap = new Map<string, number>();
  rollingFairnessLedger.forEach(l => {
    fairnessCreditMap.set(l.playerId, l.accumulatedFairnessCreditMinutes || 0);
  });

  const rotationBlocks: RotationBlockPlan[] = [];

  // Track player cumulative batting minutes in this session
  const sessionBattingMinutesMap = new Map<string, number>();
  attendingPlayers.forEach(p => sessionBattingMinutesMap.set(p.id, 0));

  // Track deliveries bowled
  const deliveriesBowledMap = new Map<string, number>();
  attendingPlayers.forEach(p => deliveriesBowledMap.set(p.id, 0));

  // Track recent batter-bowler matchups to avoid repeated pairings
  const matchupHistory = new Set<string>();

  for (let bIndex = 0; bIndex < totalBlocksCount; bIndex++) {
    // If block was already completed live, preserve it!
    if (completedBlocks[bIndex]) {
      rotationBlocks.push(completedBlocks[bIndex]);
      continue;
    }

    const currentBlockMins = blockDurations[bIndex];
    const bStartMins = startMins + blockDurations.slice(0, bIndex).reduce((sum, value) => sum + value, 0);
    const bEndMins = bStartMins + currentBlockMins;
    const blockStartTimeStr = minutesToTime(bStartMins);
    const blockEndTimeStr = minutesToTime(bEndMins);

    // 1. Filter players available in THIS time window
    const windowAvailablePlayers = attendingPlayers.filter(p => {
      const rec = availability[p.id];
      if (!rec) return true;

      if (rec.expectedArrivalTime) {
        const arrMins = timeToMinutes(rec.expectedArrivalTime);
        if (arrMins > bStartMins) return false;
      }
      if (rec.expectedDepartureTime) {
        const depMins = timeToMinutes(rec.expectedDepartureTime);
        if (depMins <= bStartMins) return false;
      }
      return true;
    });

    const assignedInBlock = new Set<string>();
    const blockAlerts: string[] = [];
    const resourceAssignments: AllocationResourceAssignment[] = [];

    // Sort available players for batting priority:
    // Priority: Staff priorityBattingPrep > higher rolling fairness credit > lower session batting minutes
    const sortedBatters = [...windowAvailablePlayers].sort((a, b) => {
      const staffA = staffAssignments[a.id];
      const staffB = staffAssignments[b.id];

      const prioA = staffA?.priorityBattingPrep ? 1 : 0;
      const prioB = staffB?.priorityBattingPrep ? 1 : 0;
      if (prioA !== prioB) return prioB - prioA;

      const extraA = staffA?.extraBattingAllocation ? 1 : 0;
      const extraB = staffB?.extraBattingAllocation ? 1 : 0;
      if (extraA !== extraB) return extraB - extraA;

      const creditA = fairnessCreditMap.get(a.id) || 0;
      const creditB = fairnessCreditMap.get(b.id) || 0;
      if (creditA !== creditB) return creditB - creditA;

      const currentMinsA = sessionBattingMinutesMap.get(a.id) || 0;
      const currentMinsB = sessionBattingMinutesMap.get(b.id) || 0;
      return currentMinsA - currentMinsB;
    });

    // 2. Allocate across resources
    activeResources.forEach(res => {
      const resourceBatters: string[] = [];
      const resourceBowlers: string[] = [];
      const resourceKeepers: string[] = [];
      const resourceFeeders: string[] = [];
      const resourceFielders: string[] = [];
      const resourceRest: string[] = [];
      let priorityMatchups: PriorityMatchup[] | undefined;
      let centreWicketScenario: CentreWicketScenario | undefined;

      // Handle Centre Wicket resource type
      if (res.type === 'centre_wicket' || res.type === 'centre_wicket_half') {
        const unassignedForCw = windowAvailablePlayers.filter(p => !assignedInBlock.has(p.id));
        const participantLimit = Math.max(0, res.maxTotalParticipants);
        const batterLimit = Math.min(res.maxBatters, participantLimit);
        const cwBatters = unassignedForCw.filter(p => {
          const r = staffAssignments[p.id]?.trainingBattingRole;
          return r === 'top_order_prep' || r === 'middle_order_prep' || r === 'new_ball_prep' || r === 'general_rotation';
        }).slice(0, batterLimit);

        let remainingCapacity = participantLimit - cwBatters.length;
        const cwBowlers = unassignedForCw
          .filter(p => !cwBatters.includes(p) && staffAssignments[p.id]?.trainingBowlingRole !== 'none')
          .slice(0, Math.min(res.maxBowlers, remainingCapacity));
        remainingCapacity -= cwBowlers.length;
        const cwKeepers = unassignedForCw.filter(p => !cwBatters.includes(p) && !cwBowlers.includes(p) && p.wicketkeepingCapability !== 'none').slice(0, Math.min(1, remainingCapacity));
        remainingCapacity -= cwKeepers.length;
        const cwFielders = unassignedForCw.filter(p => !cwBatters.includes(p) && !cwBowlers.includes(p) && !cwKeepers.includes(p)).slice(0, remainingCapacity);

        cwBatters.forEach(b => {
          resourceBatters.push(b.id);
          assignedInBlock.add(b.id);
          sessionBattingMinutesMap.set(b.id, (sessionBattingMinutesMap.get(b.id) || 0) + currentBlockMins);
        });

        cwBowlers.forEach(b => {
          resourceBowlers.push(b.id);
          assignedInBlock.add(b.id);
          deliveriesBowledMap.set(b.id, (deliveriesBowledMap.get(b.id) || 0) + 12);
        });

        cwKeepers.forEach(k => {
          resourceKeepers.push(k.id);
          assignedInBlock.add(k.id);
        });

        cwFielders.forEach(f => {
          resourceFielders.push(f.id);
          assignedInBlock.add(f.id);
        });

        if (cwBatters.length >= 2) {
          const pairPlayerIds: [string, string] = [cwBatters[0].id, cwBatters[1].id];
          centreWicketScenario = {
            scenarioId: `cw-scen-${bIndex}`,
            name: `Middle Overs Scenario (Target: 36 off 24 balls)`,
            targetRuns: 36,
            targetOversOrBalls: 24,
            wicketsRemaining: 4,
            battingPairs: [{ pairPlayerIds, allocatedOversOrBalls: 4 }],
            bowlingSpells: cwBowlers.map(bw => ({ bowlerPlayerId: bw.id, oversOrDeliveries: 1 })),
            wicketkeeperId: cwKeepers[0]?.id,
            assignments: [
              { playerId: cwBatters[0].id, role: 'batter' },
              { playerId: cwBatters[1].id, role: 'batter' },
              ...cwBatters.slice(2).map(batter => ({ playerId: batter.id, role: 'next_batting_pair' as const })),
              ...cwBowlers.map(bw => ({ playerId: bw.id, role: 'bowler' as const })),
              ...cwKeepers.map(k => ({ playerId: k.id, role: 'wicketkeeper' as const })),
              ...cwFielders.map((f, i) => ({
                playerId: f.id,
                role: i === 0 ? 'close_fielder' as const : i <= 3 ? 'ring_fielder' as const : 'boundary_fielder' as const
              }))
            ]
          };
        }
        if (cwKeepers.length === 0 && resourceBatters.length > 0) {
          blockAlerts.push(`${res.name}: No eligible wicketkeeper is available.`);
        }
      }
      // Handle Net resources
      else if (res.type === 'standard_net' || res.type === 'spin_net' || res.type === 'pace_new_ball_net' || res.type === 'bowling_machine_net') {
        const availableBatters = sortedBatters.filter(p => !assignedInBlock.has(p.id));
        const batterCount = Math.min(res.maxBatters, res.maxTotalParticipants, availableBatters.length);

        for (let i = 0; i < batterCount; i++) {
          const b = availableBatters[i];
          if (b) {
            resourceBatters.push(b.id);
            assignedInBlock.add(b.id);
            sessionBattingMinutesMap.set(b.id, (sessionBattingMinutesMap.get(b.id) || 0) + currentBlockMins);
          }
        }

        // Find bowlers (cannot bat and bowl simultaneously)
        const availableBowlers = windowAvailablePlayers.filter(p => !assignedInBlock.has(p.id));
        let candidateBowlers = availableBowlers;

        if (res.type === 'spin_net') {
          candidateBowlers = availableBowlers.filter(p => p.bowlingStyle.includes('spin') || staffAssignments[p.id]?.trainingBowlingRole === 'spin_focus');
          if (candidateBowlers.length < res.minBowlers) candidateBowlers = availableBowlers;
        } else if (res.type === 'pace_new_ball_net') {
          candidateBowlers = availableBowlers.filter(p => p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium') || staffAssignments[p.id]?.trainingBowlingRole === 'pace_focus');
          if (candidateBowlers.length < res.minBowlers) candidateBowlers = availableBowlers;
        }

        const bowlerCount = Math.min(res.maxBowlers, Math.max(0, res.maxTotalParticipants - resourceBatters.length), candidateBowlers.length);
        for (let i = 0; i < bowlerCount; i++) {
          const bw = candidateBowlers[i];
          if (bw) {
            // Check workload limit
            const maxDel = bw.workloadRestriction?.maxDeliveries || staffAssignments[bw.id]?.workloadLimitDeliveries;
            const currentDel = deliveriesBowledMap.get(bw.id) || 0;

            if (maxDel && currentDel >= maxDel) {
              blockAlerts.push(`${bw.name}: Reached delivery workload restriction limit (${maxDel} deliveries).`);
              continue;
            }

            resourceBowlers.push(bw.id);
            assignedInBlock.add(bw.id);
            deliveriesBowledMap.set(bw.id, currentDel + 12);

            // Record matchup
            resourceBatters.forEach(bId => {
              matchupHistory.add(`${bId}_${bw.id}`);
            });
          }
        }

        // Keepers / Feeders
        if (res.type === 'bowling_machine_net') {
          const feederCandidate = windowAvailablePlayers.find(p => !assignedInBlock.has(p.id));
          if (feederCandidate) {
            resourceFeeders.push(feederCandidate.id);
            assignedInBlock.add(feederCandidate.id);
          }
        }

        if (resourceBowlers.length < res.minBowlers) {
          blockAlerts.push(`${res.name}: Insufficient bowling support (${resourceBowlers.length}/${res.minBowlers} minimum). Recommend adding a machine or combine pods.`);
        }

        // Support staff-approved priority matchup
        if (resourceBatters.length > 0 && resourceBowlers.length > 0) {
          const bId = resourceBatters[0];
          const staffAss = staffAssignments[bId];
          if (staffAss?.priorityBattingPrep && staffAss.matchupRequirements?.length) {
            priorityMatchups = [
              {
                id: `prio-${bIndex}-${res.id}`,
                batterPlayerId: bId,
                targetBowlerStyleOrId: staffAss.matchupRequirements[0],
                durationMinutes: Math.min(4, Math.floor(currentBlockMins / 2)),
                notes: `Staff approved priority matchup vs ${staffAss.matchupRequirements[0]}`
              }
            ];
          }
        }
      }
      // Fielding / Fitness Area
      else {
        const unassignedOthers = windowAvailablePlayers.filter(p => !assignedInBlock.has(p.id));
        unassignedOthers.slice(0, res.maxTotalParticipants).forEach(p => {
          resourceFielders.push(p.id);
          assignedInBlock.add(p.id);
        });
      }

      const participants = [...resourceBatters, ...resourceBowlers, ...resourceKeepers, ...resourceFeeders, ...resourceFielders, ...resourceRest];
      const leaderId = participants.find(id => leaderIds.has(id));
      if (res.requiresCoachOrLeader && !leaderId) {
        blockAlerts.push(`${res.name}: Cannot open because no lane leader is available.`);
      }

      resourceAssignments.push({
        resourceId: res.id,
        resourceName: res.name,
        leaderId,
        batterPlayerIds: resourceBatters,
        bowlerPodPlayerIds: resourceBowlers,
        wicketkeeperPlayerIds: resourceKeepers,
        feederPlayerIds: resourceFeeders,
        fieldingPlayerIds: resourceFielders,
        restPlayerIds: resourceRest,
        priorityMatchups,
        centreWicketScenario
      });
    });

    // Unassigned players in this block
    const unassignedPlayerIds = windowAvailablePlayers.filter(p => !assignedInBlock.has(p.id)).map(p => p.id);

    if (unassignedPlayerIds.length > 0) {
      blockAlerts.push(`${unassignedPlayerIds.length} player(s) allocated to Outfield / Rest.`);
    }

    rotationBlocks.push({
      blockId: `block-${bIndex + 1}`,
      blockIndex: bIndex,
      durationMinutes: currentBlockMins,
      startTime: blockStartTimeStr,
      endTime: blockEndTimeStr,
      resourceAssignments,
      unassignedPlayerIds,
      alerts: blockAlerts
    });
  }

  // Evaluate Explainable Plan Score (0-100)
  let score = 100;
  const battingTimes = Array.from(sessionBattingMinutesMap.values());
  const maxBattingTime = Math.max(...battingTimes, 0);
  const minBattingTime = Math.min(...battingTimes, 0);

  if (maxBattingTime - minBattingTime > 15) {
    score -= 15;
    unsatisfiedSoftConstraints.push(`Unequal batting time gap of ${maxBattingTime - minBattingTime} mins between players.`);
  }

  // Check players left without a batting opportunity
  const zeroBattingPlayers = attendingPlayers.filter(p => {
    const staffRole = staffAssignments[p.id]?.trainingBattingRole;
    const mins = sessionBattingMinutesMap.get(p.id) || 0;
    return mins === 0 && staffRole !== 'none' && staffRole !== 'limited_participation';
  });

  if (zeroBattingPlayers.length > 0) {
    score -= Math.min(30, zeroBattingPlayers.length * 10);
    warnings.push(`${zeroBattingPlayers.length} attending batter(s) received 0 net batting minutes: ${zeroBattingPlayers.map(p => p.name).join(', ')}.`);
    unsatisfiedSoftConstraints.push(`${zeroBattingPlayers.length} player(s) did not receive a batting turn.`);
  }

  const theoreticalCapacityMinutes = rotationBlocks.reduce((total, block) => total + activeResources.reduce((sum, resource) => sum + battingCapacity(resource) * block.durationMinutes, 0), 0);
  const staffableCapacityMinutes = rotationBlocks.reduce((total, block) => total + block.resourceAssignments.reduce((sum, assignment) => {
    const resource = activeResources.find(item => item.id === assignment.resourceId);
    if (!resource || (resource.requiresCoachOrLeader && !assignment.leaderId)) return sum;
    return sum + battingCapacity(resource) * block.durationMinutes;
  }, 0), 0);
  const actuallyAllocatedCapacityMinutes = rotationBlocks.reduce((total, block) => total + block.resourceAssignments.reduce((sum, assignment) => sum + assignment.batterPlayerIds.length * block.durationMinutes, 0), 0);
  const unusedCapacityMinutes = Math.max(0, staffableCapacityMinutes - actuallyAllocatedCapacityMinutes);

  activeResources.forEach(resource => {
    const assignments = rotationBlocks.flatMap(block => block.resourceAssignments.filter(item => item.resourceId === resource.id));
    const used = assignments.some(assignment => assignment.batterPlayerIds.length + assignment.bowlerPodPlayerIds.length + assignment.wicketkeeperPlayerIds.length + assignment.feederPlayerIds.length + assignment.fieldingPlayerIds.length > 0);
    if (!used) warnings.push(`${resource.name}: Selected but unused.`);
    if (resource.requiresCoachOrLeader && assignments.some(assignment => !assignment.leaderId)) warnings.push(`${resource.name}: Capacity is configured but not staffed in one or more blocks.`);
  });

  if (staffableCapacityMinutes > 0 && unusedCapacityMinutes / staffableCapacityMinutes > 0.25) {
    score -= 10;
    unsatisfiedSoftConstraints.push(`${unusedCapacityMinutes} staffable batting minutes remain unused.`);
  }

  return {
    rotationBlocks,
    explainablePlanScore: Math.max(0, score),
    warnings,
    unsatisfiedSoftConstraints,
    capacityMetrics: { theoreticalCapacityMinutes, staffableCapacityMinutes, actuallyAllocatedCapacityMinutes, unusedCapacityMinutes }
  };
}

// -------------------------------------------------------------------
// 2b. "Why This Plan?" Rationale Generator (template-based, no LLM)
// -------------------------------------------------------------------

function categoriseResourceObjective(resourceName: string): string {
  const lower = resourceName.toLowerCase();
  if (lower.includes('new ball') || lower.includes('new-ball') || lower.includes('seam')) return 'new-ball decision making';
  if (lower.includes('spin')) return 'spin & strike rotation';
  if (lower.includes('death') || lower.includes('yorker')) return 'death bowling';
  if (lower.includes('centre wicket') || lower.includes('center wicket')) return 'centre-wicket scenario play';
  if (lower.includes('outfield') || lower.includes('fielding')) return 'fielding & ground work';
  if (lower.includes('machine')) return 'machine-fed repetition';
  return 'general net practice';
}

function joinWithCommasAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}, and ${items[1]}`;
  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return `${allButLast}, and ${last}`;
}

/**
 * Produces a short, plain-English explanation of why the plan looks the way it does,
 * built entirely from data already computed by generateClubRotationPlan — no external
 * AI call, so it stays available even if a future LLM-backed feature is unavailable.
 */
export function generateSessionRationale(
  output: ClubRotationEngineOutput,
  sessionObjectives: string[]
): string {
  if (!output.rotationBlocks.length) {
    return 'No training areas were active, so no rotation plan could be generated.';
  }

  const firstBlock = output.rotationBlocks[0];
  const activeAssignments = firstBlock.resourceAssignments.filter(
    a => a.batterPlayerIds.length > 0 || a.bowlerPodPlayerIds.length > 0 || a.centreWicketScenario
  );

  const laneDescriptions = activeAssignments.map(a => {
    const netLabel = (a.resourceName.match(/Net\s*\d+/i) || [a.resourceName])[0];
    return `${netLabel} to ${categoriseResourceObjective(a.resourceName)}`;
  });

  const objectiveList = sessionObjectives.filter(Boolean).map(o => o.toLowerCase());
  const objectiveSentence = objectiveList.length > 0
    ? `This session is built around ${joinWithCommasAnd(objectiveList)}.`
    : '';

  const allocationSentence = laneDescriptions.length > 0
    ? `The plan allocates ${joinWithCommasAnd(laneDescriptions)}.`
    : '';

  const concernSentence = output.unsatisfiedSoftConstraints.length > 0
    ? output.unsatisfiedSoftConstraints[0]
    : '';

  return [objectiveSentence, allocationSentence, concernSentence].filter(Boolean).join(' ');
}

export function getPlanBalanceLabel(explainablePlanScore: number): string {
  if (explainablePlanScore >= 85) return 'Good balance — most players have similar opportunities.';
  if (explainablePlanScore >= 70) return 'Fair balance — a small number of players have less opportunity than others.';
  return 'Needs attention — opportunity is unevenly spread across the squad.';
}

// -------------------------------------------------------------------
// 3. Live Change & Future-Only Recalculation Handlers
// -------------------------------------------------------------------

export function recalculateFutureRotations(
  currentSession: ClubTrainingSession,
  activeBlockIndex: number,
  allPlayers: Player[],
  allTeams: ClubTeam[],
  allResources: TrainingResource[]
): ClubTrainingSession {
  const completedBlocks = currentSession.rotationPlan.slice(0, activeBlockIndex + 1);

  const activeResources = allResources.filter(r => currentSession.availableResourceIds.includes(r.id));
  const remainingBlocksCount = currentSession.rotationPlan.length - (activeBlockIndex + 1);

  if (remainingBlocksCount <= 0) {
    return currentSession;
  }

  // Calculate remaining session window
  const activeBlock = currentSession.rotationPlan[activeBlockIndex];
  const nextStartMins = timeToMinutes(activeBlock ? activeBlock.endTime : currentSession.startTime);
  const finishMins = timeToMinutes(currentSession.finishTime);

  const output = generateClubRotationPlan({
    resources: activeResources,
    players: allPlayers,
    teams: allTeams,
    availability: currentSession.availabilityRecords,
    staffAssignments: currentSession.staffPlayerAssignments,
    sessionObjectives: currentSession.sessionObjectives,
    rotationBlockDurationMinutes: currentSession.rotationDurationMinutes,
    sessionStartTime: minutesToTime(nextStartMins),
    sessionFinishTime: minutesToTime(finishMins),
    manualLocks: currentSession.manualLocks
  });

  const roleArrays: Array<keyof Pick<AllocationResourceAssignment, 'batterPlayerIds' | 'bowlerPodPlayerIds' | 'wicketkeeperPlayerIds' | 'feederPlayerIds' | 'fieldingPlayerIds' | 'restPlayerIds'>> = [
    'batterPlayerIds', 'bowlerPodPlayerIds', 'wicketkeeperPlayerIds', 'feederPlayerIds', 'fieldingPlayerIds', 'restPlayerIds'
  ];
  const futureBlocks = output.rotationBlocks.map((generatedBlock, offset) => {
    const absoluteIndex = activeBlockIndex + 1 + offset;
    const oldBlock = currentSession.rotationPlan[absoluteIndex];
    const block = { ...generatedBlock, blockIndex: absoluteIndex, blockId: oldBlock?.blockId || `block-${absoluteIndex + 1}` };
    if (!oldBlock) return block;

    const assignments = block.resourceAssignments.map(assignment => ({ ...assignment }));
    oldBlock.resourceAssignments.forEach(oldAssignment => {
      roleArrays.forEach(roleKey => {
        oldAssignment[roleKey].forEach(playerId => {
          if (!currentSession.manualLocks[`${absoluteIndex}_${oldAssignment.resourceId}_${playerId}`]) return;
          assignments.forEach(assignment => {
            roleArrays.forEach(key => {
              assignment[key] = assignment[key].filter(id => id !== playerId);
            });
          });
          const target = assignments.find(assignment => assignment.resourceId === oldAssignment.resourceId);
          if (target) target[roleKey] = [...target[roleKey], playerId];
          block.unassignedPlayerIds = block.unassignedPlayerIds.filter(id => id !== playerId);
        });
      });
    });
    return { ...block, resourceAssignments: assignments };
  });

  return {
    ...currentSession,
    rotationPlan: [...completedBlocks, ...futureBlocks],
    warnings: output.warnings
  };
}

export function handleManualSwap(
  session: ClubTrainingSession,
  playerAId: string,
  playerBId: string,
  activeBlockIndex: number
): ClubTrainingSession {
  const manualLocks = { ...session.manualLocks };
  const rotationPlan = session.rotationPlan.map(block => {
    if (block.blockIndex <= activeBlockIndex) return block;
    const resourceAssignments = block.resourceAssignments.map(assignment => {
      const next = { ...assignment };
      const roleArrays: Array<keyof Pick<AllocationResourceAssignment, 'batterPlayerIds' | 'bowlerPodPlayerIds' | 'wicketkeeperPlayerIds' | 'feederPlayerIds' | 'fieldingPlayerIds' | 'restPlayerIds'>> = [
        'batterPlayerIds', 'bowlerPodPlayerIds', 'wicketkeeperPlayerIds', 'feederPlayerIds', 'fieldingPlayerIds', 'restPlayerIds'
      ];
      roleArrays.forEach(key => {
        const hasA = assignment[key].includes(playerAId);
        const hasB = assignment[key].includes(playerBId);
        next[key] = assignment[key].map(id => id === playerAId ? playerBId : id === playerBId ? playerAId : id);
        if (hasA) manualLocks[`${block.blockIndex}_${assignment.resourceId}_${playerBId}`] = true;
        if (hasB) manualLocks[`${block.blockIndex}_${assignment.resourceId}_${playerAId}`] = true;
      });
      return next;
    });
    return {
      ...block,
      resourceAssignments,
      unassignedPlayerIds: block.unassignedPlayerIds.map(id => id === playerAId ? playerBId : id === playerBId ? playerAId : id)
    };
  });
  return { ...session, rotationPlan, manualLocks };
}

export function handleLiveNoShow(
  session: ClubTrainingSession,
  playerId: string,
  activeBlockIndex: number,
  allPlayers: Player[],
  allTeams: ClubTeam[],
  allResources: TrainingResource[]
): ClubTrainingSession {
  const updatedAvailability = {
    ...session.availabilityRecords,
    [playerId]: {
      playerId,
      status: 'not_attending' as const,
      injurySorenessNotes: 'Marked absent / no-show during live session'
    }
  };

  const updatedSession = {
    ...session,
    availabilityRecords: updatedAvailability,
    expectedPlayerIds: session.expectedPlayerIds.filter(id => id !== playerId)
  };

  return recalculateFutureRotations(updatedSession, activeBlockIndex, allPlayers, allTeams, allResources);
}

export function handleLiveLateArrival(
  session: ClubTrainingSession,
  playerId: string,
  arrivalTimeStr: string,
  activeBlockIndex: number,
  allPlayers: Player[],
  allTeams: ClubTeam[],
  allResources: TrainingResource[]
): ClubTrainingSession {
  const existing = session.availabilityRecords[playerId] || { playerId, status: 'attending' };
  const updatedAvailability = {
    ...session.availabilityRecords,
    [playerId]: {
      ...existing,
      status: 'attending' as const,
      expectedArrivalTime: arrivalTimeStr
    }
  };

  const updatedSession = {
    ...session,
    availabilityRecords: updatedAvailability
  };

  return recalculateFutureRotations(updatedSession, activeBlockIndex, allPlayers, allTeams, allResources);
}

export function handleLiveInjury(
  session: ClubTrainingSession,
  playerId: string,
  injuryNotes: string,
  activeBlockIndex: number,
  allPlayers: Player[],
  allTeams: ClubTeam[],
  allResources: TrainingResource[]
): ClubTrainingSession {
  const existingStaff = session.staffPlayerAssignments[playerId] || {
    playerId,
    trainingBattingRole: 'general_rotation',
    trainingBowlingRole: 'general_rotation',
    bowlingTrainingBand: 'restricted'
  };

  const updatedStaff = {
    ...session.staffPlayerAssignments,
    [playerId]: {
      ...existingStaff,
      trainingBowlingRole: 'none' as const,
      trainingBattingRole: 'limited_participation' as const,
      returnToPlayRestrictions: injuryNotes
    }
  };

  const updatedSession = {
    ...session,
    staffPlayerAssignments: updatedStaff
  };

  return recalculateFutureRotations(updatedSession, activeBlockIndex, allPlayers, allTeams, allResources);
}

// -------------------------------------------------------------------
// 4. Session & Rolling Fairness Ledger Math
// -------------------------------------------------------------------

export function calculateSessionFairness(
  session: ClubTrainingSession,
  players: Player[]
): SessionFairnessRecord[] {
  const records: SessionFairnessRecord[] = [];

  players.forEach(p => {
    let plannedBattingMins = 0;
    let deliveries = 0;
    let centreOvers = 0;

    session.rotationPlan.forEach(block => {
      block.resourceAssignments.forEach(res => {
        if (res.batterPlayerIds.includes(p.id)) {
          plannedBattingMins += block.durationMinutes;
        }
        if (res.bowlerPodPlayerIds.includes(p.id)) {
          deliveries += 12;
        }
        if (res.centreWicketScenario) {
          const cwAss = res.centreWicketScenario.assignments.find(a => a.playerId === p.id);
          if (cwAss && cwAss.role === 'bowler') {
            centreOvers += 1;
          }
        }
      });
    });

    const staffAss = session.staffPlayerAssignments[p.id];
    const extraBattingGranted = staffAss?.extraBattingAllocation ? 10 : 0;
    const extraReason = staffAss?.extraBattingReason;

    // Standard baseline equal batting target
    const targetMins = session.fairnessSettings?.targetEqualBattingMinutes || 12;
    const missedMins = Math.max(0, targetMins - plannedBattingMins);

    const actual = session.actualParticipationOutcomes?.[p.id];
    records.push({
      sessionId: session.id,
      date: session.date,
      playerId: p.id,
      plannedBattingMinutes: plannedBattingMins,
      actualBattingMinutes: actual?.battingMinutes ?? plannedBattingMins,
      extraBattingMinutesGranted: extraBattingGranted,
      extraBattingReason: extraReason,
      deliveriesBowled: actual?.deliveriesBowled ?? deliveries,
      centreWicketOvers: actual?.centreWicketOvers ?? centreOvers,
      missedOrShortenedMinutes: Math.max(missedMins, targetMins - (actual?.battingMinutes ?? plannedBattingMins))
    });
  });

  return records;
}

export function updateRollingFairnessLedger(
  currentLedger: RollingFairnessLedger[],
  sessionRecords: SessionFairnessRecord[]
): RollingFairnessLedger[] {
  const updated = [...currentLedger];

  sessionRecords.forEach(rec => {
    const idx = updated.findIndex(l => l.playerId === rec.playerId);
    if (idx !== -1) {
      const existing = updated[idx];
      updated[idx] = {
        ...existing,
        totalSessionsAttended: existing.totalSessionsAttended + 1,
        totalBattingMinutes: existing.totalBattingMinutes + rec.actualBattingMinutes,
        totalDeliveriesBowled: existing.totalDeliveriesBowled + rec.deliveriesBowled,
        totalCentreWicketOvers: existing.totalCentreWicketOvers + rec.centreWicketOvers,
        accumulatedFairnessCreditMinutes: Math.round((existing.accumulatedFairnessCreditMinutes + rec.missedOrShortenedMinutes - rec.extraBattingMinutesGranted) * 10) / 10
      };
    } else {
      updated.push({
        playerId: rec.playerId,
        totalSessionsAttended: 1,
        totalBattingMinutes: rec.actualBattingMinutes,
        totalDeliveriesBowled: rec.deliveriesBowled,
        totalCentreWicketOvers: rec.centreWicketOvers,
        accumulatedFairnessCreditMinutes: Math.round((rec.missedOrShortenedMinutes - rec.extraBattingMinutesGranted) * 10) / 10
      });
    }
  });

  return updated;
}

export function completeSessionWithFairness(
  session: ClubTrainingSession,
  players: Player[],
  ledger: RollingFairnessLedger[],
  completedAt = new Date().toISOString()
): { session: ClubTrainingSession; ledger: RollingFairnessLedger[]; applied: boolean } {
  if (session.fairnessAppliedAt) return { session, ledger, applied: false };
  const completedSession: ClubTrainingSession = { ...session, status: 'completed', completedAt, fairnessAppliedAt: completedAt, currentLiveState: undefined };
  const records = calculateSessionFairness(completedSession, players);
  return { session: completedSession, ledger: updateRollingFairnessLedger(ledger, records), applied: true };
}
