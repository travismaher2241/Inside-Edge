import type { CompetitionRuleSet, CompetitionRule } from '../schemas/competitionRuleTypes';
import { CompetitionRuleRepository } from '../storage/competitionRuleRepository';

export const RuleSetVersionEngine = {
  /**
   * Creates a new immutable version of an existing ruleset when documents or rules are updated.
   */
  createNewVersion(
    existingRuleSetId: string,
    newSourceDocumentIds: string[],
    newRules: CompetitionRule[],
    createdBy: string
  ): CompetitionRuleSet | undefined {
    const existing = CompetitionRuleRepository.getRuleSet(existingRuleSetId);
    if (!existing) return undefined;

    // Archive current active version
    existing.status = 'archived';
    CompetitionRuleRepository.saveRuleSet(existing);

    const nextVersionNumber = existing.version + 1;
    const newRuleSet: CompetitionRuleSet = {
      ...existing,
      id: `ruleset_${Date.now()}_v${nextVersionNumber}`,
      version: nextVersionNumber,
      sourceDocumentIds: Array.from(new Set([...existing.sourceDocumentIds, ...newSourceDocumentIds])),
      status: 'reviewing',
      createdAt: new Date().toISOString(),
      createdBy,
      approvedAt: undefined,
      approvedBy: undefined,
      rules: newRules
    };

    CompetitionRuleRepository.saveRuleSet(newRuleSet);
    return newRuleSet;
  }
};
