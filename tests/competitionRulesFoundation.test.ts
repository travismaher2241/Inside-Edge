import { describe, expect, it, beforeEach } from 'vitest';
import { DocumentService } from '../src/modules/competition-rules/documents/documentService';
import { extractPdfPages } from '../src/modules/competition-rules/ingestion/pdfTextExtractor';
import { extractCandidateRulesFromPages } from '../src/modules/competition-rules/extraction/ruleCandidateExtractor';
import { RuleReviewService } from '../src/modules/competition-rules/review/ruleReviewService';
import { ApprovalService } from '../src/modules/competition-rules/review/approvalService';
import { RuleSetAssignmentService } from '../src/modules/competition-rules/assignment/ruleSetAssignmentService';
import { CompetitionRuleRepository } from '../src/modules/competition-rules/storage/competitionRuleRepository';

const MOCK_SENIOR_PDF_CONTENT = `
--- PAGE 1 ---
WDCA SENIOR PLAYING CONDITIONS 2026/27
SECTION 1: MATCH FORMAT
Overs per side: 40 overs per side in all one-day matches.

--- PAGE 2 ---
SECTION 7: BOWLING RESTRICTIONS
Rule 7.3: A bowler may bowl a maximum of 8 overs in a 40-over innings.
Junior bowlers under 16 have a spell limit of 5 overs maximum per spell.

--- PAGE 3 ---
SECTION 9: FIELDING RESTRICTIONS
Overs 1 to 10 constitute the Powerplay.
During Powerplay overs, a maximum of 2 fielders are permitted outside the 30-yard circle.
`;

describe('Competition Rules Foundation (C-01 to C-07, C-10, C-11, C-15)', () => {
  beforeEach(() => {
    DocumentService.clearAll();
    CompetitionRuleRepository.clearAll();
    RuleSetAssignmentService.clearAll();
  });

  it('C-01: retains original document metadata on upload', () => {
    const docResult = DocumentService.createDocument({
      originalFileName: 'WDCA_Senior_2026.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'coach_1',
      documentType: 'playing_conditions',
      content: MOCK_SENIOR_PDF_CONTENT
    });

    expect(docResult.document.id).toBeDefined();
    expect(docResult.document.originalFileName).toBe('WDCA_Senior_2026.pdf');
    expect(docResult.document.checksum).toBeDefined();
    expect(docResult.isDuplicate).toBe(false);
  });

  it('C-02: preserves page boundaries during text extraction', () => {
    const result = extractPdfPages(MOCK_SENIOR_PDF_CONTENT);
    expect(result.pageCount).toBe(3);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[2].pageNumber).toBe(3);
  });

  it('C-03: candidate rules preserve source document and page references', () => {
    const pageResult = extractPdfPages(MOCK_SENIOR_PDF_CONTENT);
    const candidates = extractCandidateRulesFromPages('doc-101', pageResult.pages);

    expect(candidates.length).toBeGreaterThan(0);
    const bowlerRule = candidates.find(r => r.title === 'Maximum Overs Per Bowler');
    expect(bowlerRule).toBeDefined();
    expect(bowlerRule?.sourceDocumentId).toBe('doc-101');
    expect(bowlerRule?.sourcePage).toBe(2);
    expect(bowlerRule?.sourceExcerpt).toContain('maximum of 8 overs');
  });

  it('C-04 & C-05: candidate rules require human approval; coach can approve/edit/reject', () => {
    const docResult = DocumentService.createDocument({
      originalFileName: 'WDCA_Senior_2026.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'coach_1',
      documentType: 'playing_conditions',
      content: MOCK_SENIOR_PDF_CONTENT
    });

    const ruleSet = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA',
      competitionName: 'Division 1',
      season: '2026/27',
      documents: [{ document: docResult.document, rawContent: MOCK_SENIOR_PDF_CONTENT }],
      createdBy: 'coach_1'
    });

    expect(ruleSet.status).toBe('reviewing');
    expect(ruleSet.rules.some(r => r.status === 'Approved')).toBe(false);

    // Unapproved ruleset activation fails
    const actFail = ApprovalService.activateRuleSet(ruleSet.id, 'head_coach', 'coach_1');
    expect(actFail.success).toBe(false);

    // Approve all rules
    ruleSet.rules.forEach(r => {
      ApprovalService.approveRule(ruleSet.id, r.id, 'coach_1');
    });

    // Activation succeeds now
    const actSuccess = ApprovalService.activateRuleSet(ruleSet.id, 'head_coach', 'coach_1');
    expect(actSuccess.success).toBe(true);
    expect(actSuccess.ruleSet?.status).toBe('active');
  });

  it('C-06: preserves rawInterpretation when coach edits approvedInterpretation', () => {
    const docResult = DocumentService.createDocument({
      originalFileName: 'WDCA_Senior.pdf', mimeType: 'application/pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: MOCK_SENIOR_PDF_CONTENT
    });
    const ruleSet = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: docResult.document, rawContent: MOCK_SENIOR_PDF_CONTENT }], createdBy: 'c1'
    });

    const targetRule = ruleSet.rules[0];
    const rawOriginal = targetRule.rawInterpretation;

    const updatedRuleSet = ApprovalService.editRule(ruleSet.id, targetRule.id, {
      approvedInterpretation: 'Edited coach interpretation: 8 overs max.'
    }, 'c1');

    const edited = updatedRuleSet?.rules.find(r => r.id === targetRule.id);
    expect(edited?.rawInterpretation).toBe(rawOriginal);
    expect(edited?.approvedInterpretation).toBe('Edited coach interpretation: 8 overs max.');
    expect(edited?.status).toBe('Approved');
  });

  it('C-07: supports multiple source documents in a single CompetitionRuleSet', () => {
    const doc1 = DocumentService.createDocument({ originalFileName: 'Main_PC.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: MOCK_SENIOR_PDF_CONTENT }).document;
    const doc2 = DocumentService.createDocument({ originalFileName: 'T20_Appendix.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'grade_appendix', content: '--- PAGE 1 ---\nPowerplay overs 1 to 6.' }).document;

    const ruleSet = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: doc1, rawContent: MOCK_SENIOR_PDF_CONTENT }], createdBy: 'c1'
    });

    RuleReviewService.addDocumentToRuleSet(ruleSet.id, doc2, '--- PAGE 1 ---\nPowerplay overs 1 to 6.');

    const updatedSet = CompetitionRuleRepository.getRuleSet(ruleSet.id);
    expect(updatedSet?.sourceDocumentIds).toEqual([doc1.id, doc2.id]);
    expect(updatedSet?.rules.length).toBeGreaterThan(3);
  });

  it('C-10: supports manual rule addition', () => {
    const doc1 = DocumentService.createDocument({ originalFileName: 'Main_PC.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: MOCK_SENIOR_PDF_CONTENT }).document;
    const ruleSet = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: doc1, rawContent: MOCK_SENIOR_PDF_CONTENT }], createdBy: 'c1'
    });

    const updated = ApprovalService.addManualRule(ruleSet.id, {
      category: 'equipment_ground',
      behaviour: 'INFORMATION',
      title: 'Kookaburra Red Ball Rule',
      sourceDocumentId: 'MANUAL_ENTRY',
      sourcePage: 1,
      sourceExcerpt: 'Red 156g Kookaburra balls mandatory for all senior matches.',
      extractionConfidence: 'high',
      ambiguityFlags: [],
      applicabilityConditions: []
    }, 'c1');

    expect(updated?.rules.some(r => r.title === 'Kookaburra Red Ball Rule')).toBe(true);
  });

  it('C-11 & C-15: assigns ruleset to team/grade/season and enforces role permissions', () => {
    const doc1 = DocumentService.createDocument({ originalFileName: 'Main_PC.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: MOCK_SENIOR_PDF_CONTENT }).document;
    const ruleSet = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: doc1, rawContent: MOCK_SENIOR_PDF_CONTENT }], createdBy: 'c1'
    });

    ruleSet.rules.forEach(r => ApprovalService.approveRule(ruleSet.id, r.id, 'c1'));

    // Assistant coach activation fails (C-15)
    const asstResult = ApprovalService.activateRuleSet(ruleSet.id, 'assistant_coach', 'c2');
    expect(asstResult.success).toBe(false);
    expect(asstResult.error).toContain('Assistant coaches cannot activate');

    // Head coach activation succeeds
    const headResult = ApprovalService.activateRuleSet(ruleSet.id, 'head_coach', 'c1');
    expect(headResult.success).toBe(true);

    const assignment = RuleSetAssignmentService.assignRuleSet({
      ruleSetId: ruleSet.id,
      ruleSetVersion: ruleSet.version,
      clubId: 'club-1',
      teamId: 'team-1st-xi',
      gradeName: 'Division 1',
      competitionName: 'WDCA',
      season: '2026/27',
      assignedBy: 'c1'
    });

    expect(assignment.teamId).toBe('team-1st-xi');
    const teamAssigns = RuleSetAssignmentService.getAssignmentsForTeam('team-1st-xi', '2026/27');
    expect(teamAssigns.length).toBe(1);
  });
});
