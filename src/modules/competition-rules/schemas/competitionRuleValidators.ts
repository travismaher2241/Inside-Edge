import type { CompetitionRule, CompetitionRuleSet, RuleCondition, RuleStructuredValue } from './competitionRuleTypes';

export function validateRule(rule: Partial<CompetitionRule>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.id) errors.push('Rule ID is required');
  if (!rule.category) errors.push('Rule category is required');
  if (!rule.behaviour) errors.push('Rule behaviour is required');
  if (!rule.title) errors.push('Rule title is required');
  if (!rule.rawInterpretation) errors.push('Raw interpretation is required');
  if (!rule.sourceDocumentId) errors.push('Source document ID is required');
  if (typeof rule.sourcePage !== 'number' || rule.sourcePage < 1) errors.push('Valid source page number is required');
  if (!rule.sourceExcerpt) errors.push('Source excerpt is required');
  if (!rule.status) errors.push('Rule status is required');

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateRuleSet(ruleSet: Partial<CompetitionRuleSet>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ruleSet.id) errors.push('RuleSet ID is required');
  if (!ruleSet.organisationName) errors.push('Organisation name is required');
  if (!ruleSet.competitionName) errors.push('Competition name is required');
  if (!ruleSet.season) errors.push('Season is required');
  if (!Array.isArray(ruleSet.sourceDocumentIds) || ruleSet.sourceDocumentIds.length === 0) {
    errors.push('At least one source document ID is required');
  }
  if (!ruleSet.status) errors.push('RuleSet status is required');
  if (typeof ruleSet.version !== 'number' || ruleSet.version < 1) errors.push('Valid version number is required');

  return {
    isValid: errors.length === 0,
    errors
  };
}
