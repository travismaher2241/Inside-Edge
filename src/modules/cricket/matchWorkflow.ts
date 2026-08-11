import type { MatchSquad, OppositionBatter, SavedTacticalPlan } from '../../types/cricket';

export interface MatchWorkflowStatus {
  squad: boolean;
  opposition: boolean;
  conditions: boolean;
  plans: boolean;
  completedCount: number;
}

export function getMatchWorkflowStatus(
  squad: MatchSquad | undefined,
  oppositionBatters: OppositionBatter[],
  rulesConfirmed: boolean,
  selectedRulesProfileId: string,
  savedPlans: SavedTacticalPlan[]
): MatchWorkflowStatus {
  const status = {
    squad: Boolean(squad && squad.selectedPlayerIds.length === 11 && squad.wicketkeeperId),
    opposition: oppositionBatters.length > 0,
    conditions: Boolean(rulesConfirmed && selectedRulesProfileId),
    plans: savedPlans.length > 0
  };

  return {
    ...status,
    completedCount: Object.values(status).filter(Boolean).length
  };
}
