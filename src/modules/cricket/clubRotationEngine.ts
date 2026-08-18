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
  PlayerTrainingProfile,
  DevelopmentFocus,
  SkillTier,
  TrainingResourceType,
  ClubTrainingGroup,
  RotationPlanValidationResult,
  PlanValidationError,
  PlanValidationWarning,
  PlanValidationMetrics
} from '../../types/cricket';
import { buildBlockDurations } from './sessionModel';
import { SafetyCompatibilityService } from './safetyCompatibilityService';
import { FairnessEngine } from './fairnessEngine';

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
  trainingGroups?: ClubTrainingGroup[];
  templateGroupRules?: Array<{
    teamQuery: 'all' | 'first_seconds' | 'remaining' | 'juniors' | 'seniors';
    allocatedResourceType?: TrainingResourceType;
  }>;
  centreWicketScenario?: CentreWicketScenario;
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
  validationResult?: RotationPlanValidationResult;
}

/**
 * Single source of truth for batting capacity across all resources.
 * Nets and centre wickets contribute batting capacity.
 * Fielding, fitness, wicketkeeping-only areas contribute 0 batting capacity.
 */
export function getBattingCapacity(resource: TrainingResource): number {
  if (resource.supportsLiveBatting === false) return 0;
  if (resource.type === 'centre_wicket' || resource.type === 'centre_wicket_half') {
    return resource.maxBatters || 2;
  }
  if (['standard_net', 'spin_net', 'pace_new_ball_net', 'bowling_machine_net'].includes(resource.type)) {
    return resource.maxBatters || 2;
  }
  return 0;
}

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

/**
 * Derives a PlayerTrainingProfile for safety compatibility checks from a Player record.
 */
export function derivePlayerTrainingProfile(player: Player, team?: ClubTeam): PlayerTrainingProfile {
  let primaryRole: PlayerTrainingProfile['primaryRole'] = 'batter';
  if (player.primaryRole === 'pace_bowler' || player.primaryRole === 'spin_bowler') {
    primaryRole = 'bowler';
  } else if (player.primaryRole === 'all_rounder') {
    primaryRole = 'all_rounder';
  } else if (player.primaryRole === 'wicketkeeper') {
    primaryRole = 'wicketkeeper';
  }

  const isJunior = team?.juniorMode || player.ageGroup?.toLowerCase().includes('u1') || player.ageGroup?.toLowerCase().includes('junior');
  const isPremierSenior = team?.gradeOrDivision?.toLowerCase().includes('1st') || team?.name?.toLowerCase().includes('1st');

  let paceBowlingTier: SkillTier | undefined = undefined;
  if (player.bowlingStyle === 'right_arm_fast' || player.capabilities?.includes('high_pace')) {
    paceBowlingTier = isJunior ? 'advanced' : 'performance';
  } else if (player.bowlingStyle === 'right_arm_fast_medium' || player.bowlingStyle === 'left_arm_fast_medium') {
    paceBowlingTier = isPremierSenior ? 'advanced' : 'competent';
  } else if (player.bowlingStyle !== 'does_not_bowl' && !player.bowlingStyle.includes('spin')) {
    paceBowlingTier = 'developing';
  }

  let spinBowlingTier: SkillTier | undefined = undefined;
  if (player.bowlingStyle.includes('spin')) {
    spinBowlingTier = isPremierSenior ? 'advanced' : 'competent';
  }

  let battingTier: SkillTier = 'competent';
  if (isPremierSenior && (player.primaryRole === 'top_order_batter' || player.primaryRole === 'middle_order_batter')) {
    battingTier = 'performance';
  } else if (isJunior || player.primaryTeamId === 'ct-5' || player.ageGroup?.includes('5th')) {
    battingTier = 'developing';
  }

  const canFacePace: boolean = player.workloadRestriction?.restrictedBowler ? false : true;
  const canFaceAdvancedPace: boolean = !isJunior && (battingTier === 'performance' || Boolean(isPremierSenior));

  return {
    primaryRole,
    ageGroup: player.ageGroup,
    battingTier,
    paceBowlingTier,
    spinBowlingTier,
    safetyProfile: {
      playerId: player.id,
      canFacePace,
      canFaceAdvancedPace,
      canFaceSpin: true,
      maxCompatiblePaceTier: canFaceAdvancedPace ? 'performance' : 'competent',
      coachRestrictions: player.workloadRestriction?.notes ? [player.workloadRestriction.notes] : []
    }
  };
}

/**
 * Resolves explicit or template-driven training groups.
 */
const SENIOR_GROUP_ID = 'grp-seniors';
const LOWER_GROUP_ID = 'grp-lower-grades';

const NET_TYPES: TrainingResourceType[] = ['standard_net', 'spin_net', 'pace_new_ball_net', 'bowling_machine_net'];

const isCentreWicketType = (type: TrainingResourceType): boolean =>
  type === 'centre_wicket' || type === 'centre_wicket_half';

/**
 * Turns a template's resource-type rules into a per-cohort preference.
 *
 * A rule naming any net type means "this cohort prefers nets", since a club's three
 * nets are rarely all the same type. The preference only breaks ties in
 * `distributeResourcesByHeadcount` — it can steer which cohort gets the centre
 * wicket, but it can no longer hand one cohort six batting slots and the other two.
 */
function preferredTypesFromTemplate(
  rules?: Array<{ teamQuery: string; allocatedResourceType?: TrainingResourceType }>
): Record<string, TrainingResourceType[]> {
  const preferences: Record<string, TrainingResourceType[]> = {};
  if (!rules?.length) return preferences;

  const expand = (type?: TrainingResourceType): TrainingResourceType[] => {
    if (!type) return [];
    return NET_TYPES.includes(type) ? NET_TYPES : [type];
  };

  const firstSecondsRule = rules.find(rule => rule.teamQuery === 'first_seconds');
  const remainingRule = rules.find(rule => rule.teamQuery === 'remaining');
  if (firstSecondsRule) preferences[SENIOR_GROUP_ID] = expand(firstSecondsRule.allocatedResourceType);
  if (remainingRule) preferences[LOWER_GROUP_ID] = expand(remainingRule.allocatedResourceType);
  return preferences;
}

/**
 * Shares the training areas out so that batting slots per player land as evenly as
 * possible across cohorts, instead of giving the top grades the pick of the facility.
 *
 * Areas are handed out largest first to whichever cohort is furthest behind on slots
 * per player. `rotationSeed` breaks any remaining tie, so calling this once per block
 * walks the centre wicket around the cohorts rather than parking it with one of them
 * for the whole session.
 */
export function distributeResourcesByHeadcount(options: {
  groups: Array<{ id: string; weight: number; preferredTypes?: TrainingResourceType[] }>;
  resources: TrainingResource[];
  rotationSeed?: number;
}): Record<string, string[]> {
  const { resources, rotationSeed = 0 } = options;

  const allocation: Record<string, string[]> = {};
  options.groups.forEach(group => { allocation[group.id] = []; });

  // A cohort with nobody in it must not hold a net hostage.
  const groups = options.groups.filter(group => group.weight > 0);
  if (groups.length === 0) return allocation;

  const slots: Record<string, number> = {};
  groups.forEach(group => { slots[group.id] = 0; });

  const battingAreas = resources
    .filter(resource => getBattingCapacity(resource) > 0)
    .sort((a, b) => getBattingCapacity(b) - getBattingCapacity(a) || a.id.localeCompare(b.id));
  const supportAreas = resources.filter(resource => getBattingCapacity(resource) === 0);

  battingAreas.forEach(resource => {
    const ranked = groups
      .map((group, index) => ({
        group,
        ratio: slots[group.id] / group.weight,
        prefers: group.preferredTypes?.includes(resource.type) ? 0 : 1,
        tie: (index + rotationSeed) % groups.length
      }))
      .sort((a, b) => {
        if (Math.abs(a.ratio - b.ratio) > 1e-9) return a.ratio - b.ratio;
        if (a.prefers !== b.prefers) return a.prefers - b.prefers;
        return a.tie - b.tie;
      });

    const target = ranked[0].group;
    allocation[target.id].push(resource.id);
    slots[target.id] += getBattingCapacity(resource);
  });

  // Nobody trains for 90 minutes without a bat in hand: if a cohort ended up with no
  // batting area while another holds several, move the smallest one across.
  const isBattingArea = (id: string) => battingAreas.some(resource => resource.id === id);
  groups.forEach(group => {
    if (allocation[group.id].some(isBattingArea)) return;

    const donor = groups
      .map(other => ({ other, areas: allocation[other.id].filter(isBattingArea) }))
      .filter(entry => entry.areas.length > 1)
      .sort((a, b) => b.areas.length - a.areas.length)[0];
    if (!donor) return;

    const smallest = donor.areas
      .map(id => battingAreas.find(resource => resource.id === id)!)
      .sort((a, b) => getBattingCapacity(a) - getBattingCapacity(b))[0];

    allocation[donor.other.id] = allocation[donor.other.id].filter(id => id !== smallest.id);
    allocation[group.id].push(smallest.id);
    slots[donor.other.id] -= getBattingCapacity(smallest);
    slots[group.id] += getBattingCapacity(smallest);
  });

  // Fielding and fitness areas follow the bigger squads, since that is where the
  // players waiting for a net actually are.
  const byHeadcount = [...groups].sort((a, b) => b.weight - a.weight);
  supportAreas.forEach((resource, index) => {
    const target = byHeadcount[(index + rotationSeed) % byHeadcount.length];
    allocation[target.id].push(resource.id);
  });

  return allocation;
}

export function resolveTrainingGroups(options: {
  teams: ClubTeam[];
  resources: TrainingResource[];
  /** Attending players, used to weight the area split by real squad sizes. */
  players?: Player[];
  groupingStrategy?: GroupingStrategy;
  trainingGroups?: ClubTrainingGroup[];
  templateGroupRules?: Array<{
    teamQuery: 'all' | 'first_seconds' | 'remaining' | 'juniors' | 'seniors';
    allocatedResourceType?: TrainingResourceType;
  }>;
}): ClubTrainingGroup[] {
  const { teams, resources, players, groupingStrategy = 'graded', trainingGroups, templateGroupRules } = options;

  if (trainingGroups && trainingGroups.length > 0) {
    return trainingGroups;
  }

  const activeResources = resources.filter(r => r.active);
  const activeTeams = teams.filter(t => t.active !== false);

  if (activeTeams.length <= 1 || groupingStrategy === 'mixed') {
    return [
      {
        id: 'grp-all',
        name: 'All Squads Combined',
        teamIds: activeTeams.map(t => t.id),
        resourceIds: activeResources.map(r => r.id),
        groupingStrategy: 'mixed'
      }
    ];
  }

  const firstSecondsTeams = activeTeams.slice(0, 2);
  const remainingTeams = activeTeams.slice(2);

  // Graded 2-cohort partition (1sts/2nds vs 3rds/4ths/5ths). Areas are shared out by
  // headcount rather than by grade, so three lower sides are not left fighting over one
  // net while the top two hold the rest of the ground. A template's resource types still
  // steer which cohort gets which area, but only as a tiebreak.
  if (firstSecondsTeams.length > 0 && remainingTeams.length > 0) {
    const preferences = preferredTypesFromTemplate(templateGroupRules);

    const countIn = (cohort: ClubTeam[]): number => {
      const ids = new Set(cohort.map(t => t.id));
      return (players || []).filter(p => p.primaryTeamId && ids.has(p.primaryTeamId)).length;
    };
    // Fresh club with no squads entered yet: weight by how many sides each cohort holds,
    // which is still proportional and keeps the split deterministic. Once anyone is on a
    // squad list we go by real headcount, so a cohort with nobody there holds no areas.
    const squadsAreKnown = countIn(firstSecondsTeams) + countIn(remainingTeams) > 0;
    const headcount = (cohort: ClubTeam[]): number =>
      squadsAreKnown ? countIn(cohort) : cohort.length;

    const allocation = distributeResourcesByHeadcount({
      groups: [
        { id: SENIOR_GROUP_ID, weight: headcount(firstSecondsTeams), preferredTypes: preferences[SENIOR_GROUP_ID] },
        { id: LOWER_GROUP_ID, weight: headcount(remainingTeams), preferredTypes: preferences[LOWER_GROUP_ID] }
      ],
      resources: activeResources
    });

    return [
      {
        id: SENIOR_GROUP_ID,
        name: `${firstSecondsTeams.map(t => t.name).join(' & ')}`,
        teamIds: firstSecondsTeams.map(t => t.id),
        resourceIds: allocation[SENIOR_GROUP_ID],
        groupingStrategy: 'graded'
      },
      {
        id: LOWER_GROUP_ID,
        name: `${remainingTeams.map(t => t.name).join(', ')}`,
        teamIds: remainingTeams.map(t => t.id),
        resourceIds: allocation[LOWER_GROUP_ID],
        groupingStrategy: 'graded'
      }
    ];
  }

  return [
    {
      id: 'grp-all',
      name: 'All Club Combined',
      teamIds: activeTeams.map(t => t.id),
      resourceIds: activeResources.map(r => r.id),
      groupingStrategy: 'graded'
    }
  ];
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

  const activeResources = availableResources.filter(r => r.active);
  let totalNetBattingCapacityMinutes = 0;
  activeResources.forEach(res => {
    totalNetBattingCapacityMinutes += getBattingCapacity(res) * sessionDurationMinutes;
  });

  const battersNeedingTurns = attendingPlayers.filter(p => {
    const staffRole = staffAssignments?.[p.id]?.trainingBattingRole;
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

  const staffableCapacityMinutes = totalNetBattingCapacityMinutes;
  const fairBattingMinutesPerPlayer = Math.round(
    (staffableCapacityMinutes / totalBattingTurnsNeeded) * 10
  ) / 10;

  const warnings: string[] = [];
  const recommendedAdjustments: string[] = [];
  let isFeasible = true;

  if (fairBattingMinutesPerPlayer < 8) {
    isFeasible = false;
    warnings.push(
      `Capacity alert: ${totalBattingTurnsNeeded} players require batting turns. ${activeResources.length} active areas provide ${staffableCapacityMinutes} staffable batting minutes. Equal allocation would be approx ${fairBattingMinutesPerPlayer} mins each.`
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
    teams,
    availability,
    staffAssignments,
    rotationBlockDurationMinutes,
    sessionStartTime,
    sessionFinishTime,
    manualLocks: _manualLocks = {},
    rollingFairnessLedger = [],
    completedBlocks = [],
    groupingStrategy = 'graded',
    trainingGroups,
    templateGroupRules,
    centreWicketScenario: customCentreWicketScenario,
    playerTrainingProfiles = {}
  } = options;

  const startMins = timeToMinutes(sessionStartTime || '18:00');
  const finishMins = timeToMinutes(sessionFinishTime || '19:30');
  const totalMins = Math.max(15, finishMins - startMins);
  const blockMins = Math.max(5, rotationBlockDurationMinutes || 12);
  const blockDurations = buildBlockDurations(totalMins, blockMins);
  const totalBlocksCount = blockDurations.length;

  const activeResources = resources.filter(r => r.active !== false);
  const leaderIds = new Set((teams || []).flatMap(team => [...(team.captainIds || []), ...(team.coachIds || [])]));
  const warnings: string[] = [];
  const unsatisfiedSoftConstraints: string[] = [];

  const attendingPlayers = players.filter(p => {
    const rec = availability?.[p.id];
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

  const fairnessCreditMap = new Map<string, number>();
  const centreWicketExposureMap = new Map<string, number>();
  rollingFairnessLedger.forEach(l => {
    fairnessCreditMap.set(l.playerId, l.accumulatedFairnessCreditMinutes || 0);
    centreWicketExposureMap.set(l.playerId, l.totalCentreWicketOvers || 0);
  });

  const sessionBattingMinutesMap = new Map<string, number>();
  attendingPlayers.forEach(p => sessionBattingMinutesMap.set(p.id, 0));

  const deliveriesBowledMap = new Map<string, number>();
  attendingPlayers.forEach(p => deliveriesBowledMap.set(p.id, 0));

  const matchupHistory = new Set<string>();

  completedBlocks.forEach(block => {
    block.resourceAssignments.forEach(assignment => {
      assignment.batterPlayerIds.forEach(bId => {
        sessionBattingMinutesMap.set(bId, (sessionBattingMinutesMap.get(bId) || 0) + block.durationMinutes);
      });
      assignment.bowlerPodPlayerIds.forEach(bwId => {
        deliveriesBowledMap.set(bwId, (deliveriesBowledMap.get(bwId) || 0) + 12);
        assignment.batterPlayerIds.forEach(bId => {
          matchupHistory.add(`${bId}_${bwId}`);
        });
      });
    });
  });

  // Resolve groups
  const resolvedGroups = resolveTrainingGroups({
    teams,
    resources: activeResources,
    players: attendingPlayers,
    groupingStrategy,
    trainingGroups,
    templateGroupRules
  });

  // When the coach has configured groups by hand, that configuration is the plan and we
  // leave it alone. When we derived the split ourselves we re-balance it every block, so
  // the centre wicket travels between cohorts instead of belonging to one all night.
  const groupsAreCoachConfigured = Boolean(trainingGroups && trainingGroups.length > 0);
  const groupTypePreferences = preferredTypesFromTemplate(templateGroupRules);

  // Map each player to team
  const playerTeamMap = new Map<string, string>();
  players.forEach(p => {
    let tId = p.primaryTeamId;
    if (!tId) {
      const foundTeam = teams.find(t => t.squadPlayerIds?.includes(p.id));
      tId = foundTeam?.id || teams[0]?.id || 'team-1';
    }
    playerTeamMap.set(p.id, tId);
  });

  // Build profiles map
  const trainingProfilesMap = new Map<string, PlayerTrainingProfile>();
  players.forEach(p => {
    if (playerTrainingProfiles[p.id]) {
      trainingProfilesMap.set(p.id, playerTrainingProfiles[p.id]);
    } else {
      const tId = playerTeamMap.get(p.id);
      const teamObj = teams.find(t => t.id === tId);
      trainingProfilesMap.set(p.id, derivePlayerTrainingProfile(p, teamObj));
    }
  });

  const rotationBlocks: RotationBlockPlan[] = [];

  for (let bIndex = 0; bIndex < totalBlocksCount; bIndex++) {
    if (completedBlocks[bIndex]) {
      rotationBlocks.push(completedBlocks[bIndex]);
      continue;
    }

    const currentBlockMins = blockDurations[bIndex];
    const bStartMins = startMins + blockDurations.slice(0, bIndex).reduce((sum, value) => sum + value, 0);
    const bEndMins = bStartMins + currentBlockMins;
    const blockStartTimeStr = minutesToTime(bStartMins);
    const blockEndTimeStr = minutesToTime(bEndMins);

    const windowAvailablePlayers = attendingPlayers.filter(p => {
      const rec = availability?.[p.id];
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
    const resourceAssignmentsMap = new Map<string, AllocationResourceAssignment>();
    const customScenarioIsActive = customCentreWicketScenario != null && (
      customCentreWicketScenario.blockIndexes?.length
        ? customCentreWicketScenario.blockIndexes.includes(bIndex)
        : bIndex === 0
    );

    // Initialise assignments for all active resources
    activeResources.forEach(res => {
      resourceAssignmentsMap.set(res.id, {
        resourceId: res.id,
        resourceName: res.name,
        batterPlayerIds: [],
        bowlerPodPlayerIds: [],
        wicketkeeperPlayerIds: [],
        feederPlayerIds: [],
        fieldingPlayerIds: [],
        restPlayerIds: []
      });
    });

    // 1. Custom Centre-Wicket Scenario (Constraint-First)
    if (customCentreWicketScenario && customScenarioIsActive) {
      const centreResource = activeResources.find(r => r.supportsCentreWicket || r.type === 'centre_wicket' || r.type === 'centre_wicket_half');
      if (centreResource) {
        const roles = (roleNames: CentreWicketScenario['assignments'][number]['role'][]) =>
          customCentreWicketScenario.assignments
            .filter(item => roleNames.includes(item.role))
            .map(item => item.playerId)
            .filter(id => windowAvailablePlayers.some(p => p.id === id));

        const cwBatters = roles(['batter']);
        const cwBowlers = roles(['bowler', 'next_bowler']);
        const cwKeepers = roles(['wicketkeeper']);
        const cwFielders = roles(['close_fielder', 'ring_fielder', 'boundary_fielder']);
        const cwRest = roles(['next_batting_pair', 'rest']);

        [...cwBatters, ...cwBowlers, ...cwKeepers, ...cwFielders, ...cwRest].forEach(id => {
          assignedInBlock.add(id);
        });

        cwBatters.forEach(bId => {
          sessionBattingMinutesMap.set(bId, (sessionBattingMinutesMap.get(bId) || 0) + currentBlockMins);
        });
        cwBowlers.forEach(bwId => {
          deliveriesBowledMap.set(bwId, (deliveriesBowledMap.get(bwId) || 0) + 12);
        });

        resourceAssignmentsMap.set(centreResource.id, {
          resourceId: centreResource.id,
          resourceName: centreResource.name,
          leaderId: customCentreWicketScenario.namedLeaderId,
          batterPlayerIds: cwBatters,
          bowlerPodPlayerIds: cwBowlers,
          wicketkeeperPlayerIds: cwKeepers,
          feederPlayerIds: [],
          fieldingPlayerIds: cwFielders,
          restPlayerIds: cwRest,
          centreWicketScenario: customCentreWicketScenario
        });
      }
    }

    // Fairness Queue comparator
    const fairnessQueueComparator = (a: Player, b: Player) => {
      const staffA = staffAssignments?.[a.id];
      const staffB = staffAssignments?.[b.id];

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
    };

    // Re-share the areas for this block against who actually turned up and is still here,
    // rotating the tiebreak so no cohort keeps the centre wicket for the whole session.
    const blockPlayerCount = (group: ClubTrainingGroup): number =>
      windowAvailablePlayers.filter(p => group.teamIds.includes(playerTeamMap.get(p.id) || 'team-1')).length;

    const blockAllocation = groupsAreCoachConfigured
      ? null
      : distributeResourcesByHeadcount({
        groups: resolvedGroups.map(group => ({
          id: group.id,
          weight: blockPlayerCount(group),
          preferredTypes: groupTypePreferences[group.id]
        })),
        // The custom centre-wicket scenario has already claimed its players and area.
        resources: activeResources.filter(r => !(customScenarioIsActive && (r.supportsCentreWicket || isCentreWicketType(r.type)))),
        // Swap the cohorts over in phases rather than every block: moving forty players
        // between the nets and the middle every twelve minutes is not a real session.
        rotationSeed: Math.floor(bIndex / Math.max(1, Math.ceil(totalBlocksCount / Math.max(1, resolvedGroups.length))))
      });

    // 2. Allocate Per Group
    resolvedGroups.forEach(group => {
      // Get players for this group
      const groupPlayers = windowAvailablePlayers.filter(p => {
        if (assignedInBlock.has(p.id)) return false;
        const pTeamId = playerTeamMap.get(p.id) || 'team-1';
        return group.teamIds.includes(pTeamId);
      });

      const allowedResourceIds = blockAllocation ? blockAllocation[group.id] : group.resourceIds;

      // Get resources allocated to this group (excluding centre wicket if custom scenario is active)
      const groupResources = activeResources.filter(r => {
        if (!allowedResourceIds?.includes(r.id)) return false;
        if (customScenarioIsActive && (r.supportsCentreWicket || r.type === 'centre_wicket' || r.type === 'centre_wicket_half')) {
          return false;
        }
        return true;
      }).sort((a, b) => {
        const aIsCentre = a.type === 'centre_wicket' || a.type === 'centre_wicket_half';
        const bIsCentre = b.type === 'centre_wicket' || b.type === 'centre_wicket_half';
        return Number(bIsCentre) - Number(aIsCentre);
      });

      if (groupPlayers.length === 0 || groupResources.length === 0) return;

      const sortedGroupBatters = [...groupPlayers].sort(fairnessQueueComparator);

      groupResources.forEach((res, resourceIndex) => {
        const assignment = resourceAssignmentsMap.get(res.id)!;
        const resourceBatters: string[] = [];
        const resourceBowlers: string[] = [];
        const resourceKeepers: string[] = [];
        const resourceFeeders: string[] = [];
        const resourceFielders: string[] = [];
        let priorityMatchups: PriorityMatchup[] | undefined;
        let centreWicketScenario: CentreWicketScenario | undefined;
        const unassignedGroupPlayerCount = groupPlayers.filter(player => !assignedInBlock.has(player.id)).length;
        const remainingResourceCount = groupResources.length - resourceIndex;
        const allocationParticipantLimit = Math.min(
          res.maxTotalParticipants,
          Math.ceil(unassignedGroupPlayerCount / Math.max(1, remainingResourceCount))
        );

        // Centre Wicket (Automated Rotation)
        if (res.type === 'centre_wicket' || res.type === 'centre_wicket_half') {
          const availableForCw = groupPlayers.filter(p => !assignedInBlock.has(p.id));
          const participantLimit = Math.max(0, allocationParticipantLimit);
          const batterLimit = Math.min(res.maxBatters, participantLimit);

          const cwCandidateBatters = sortedGroupBatters
            .filter(p => !assignedInBlock.has(p.id))
            .sort((a, b) => {
              const exposureDifference = (centreWicketExposureMap.get(a.id) || 0) - (centreWicketExposureMap.get(b.id) || 0);
              return exposureDifference || fairnessQueueComparator(a, b);
            })
            .slice(0, batterLimit);
          cwCandidateBatters.forEach(b => {
            resourceBatters.push(b.id);
            assignedInBlock.add(b.id);
            sessionBattingMinutesMap.set(b.id, (sessionBattingMinutesMap.get(b.id) || 0) + currentBlockMins);
          });

          let remainingCap = participantLimit - resourceBatters.length;
          const cwAvailableBowlers = availableForCw
            .filter(p => !assignedInBlock.has(p.id) && staffAssignments?.[p.id]?.trainingBowlingRole !== 'none' && p.bowlingStyle !== 'does_not_bowl');

          for (let i = 0; i < cwAvailableBowlers.length && resourceBowlers.length < Math.min(res.maxBowlers, remainingCap); i++) {
            const bw = cwAvailableBowlers[i];
            const currentDel = deliveriesBowledMap.get(bw.id) || 0;
            const maxDel = bw.workloadRestriction?.maxDeliveries || staffAssignments?.[bw.id]?.workloadLimitDeliveries;
            if (maxDel && currentDel >= maxDel) continue;

            const bowlerProfile = trainingProfilesMap.get(bw.id) || derivePlayerTrainingProfile(bw, playerTeamMap.get(bw.id) ? teams.find(t => t.id === playerTeamMap.get(bw.id)) : undefined);
            let isSafe = true;

            for (const bId of resourceBatters) {
              const bPlayer = players.find(p => p.id === bId)!;
              const batterProfile = trainingProfilesMap.get(bId) || derivePlayerTrainingProfile(bPlayer, playerTeamMap.get(bId) ? teams.find(t => t.id === playerTeamMap.get(bId)) : undefined);
              const safetyEval = SafetyCompatibilityService.isSafeMatchup(batterProfile, bowlerProfile);
              if (safetyEval.status === 'BLOCKED') {
                isSafe = false;
                break;
              } else if (safetyEval.status === 'REQUIRES_COACH_APPROVAL') {
                blockAlerts.push(`${res.name}: ${bw.name} vs ${bPlayer.name} requires coach approval (${safetyEval.reasons.join('; ')}).`);
              }
            }

            if (isSafe) {
              resourceBowlers.push(bw.id);
              assignedInBlock.add(bw.id);
              deliveriesBowledMap.set(bw.id, currentDel + 12);
            }
          }
          remainingCap -= resourceBowlers.length;

          const cwCandidateKeepers = availableForCw
            .filter(p => !assignedInBlock.has(p.id) && p.wicketkeepingCapability !== 'none')
            .slice(0, Math.min(1, remainingCap));
          cwCandidateKeepers.forEach(k => {
            resourceKeepers.push(k.id);
            assignedInBlock.add(k.id);
          });
          remainingCap -= cwCandidateKeepers.length;

          const cwCandidateFielders = availableForCw
            .filter(p => !assignedInBlock.has(p.id))
            .slice(0, remainingCap);
          cwCandidateFielders.forEach(f => {
            resourceFielders.push(f.id);
            assignedInBlock.add(f.id);
          });

          if (resourceBatters.length >= 2) {
            const pairPlayerIds: [string, string] = [resourceBatters[0], resourceBatters[1]];
            centreWicketScenario = {
              scenarioId: `cw-scen-${bIndex}-${group.id}`,
              name: `Scenario Play (${group.name})`,
              targetRuns: 36,
              targetOversOrBalls: 24,
              wicketsRemaining: 4,
              battingPairs: [{ pairPlayerIds, allocatedOversOrBalls: 4 }],
              bowlingSpells: resourceBowlers.map(bwId => ({ bowlerPlayerId: bwId, oversOrDeliveries: 1 })),
              wicketkeeperId: resourceKeepers[0],
              assignments: [
                { playerId: resourceBatters[0], role: 'batter' },
                { playerId: resourceBatters[1], role: 'batter' },
                ...resourceBatters.slice(2).map(bId => ({ playerId: bId, role: 'next_batting_pair' as const })),
                ...resourceBowlers.map(bwId => ({ playerId: bwId, role: 'bowler' as const })),
                ...resourceKeepers.map(kId => ({ playerId: kId, role: 'wicketkeeper' as const })),
                ...resourceFielders.map((fId, i) => ({
                  playerId: fId,
                  role: i === 0 ? 'close_fielder' as const : i <= 3 ? 'ring_fielder' as const : 'boundary_fielder' as const
                }))
              ]
            };
          }
        }
        // Net Resources
        else if (['standard_net', 'spin_net', 'pace_new_ball_net', 'bowling_machine_net'].includes(res.type)) {
          const availableBatters = sortedGroupBatters.filter(p => !assignedInBlock.has(p.id));
          const batterCount = Math.min(res.maxBatters, allocationParticipantLimit, availableBatters.length);

          for (let i = 0; i < batterCount; i++) {
            const b = availableBatters[i];
            if (b) {
              resourceBatters.push(b.id);
              assignedInBlock.add(b.id);
              sessionBattingMinutesMap.set(b.id, (sessionBattingMinutesMap.get(b.id) || 0) + currentBlockMins);
            }
          }

          // Candidate Bowlers
          const availableBowlers = groupPlayers.filter(p => !assignedInBlock.has(p.id) && staffAssignments?.[p.id]?.trainingBowlingRole !== 'none' && p.bowlingStyle !== 'does_not_bowl');
          let candidateBowlers = availableBowlers;

          if (res.type === 'spin_net') {
            const spinOnly = availableBowlers.filter(p => p.bowlingStyle.includes('spin') || staffAssignments?.[p.id]?.trainingBowlingRole === 'spin_focus');
            if (spinOnly.length >= res.minBowlers) candidateBowlers = spinOnly;
          } else if (res.type === 'pace_new_ball_net') {
            const paceOnly = availableBowlers.filter(p => p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium') || staffAssignments?.[p.id]?.trainingBowlingRole === 'pace_focus');
            if (paceOnly.length >= res.minBowlers) candidateBowlers = paceOnly;
          }

          const maxBowlerSlots = Math.min(res.maxBowlers, Math.max(0, allocationParticipantLimit - resourceBatters.length));

          // Safe bowler allocation
          for (let i = 0; i < candidateBowlers.length && resourceBowlers.length < maxBowlerSlots; i++) {
            const bw = candidateBowlers[i];
            const currentDel = deliveriesBowledMap.get(bw.id) || 0;
            const maxDel = bw.workloadRestriction?.maxDeliveries || staffAssignments?.[bw.id]?.workloadLimitDeliveries;
            if (maxDel && currentDel >= maxDel) continue;

            // Safety check against all batters in this net
            const bowlerProfile = trainingProfilesMap.get(bw.id) || derivePlayerTrainingProfile(bw);
            let isSafe = true;

            for (const bId of resourceBatters) {
              const batterProfile = trainingProfilesMap.get(bId) || derivePlayerTrainingProfile(players.find(p => p.id === bId)!);
              const safetyEval = SafetyCompatibilityService.isSafeMatchup(batterProfile, bowlerProfile);
              if (safetyEval.status === 'BLOCKED') {
                isSafe = false;
                break;
              } else if (safetyEval.status === 'REQUIRES_COACH_APPROVAL') {
                blockAlerts.push(`${res.name}: ${bw.name} vs ${players.find(p => p.id === bId)?.name} requires coach approval (${safetyEval.reasons.join('; ')}).`);
              }
            }

            if (isSafe) {
              resourceBowlers.push(bw.id);
              assignedInBlock.add(bw.id);
              deliveriesBowledMap.set(bw.id, currentDel + 12);
              resourceBatters.forEach(bId => matchupHistory.add(`${bId}_${bw.id}`));
            }
          }

          // Feeders / Machine
          if (res.type === 'bowling_machine_net' && resourceBatters.length + resourceBowlers.length < allocationParticipantLimit) {
            const feederCandidate = groupPlayers.find(p => !assignedInBlock.has(p.id));
            if (feederCandidate) {
              resourceFeeders.push(feederCandidate.id);
              assignedInBlock.add(feederCandidate.id);
            }
          }

          if (resourceBatters.length > 0 && resourceBowlers.length === 0 && res.type !== 'bowling_machine_net') {
            blockAlerts.push(`${res.name}: Insufficient bowling support (0/${res.minBowlers}).`);
          }

          // Priority matchups
          if (resourceBatters.length > 0 && resourceBowlers.length > 0) {
            const bId = resourceBatters[0];
            const staffAss = staffAssignments?.[bId];
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
        // Fielding / Other
        else {
          const unassignedOthers = groupPlayers.filter(p => !assignedInBlock.has(p.id));
          unassignedOthers.slice(0, allocationParticipantLimit).forEach(p => {
            resourceFielders.push(p.id);
            assignedInBlock.add(p.id);
          });
        }

        assignment.batterPlayerIds = resourceBatters;
        assignment.bowlerPodPlayerIds = resourceBowlers;
        assignment.wicketkeeperPlayerIds = resourceKeepers;
        assignment.feederPlayerIds = resourceFeeders;
        assignment.fieldingPlayerIds = resourceFielders;
        assignment.priorityMatchups = priorityMatchups;
        assignment.centreWicketScenario = centreWicketScenario;
      });
    });

    // 3. Finalise Block Assignments and Leader Validation
    const resourceAssignments = Array.from(resourceAssignmentsMap.values()).map(assignment => {
      const res = activeResources.find(r => r.id === assignment.resourceId);
      const participants = [
        ...assignment.batterPlayerIds,
        ...assignment.bowlerPodPlayerIds,
        ...assignment.wicketkeeperPlayerIds,
        ...assignment.feederPlayerIds,
        ...assignment.fieldingPlayerIds,
        ...assignment.restPlayerIds
      ];

      let leaderId = assignment.leaderId;
      if (!leaderId) {
        leaderId = participants.find(id => leaderIds.has(id));
      }

      if (res?.requiresCoachOrLeader && !leaderId && participants.length > 0) {
        const availableLeader = Array.from(leaderIds).find(id => windowAvailablePlayers.some(p => p.id === id));
        if (availableLeader) {
          leaderId = availableLeader;
        } else {
          blockAlerts.push(`${res.name}: Cannot open because no lane leader is available.`);
        }
      }

      return {
        ...assignment,
        leaderId
      };
    });

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

  // Evaluate Score & Constraints
  let score = 100;
  const battingTimes = Array.from(sessionBattingMinutesMap.values());
  const maxBattingTime = Math.max(...battingTimes, 0);
  const minBattingTime = Math.min(...battingTimes, 0);

  if (maxBattingTime - minBattingTime > 15) {
    score -= 15;
    unsatisfiedSoftConstraints.push(`Unequal batting time gap of ${maxBattingTime - minBattingTime} mins between players.`);
  }

  const zeroBattingPlayers = attendingPlayers.filter(p => {
    const staffRole = staffAssignments?.[p.id]?.trainingBattingRole;
    const mins = sessionBattingMinutesMap.get(p.id) || 0;
    return mins === 0 && staffRole !== 'none' && staffRole !== 'limited_participation';
  });

  if (zeroBattingPlayers.length > 0) {
    score -= Math.min(30, zeroBattingPlayers.length * 10);
    warnings.push(`${zeroBattingPlayers.length} attending batter(s) received 0 net batting minutes: ${zeroBattingPlayers.map(p => p.name).join(', ')}.`);
    unsatisfiedSoftConstraints.push(`${zeroBattingPlayers.length} player(s) did not receive a batting turn.`);
  }

  const theoreticalCapacityMinutes = rotationBlocks.reduce((total, block) =>
    total + activeResources.reduce((sum, resource) => sum + getBattingCapacity(resource) * block.durationMinutes, 0), 0);

  const staffableCapacityMinutes = rotationBlocks.reduce((total, block) =>
    total + block.resourceAssignments.reduce((sum, assignment) => {
      const resource = activeResources.find(item => item.id === assignment.resourceId);
      if (!resource || (resource.requiresCoachOrLeader && !assignment.leaderId)) return sum;
      return sum + getBattingCapacity(resource) * block.durationMinutes;
    }, 0), 0);

  const actuallyAllocatedCapacityMinutes = rotationBlocks.reduce((total, block) =>
    total + block.resourceAssignments.reduce((sum, assignment) => sum + assignment.batterPlayerIds.length * block.durationMinutes, 0), 0);

  const unusedCapacityMinutes = Math.max(0, staffableCapacityMinutes - actuallyAllocatedCapacityMinutes);

  activeResources.forEach(resource => {
    const assignments = rotationBlocks.flatMap(block => block.resourceAssignments.filter(item => item.resourceId === resource.id));
    const used = assignments.some(assignment =>
      assignment.batterPlayerIds.length + assignment.bowlerPodPlayerIds.length + assignment.wicketkeeperPlayerIds.length +
      assignment.feederPlayerIds.length + assignment.fieldingPlayerIds.length > 0
    );
    if (!used) warnings.push(`${resource.name}: Selected but unused.`);
    if (resource.requiresCoachOrLeader && assignments.some(assignment => !assignment.leaderId && (assignment.batterPlayerIds.length + assignment.bowlerPodPlayerIds.length > 0))) {
      warnings.push(`${resource.name}: Capacity is configured but not staffed in one or more blocks.`);
    }
  });

  if (staffableCapacityMinutes > 0 && unusedCapacityMinutes / staffableCapacityMinutes > 0.25) {
    score -= 10;
    unsatisfiedSoftConstraints.push(`${unusedCapacityMinutes} staffable batting minutes remain unused.`);
  }

  // Pure validation
  const validationResult = validateRotationPlan({
    rotationBlocks,
    resources: activeResources,
    players: attendingPlayers,
    teams,
    availability,
    staffAssignments,
    playerTrainingProfiles
  });

  return {
    rotationBlocks,
    explainablePlanScore: Math.max(0, score),
    warnings: [...new Set([...warnings, ...validationResult.warnings.map(w => w.message)])],
    unsatisfiedSoftConstraints,
    capacityMetrics: { theoreticalCapacityMinutes, staffableCapacityMinutes, actuallyAllocatedCapacityMinutes, unusedCapacityMinutes },
    validationResult
  };
}

/**
 * Pure validation of a generated rotation plan against all hard constraints, safety rules and fairness metrics.
 */
export function validateRotationPlan(options: {
  rotationBlocks?: RotationBlockPlan[];
  blocks?: RotationBlockPlan[];
  resources: TrainingResource[];
  players: Player[];
  teams?: ClubTeam[];
  availability?: Record<string, PlayerAvailabilityRecord>;
  staffAssignments?: Record<string, StaffPlayerAssignment>;
  playerTrainingProfiles?: Record<string, PlayerTrainingProfile>;
}): RotationPlanValidationResult {
  const rotationBlocks = options.rotationBlocks || options.blocks || [];
  const {
    resources,
    players,
    teams = [],
    availability,
    staffAssignments,
    playerTrainingProfiles = {}
  } = options;

  const hardErrors: PlanValidationError[] = [];
  const warnings: PlanValidationWarning[] = [];
  const resourceMap = new Map<string, TrainingResource>(resources.map(r => [r.id, r]));
  const playerMap = new Map<string, Player>(players.map(p => [p.id, p]));
  const leaderIds = new Set((teams || []).flatMap(team => [...(team.captainIds || []), ...(team.coachIds || [])]));

  const playerBattingMinutes = new Map<string, number>();
  players.forEach(p => playerBattingMinutes.set(p.id, 0));

  const playerTeamMap = new Map<string, ClubTeam>();
  players.forEach(p => {
    const t = teams.find(team => team.id === p.primaryTeamId || team.squadPlayerIds?.includes(p.id));
    if (t) playerTeamMap.set(p.id, t);
  });

  const resourceUsedSet = new Set<string>();

  rotationBlocks.forEach((block, bIndex) => {
    const seenInBlock = new Set<string>();
    const bStartMins = timeToMinutes(block.startTime);

    const availableInWindow = players.filter(p => {
      const rec = availability?.[p.id];
      if (!rec) return p.trainingAvailability !== false;
      if (rec.status === 'not_attending') return false;
      const arrMins = timeToMinutes(rec.expectedArrivalTime || '18:00');
      const depMins = timeToMinutes(rec.expectedDepartureTime || '19:30');
      return bStartMins >= arrMins && bStartMins < depMins;
    });

    const activeInBlockPlayers = new Set<string>();

    block.resourceAssignments.forEach(assignment => {
      const res = resourceMap.get(assignment.resourceId);
      if (!res) {
        hardErrors.push({
          code: 'INVALID_RESOURCE_REFERENCE',
          message: `Block ${bIndex + 1} references invalid training resource ID '${assignment.resourceId}'.`,
          blockIndex: bIndex,
          resourceId: assignment.resourceId
        });
        return;
      }

      const allParticipants = [
        ...assignment.batterPlayerIds,
        ...assignment.bowlerPodPlayerIds,
        ...assignment.wicketkeeperPlayerIds,
        ...assignment.feederPlayerIds,
        ...assignment.fieldingPlayerIds,
        ...assignment.restPlayerIds
      ];

      if (allParticipants.length > 0) {
        resourceUsedSet.add(res.id);
      }

      // Check double booking
      allParticipants.forEach(pId => {
        if (seenInBlock.has(pId)) {
          hardErrors.push({
            code: 'PLAYER_DOUBLE_BOOKED',
            message: `Player '${playerMap.get(pId)?.name || pId}' is assigned to multiple areas/roles in Block ${bIndex + 1}.`,
            blockIndex: bIndex,
            resourceId: res.id,
            playerId: pId
          });
        }
        seenInBlock.add(pId);
        activeInBlockPlayers.add(pId);
      });

      // Check capacity
      if (allParticipants.length > res.maxTotalParticipants) {
        hardErrors.push({
          code: 'CAPACITY_EXCEEDED',
          message: `${res.name} exceeds max capacity (${allParticipants.length}/${res.maxTotalParticipants}) in Block ${bIndex + 1}.`,
          blockIndex: bIndex,
          resourceId: res.id
        });
      }

      if (assignment.batterPlayerIds.length > res.maxBatters) {
        hardErrors.push({
          code: 'BATTER_CAPACITY_EXCEEDED',
          message: `${res.name} exceeds max batters (${assignment.batterPlayerIds.length}/${res.maxBatters}) in Block ${bIndex + 1}.`,
          blockIndex: bIndex,
          resourceId: res.id
        });
      }

      // Track batting minutes
      assignment.batterPlayerIds.forEach(pId => {
        playerBattingMinutes.set(pId, (playerBattingMinutes.get(pId) || 0) + block.durationMinutes);
      });

      // Check leader requirement
      const hasLeader = assignment.leaderId || allParticipants.some(id => leaderIds.has(id));
      if (res.requiresCoachOrLeader && !hasLeader && allParticipants.length > 0) {
        hardErrors.push({
          code: 'LEADER_MISSING',
          message: `${res.name} requires a coach or leader but none is assigned in Block ${bIndex + 1}.`,
          blockIndex: bIndex,
          resourceId: res.id
        });
      }

      // Check safety compatibility
      assignment.batterPlayerIds.forEach(bId => {
        const bPlayer = playerMap.get(bId);
        if (!bPlayer) return;
        const bProfile = playerTrainingProfiles[bId] || derivePlayerTrainingProfile(bPlayer, playerTeamMap.get(bId));
        assignment.bowlerPodPlayerIds.forEach(bwId => {
          const bwPlayer = playerMap.get(bwId);
          if (!bwPlayer) return;
          const bwProfile = playerTrainingProfiles[bwId] || derivePlayerTrainingProfile(bwPlayer, playerTeamMap.get(bwId));
          const safetyEval = SafetyCompatibilityService.isSafeMatchup(bProfile, bwProfile);
          if (safetyEval.status === 'BLOCKED') {
            hardErrors.push({
              code: 'BLOCKED_SAFETY_MATCHUP',
              message: `Unsafe matchup in ${res.name} (Block ${bIndex + 1}): ${playerMap.get(bwProfile.safetyProfile.playerId)?.name || 'Bowler'} vs ${playerMap.get(bProfile.safetyProfile.playerId)?.name || 'Batter'} (${safetyEval.reasons.join(', ')}).`,
              blockIndex: bIndex,
              resourceId: res.id,
              playerId: bId
            });
          } else if (safetyEval.status === 'REQUIRES_COACH_APPROVAL') {
            warnings.push({
              code: 'SAFETY_APPROVAL_REQUIRED',
              message: `${res.name} (Block ${bIndex + 1}): Matchup requires coach approval (${safetyEval.reasons.join(', ')}).`,
              severity: 'medium'
            });
          }
        });
      });

      // Warning: Net has batters but 0 bowlers
      if (['standard_net', 'spin_net', 'pace_new_ball_net'].includes(res.type) && assignment.batterPlayerIds.length > 0 && assignment.bowlerPodPlayerIds.length === 0) {
        warnings.push({
          code: 'NET_MISSING_BOWLER',
          message: `${res.name} has batters but no bowlers in Block ${bIndex + 1}.`,
          severity: 'low'
        });
      }
    });

    // Check unassigned in block
    block.unassignedPlayerIds.forEach(pId => {
      seenInBlock.add(pId);
      activeInBlockPlayers.add(pId);
    });

    // Check unaccounted players
    availableInWindow.forEach(p => {
      if (!activeInBlockPlayers.has(p.id)) {
        hardErrors.push({
          code: 'PLAYER_UNACCOUNTED',
          message: `Attending player '${p.name}' is not assigned to any area or rest list in Block ${bIndex + 1}.`,
          blockIndex: bIndex,
          playerId: p.id
        });
      }
    });
  });

  // Calculate Metrics
  const battingValues = Array.from(playerBattingMinutes.values()).sort((a, b) => a - b);
  const minBattingMinutes = battingValues[0] || 0;
  const maxBattingMinutes = battingValues[battingValues.length - 1] || 0;
  const medianBattingMinutes = battingValues.length > 0
    ? battingValues[Math.floor(battingValues.length / 2)]
    : 0;
  const battingOpportunityGapMinutes = maxBattingMinutes - minBattingMinutes;

  const zeroBattingPlayerCount = players.filter(p => {
    const staffRole = staffAssignments?.[p.id]?.trainingBattingRole;
    return (playerBattingMinutes.get(p.id) || 0) === 0 && staffRole !== 'none' && staffRole !== 'limited_participation';
  }).length;

  const emptyAreaCount = resources.filter(r => !resourceUsedSet.has(r.id)).length;

  resources.filter(r => r.active && !resourceUsedSet.has(r.id)).forEach(res => {
    warnings.push({
      code: 'UNUSED_FACILITY',
      message: `${res.name} is selected but was not allocated any players.`,
      severity: 'medium'
    });
  });

  if (battingOpportunityGapMinutes > 15) {
    warnings.push({
      code: 'SIGNIFICANT_FAIRNESS_GAP',
      message: `Significant batting opportunity gap: ${battingOpportunityGapMinutes} min difference between squad members.`,
      severity: 'high',
      requiresAcknowledgement: true
    });
  }

  if (zeroBattingPlayerCount > 0) {
    warnings.push({
      code: 'ZERO_BATTING_PLAYERS',
      message: `${zeroBattingPlayerCount} attending batter(s) received 0 batting minutes.`,
      severity: 'high',
      requiresAcknowledgement: true
    });
  }

  const metrics: PlanValidationMetrics = {
    totalAttendingPlayers: players.length,
    totalBlocks: rotationBlocks.length,
    minBattingMinutes,
    medianBattingMinutes,
    maxBattingMinutes,
    battingOpportunityGapMinutes,
    unassignedPlayerCount: rotationBlocks.reduce((sum, b) => sum + b.unassignedPlayerIds.length, 0),
    zeroBattingPlayerCount,
    emptyAreaCount
  };

  return {
    isValid: hardErrors.length === 0,
    canLaunch: hardErrors.length === 0,
    hardErrors,
    warnings,
    metrics
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
export interface StructuredRationaleOptions {
  players?: Player[];
  developmentFocuses?: DevelopmentFocus[];
  fairnessLedger?: RollingFairnessLedger[];
  matchReviewIssues?: string[];
  userRole?: string;
  manualLocks?: Record<string, boolean>;
}

export interface StructuredSessionRationale {
  teamRationale: string;
  activityRationale: string;
  playerRationale: Array<{ playerId: string; reason: string }>;
  fullTextRationale: string;
}

/**
 * Produces a structured, plain-English explanation of why the plan looks the way it does,
 * with optional player-aware evidence (active development focus, fairness ledger, locked assignments).
 */
export function generateStructuredRationale(
  output: ClubRotationEngineOutput,
  sessionObjectives: string[],
  options: StructuredRationaleOptions = {}
): StructuredSessionRationale {
  if (!output.rotationBlocks.length) {
    const emptyMsg = 'No training areas were active, so no rotation plan could be generated.';
    return {
      teamRationale: emptyMsg,
      activityRationale: '',
      playerRationale: [],
      fullTextRationale: emptyMsg
    };
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
  const teamRationale = objectiveList.length > 0
    ? `This session is built around ${joinWithCommasAnd(objectiveList)}.`
    : 'This session is structured around standard facility rotation blocks.';

  const activityRationale = laneDescriptions.length > 0
    ? `The plan allocates ${joinWithCommasAnd(laneDescriptions)}.`
    : '';

  const concernSentence = output.unsatisfiedSoftConstraints.length > 0
    ? output.unsatisfiedSoftConstraints[0]
    : '';

  const playerRationaleList: Array<{ playerId: string; reason: string }> = [];

  // Filter confidential information if userRole is assistant_coach or player
  const allowPrivateDevFocus = options.userRole !== 'assistant_coach';

  if (options.players && options.players.length > 0 && allowPrivateDevFocus) {
    output.rotationBlocks.forEach((block, blockIndex) => {
      block.resourceAssignments.forEach(assignment => {
        if (options.manualLocks) {
          const allPlayersInLane = [...assignment.batterPlayerIds, ...assignment.bowlerPodPlayerIds];
          allPlayersInLane.forEach(pid => {
            const isLocked = options.manualLocks?.[`${blockIndex}_${assignment.resourceId}_${pid}`];
            const p = options.players?.find(pl => pl.id === pid);
            if (isLocked && p && !playerRationaleList.some(pr => pr.playerId === pid)) {
              playerRationaleList.push({
                playerId: pid,
                reason: `${p.name} was assigned via explicit coach lock for specific technical work.`
              });
            }
          });
        }

        if (options.developmentFocuses) {
          assignment.batterPlayerIds.forEach(pid => {
            const devFocus = options.developmentFocuses?.find(f => f.playerId === pid && f.state !== 'ARCHIVED');
            const p = options.players?.find(pl => pl.id === pid);
            if (p && devFocus && !playerRationaleList.some(pr => pr.playerId === pid)) {
              playerRationaleList.push({
                playerId: pid,
                reason: `${p.name} has been assigned to ${assignment.resourceName} because '${devFocus.focusStatement}' is an active development focus.`
              });
            }
          });
        }
      });
    });
  }

  // Participation deficit evidence from ledger
  if (options.fairnessLedger && options.players) {
    options.fairnessLedger.forEach(entry => {
      if (entry.accumulatedFairnessCreditMinutes > 15) {
        const p = options.players?.find(pl => pl.id === entry.playerId);
        if (p && !playerRationaleList.some(pr => pr.playerId === p.id)) {
          playerRationaleList.push({
            playerId: p.id,
            reason: `${p.name} has been prioritized for extra batting exposure due to a recent participation deficit.`
          });
        }
      }
    });
  }

  const playerRationaleSentence = playerRationaleList.length > 0
    ? playerRationaleList.map(pr => pr.reason).slice(0, 3).join(' ')
    : '';

  const fullTextRationale = [teamRationale, activityRationale, playerRationaleSentence, concernSentence]
    .filter(Boolean)
    .join(' ');

  return {
    teamRationale,
    activityRationale,
    playerRationale: playerRationaleList,
    fullTextRationale
  };
}

/**
 * Produces a short, plain-English explanation of why the plan looks the way it does.
 */
export function generateSessionRationale(
  output: ClubRotationEngineOutput,
  sessionObjectives: string[],
  options: StructuredRationaleOptions = {}
): string {
  return generateStructuredRationale(output, sessionObjectives, options).fullTextRationale;
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

  const activeResources = allResources.filter(r =>
    currentSession.availableResourceIds?.length
      ? currentSession.availableResourceIds.includes(r.id)
      : r.active !== false
  );
  const remainingBlocksCount = currentSession.rotationPlan.length - (activeBlockIndex + 1);

  if (remainingBlocksCount <= 0) {
    return currentSession;
  }

  const output = generateClubRotationPlan({
    resources: activeResources,
    players: allPlayers,
    teams: allTeams,
    availability: currentSession.availabilityRecords,
    staffAssignments: currentSession.staffPlayerAssignments,
    sessionObjectives: currentSession.sessionObjectives,
    rotationBlockDurationMinutes: currentSession.rotationDurationMinutes,
    sessionStartTime: currentSession.startTime,
    sessionFinishTime: currentSession.finishTime,
    manualLocks: currentSession.manualLocks,
    completedBlocks,
    groupingStrategy: currentSession.defaultGroupingStrategy || 'graded',
    centreWicketScenario: currentSession.rotationPlan[0]?.resourceAssignments.find(r => r.centreWicketScenario)?.centreWicketScenario
  });

  const roleArrays: Array<keyof Pick<AllocationResourceAssignment, 'batterPlayerIds' | 'bowlerPodPlayerIds' | 'wicketkeeperPlayerIds' | 'feederPlayerIds' | 'fieldingPlayerIds' | 'restPlayerIds'>> = [
    'batterPlayerIds', 'bowlerPodPlayerIds', 'wicketkeeperPlayerIds', 'feederPlayerIds', 'fieldingPlayerIds', 'restPlayerIds'
  ];

  const fullPlan = output.rotationBlocks.map((block, bIndex) => {
    if (bIndex <= activeBlockIndex) {
      return completedBlocks[bIndex] || block;
    }
    const oldBlock = currentSession.rotationPlan[bIndex];
    if (!oldBlock) return block;

    const assignments = block.resourceAssignments.map(assignment => ({ ...assignment }));
    oldBlock.resourceAssignments.forEach(oldAssignment => {
      roleArrays.forEach(roleKey => {
        oldAssignment[roleKey].forEach(playerId => {
          if (!currentSession.manualLocks[`${bIndex}_${oldAssignment.resourceId}_${playerId}`]) return;
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
    rotationPlan: fullPlan,
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
    expectedPlayerIds: session.expectedPlayerIds.filter(id => id !== playerId),
    confirmedAttendingPlayerIds: session.confirmedAttendingPlayerIds.filter(id => id !== playerId),
    liveAttendance: {
      ...session.liveAttendance,
      [playerId]: {
        playerId,
        status: 'live_absent' as const,
        changedAt: new Date().toISOString()
      }
    }
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
    availabilityRecords: updatedAvailability,
    expectedPlayerIds: [...new Set([...session.expectedPlayerIds, playerId])],
    confirmedAttendingPlayerIds: [...new Set([...session.confirmedAttendingPlayerIds, playerId])],
    liveAttendance: {
      ...session.liveAttendance,
      [playerId]: {
        playerId,
        status: 'present' as const,
        actualArrivedAt: arrivalTimeStr,
        changedAt: new Date().toISOString()
      }
    }
  };

  return recalculateFutureRotations(updatedSession, activeBlockIndex, allPlayers, allTeams, allResources);
}

export function handleLiveEarlyDeparture(
  session: ClubTrainingSession,
  playerId: string,
  departureTimeStr: string,
  activeBlockIndex: number,
  allPlayers: Player[],
  allTeams: ClubTeam[],
  allResources: TrainingResource[]
): ClubTrainingSession {
  const existing = session.availabilityRecords[playerId] || { playerId, status: 'attending' as const };
  const updatedSession: ClubTrainingSession = {
    ...session,
    availabilityRecords: {
      ...session.availabilityRecords,
      [playerId]: {
        ...existing,
        status: 'attending',
        expectedDepartureTime: departureTimeStr,
        leaveEarly: true
      }
    },
    liveAttendance: {
      ...session.liveAttendance,
      [playerId]: {
        playerId,
        status: 'left_early',
        actualLeftAt: departureTimeStr,
        changedAt: new Date().toISOString()
      }
    }
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
    staffPlayerAssignments: updatedStaff,
    liveAttendance: {
      ...session.liveAttendance,
      [playerId]: {
        playerId,
        status: 'injured' as const,
        injuryNotes,
        changedAt: new Date().toISOString()
      }
    }
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

  const participantIds = new Set<string>([
    ...session.expectedPlayerIds,
    ...session.confirmedAttendingPlayerIds,
    ...Object.entries(session.availabilityRecords)
      .filter(([, record]) => record.status !== 'not_attending')
      .map(([playerId]) => playerId)
  ]);
  session.rotationPlan.forEach(block => block.resourceAssignments.forEach(assignment => {
    [
      ...assignment.batterPlayerIds,
      ...assignment.bowlerPodPlayerIds,
      ...assignment.wicketkeeperPlayerIds,
      ...assignment.feederPlayerIds,
      ...assignment.fieldingPlayerIds,
      ...assignment.restPlayerIds
    ].forEach(playerId => participantIds.add(playerId));
  }));
  Object.values(session.availabilityRecords).forEach(record => {
    if (record.status === 'not_attending') participantIds.delete(record.playerId);
  });
  Object.values(session.liveAttendance || {}).forEach(record => {
    if (record.status === 'live_absent') participantIds.delete(record.playerId);
    else participantIds.add(record.playerId);
  });

  players.filter(player => participantIds.has(player.id)).forEach(p => {
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
          const cwAss = res.centreWicketScenario.assignments?.find(a => a.playerId === p.id);
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
        accumulatedFairnessCreditMinutes: Math.max(0, Math.round((existing.accumulatedFairnessCreditMinutes + rec.missedOrShortenedMinutes - rec.extraBattingMinutesGranted) * 10) / 10)
      };
    } else {
      updated.push({
        playerId: rec.playerId,
        totalSessionsAttended: 1,
        totalBattingMinutes: rec.actualBattingMinutes,
        totalDeliveriesBowled: rec.deliveriesBowled,
        totalCentreWicketOvers: rec.centreWicketOvers,
        accumulatedFairnessCreditMinutes: Math.max(0, Math.round((rec.missedOrShortenedMinutes - rec.extraBattingMinutesGranted) * 10) / 10)
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
  completedSession.actualParticipationOutcomes = Object.fromEntries(records.map(record => [record.playerId, {
    battingMinutes: record.actualBattingMinutes,
    deliveriesBowled: record.deliveriesBowled,
    centreWicketOvers: record.centreWicketOvers
  }]));
  completedSession.opportunityRecords = FairnessEngine.generateSessionOpportunityRecords(completedSession, players);
  return { session: completedSession, ledger: updateRollingFairnessLedger(ledger, records), applied: true };
}

/**
 * Clones and advances an existing club training session by 7 days to generate the next recurring weekly session.
 * Automatically runs the rotation engine with latest rolling fairness ledger deficits so under-allocated players
 * get prioritized in the new session.
 */
export function generateNextWeeklySession(options: {
  currentSession: ClubTrainingSession;
  allPlayers: Player[];
  allResources: TrainingResource[];
  clubTeams: ClubTeam[];
  rollingFairnessLedger?: RollingFairnessLedger[];
}): ClubTrainingSession {
  const { currentSession, allPlayers, allResources, clubTeams, rollingFairnessLedger = [] } = options;

  let nextDate = new Date();
  if (currentSession.date) {
    const parsed = new Date(currentSession.date);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setDate(parsed.getDate() + 7);
      nextDate = parsed;
    }
  } else {
    const day = nextDate.getDay();
    const daysUntilThursday = (4 + 7 - day) % 7 || 7;
    nextDate.setDate(nextDate.getDate() + daysUntilThursday);
  }

  const nextDateStr = nextDate.toISOString().split('T')[0];
  const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const activeResources = allResources.filter(r => currentSession.availableResourceIds.includes(r.id));
  const activeTeams = clubTeams.filter(t => currentSession.includedTeamIds.includes(t.id));
  const activePlayers = allPlayers.filter(p => p.primaryTeamId && currentSession.includedTeamIds.includes(p.primaryTeamId));

  const rotationOutput = generateClubRotationPlan({
    teams: activeTeams.length > 0 ? activeTeams : clubTeams,
    players: activePlayers.length > 0 ? activePlayers : allPlayers,
    resources: activeResources.length > 0 ? activeResources : allResources,
    availability: currentSession.availabilityRecords || {},
    staffAssignments: currentSession.staffPlayerAssignments || {},
    sessionObjectives: currentSession.sessionObjectives || [],
    rotationBlockDurationMinutes: currentSession.rotationDurationMinutes || 12,
    sessionStartTime: currentSession.startTime || '17:30',
    sessionFinishTime: currentSession.finishTime || '19:30',
    rollingFairnessLedger
  });

  const nextSession: ClubTrainingSession = {
    ...currentSession,
    id: newSessionId,
    title: `Thursday Training - ${nextDateStr}`,
    date: nextDateStr,
    status: 'draft',
    rotationPlan: rotationOutput.rotationBlocks || [],
    opportunityRecords: []
  };

  return nextSession;
}

