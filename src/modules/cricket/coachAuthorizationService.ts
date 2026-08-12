import type { Observation, DevelopmentFocus, Player, CoachRole } from '../../types/cricket';

export interface UserContext {
  uid: string;
  role: CoachRole;
  clubId?: string;
  coachedTeamIds?: string[]; // Teams user is authorized to coach
  isClubAdmin?: boolean;
}

export const CoachAuthorizationService = {
  /**
   * Checks if a user has coaching access to a player's team/squad.
   */
  hasTeamAccess(user: UserContext, player: Player): boolean {
    if (user.isClubAdmin) return true;
    if (!user.coachedTeamIds || user.coachedTeamIds.length === 0) return true; // Default fallback for single-team setups
    if (player.primaryTeamId && user.coachedTeamIds.includes(player.primaryTeamId)) return true;
    if (player.eligibleTeamIds && player.eligibleTeamIds.some(id => user.coachedTeamIds?.includes(id))) return true;
    return false;
  },

  /**
   * Evaluates if a user can view an observation based on staffVisibility and team scope.
   */
  canViewObservation(user: UserContext, observation: Observation, player: Player): boolean {
    if (!this.hasTeamAccess(user, player)) return false;

    if (observation.access.staffVisibility === 'head_coach_only') {
      return user.role === 'head_coach' || Boolean(user.isClubAdmin);
    }

    return true;
  },

  /**
   * Evaluates if a user can edit a development focus.
   */
  canEditDevelopmentFocus(user: UserContext, focus: DevelopmentFocus, player: Player): boolean {
    if (!this.hasTeamAccess(user, player)) return false;

    if (focus.access.staffVisibility === 'head_coach_only') {
      return user.role === 'head_coach' || Boolean(user.isClubAdmin);
    }

    return true;
  },

  /**
   * Evaluates if a user can publish a player progress summary.
   */
  canPublishPlayerReport(user: UserContext, player: Player): boolean {
    if (!this.hasTeamAccess(user, player)) return false;
    return user.role === 'head_coach' || Boolean(user.isClubAdmin);
  }
};
