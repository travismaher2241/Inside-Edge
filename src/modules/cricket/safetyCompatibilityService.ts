import type { PlayerTrainingProfile, SkillTier } from '../../types/cricket';

export type MatchupSafetyStatus = 'SAFE' | 'REQUIRES_COACH_APPROVAL' | 'BLOCKED';

export interface MatchupSafetyEvaluation {
  status: MatchupSafetyStatus;
  reasons: string[];
}

const TIER_WEIGHTS: Record<SkillTier, number> = {
  developing: 1,
  competent: 2,
  advanced: 3,
  performance: 4
};

export const SafetyCompatibilityService = {
  /**
   * Evaluates safety compatibility between a batter and a bowler.
   */
  isSafeMatchup(
    batter: PlayerTrainingProfile,
    bowler: PlayerTrainingProfile
  ): MatchupSafetyEvaluation {
    const reasons: string[] = [];

    const batterPaceSafety = batter.safetyProfile;

    // 1. Hard Coach Restrictions
    if (batterPaceSafety?.coachRestrictions && batterPaceSafety.coachRestrictions.length > 0) {
      reasons.push(`Coach restriction on batter: ${batterPaceSafety.coachRestrictions.join(', ')}`);
      return { status: 'BLOCKED', reasons };
    }

    if (bowler.primaryRole === 'bowler' || bowler.primaryRole === 'all_rounder') {
      const bowlerPaceTier = bowler.paceBowlingTier || 'developing';
      const bowlerPaceWeight = TIER_WEIGHTS[bowlerPaceTier];

      // 2. Pace capability check
      if (bowlerPaceWeight >= 3 && !batterPaceSafety.canFaceAdvancedPace) {
        reasons.push(`Advanced pace bowler vs batter not approved for advanced pace.`);
        return { status: 'BLOCKED', reasons };
      }

      if (bowlerPaceWeight >= 2 && !batterPaceSafety.canFacePace) {
        reasons.push(`Pace bowler vs batter restricted to spin/throwdowns.`);
        return { status: 'BLOCKED', reasons };
      }

      // 3. Max Compatible Pace Tier check
      if (batterPaceSafety.maxCompatiblePaceTier) {
        const maxTierWeight = TIER_WEIGHTS[batterPaceSafety.maxCompatiblePaceTier];
        if (bowlerPaceWeight > maxTierWeight) {
          reasons.push(
            `Bowler pace tier (${bowlerPaceTier}) exceeds batter's max approved pace tier (${batterPaceSafety.maxCompatiblePaceTier}).`
          );
          return { status: 'BLOCKED', reasons };
        }
      }

      // 4. Extreme Tier Gap (> 2 tier gap in pace)
      const batterTierWeight = TIER_WEIGHTS[batter.battingTier || 'developing'];
      if (bowlerPaceWeight - batterTierWeight >= 2) {
        reasons.push(`Large capability gap (Pace ${bowlerPaceTier} vs Batter ${batter.battingTier || 'developing'}).`);
        return { status: 'REQUIRES_COACH_APPROVAL', reasons };
      }
    }

    // 5. Spin check
    if (bowler.spinBowlingTier && !batterPaceSafety.canFaceSpin) {
      reasons.push(`Spin bowler vs batter restricted from facing spin.`);
      return { status: 'BLOCKED', reasons };
    }

    return { status: 'SAFE', reasons: ['Compatible safety profile.'] };
  }
};
