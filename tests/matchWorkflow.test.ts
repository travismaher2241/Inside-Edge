import { describe, expect, it } from 'vitest';
import { getMatchWorkflowStatus } from '../src/modules/cricket/matchWorkflow';
import type { MatchSquad, OppositionBatter, SavedTacticalPlan } from '../src/types/cricket';

describe('match workflow status', () => {
  it('only marks stages complete when their required data exists', () => {
    const squad: MatchSquad = { matchId: 'match-1', selectedPlayerIds: Array.from({ length: 11 }, (_, index) => `p-${index}`), wicketkeeperId: 'p-0' };
    const batter = { id: 'b-1', matchId: 'match-1', name: 'Opener', battingHand: 'right', observations: [] } as OppositionBatter;
    const plan = { id: 'plan-1' } as SavedTacticalPlan;

    expect(getMatchWorkflowStatus(squad, [batter], true, 'rules-t20', [plan])).toEqual({
      squad: true,
      opposition: true,
      conditions: true,
      plans: true,
      completedCount: 4
    });
  });

  it('keeps incomplete setup visible', () => {
    expect(getMatchWorkflowStatus(undefined, [], false, '', [])).toEqual({
      squad: false,
      opposition: false,
      conditions: false,
      plans: false,
      completedCount: 0
    });
  });
});
