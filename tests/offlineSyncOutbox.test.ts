import { describe, expect, it, beforeEach } from 'vitest';
import { IndexedDbJournal } from '../src/storage/indexedDbJournal';
import { SyncOutboxEngine } from '../src/modules/cricket/syncOutboxEngine';
import type { Observation } from '../src/types/cricket';

describe('Offline Live Training Sync Outbox Engine (B-09, B-10, DEF-01 Resolution)', () => {
  const mockObservation: Observation = {
    id: `obs_test_${Date.now()}`,
    operationId: `op_test_${Date.now()}`,
    playerId: 'p-1',
    source: 'training',
    sessionId: 'sess-offline-1',
    tags: ['Spin', 'Footwork'],
    textNote: 'Great soft-hand placement against off-spin',
    linkedFocusIds: [],
    access: { staffVisibility: 'all_staff', shareWithPlayerGuardian: true },
    createdAt: new Date().toISOString(),
    createdByUserId: 'coach-1',
    baseRevision: 0,
    revision: 1,
    syncStatus: 'pending'
  };

  it('queues an observation operation offline in IndexedDB journal (B-09)', async () => {
    await IndexedDbJournal.appendOperation(mockObservation.sessionId!, {
      operationId: mockObservation.operationId!,
      type: 'OBSERVATION_CREATED',
      playerId: mockObservation.playerId,
      details: mockObservation,
      occurredAt: new Date().toISOString(),
      deviceId: 'local_device'
    });

    const pendingLogs = await IndexedDbJournal.getPendingOperationLogs();
    expect(pendingLogs.length).toBeGreaterThan(0);

    const matchLog = pendingLogs.find(op => op.operationId === mockObservation.operationId);
    expect(matchLog).toBeDefined();
    expect(matchLog?.type).toBe('OBSERVATION_CREATED');
  });

  it('processes pending offline operations on reconnect without duplication (B-09, B-10)', async () => {
    const result = await SyncOutboxEngine.processPendingOperations();
    expect(result.totalProcessed).toBeGreaterThan(0);
    expect(result.syncedCount).toBeGreaterThan(0);

    // Verify operation is now marked SYNCED
    const pendingLogsAfter = await IndexedDbJournal.getPendingOperationLogs();
    const remainingMatchLog = pendingLogsAfter.find(op => op.operationId === mockObservation.operationId);
    expect(remainingMatchLog).toBeUndefined(); // Should no longer be pending
  });

  it('replaying the sync process twice is idempotent and does not re-process synced items (B-10)', async () => {
    const secondPass = await SyncOutboxEngine.processPendingOperations();
    expect(secondPass.totalProcessed).toBe(0);
    expect(secondPass.syncedCount).toBe(0);
  });
});
