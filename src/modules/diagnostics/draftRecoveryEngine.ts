export type EditableDraftType = 'training_planner' | 'match_review' | 'match_prep' | 'rules_review';

export interface UnsavedDraft {
  draftId: string;
  type: EditableDraftType;
  entityId: string;
  title: string;
  baseRevision: number;
  lastModified: string;
  payload: Record<string, unknown>;
}

const DRAFT_STORAGE_KEY = 'inside_edge_editable_drafts_v2';
let inMemoryDrafts: UnsavedDraft[] = [];

function loadDrafts(): UnsavedDraft[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (data) return JSON.parse(data) as UnsavedDraft[];
    } catch {
      // Fallback
    }
  }
  return inMemoryDrafts;
}

function saveDrafts(drafts: UnsavedDraft[]): void {
  inMemoryDrafts = [...drafts];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch (err) {
      console.error('Failed to save editable draft:', err);
    }
  }
}

export const DraftRecoveryEngine = {
  saveDraft(params: {
    type: EditableDraftType;
    entityId: string;
    title: string;
    baseRevision: number;
    payload: Record<string, unknown>;
  }): UnsavedDraft {
    const drafts = loadDrafts();
    const existingIndex = drafts.findIndex(d => d.type === params.type && d.entityId === params.entityId);

    const draft: UnsavedDraft = {
      draftId: `draft_${params.type}_${params.entityId}`,
      type: params.type,
      entityId: params.entityId,
      title: params.title,
      baseRevision: params.baseRevision,
      lastModified: new Date().toISOString(),
      payload: params.payload
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }

    saveDrafts(drafts);
    return draft;
  },

  getDraft(type: EditableDraftType, entityId?: string): UnsavedDraft | undefined {
    const drafts = loadDrafts();
    if (entityId) {
      return drafts.find(d => d.type === type && d.entityId === entityId);
    }
    return drafts.find(d => d.type === type);
  },

  shouldRestoreDraft(type: EditableDraftType, entityId: string, currentServerRevision: number): boolean {
    const draft = DraftRecoveryEngine.getDraft(type, entityId);
    if (!draft) return false;
    // Do not restore draft if server revision has moved beyond draft baseRevision
    return draft.baseRevision >= currentServerRevision;
  },

  getAllDrafts(): UnsavedDraft[] {
    return loadDrafts();
  },

  discardDraft(type: EditableDraftType, entityId?: string): void {
    const drafts = loadDrafts().filter(d => {
      if (entityId) return !(d.type === type && d.entityId === entityId);
      return d.type !== type;
    });
    saveDrafts(drafts);
  },

  clearAll(): void {
    inMemoryDrafts = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }
};
