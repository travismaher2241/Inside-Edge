export type RuleSpecificityLevel =
  | 'MATCH_SPECIFIC'
  | 'GRADE_AGE_GROUP'
  | 'COMPETITION'
  | 'GOVERNING_BODY'
  | 'CLUB_COACHING_POLICY';

export interface RuleSourceMetadata {
  sourceType: 'LEAGUE_RULE' | 'CLUB_POLICY' | 'COACH_RESTRICTION' | 'MEDICAL_RESTRICTION';
  specificityLevel: RuleSpecificityLevel;
  authorityName: string;
}

export function getRuleSpecificityWeight(level: RuleSpecificityLevel): number {
  switch (level) {
    case 'MATCH_SPECIFIC':
      return 100;
    case 'GRADE_AGE_GROUP':
      return 80;
    case 'COMPETITION':
      return 60;
    case 'GOVERNING_BODY':
      return 40;
    case 'CLUB_COACHING_POLICY':
      return 20;
    default:
      return 10;
  }
}
