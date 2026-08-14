export type Role = 'head_coach' | 'assistant_coach' | 'captain' | 'public_user';

export type Action =
  | 'manage_coaches'
  | 'activate_ruleset'
  | 'upload_playing_conditions'
  | 'edit_confidential_focus'
  | 'view_confidential_focus'
  | 'create_training_session'
  | 'record_live_observation'
  | 'view_match_report'
  | 'edit_match_plan'
  | 'export_data';

export const PermissionMatrix = {
  canExecute(role: Role, action: Action): boolean {
    switch (action) {
      case 'manage_coaches':
      case 'activate_ruleset':
      case 'upload_playing_conditions':
      case 'edit_confidential_focus':
      case 'view_confidential_focus':
        return role === 'head_coach';

      case 'create_training_session':
      case 'record_live_observation':
      case 'edit_match_plan':
      case 'export_data':
        return role === 'head_coach' || role === 'assistant_coach';

      case 'view_match_report':
        return role === 'head_coach' || role === 'assistant_coach' || role === 'captain' || role === 'public_user';

      default:
        return false;
    }
  }
};
