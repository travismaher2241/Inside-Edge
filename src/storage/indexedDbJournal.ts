// IndexedDB Resilient Storage & Operation Journal Engine for Inside Edge
// Provides async local-first persistence for Live Sessions, Operation Logs, Undo Stacks, and Outbox Queues.

import type { ClubTrainingSession, LiveOperationLog, PlayerRsvpSubmissionPayload } from '../types/cricket';

const DB_NAME = 'inside_edge_idb_v1';
const DB_VERSION = 1;

const STORES = {
  LIVE_SESSIONS: 'live_sessions',
  OPERATION_LOGS: 'operation_logs',
  UNDO_STACKS: 'undo_stacks',
  RSVP_OUTBOX: 'rsvp_outbox'
};

export interface OutboxRsvpItem {
  submissionId: string;
  token: string;
  payload: PlayerRsvpSubmissionPayload;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  lastAttemptAt?: string;
  error?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.LIVE_SESSIONS)) {
        db.createObjectStore(STORES.LIVE_SESSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.OPERATION_LOGS)) {
        const store = db.createObjectStore(STORES.OPERATION_LOGS, { keyPath: 'operationId' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.UNDO_STACKS)) {
        db.createObjectStore(STORES.UNDO_STACKS, { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains(STORES.RSVP_OUTBOX)) {
        db.createObjectStore(STORES.RSVP_OUTBOX, { keyPath: 'submissionId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Memory fallback store for environments without IndexedDB
const memoryDb: {
  liveSessions: Map<string, ClubTrainingSession>;
  operationLogs: Map<string, LiveOperationLog & { sessionId: string }>;
  undoStacks: Map<string, ClubTrainingSession[]>;
  rsvpOutbox: Map<string, OutboxRsvpItem>;
} = {
  liveSessions: new Map(),
  operationLogs: new Map(),
  undoStacks: new Map(),
  rsvpOutbox: new Map()
};

export const IndexedDbJournal = {
  // Live Session Persistence
  saveLiveSession: async (session: ClubTrainingSession): Promise<void> => {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.LIVE_SESSIONS, 'readwrite');
        tx.objectStore(STORES.LIVE_SESSIONS).put(session);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryDb.liveSessions.set(session.id, session);
    }
  },

  getLiveSession: async (sessionId: string): Promise<ClubTrainingSession | undefined> => {
    try {
      const db = await openDatabase();
      return await new Promise<ClubTrainingSession | undefined>((resolve, reject) => {
        const tx = db.transaction(STORES.LIVE_SESSIONS, 'readonly');
        const req = tx.objectStore(STORES.LIVE_SESSIONS).get(sessionId);
        req.onsuccess = () => resolve(req.result as ClubTrainingSession | undefined);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return memoryDb.liveSessions.get(sessionId);
    }
  },

  // Operation Journal Logging
  appendOperation: async (sessionId: string, log: LiveOperationLog): Promise<void> => {
    const entry = { ...log, sessionId };
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.OPERATION_LOGS, 'readwrite');
        tx.objectStore(STORES.OPERATION_LOGS).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryDb.operationLogs.set(log.operationId, entry);
    }
  },

  getOperationsForSession: async (sessionId: string): Promise<LiveOperationLog[]> => {
    try {
      const db = await openDatabase();
      return await new Promise<LiveOperationLog[]>((resolve, reject) => {
        const tx = db.transaction(STORES.OPERATION_LOGS, 'readonly');
        const idx = tx.objectStore(STORES.OPERATION_LOGS).index('sessionId');
        const req = idx.getAll(sessionId);
        req.onsuccess = () => resolve((req.result || []) as LiveOperationLog[]);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(memoryDb.operationLogs.values()).filter(item => item.sessionId === sessionId);
    }
  },

  // Undo Stack Persistence
  saveUndoStack: async (sessionId: string, stack: ClubTrainingSession[]): Promise<void> => {
    const limitedStack = stack.slice(-20); // Keep last 20 snapshots
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.UNDO_STACKS, 'readwrite');
        tx.objectStore(STORES.UNDO_STACKS).put({ sessionId, stack: limitedStack });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryDb.undoStacks.set(sessionId, limitedStack);
    }
  },

  getUndoStack: async (sessionId: string): Promise<ClubTrainingSession[]> => {
    try {
      const db = await openDatabase();
      return await new Promise<ClubTrainingSession[]>((resolve, reject) => {
        const tx = db.transaction(STORES.UNDO_STACKS, 'readonly');
        const req = tx.objectStore(STORES.UNDO_STACKS).get(sessionId);
        req.onsuccess = () => resolve(req.result?.stack || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return memoryDb.undoStacks.get(sessionId) || [];
    }
  },

  // RSVP Offline Outbox Queue
  queueRsvpSubmission: async (item: OutboxRsvpItem): Promise<void> => {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.RSVP_OUTBOX, 'readwrite');
        tx.objectStore(STORES.RSVP_OUTBOX).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryDb.rsvpOutbox.set(item.submissionId, item);
    }
  },

  getPendingRsvpOutbox: async (): Promise<OutboxRsvpItem[]> => {
    try {
      const db = await openDatabase();
      return await new Promise<OutboxRsvpItem[]>((resolve, reject) => {
        const tx = db.transaction(STORES.RSVP_OUTBOX, 'readonly');
        const req = tx.objectStore(STORES.RSVP_OUTBOX).getAll();
        req.onsuccess = () => resolve((req.result || []).filter((i: OutboxRsvpItem) => i.status === 'pending' || i.status === 'failed'));
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(memoryDb.rsvpOutbox.values()).filter(i => i.status === 'pending' || i.status === 'failed');
    }
  },

  removeRsvpOutboxItem: async (submissionId: string): Promise<void> => {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.RSVP_OUTBOX, 'readwrite');
        tx.objectStore(STORES.RSVP_OUTBOX).delete(submissionId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      memoryDb.rsvpOutbox.delete(submissionId);
    }
  }
};
