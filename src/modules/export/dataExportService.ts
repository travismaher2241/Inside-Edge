import type { Player, Team, MatchRecord, DevelopmentFocus, Observation, ClubTrainingSession } from '../../types/cricket';
import { CompetitionRuleRepository } from '../competition-rules/storage/competitionRuleRepository';
import { PermissionMatrix, type Role } from '../permissions/permissionMatrix';

export interface ExportBundle {
  schemaVersion: string;
  exportedAt: string;
  exportingUserRole: Role;
  clubName: string;
  team?: Team;
  players: Player[];
  matches: MatchRecord[];
  developmentFocuses: DevelopmentFocus[];
  observations: Observation[];
  sessions: ClubTrainingSession[];
  activeRulesets: any[];
}

export const DataExportService = {
  generateExportBundle(params: {
    exportingRole: Role;
    clubName: string;
    team?: Team;
    players: Player[];
    matches: MatchRecord[];
    focuses: DevelopmentFocus[];
    observations: Observation[];
    sessions: ClubTrainingSession[];
  }): ExportBundle {
    const rulesets = CompetitionRuleRepository.getAllRuleSets();
    const canViewConfidential = PermissionMatrix.canExecute(params.exportingRole, 'view_confidential_focus');

    // Filter confidential notes for non-head coaches (Refinement 6)
    const sanitizedFocuses = params.focuses.map(f => {
      if (f.access?.staffVisibility === 'head_coach_only' && !canViewConfidential) {
        return {
          ...f,
          why: '[REDACTED_CONFIDENTIAL_HEAD_COACH_NOTE]'
        };
      }
      return f;
    });

    return {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportingUserRole: params.exportingRole,
      clubName: params.clubName,
      team: params.team,
      players: params.players,
      matches: params.matches,
      developmentFocuses: sanitizedFocuses,
      observations: params.observations,
      sessions: params.sessions,
      activeRulesets: rulesets
    };
  },

  downloadJsonExport(bundle: ExportBundle): void {
    if (typeof document === 'undefined') return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const filename = `inside-edge-${bundle.clubName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};
