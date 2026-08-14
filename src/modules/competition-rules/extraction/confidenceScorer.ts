import type { RuleExtractionConfidence, RuleAmbiguity } from '../schemas/competitionRuleTypes';

export function calculateConfidence(
  lineText: string,
  ambiguityFlags: RuleAmbiguity[],
  isPageReadable: boolean
): RuleExtractionConfidence {
  if (!isPageReadable || ambiguityFlags.includes('OCR_QUALITY') || ambiguityFlags.includes('UNCERTAIN_TABLE_EXTRACTION')) {
    return 'low';
  }

  if (ambiguityFlags.length > 0 || lineText.length < 20) {
    return 'medium';
  }

  return 'high';
}
