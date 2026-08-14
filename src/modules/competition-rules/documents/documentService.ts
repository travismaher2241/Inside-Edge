import type { CompetitionDocument, DocumentType } from './documentTypes';

const DOCUMENT_STORAGE_KEY = 'inside_edge_competition_documents_v1';

let inMemoryDocuments: CompetitionDocument[] = [];

function loadDocuments(): CompetitionDocument[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(DOCUMENT_STORAGE_KEY);
      if (data) return JSON.parse(data) as CompetitionDocument[];
    } catch {
      // Fallback
    }
  }
  return inMemoryDocuments;
}

function saveDocuments(docs: CompetitionDocument[]): void {
  inMemoryDocuments = [...docs];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(docs));
    } catch (err) {
      console.error('Failed to save competition documents:', err);
    }
  }
}

/**
 * Computes a simple deterministic checksum string for file deduplication check.
 */
export function generateSimpleChecksum(content: string | ArrayBuffer): string {
  let hash = 0;
  const str = typeof content === 'string' ? content : new Uint8Array(content).join('');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `chk_${Math.abs(hash).toString(16)}`;
}

export const DocumentService = {
  createDocument(params: {
    originalFileName: string;
    displayName?: string;
    mimeType: string;
    uploadedBy: string;
    documentType: DocumentType;
    clubId?: string;
    seasonHint?: string;
    competitionHint?: string;
    gradeHint?: string;
    content?: string;
  }): { document: CompetitionDocument; isDuplicate: boolean; existingDocument?: CompetitionDocument } {
    const docs = loadDocuments();
    const checksum = params.content ? generateSimpleChecksum(params.content) : undefined;

    if (checksum) {
      const existing = docs.find(d => d.checksum === checksum);
      if (existing) {
        return { document: existing, isDuplicate: true, existingDocument: existing };
      }
    }

    const newDoc: CompetitionDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      clubId: params.clubId,
      originalFileName: params.originalFileName,
      displayName: params.displayName || params.originalFileName,
      mimeType: params.mimeType,
      storageReference: `storage/docs/${Date.now()}_${params.originalFileName}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: params.uploadedBy,
      documentType: params.documentType,
      seasonHint: params.seasonHint,
      competitionHint: params.competitionHint,
      gradeHint: params.gradeHint,
      extractionStatus: 'pending',
      extractionWarnings: [],
      checksum
    };

    docs.push(newDoc);
    saveDocuments(docs);

    return { document: newDoc, isDuplicate: false };
  },

  updateDocument(id: string, updates: Partial<CompetitionDocument>): CompetitionDocument | undefined {
    const docs = loadDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) return undefined;

    docs[index] = { ...docs[index], ...updates };
    saveDocuments(docs);
    return docs[index];
  },

  getDocument(id: string): CompetitionDocument | undefined {
    return loadDocuments().find(d => d.id === id);
  },

  getAllDocuments(): CompetitionDocument[] {
    return loadDocuments();
  },

  clearAll(): void {
    inMemoryDocuments = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DOCUMENT_STORAGE_KEY);
    }
  }
};
