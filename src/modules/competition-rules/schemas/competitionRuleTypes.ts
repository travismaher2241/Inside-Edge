// TypeScript definitions for Competition Rules & Playing Conditions Foundation

export type RuleCategory =
  | 'match_structure'
  | 'player_eligibility'
  | 'batting'
  | 'bowling'
  | 'fielding'
  | 'match_phases'
  | 'result_conditions'
  | 'equipment_ground'
  | 'safety'
  | 'procedure'
  | 'special';

export type RuleBehaviour =
  | 'CONSTRAINT'
  | 'CALCULATION'
  | 'INFORMATION'
  | 'WARNING'
  | 'PROCEDURE';

export type RuleOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'between'
  | 'exists';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value?: unknown;
}

export type RuleStructuredValue =
  | {
      kind: 'number';
      key: string;
      value: number;
      unit?: string;
    }
  | {
      kind: 'range';
      key: string;
      min?: number;
      max?: number;
      unit?: string;
    }
  | {
      kind: 'boolean';
      key: string;
      value: boolean;
    }
  | {
      kind: 'enum';
      key: string;
      value: string;
    }
  | {
      kind: 'table';
      key: string;
      rows: Record<string, unknown>[];
    }
  | {
      kind: 'formula';
      key: string;
      expression: string;
    }
  | {
      kind: 'text';
      key: string;
      value: string;
    };

export type RuleAmbiguity =
  | 'UNRESOLVED_CROSS_REFERENCE'
  | 'MULTIPLE_INTERPRETATIONS'
  | 'MISSING_DEFINITION'
  | 'UNCERTAIN_TABLE_EXTRACTION'
  | 'CONFLICTING_CLAUSES'
  | 'UNCLEAR_GRADE'
  | 'UNCLEAR_AGE_GROUP'
  | 'UNCLEAR_EFFECTIVE_DATE'
  | 'OCR_QUALITY'
  | 'AMENDMENT_DETECTED'
  | 'INCOMPLETE_SOURCE';

export type RuleExtractionConfidence = 'high' | 'medium' | 'low';

export type RuleStatus =
  | 'Extracted'
  | 'Needs Review'
  | 'Approved'
  | 'Rejected'
  | 'Superseded'
  | 'Archived';

export interface CompetitionRule {
  id: string;
  category: RuleCategory;
  subcategory?: string;
  behaviour: RuleBehaviour;

  title: string;

  rawInterpretation: string;
  approvedInterpretation?: string;

  structuredValue?: RuleStructuredValue;

  applicabilityConditions: RuleCondition[];

  sourceDocumentId: string;
  sourcePage: number;
  sourceSection?: string;
  sourceHeading?: string;
  sourceLocator?: string;
  sourceExcerpt: string;

  extractionConfidence: RuleExtractionConfidence;
  ambiguityFlags: RuleAmbiguity[];

  status: RuleStatus;

  coachNotes?: string;
  supersedesRuleId?: string;
}

export type RuleSetStatus = 'draft' | 'reviewing' | 'active' | 'archived';

export interface CompetitionRuleSet {
  id: string;

  organisationName: string;
  competitionName: string;
  gradeName?: string;
  season: string;

  sourceDocumentIds: string[];

  status: RuleSetStatus;
  version: number;

  effectiveFrom?: string;
  effectiveUntil?: string;

  createdAt: string;
  createdBy: string;

  approvedAt?: string;
  approvedBy?: string;

  rules: CompetitionRule[];
}

export interface RuleSetAssignment {
  id: string;
  ruleSetId: string;
  ruleSetVersion: number;
  clubId: string;
  teamId?: string;
  gradeName?: string;
  competitionName: string;
  season: string;
  assignedAt: string;
  assignedBy: string;
}
