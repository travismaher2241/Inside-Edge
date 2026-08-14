import type { RuleAmbiguity } from '../schemas/competitionRuleTypes';
import type { ExtractedPageText } from '../documents/documentTypes';

export function detectAmbiguities(lineText: string, page: ExtractedPageText): RuleAmbiguity[] {
  const flags: RuleAmbiguity[] = [];
  const lower = lineText.toLowerCase();

  if (lower.includes('refer to') || lower.includes('see section') || lower.includes('appendix')) {
    flags.push('UNRESOLVED_CROSS_REFERENCE');
  }

  if (lower.includes('may or may not') || lower.includes('at the discretion of') || lower.includes('or')) {
    flags.push('MULTIPLE_INTERPRETATIONS');
  }

  if (lower.includes('table') || lower.includes('schedule a') || lower.includes('matrix')) {
    flags.push('UNCERTAIN_TABLE_EXTRACTION');
  }

  if ((lower.includes('u14') && lower.includes('u16')) || lower.includes('age groups')) {
    flags.push('UNCLEAR_AGE_GROUP');
  }

  if (lower.includes('grade') && !lower.includes('division 1') && !lower.includes('1st xi')) {
    flags.push('UNCLEAR_GRADE');
  }

  if (lower.includes('amended') || lower.includes('effective from')) {
    flags.push('AMENDMENT_DETECTED');
  }

  if (!page.isReadable || page.isScanned) {
    flags.push('OCR_QUALITY');
  }

  return flags;
}
