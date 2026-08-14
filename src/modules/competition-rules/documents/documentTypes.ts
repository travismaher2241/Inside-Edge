export type DocumentType =
  | 'playing_conditions'
  | 'bylaws'
  | 'grade_appendix'
  | 'junior_rules'
  | 'policy'
  | 'amendment'
  | 'finals_conditions'
  | 'other';

export type DocumentExtractionStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'partial'
  | 'failed';

export interface CompetitionDocument {
  id: string;

  clubId?: string;
  organisationId?: string;

  originalFileName: string;
  displayName: string;

  mimeType: string;
  storageReference: string;

  uploadedAt: string;
  uploadedBy: string;

  documentType: DocumentType;

  seasonHint?: string;
  competitionHint?: string;
  gradeHint?: string;

  extractionStatus: DocumentExtractionStatus;

  pageCount?: number;
  readablePageCount?: number;
  unreadablePages?: number[];

  scannedPdfDetected?: boolean;

  extractionWarnings: string[];

  checksum?: string;

  supersedesDocumentId?: string;
}

export interface ExtractedPageText {
  pageNumber: number;
  text: string;
  isReadable: boolean;
  isScanned: boolean;
  detectedHeadings: string[];
}
