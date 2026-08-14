import type { CompetitionRuleSet, CompetitionRule } from '../schemas/competitionRuleTypes';

export interface RuleChangeDelta {
  ruleId: string;
  title: string;
  category: string;
  changeType: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
  oldValue?: string;
  newValue?: string;
}

export interface RuleSetDiffResult {
  oldVersion: number;
  newVersion: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  unchangedCount: number;
  deltas: RuleChangeDelta[];
}

export const RuleSetDiffEngine = {
  diffRuleSets(oldRuleSet: CompetitionRuleSet, newRuleSet: CompetitionRuleSet): RuleSetDiffResult {
    const deltas: RuleChangeDelta[] = [];
    let addedCount = 0;
    let removedCount = 0;
    let changedCount = 0;
    let unchangedCount = 0;

    const oldRuleMap = new Map<string, CompetitionRule>();
    oldRuleSet.rules.forEach(r => oldRuleMap.set(r.title.toLowerCase(), r));

    const newRuleMap = new Map<string, CompetitionRule>();
    newRuleSet.rules.forEach(r => newRuleMap.set(r.title.toLowerCase(), r));

    // Check new vs old
    newRuleSet.rules.forEach(newRule => {
      const oldRule = oldRuleMap.get(newRule.title.toLowerCase());
      if (!oldRule) {
        addedCount++;
        deltas.push({
          ruleId: newRule.id,
          title: newRule.title,
          category: newRule.category,
          changeType: 'ADDED',
          newValue: newRule.approvedInterpretation || newRule.rawInterpretation
        });
      } else {
        const oldInterp = oldRule.approvedInterpretation || oldRule.rawInterpretation;
        const newInterp = newRule.approvedInterpretation || newRule.rawInterpretation;
        if (oldInterp !== newInterp) {
          changedCount++;
          deltas.push({
            ruleId: newRule.id,
            title: newRule.title,
            category: newRule.category,
            changeType: 'CHANGED',
            oldValue: oldInterp,
            newValue: newInterp
          });
        } else {
          unchangedCount++;
          deltas.push({
            ruleId: newRule.id,
            title: newRule.title,
            category: newRule.category,
            changeType: 'UNCHANGED',
            oldValue: oldInterp,
            newValue: newInterp
          });
        }
      }
    });

    // Check removed
    oldRuleSet.rules.forEach(oldRule => {
      if (!newRuleMap.has(oldRule.title.toLowerCase())) {
        removedCount++;
        deltas.push({
          ruleId: oldRule.id,
          title: oldRule.title,
          category: oldRule.category,
          changeType: 'REMOVED',
          oldValue: oldRule.approvedInterpretation || oldRule.rawInterpretation
        });
      }
    });

    return {
      oldVersion: oldRuleSet.version,
      newVersion: newRuleSet.version,
      addedCount,
      removedCount,
      changedCount,
      unchangedCount,
      deltas
    };
  }
};
