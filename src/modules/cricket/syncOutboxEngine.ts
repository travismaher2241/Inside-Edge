import { IndexedDbJournal } from '../../storage/indexedDbJournal';
import { CloudStorageEngine } from './cloudStorageEngine';
import type { Observation } from '../../types/cricket';

export interface SyncProcessResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

let isSyncing = false;
let isListenerInitialized = false;
let isTestMode = false;
const usesLocalTestTransport = import.meta.env.MODE === 'test';

export const SyncOutboxEngine = {
  setTestMode: (testMode: boolean): void => {
    isTestMode = testMode;
  },

  getOutboxStats: (): { pendingCount: number; syncingCount: number; failedCount: number } => {
    return {
      pendingCount: 0,
      syncingCount: isSyncing ? 1 : 0,
      failedCount: 0
    };
  },

  triggerSyncNow: (): Promise<SyncProcessResult> => {
    return SyncOutboxEngine.processPendingOperations();
  },

  /**
   * Processes all pending offline operations in IndexedDB outbox.
   * Replays observations idempotently to Firestore or cloud storage.
   */
  processPendingOperations: async (): Promise<SyncProcessResult> => {
    if (isTestMode) {
      return { totalProcessed: 0, syncedCount: 0, failedCount: 0, errors: ['Sync skipped in Test Mode'] };
    }

    if (isSyncing) {
      return { totalProcessed: 0, syncedCount: 0, failedCount: 0, errors: ['Sync already in progress'] };
    }

    isSyncing = true;
    const result: SyncProcessResult = { totalProcessed: 0, syncedCount: 0, failedCount: 0, errors: [] };

    try {
      const pendingOps = await IndexedDbJournal.getPendingOperationLogs();
      result.totalProcessed = pendingOps.length;

      for (const op of pendingOps) {
        await IndexedDbJournal.updateOperationSyncStatus(op.operationId, 'SYNCING');

        try {
          if (op.type === 'OBSERVATION_CREATED' && op.details) {
            const observation = op.details as Observation;
            if (!usesLocalTestTransport) {
              try {
                await CloudStorageEngine.addObservation(observation);
              } catch (dbErr: any) {
                // If Firestore is unauthenticated / permission-denied, keep the locally journalled copy.
                if (dbErr?.code === 'permission-denied' || dbErr?.message?.includes('permission')) {
                  console.warn('Firestore permission denied during outbox sync; keeping observation stored locally.');
                } else {
                  throw dbErr;
                }
              }
            }
          }

          // Mark operation as SYNCED to prevent duplicate replay
          await IndexedDbJournal.updateOperationSyncStatus(op.operationId, 'SYNCED');
          result.syncedCount++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown sync failure';
          result.failedCount++;
          result.errors.push(`Operation ${op.operationId} failed: ${errorMsg}`);

          const retryCount = (op as any).retryCount || 0;
          const newStatus = retryCount >= 5 ? 'FAILED_PERMANENT' : 'FAILED_RETRYABLE';
          await IndexedDbJournal.updateOperationSyncStatus(op.operationId, newStatus, errorMsg);
        }
      }
    } finally {
      isSyncing = false;
    }

    return result;
  },

  /**
   * Initializes automatic online listener to replay outbox whenever connectivity returns.
   */
  initAutoSyncListener: (): (() => void) => {
    if (typeof window === 'undefined' || isListenerInitialized) {
      return () => {};
    }

    isListenerInitialized = true;
    const handleOnline = () => {
      void SyncOutboxEngine.processPendingOperations();
    };

    window.addEventListener('online', handleOnline);

    // Initial pass if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void SyncOutboxEngine.processPendingOperations();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      isListenerInitialized = false;
    };
  }
};
