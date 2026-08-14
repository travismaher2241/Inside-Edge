import type { ExtractedPageText } from '../documents/documentTypes';

export function detectScannedPages(pages: ExtractedPageText[]): {
  scannedPageNumbers: number[];
  recommendation: string;
} {
  const scannedPageNumbers = pages.filter(p => p.isScanned || !p.isReadable).map(p => p.pageNumber);

  let recommendation = 'Document contains native selectable text.';
  if (scannedPageNumbers.length > 0) {
    recommendation = `Pages ${scannedPageNumbers.join(', ')} appear scanned. You can continue with readable pages or add missing rules manually.`;
  }

  return {
    scannedPageNumbers,
    recommendation
  };
}
