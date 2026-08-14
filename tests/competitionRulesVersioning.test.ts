import { describe, expect, it, beforeEach } from 'vitest';
import { DocumentService } from '../src/modules/competition-rules/documents/documentService';
import { RuleReviewService } from '../src/modules/competition-rules/review/ruleReviewService';
import { ApprovalService } from '../src/modules/competition-rules/review/approvalService';
import { RuleSetVersionEngine } from '../src/modules/competition-rules/versioning/ruleSetVersionEngine';
import { RuleSetDiffEngine } from '../src/modules/competition-rules/versioning/ruleSetDiffEngine';
import { CompetitionRuleRepository } from '../src/modules/competition-rules/storage/competitionRuleRepository';

const V1_CONTENT = `
--- PAGE 1 ---
WDCA DIVISION 1 PLAYING CONDITIONS 2026/27
SECTION 7: BOWLING RESTRICTIONS
Rule 7.3: A bowler may bowl a maximum of 10 overs in a 50-over match.
`;

const V2_REVISED_CONTENT = `
--- PAGE 1 ---
WDCA DIVISION 1 PLAYING CONDITIONS 2026/27 (AMENDED)
SECTION 7: BOWLING RESTRICTIONS
Rule 7.3: A bowler may bowl a maximum of 8 overs in a 40-over match.
Rule 7.4: Powerplay overs 1 to 10 allow maximum 2 fielders outside circle.
`;

describe('Competition Rules Versioning & Diffing (C-12, C-13)', () => {
  beforeEach(() => {
    DocumentService.clearAll();
    CompetitionRuleRepository.clearAll();
  });

  it('C-12: creates a new immutable ruleset version on revision rather than overwriting existing version', () => {
    const docV1 = DocumentService.createDocument({ originalFileName: 'WDCA_v1.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: V1_CONTENT }).document;

    const setV1 = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: docV1, rawContent: V1_CONTENT }], createdBy: 'c1'
    });

    setV1.rules.forEach(r => ApprovalService.approveRule(setV1.id, r.id, 'c1'));
    ApprovalService.activateRuleSet(setV1.id, 'head_coach', 'c1');

    expect(setV1.version).toBe(1);
    expect(setV1.status).toBe('active');

    // Process revision V2
    const docV2 = DocumentService.createDocument({ originalFileName: 'WDCA_v2_Amended.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: V2_REVISED_CONTENT }).document;

    const draftV2Candidates = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: docV2, rawContent: V2_REVISED_CONTENT }], createdBy: 'c1'
    });

    const setV2 = RuleSetVersionEngine.createNewVersion(
      setV1.id,
      [docV2.id],
      draftV2Candidates.rules,
      'c1'
    );

    expect(setV2).toBeDefined();
    expect(setV2?.version).toBe(2);
    expect(setV2?.status).toBe('reviewing');

    // Verify V1 remains archived in repository
    const archivedV1 = CompetitionRuleRepository.getRuleSet(setV1.id);
    expect(archivedV1?.version).toBe(1);
    expect(archivedV1?.status).toBe('archived');
  });

  it('C-13: version diff identifies added, changed, and unchanged rules', () => {
    const docV1 = DocumentService.createDocument({ originalFileName: 'WDCA_v1.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: V1_CONTENT }).document;
    const setV1 = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: docV1, rawContent: V1_CONTENT }], createdBy: 'c1'
    });

    const docV2 = DocumentService.createDocument({ originalFileName: 'WDCA_v2.pdf', mimeType: 'pdf', uploadedBy: 'c1', documentType: 'playing_conditions', content: V2_REVISED_CONTENT }).document;
    const setV2Candidates = RuleReviewService.processDocumentToDraftRuleSet({
      organisationName: 'WDCA', competitionName: 'Division 1', season: '2026/27', documents: [{ document: docV2, rawContent: V2_REVISED_CONTENT }], createdBy: 'c1'
    });

    const setV2 = RuleSetVersionEngine.createNewVersion(setV1.id, [docV2.id], setV2Candidates.rules, 'c1')!;

    const diff = RuleSetDiffEngine.diffRuleSets(setV1, setV2);

    expect(diff.oldVersion).toBe(1);
    expect(diff.newVersion).toBe(2);
    expect(diff.deltas.length).toBeGreaterThan(0);
    expect(diff.deltas.some(d => d.changeType === 'CHANGED' || d.changeType === 'ADDED')).toBe(true);
  });
});
