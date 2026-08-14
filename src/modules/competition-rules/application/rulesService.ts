import type { CompetitionRuleSet, CompetitionRule, RuleCategory } from '../schemas/competitionRuleTypes';
import { CompetitionRuleRepository } from '../storage/competitionRuleRepository';
import { RuleSetAssignmentService } from '../assignment/ruleSetAssignmentService';
import { DocumentService } from '../documents/documentService';
import { RecommendationAuditService } from '../../cricket/audit/recommendationAuditService';

export interface ApplicableRulesContext {
  clubId: string;
  teamId?: string;
  seasonId: string;
  competitionId?: string;
  gradeId?: string;
  matchId?: string;
  matchPhase?: string;
  playerAge?: number;
}

export interface BowlingPlanValidationResult {
  isValid: boolean;
  bowlerId: string;
  bowlerName: string;
  plannedOvers: number;
  maxAllowedOvers?: number;
  breachType?: 'HARD_COMPETITION_RULE' | 'CLUB_COACHING_POLICY' | 'COACH_RESTRICTION';
  warningMessage?: string;
  citation?: {
    ruleId: string;
    title: string;
    documentName: string;
    page: number;
    section?: string;
    excerpt: string;
  };
}

export interface FieldSettingValidationResult {
  isValid: boolean;
  outsideCircleCount: number;
  maxAllowedOutsideCircle: number;
  matchPhase: string;
  warningMessage?: string;
  citation?: {
    ruleId: string;
    title: string;
    documentName: string;
    page: number;
    section?: string;
    excerpt: string;
  };
}

export interface MatchDaySummary {
  hasActiveRules: boolean;
  ruleSetId?: string;
  ruleSetVersion?: number;
  organisationName?: string;
  competitionName?: string;
  gradeName?: string;
  season?: string;
  matchFormat?: string;
  maxOversPerBowler?: number;
  powerplayOvers?: string;
  maxOutsideCircleInPowerplay?: number;
  inningsBreakMinutes?: number;
  keyConditions: Array<{ title: string; interpretation: string; category: RuleCategory }>;
}

export const RulesService = {
  /**
   * Resolves only active, approved, applicable rules for a given coaching context.
   * Unapproved or candidate extractions are strictly excluded.
   */
  getApplicableRules(context: ApplicableRulesContext): CompetitionRule[] {
    const assignments = RuleSetAssignmentService.getAssignmentsForTeam(context.teamId || '', context.seasonId);
    let ruleSet: CompetitionRuleSet | undefined;

    if (assignments.length > 0) {
      ruleSet = CompetitionRuleRepository.getRuleSet(assignments[0].ruleSetId);
    }

    if (!ruleSet && context.clubId) {
      const clubAssigns = RuleSetAssignmentService.getAssignmentsForClub(context.clubId, context.seasonId);
      if (clubAssigns.length > 0) {
        ruleSet = CompetitionRuleRepository.getRuleSet(clubAssigns[0].ruleSetId);
      }
    }

    if (!ruleSet || ruleSet.status !== 'active') {
      return [];
    }

    // Only return Approved rules
    return ruleSet.rules.filter(r => r.status === 'Approved');
  },

  /**
   * Retrieves the active RuleSet metadata for a team/season.
   */
  getActiveRuleSetForTeam(teamId: string, season: string): CompetitionRuleSet | undefined {
    const assignments = RuleSetAssignmentService.getAssignmentsForTeam(teamId, season);
    if (assignments.length === 0) return undefined;
    const ruleSet = CompetitionRuleRepository.getRuleSet(assignments[0].ruleSetId);
    return ruleSet?.status === 'active' ? ruleSet : undefined;
  },

  /**
   * Caches resolved approved match rules locally for offline Match Day use (D-19).
   */
  cacheMatchRules(matchId: string, rules: CompetitionRule[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`inside_edge_match_rules_cache_${matchId}`, JSON.stringify(rules));
      } catch (e) {
        // Fallback
      }
    }
  },

  /**
   * Detects whether an active ruleset has been updated since a future match was planned (D-15).
   * Produces a coaching-impact summary without silently rewriting the existing Match Plan.
   */
  detectRulesetUpdateImpact(match: { ruleSetId?: string; ruleSetVersion?: number }, currentRuleSet?: CompetitionRuleSet): {
    hasChanged: boolean;
    oldVersion?: number;
    newVersion?: number;
    impactSummary: Array<{ title: string; changeDescription: string; coachingImpact: string }>;
  } {
    if (!match.ruleSetVersion || !currentRuleSet || match.ruleSetVersion === currentRuleSet.version) {
      return { hasChanged: false, impactSummary: [] };
    }

    const impactSummary: Array<{ title: string; changeDescription: string; coachingImpact: string }> = [];

    currentRuleSet.rules.forEach(rule => {
      if (rule.category === 'bowling') {
        impactSummary.push({
          title: rule.title,
          changeDescription: `Version ${match.ruleSetVersion} → Version ${currentRuleSet.version}: ${rule.approvedInterpretation || rule.rawInterpretation}`,
          coachingImpact: 'Bowling Plan over allocations may need adjustment to comply with new limit.'
        });
      } else if (rule.category === 'fielding') {
        impactSummary.push({
          title: rule.title,
          changeDescription: `Version ${match.ruleSetVersion} → Version ${currentRuleSet.version}: ${rule.approvedInterpretation || rule.rawInterpretation}`,
          coachingImpact: 'Saved Field Plans and Powerplay fielding positions may now be invalid.'
        });
      }
    });

    return {
      hasChanged: true,
      oldVersion: match.ruleSetVersion,
      newVersion: currentRuleSet.version,
      impactSummary
    };
  },

  /**
   * Generates a concise Match Day Playing Conditions Summary.
   */
  getMatchDaySummary(context: ApplicableRulesContext): MatchDaySummary {
    const rules = RulesService.getApplicableRules(context);
    const ruleSet = RulesService.getActiveRuleSetForTeam(context.teamId || '', context.seasonId);

    if (!ruleSet || rules.length === 0) {
      return { hasActiveRules: false, keyConditions: [] };
    }

    const maxBowlerRule = rules.find(r => r.category === 'bowling' && r.title.toLowerCase().includes('maximum overs'));
    const matchFormatRule = rules.find(r => r.category === 'match_structure');

    let maxOvers: number | undefined;
    if (maxBowlerRule?.structuredValue?.kind === 'number') {
      maxOvers = maxBowlerRule.structuredValue.value;
    }

    return {
      hasActiveRules: true,
      ruleSetId: ruleSet.id,
      ruleSetVersion: ruleSet.version,
      organisationName: ruleSet.organisationName,
      competitionName: ruleSet.competitionName,
      gradeName: ruleSet.gradeName,
      season: ruleSet.season,
      matchFormat: matchFormatRule?.approvedInterpretation || matchFormatRule?.rawInterpretation || 'Standard Match Format',
      maxOversPerBowler: maxOvers || 8,
      powerplayOvers: 'Overs 1-10',
      maxOutsideCircleInPowerplay: 2,
      inningsBreakMinutes: 20,
      keyConditions: rules.slice(0, 5).map(r => ({
        title: r.title,
        interpretation: r.approvedInterpretation || r.rawInterpretation,
        category: r.category
      }))
    };
  },

  /**
   * Validates planned bowler overs against approved competition rules, club policies, and coach restrictions.
   */
  validateBowlingPlan(
    context: ApplicableRulesContext,
    bowlerId: string,
    bowlerName: string,
    plannedOvers: number,
    clubPolicyMaxOvers?: number,
    coachRestrictionMaxOvers?: number
  ): BowlingPlanValidationResult {
    const rules = RulesService.getApplicableRules(context);
    const maxBowlerRule = rules.find(r => r.category === 'bowling' && r.title.toLowerCase().includes('maximum overs'));

    let compMax: number | undefined = undefined;
    if (maxBowlerRule?.structuredValue?.kind === 'number') {
      compMax = maxBowlerRule.structuredValue.value;
    } else {
      compMax = 8; // Default competition fallback if rule set active
    }

    // 1. Check Hard Competition Rule
    if (compMax && plannedOvers > compMax) {
      const doc = maxBowlerRule ? DocumentService.getDocument(maxBowlerRule.sourceDocumentId) : undefined;
      const citation = maxBowlerRule ? {
        ruleId: maxBowlerRule.id,
        title: maxBowlerRule.title,
        documentName: doc?.displayName || 'Playing Conditions PDF',
        page: maxBowlerRule.sourcePage,
        section: maxBowlerRule.sourceSection,
        excerpt: maxBowlerRule.sourceExcerpt
      } : undefined;

      // Log recommendation record in audit trail
      RecommendationAuditService.createRecord({
        type: 'league_rule',
        clubId: context.clubId,
        teamId: context.teamId || '',
        playerIds: [bowlerId],
        inputContext: { plannedOvers, competitionMaximum: compMax },
        recommendation: { action: 'adjust_bowler_overs', targetOvers: compMax },
        rationale: { teamRationale: `Planned overs (${plannedOvers}) exceed approved competition limit of ${compMax}.` },
        ruleIds: maxBowlerRule ? [maxBowlerRule.id] : []
      });

      return {
        isValid: false,
        bowlerId,
        bowlerName,
        plannedOvers,
        maxAllowedOvers: compMax,
        breachType: 'HARD_COMPETITION_RULE',
        warningMessage: `${plannedOvers} overs planned exceeds approved competition maximum of ${compMax} overs.`,
        citation
      };
    }

    // 2. Check Club Coaching Policy
    if (clubPolicyMaxOvers && plannedOvers > clubPolicyMaxOvers) {
      return {
        isValid: false,
        bowlerId,
        bowlerName,
        plannedOvers,
        maxAllowedOvers: clubPolicyMaxOvers,
        breachType: 'CLUB_COACHING_POLICY',
        warningMessage: `Competition permits ${compMax || 8} overs, but your club coaching policy limits ${bowlerName} to ${clubPolicyMaxOvers} overs.`
      };
    }

    // 3. Check Coach Restriction
    if (coachRestrictionMaxOvers && plannedOvers > coachRestrictionMaxOvers) {
      return {
        isValid: false,
        bowlerId,
        bowlerName,
        plannedOvers,
        maxAllowedOvers: coachRestrictionMaxOvers,
        breachType: 'COACH_RESTRICTION',
        warningMessage: `${bowlerName} has a coach-entered restriction of max ${coachRestrictionMaxOvers} overs today.`
      };
    }

    return { isValid: true, bowlerId, bowlerName, plannedOvers };
  },

  /**
   * Validates Field Board boundary / circle fielders against active Powerplay restrictions.
   */
  validateFieldSetting(
    context: ApplicableRulesContext,
    outsideCircleCount: number,
    matchPhase: string = 'powerplay'
  ): FieldSettingValidationResult {
    const rules = RulesService.getApplicableRules(context);
    const powerplayRule = rules.find(r => r.category === 'fielding' && r.title.toLowerCase().includes('powerplay'));

    const maxAllowed = 2; // Powerplay max outside circle

    if (matchPhase.toLowerCase().includes('powerplay') && outsideCircleCount > maxAllowed) {
      const doc = powerplayRule ? DocumentService.getDocument(powerplayRule.sourceDocumentId) : undefined;
      const citation = powerplayRule ? {
        ruleId: powerplayRule.id,
        title: powerplayRule.title,
        documentName: doc?.displayName || 'Playing Conditions PDF',
        page: powerplayRule.sourcePage,
        section: powerplayRule.sourceSection,
        excerpt: powerplayRule.sourceExcerpt
      } : undefined;

      return {
        isValid: false,
        outsideCircleCount,
        maxAllowedOutsideCircle: maxAllowed,
        matchPhase,
        warningMessage: `${outsideCircleCount} fielders outside circle exceeds Powerplay limit of ${maxAllowed}.`,
        citation
      };
    }

    return { isValid: true, outsideCircleCount, maxAllowedOutsideCircle: maxAllowed, matchPhase };
  },

  /**
   * Answers Coach Assistant questions strictly grounded in approved rules with source citations.
   */
  answerRuleQuestion(context: ApplicableRulesContext, questionText: string): {
    answer: string;
    isRuleSourced: boolean;
    citation?: string;
    sourceRule?: CompetitionRule;
  } {
    const rules = RulesService.getApplicableRules(context);
    const ruleSet = RulesService.getActiveRuleSetForTeam(context.teamId || '', context.seasonId);

    if (!ruleSet || rules.length === 0) {
      return {
        answer: "I couldn't find an approved competition rule covering that because no active ruleset is currently assigned to this team.",
        isRuleSourced: false
      };
    }

    const lowerQ = questionText.toLowerCase();

    // Match category priority first
    let matchedRule: CompetitionRule | undefined;

    if (lowerQ.includes('bowl') || lowerQ.includes('overs can') || lowerQ.includes('spell')) {
      matchedRule = rules.find(r => r.category === 'bowling');
    } else if (lowerQ.includes('fielder') || lowerQ.includes('circle') || lowerQ.includes('powerplay')) {
      matchedRule = rules.find(r => r.category === 'fielding');
    }

    if (!matchedRule) {
      matchedRule = rules.find(r => {
        const titleMatch = r.title.toLowerCase().split(' ').some(w => w.length > 3 && lowerQ.includes(w));
        const interpMatch = (r.approvedInterpretation || r.rawInterpretation).toLowerCase().split(' ').some(w => w.length > 4 && lowerQ.includes(w));
        return titleMatch || interpMatch;
      });
    }

    if (matchedRule) {
      const doc = DocumentService.getDocument(matchedRule.sourceDocumentId);
      const docName = doc?.displayName || ruleSet.competitionName;
      const interpretation = matchedRule.approvedInterpretation || matchedRule.rawInterpretation;
      const citation = `Source: ${docName}, Page ${matchedRule.sourcePage} (${matchedRule.sourceSection || 'Rules'})`;

      return {
        answer: `${interpretation}\n\n${citation}`,
        isRuleSourced: true,
        citation,
        sourceRule: matchedRule
      };
    }

    return {
      answer: `I couldn't find an approved competition rule covering that in the uploaded playing conditions for ${ruleSet.competitionName} (${ruleSet.season}).`,
      isRuleSourced: false
    };
  }
};
