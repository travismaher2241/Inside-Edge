import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PublicStationService } from '../src/modules/cricket/publicStationService';
import { CloudStorageEngine } from '../src/modules/cricket/cloudStorageEngine';
import { StorageEngine } from '../src/storage/db';
import { computeStationTokenHash } from '../src/modules/cricket/stationTokenCrypto';
import { makeStationSession } from './stationTestFixtures';

/**
 * A station note exists to reach the coach. Asserting that it landed in the leader's own
 * local storage proves nothing — that is exactly what happened while Firestore was
 * rejecting every one of these writes and the caller was still reporting success.
 */

vi.mock('../src/lib/firebase', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/firebase')>('../src/lib/firebase');
  return { ...actual, isFirebaseConfigured: true };
});

function tokenFrom(link: string): string {
  return link.split('/station/')[1];
}

async function submitNote(token: string) {
  return PublicStationService.submitStationObservation({
    token,
    playerId: 'p-1',
    noteText: 'Hit the seam consistently and troubled the top order',
    tags: ['Good execution'],
    authorLeaderName: 'Alex Turner'
  });
}

describe('station notes reaching the coach', () => {
  beforeEach(() => StorageEngine.saveClubSession(makeStationSession()));
  afterEach(() => vi.restoreAllMocks());

  it('sends the note to the coach, not just the leader phone', async () => {
    const sent: unknown[] = [];
    vi.spyOn(CloudStorageEngine, 'addObservation').mockImplementation(async obs => { sent.push(obs); });

    const link = await PublicStationService.getShareableStationLink('sess-station-test-1', 'res-4');
    const result = await submitNote(tokenFrom(link));

    expect(result.success).toBe(true);
    expect(result.deliveredToCoach).toBe(true);
    expect(sent).toHaveLength(1);
  });

  it('carries the station token hash so Firestore can authorise the write', async () => {
    let delivered: { stationTokenHash?: string; sessionId?: string; access?: { staffVisibility?: string }; source?: string } | undefined;
    vi.spyOn(CloudStorageEngine, 'addObservation').mockImplementation(async obs => { delivered = obs; });

    const link = await PublicStationService.getShareableStationLink('sess-station-test-1', 'res-4');
    const token = tokenFrom(link);
    await submitNote(token);

    // These four are precisely what the security rule checks. If any drifts, every
    // station note starts being rejected in production while the tests stay green.
    expect(delivered?.stationTokenHash).toBe(await computeStationTokenHash(token));
    expect(delivered?.sessionId).toBe('sess-station-test-1');
    expect(delivered?.source).toBe('training');
    expect(delivered?.access?.staffVisibility).toBe('all_coaches');
  });

  it('reports failure when the note does not reach the coach', async () => {
    vi.spyOn(CloudStorageEngine, 'addObservation')
      .mockRejectedValue(new Error('PERMISSION_DENIED: Missing or insufficient permissions.'));

    const link = await PublicStationService.getShareableStationLink('sess-station-test-1', 'res-4');
    const result = await submitNote(tokenFrom(link));

    expect(result.success).toBe(false);
    expect(result.deliveredToCoach).toBe(false);
    expect(result.error).toMatch(/not sent to your coach/i);
  });

  it('refuses a dead station link instead of banking the note locally', async () => {
    const marker = 'revoked-link-marker-note';
    const result = await PublicStationService.submitStationObservation({
      token: 'A'.repeat(43),
      playerId: 'p-1',
      noteText: marker,
      tags: ['Good execution'],
      authorLeaderName: 'Alex Turner'
    });

    expect(result.success).toBe(false);
    expect(result.deliveredToCoach).toBe(false);
    expect(result.error).toMatch(/no longer active/i);
    expect(StorageEngine.getObservations().some(o => o.textNote.includes(marker))).toBe(false);
  });
});
