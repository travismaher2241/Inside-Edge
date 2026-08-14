import type { CompetitionRuleSet, CompetitionRule } from '../schemas/competitionRuleTypes';
import { CompetitionRuleRepository } from '../storage/competitionRuleRepository';

export const ApprovalService = {
  approveRule(ruleSetId: string, ruleId: string, _approvedBy: string): CompetitionRuleSet | undefined {
    const ruleSet = CompetitionRuleRepository.getRuleSet(ruleSetId);
    if (!ruleSet) return undefined;

    const ruleIndex = ruleSet.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return undefined;

    const targetRule = ruleSet.rules[ruleIndex];
    ruleSet.rules[ruleIndex] = {
      ...targetRule,
      status: 'Approved',
      approvedInterpretation: targetRule.approvedInterpretation || targetRule.rawInterpretation
    };

    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return ruleSet;
  },

  editRule(
    ruleSetId: string,
    ruleId: string,
    edits: Partial<CompetitionRule>,
    _editedBy: string
  ): CompetitionRuleSet | undefined {
    const ruleSet = CompetitionRuleRepository.getRuleSet(ruleSetId);
    if (!ruleSet) return undefined;

    const ruleIndex = ruleSet.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return undefined;

    const existing = ruleSet.rules[ruleIndex];
    ruleSet.rules[ruleIndex] = {
      ...existing,
      ...edits,
      // Preserve rawInterpretation permanently
      rawInterpretation: existing.rawInterpretation,
      approvedInterpretation: edits.approvedInterpretation || edits.rawInterpretation || existing.approvedInterpretation || existing.rawInterpretation,
      status: 'Approved'
    };

    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return ruleSet;
  },

  rejectRule(ruleSetId: string, ruleId: string, _rejectedBy: string): CompetitionRuleSet | undefined {
    const ruleSet = CompetitionRuleRepository.getRuleSet(ruleSetId);
    if (!ruleSet) return undefined;

    const ruleIndex = ruleSet.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return undefined;

    ruleSet.rules[ruleIndex] = {
      ...ruleSet.rules[ruleIndex],
      status: 'Rejected'
    };

    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return ruleSet;
  },

  addManualRule(
    ruleSetId: string,
    rule: Omit<CompetitionRule, 'id' | 'status' | 'rawInterpretation'> & { rawInterpretation?: string },
    _createdBy: string
  ): CompetitionRuleSet | undefined {
    const ruleSet = CompetitionRuleRepository.getRuleSet(ruleSetId);
    if (!ruleSet) return undefined;

    const newRule: CompetitionRule = {
      ...rule,
      id: `rule_man_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      rawInterpretation: rule.rawInterpretation || rule.title,
      approvedInterpretation: rule.approvedInterpretation || rule.rawInterpretation || rule.title,
      sourceDocumentId: rule.sourceDocumentId || 'MANUAL_ENTRY',
      sourcePage: rule.sourcePage || 1,
      sourceExcerpt: rule.sourceExcerpt || rule.title,
      extractionConfidence: 'high',
      ambiguityFlags: [],
      status: 'Approved'
    };

    ruleSet.rules.push(newRule);
    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return ruleSet;
  },

  activateRuleSet(ruleSetId: string, userRole: string, approvedBy: string): { success: boolean; ruleSet?: CompetitionRuleSet; error?: string } {
    if (userRole === 'assistant_coach') {
      return { success: false, error: 'Assistant coaches cannot activate competition rulesets.' };
    }

    const ruleSet = CompetitionRuleRepository.getRuleSet(ruleSetId);
    if (!ruleSet) return { success: false, error: 'RuleSet not found' };

    const unapprovedCount = ruleSet.rules.filter(r => r.status === 'Extracted' || r.status === 'Needs Review').length;
    if (unapprovedCount > 0) {
      return { success: false, error: `${unapprovedCount} rules still require review before this ruleset can be activated.` };
    }

    ruleSet.status = 'active';
    ruleSet.approvedAt = new Date().toISOString();
    ruleSet.approvedBy = approvedBy;

    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return { success: true, ruleSet };
  }
};
