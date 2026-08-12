import type {
  Activity,
  ClubSessionBlock,
  ClubTeam,
  ClubTrainingSession,
  SavedClubTemplate,
  TrainingResource,
  TrainingSession
} from '../../types/cricket';

export const SESSION_MIGRATION_KEY = 'inside_edge_session_migration_v2_complete';
export const SESSION_MIGRATION_VERSION = 2;

export function selectCurrentClubSession(sessions: ClubTrainingSession[], selectedId?: string): ClubTrainingSession | undefined {
  const selected = sessions.find(session => session.id === selectedId);
  return selected?.status !== 'completed' ? selected : sessions.find(session => session.status !== 'completed');
}

const addMinutes = (time: string, minutes: number): string => {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

export function mapLegacyBlock(block: TrainingSession['blocks'][number]): ClubSessionBlock {
  const type: ClubSessionBlock['type'] = block.blockType === 'scenario'
    ? 'centre_wicket'
    : block.blockType === 'fielding'
      ? 'activity'
      : block.blockType;
  return {
    id: block.id,
    title: block.title,
    type,
    durationMinutes: block.durationMinutes,
    objective: block.objective,
    location: block.location,
    activityId: block.activityId,
    rotation: block.rotationPlan ? {
      blockId: `${block.id}-rotation`,
      blockIndex: 0,
      durationMinutes: block.durationMinutes,
      startTime: '00:00',
      endTime: addMinutes('00:00', block.durationMinutes),
      resourceAssignments: block.rotationPlan.lanes.map(lane => ({
        resourceId: lane.laneId,
        resourceName: lane.laneObjective,
        leaderId: undefined,
        batterPlayerIds: lane.batterPlayerIds,
        bowlerPodPlayerIds: lane.bowlerPlayerIds,
        wicketkeeperPlayerIds: lane.keeperPlayerIds,
        feederPlayerIds: lane.feederPlayerIds,
        fieldingPlayerIds: [],
        restPlayerIds: []
      })),
      unassignedPlayerIds: block.rotationPlan.unassignedPlayerIds,
      alerts: block.rotationPlan.alerts
    } : undefined
  };
}

export function migrateTrainingSession(
  legacy: TrainingSession,
  clubId = 'default-club',
  teamIds: string[] = [],
): ClubTrainingSession {
  const blocks = legacy.blocks.map(mapLegacyBlock);
  const rotations = blocks.flatMap(block => block.rotation ? [block.rotation] : []);
  return {
    id: legacy.id,
    clubId,
    title: legacy.title,
    date: legacy.date,
    startTime: legacy.startTime,
    finishTime: addMinutes(legacy.startTime, legacy.durationMinutes),
    venueFacilityId: legacy.facilityId,
    includedTeamIds: teamIds,
    availableResourceIds: [...new Set(rotations.flatMap(block => block.resourceAssignments.map(item => item.resourceId)))],
    expectedPlayerIds: legacy.expectedPlayerIds,
    confirmedAttendingPlayerIds: legacy.expectedPlayerIds,
    availabilityRecords: Object.fromEntries(legacy.expectedPlayerIds.map(playerId => [playerId, { playerId, status: 'attending' as const }])),
    staffPlayerAssignments: {},
    sessionObjectives: legacy.primaryObjectives,
    rotationDurationMinutes: rotations[0]?.durationMinutes || 12,
    captainCoachAssignments: [],
    rotationPlan: rotations,
    manualLocks: {},
    fairnessSettings: { targetEqualBattingMinutes: 0 },
    planningVersion: 1,
    rsvps: {},
    liveAttendance: {},
    blocks,
    activeBlockIndex: legacy.activeBlockIndex || 0,
    activeRotationIndex: legacy.activeRotationIndex || 0,
    status: legacy.status,
    warnings: [],
    rationale: legacy.rationale || legacy.notes,
    completedAt: legacy.status === 'completed' ? legacy.date : undefined
  };
}

export function getSessionDuration(session: ClubTrainingSession): number {
  if (session.blocks.length) return session.blocks.reduce((total, block) => total + block.durationMinutes, 0);
  return session.rotationPlan.reduce((total, block) => total + block.durationMinutes, 0);
}

export function activityToClubBlock(activity: Activity): ClubSessionBlock {
  const locationMap: Record<Activity['spaceRequired'], string> = {
    net: 'Net', pitch: 'Centre wicket', outfield: 'Outfield', small_grid: 'Small grid', indoor: 'Indoor'
  };
  return {
    id: `activity-${activity.id}-${Date.now()}`,
    title: activity.name,
    type: activity.spaceRequired === 'pitch' ? 'centre_wicket' : 'activity',
    durationMinutes: activity.durationMinutes,
    objective: activity.purpose,
    location: locationMap[activity.spaceRequired],
    activityId: activity.id
  };
}

export interface ReadinessResult { score: number; missing: string[] }

export function calculateSessionReadiness(session: ClubTrainingSession, resources: TrainingResource[]): ReadinessResult {
  const missing: string[] = [];
  let score = 0;
  const selectedResources = resources.filter(item => item.active && session.availableResourceIds.includes(item.id));
  if (session.date && session.startTime && session.finishTime) score += 10; else missing.push('Set a valid date and time');
  if (session.includedTeamIds.length) score += 10; else missing.push('Select at least one team');
  if (session.confirmedAttendingPlayerIds.length) score += 15; else missing.push('Confirm attendance');
  if (selectedResources.length) score += 15; else missing.push('Select active resources');
  if (session.captainCoachAssignments.length || (selectedResources.length > 0 && selectedResources.every(item => !item.requiresCoachOrLeader))) score += 10; else missing.push('Review staff roles');
  if (!session.warnings.some(warning => /capacity|unallocated/i.test(warning))) score += 15; else missing.push('Resolve feasibility warnings');
  if (!session.warnings.some(warning => /missing|required|exceed/i.test(warning))) score += 15; else missing.push('Resolve hard constraints');
  if (session.status !== 'draft') score += 10; else missing.push('Finalise the session');
  return { score, missing };
}

export function applyTemplateToSession(
  session: ClubTrainingSession,
  template: SavedClubTemplate,
  teams: ClubTeam[],
  resources: TrainingResource[]
): ClubTrainingSession {
  const includedTeamIds = template.includedTeamIds?.filter(id => teams.some(team => team.id === id))
    ?? session.includedTeamIds;
  const desiredTypes = new Set(template.resourceTypeRules ?? template.teamGroupRules.map(rule => rule.allocatedResourceType));
  const availableResourceIds = resources.filter(resource => resource.active && desiredTypes.has(resource.type)).map(resource => resource.id);
  return {
    ...session,
    includedTeamIds,
    availableResourceIds: availableResourceIds.length ? availableResourceIds : session.availableResourceIds,
    rotationDurationMinutes: template.rotationDurationMinutes,
    sessionObjectives: template.sessionObjectives,
    captainCoachAssignments: template.defaultStaffAllocation ?? session.captainCoachAssignments
  };
}

export type RemainderPolicy = 'short_final_block' | 'distribute_evenly' | 'leave_unallocated';

export function buildBlockDurations(totalMinutes: number, standardMinutes: number, policy: RemainderPolicy = 'short_final_block'): number[] {
  if (totalMinutes <= 0 || standardMinutes <= 0) return [];
  const full = Math.floor(totalMinutes / standardMinutes);
  const remainder = totalMinutes % standardMinutes;
  if (!remainder) return Array(full).fill(standardMinutes);
  if (policy === 'leave_unallocated') return Array(full).fill(standardMinutes);
  if (policy === 'distribute_evenly') {
    const count = Math.max(1, Math.ceil(totalMinutes / standardMinutes));
    const base = Math.floor(totalMinutes / count);
    return Array.from({ length: count }, (_, index) => base + (index < totalMinutes % count ? 1 : 0));
  }
  return [...Array(full).fill(standardMinutes), remainder];
}
