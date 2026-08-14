import type { CompetitionRuleSet, CompetitionRule } from '../schemas/competitionRuleTypes';
import type { CompetitionDocument } from '../documents/documentTypes';
import { extractPdfPages } from '../ingestion/pdfTextExtractor';
import { extractCandidateRulesFromPages } from '../extraction/ruleCandidateExtractor';
import { CompetitionRuleRepository } from '../storage/competitionRuleRepository';

export const RuleReviewService = {
  /**
   * Processes a document (or set of documents) into a draft CompetitionRuleSet with candidate rules.
   */
  processDocumentToDraftRuleSet(params: {
    organisationName: string;
    competitionName: string;
    gradeName?: string;
    season: string;
    documents: Array<{ document: CompetitionDocument; rawContent: string }>;
    createdBy: string;
  }): CompetitionRuleSet {
    const sourceDocumentIds = params.documents.map(d => d.document.id);
    const extractedRules: CompetitionRule[] = [];

    params.documents.forEach(({ document, rawContent }) => {
      const pageResult = extractPdfPages(rawContent);
      const candidates = extractCandidateRulesFromPages(document.id, pageResult.pages);
      extractedRules.push(...candidates);
    });

    const ruleSet: CompetitionRuleSet = {
      id: `ruleset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      organisationName: params.organisationName,
      competitionName: params.competitionName,
      gradeName: params.gradeName,
      season: params.season,
      sourceDocumentIds,
      status: 'reviewing',
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
      rules: extractedRules
    };

    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return ruleSet;
  },

  /**
   * Adds an additional document to an existing draft ruleset.
   */
  addDocumentToRuleSet(ruleSetId: string, document: CompetitionDocument, rawContent: string): CompetitionRuleSet | undefined {
    const ruleSet = CompetitionRuleRepository.getRuleSet(ruleSetId);
    if (!ruleSet) return undefined;

    if (!ruleSet.sourceDocumentIds.includes(document.id)) {
      ruleSet.sourceDocumentIds.push(document.id);
    }

    const pageResult = extractPdfPages(rawContent);
    const newCandidates = extractCandidateRulesFromPages(document.id, pageResult.pages);
    ruleSet.rules.push(...newCandidates);

    CompetitionRuleRepository.saveRuleSet(ruleSet);
    return ruleSet;
  }
};
