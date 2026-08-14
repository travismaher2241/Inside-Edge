import { describe, expect, it } from 'vitest';
import { extractPdfPages } from '../src/modules/competition-rules/ingestion/pdfTextExtractor';
import { extractCandidateRulesFromPages } from '../src/modules/competition-rules/extraction/ruleCandidateExtractor';
import { evaluateExtractionQuality } from '../src/modules/competition-rules/ingestion/extractionQuality';
import { detectScannedPages } from '../src/modules/competition-rules/ingestion/ocrDetector';

const SCANNED_OR_LOW_QUALITY_CONTENT = `
--- PAGE 1 ---
WDCA JUNIOR RULES 2026/27
SECTION 5: BOWLING SPELLS
Junior players under 16 have a spell limit of 5 overs maximum per spell. Refer to schedule A for age group breakdown.

--- PAGE 2 ---
[SCAN_IMG_001.JPG]
`;

describe('Competition Rules Extraction Quality & Ambiguity (C-08, C-09, C-14, C-16)', () => {
  it('C-08: flags ambiguous rules with explicit ambiguity tokens', () => {
    const pageResult = extractPdfPages(SCANNED_OR_LOW_QUALITY_CONTENT);
    const candidates = extractCandidateRulesFromPages('doc-scan-1', pageResult.pages);

    expect(candidates.length).toBeGreaterThan(0);
    const juniorRule = candidates.find(r => r.title.includes('Junior'));
    expect(juniorRule).toBeDefined();
    expect(juniorRule?.ambiguityFlags.length).toBeGreaterThan(0);
    expect(juniorRule?.ambiguityFlags).toContain('UNRESOLVED_CROSS_REFERENCE');
    expect(juniorRule?.status).toBe('Needs Review');
  });

  it('C-09: detects unreadable or scanned pages accurately', () => {
    const pageResult = extractPdfPages(SCANNED_OR_LOW_QUALITY_CONTENT);
    expect(pageResult.unreadablePages).toContain(2);
    expect(pageResult.readablePageCount).toBe(1);

    const quality = evaluateExtractionQuality(pageResult);
    expect(quality.qualityScore).toBeLessThan(100);

    const ocrInfo = detectScannedPages(pageResult.pages);
    expect(ocrInfo.scannedPageNumbers).toContain(2);
  });

  it('C-14: retains original source page and section metadata per candidate rule', () => {
    const pageResult = extractPdfPages(SCANNED_OR_LOW_QUALITY_CONTENT);
    const candidates = extractCandidateRulesFromPages('doc-scan-1', pageResult.pages);

    const rule = candidates[0];
    expect(rule.sourceDocumentId).toBe('doc-scan-1');
    expect(rule.sourcePage).toBe(1);
    expect(rule.sourceExcerpt).toBeDefined();
  });

  it('C-16: PDF extraction failure handles errors gracefully without crashing application state', () => {
    expect(() => {
      extractPdfPages('');
    }).not.toThrow();

    const emptyResult = extractPdfPages('');
    expect(emptyResult.pageCount).toBe(1);
    expect(emptyResult.readablePageCount).toBe(0);
  });
});
