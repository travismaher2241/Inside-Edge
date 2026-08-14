import type { PdfExtractionResult } from './pdfTextExtractor';

export function evaluateExtractionQuality(result: PdfExtractionResult): {
  qualityScore: number; // 0 to 100
  rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_REVIEW' | 'POOR';
  summary: string;
} {
  if (result.pageCount === 0) {
    return { qualityScore: 0, rating: 'POOR', summary: 'No text extracted from file.' };
  }

  const readableRatio = result.readablePageCount / result.pageCount;
  const qualityScore = Math.round(readableRatio * 100);

  if (result.scannedPdfDetected) {
    return {
      qualityScore: Math.min(qualityScore, 40),
      rating: 'POOR',
      summary: 'Scanned PDF detected with low readable text. Manual review or re-scan required.'
    };
  }

  if (qualityScore >= 90) {
    return { qualityScore, rating: 'EXCELLENT', summary: 'High text readability across all pages.' };
  } else if (qualityScore >= 70) {
    return { qualityScore, rating: 'GOOD', summary: 'Good readability with a few unreadable pages.' };
  } else {
    return { qualityScore, rating: 'NEEDS_REVIEW', summary: 'Multiple unreadable pages detected; manual verification recommended.' };
  }
}
