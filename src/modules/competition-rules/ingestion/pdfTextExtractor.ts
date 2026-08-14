import type { ExtractedPageText } from '../documents/documentTypes';

export interface PdfExtractionResult {
  pageCount: number;
  readablePageCount: number;
  unreadablePages: number[];
  scannedPdfDetected: boolean;
  pages: ExtractedPageText[];
  extractionWarnings: string[];
}

/**
 * Simulates / performs page-by-page text extraction from a PDF document string or buffer.
 * Preserves page boundaries and identifies heading levels.
 */
export function extractPdfPages(rawContent: string): PdfExtractionResult {
  const warnings: string[] = [];
  const pages: ExtractedPageText[] = [];

  // Split content by explicit page markers or double line boundaries if page marker present
  let rawPages = rawContent.split(/--- PAGE \d+ ---|\[PAGE \d+\]/i).map(p => p.trim()).filter(Boolean);
  if (rawPages.length === 0) {
    rawPages = [rawContent.trim()];
  }

  let scannedCount = 0;
  const unreadablePages: number[] = [];

  rawPages.forEach((pageText, index) => {
    const pageNum = index + 1;
    const cleanText = pageText.trim();
    
    // Estimate text density & readability
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const isReadable = wordCount >= 5;
    const isScanned = wordCount < 5 && cleanText.length > 0;

    if (!isReadable) {
      unreadablePages.push(pageNum);
      warnings.push(`Page ${pageNum} has very low readable text density (${wordCount} words).`);
    }

    if (isScanned) {
      scannedCount++;
    }

    // Extract headings (lines ending with colon, uppercase lines, or section tags)
    const lines = cleanText.split('\n');
    const detectedHeadings = lines
      .map(l => l.trim())
      .filter(l => (l.length > 3 && l.length < 60 && (l === l.toUpperCase() || l.endsWith(':') || /^SECTION \d+/i.test(l))));

    pages.push({
      pageNumber: pageNum,
      text: cleanText,
      isReadable,
      isScanned,
      detectedHeadings
    });
  });

  const scannedPdfDetected = scannedCount > 0 || unreadablePages.length > rawPages.length / 2;

  if (scannedPdfDetected) {
    warnings.push('This document appears to contain scanned image pages with limited selectable text.');
  }

  return {
    pageCount: rawPages.length,
    readablePageCount: rawPages.length - unreadablePages.length,
    unreadablePages,
    scannedPdfDetected,
    pages,
    extractionWarnings: warnings
  };
}
