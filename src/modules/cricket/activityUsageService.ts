import type {
  Activity,
  ActivityUsageRecord,
  ClubTrainingSession
} from '../../types/cricket';
import { CoachingObjectiveTaxonomy } from './coachingObjectiveTaxonomy';

export const ActivityUsageService = {
  /**
   * Generates ActivityUsageRecords for each participating team when a session completes.
   */
  generateUsageRecordsOnSessionCompletion(
    session: ClubTrainingSession
  ): ActivityUsageRecord[] {
    const completedAt = session.completedAt || new Date().toISOString();
    const newRecords: ActivityUsageRecord[] = [];

    session.blocks.forEach(block => {
      if (block.activityId) {
        session.includedTeamIds.forEach(teamId => {
          newRecords.push({
            id: `usage_${session.id}_${block.activityId}_${teamId}`,
            activityId: block.activityId!,
            teamId,
            seasonId: '2026',
            sessionId: session.id,
            completedAt,
            actualDurationMinutes: block.durationMinutes,
            selectedProgressionStage: block.activityInstance?.selectedProgressionStage || 'base'
          });
        });
      }
    });

    return newRecords;
  },

  /**
   * Checks if an activity was used in 3 of the last 4 completed sessions for a specific team.
   */
  isRepeatedIn3OfLast4Sessions(
    activityId: string,
    teamId: string,
    completedSessions: ClubTrainingSession[],
    allUsageRecords: ActivityUsageRecord[]
  ): boolean {
    // Get last 4 completed sessions for this team
    const last4TeamSessions = completedSessions
      .filter(s => s.status === 'completed' && s.includedTeamIds.includes(teamId))
      .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())
      .slice(0, 4);

    if (last4TeamSessions.length < 3) return false;

    let timesUsed = 0;
    last4TeamSessions.forEach(sess => {
      const usedInSess = allUsageRecords.some(
        r => r.sessionId === sess.id && r.teamId === teamId && r.activityId === activityId
      );
      if (usedInSess) timesUsed++;
    });

    return timesUsed >= 3;
  },

  /**
   * Suggests a fresh alternative drill matching objective, space, player count, and progression intent.
   */
  suggestFreshAlternative(
    currentActivity: Activity,
    teamId: string,
    allActivities: Activity[],
    allUsageRecords: ActivityUsageRecord[],
    currentSquadSize: number
  ): Activity | null {
    const candidateDrills = allActivities.filter(a => a.id !== currentActivity.id);

    let bestCandidate: Activity | null = null;
    let maxScore = -1;

    candidateDrills.forEach(candidate => {
      // MANDATORY CONSTRAINTS:
      // 1. Same Coaching Objective (matching objectiveIds)
      const hasObjectiveMatch = (candidate.objectiveIds || []).some(candObj =>
        (currentActivity.objectiveIds || []).some(currObj =>
          CoachingObjectiveTaxonomy.matchesObjective(candObj, currObj)
        )
      ) || candidate.category === currentActivity.category;

      if (!hasObjectiveMatch) return;

      // 2. Player count fit
      if (currentSquadSize < candidate.minPlayers || currentSquadSize > candidate.maxPlayers) return;

      // 3. Space fit
      if (candidate.spaceRequired !== currentActivity.spaceRequired) return;

      // SCORED PRIORITY:
      let score = 0;

      // Progression level fit (+30)
      if (candidate.structuredProgressions && currentActivity.structuredProgressions) {
        score += 30;
      }

      // Freshness (+25 if not used in last 4 team sessions)
      const recentUsage = allUsageRecords.filter(r => r.teamId === teamId && r.activityId === candidate.id);
      if (recentUsage.length === 0) {
        score += 25;
      }

      // Duration fit (+15)
      if (candidate.durationMinutes === currentActivity.durationMinutes) {
        score += 15;
      }

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = candidate;
      }
    });

    return bestCandidate;
  }
};
