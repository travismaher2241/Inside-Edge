import { beforeEach, describe, expect, it } from 'vitest';
import { PublicStationService } from '../src/modules/cricket/publicStationService';
import { SEED_PLAYERS, SEED_TRAINING_RESOURCES } from '../src/modules/cricket/seedData';
import { StorageEngine } from '../src/storage/db';
import { makeStationSession } from './stationTestFixtures';

function tokenFrom(link: string): string {
  return link.split('/station/')[1];
}

describe('public station delegation service', () => {
  beforeEach(() => StorageEngine.saveClubSession(makeStationSession()));

  it('creates an invitation and resolves only its station-scoped projection', async () => {
    const link = await PublicStationService.getShareableStationLink('sess-station-test-1', 'res-4');
    const data = await PublicStationService.resolveStationData(tokenFrom(link));

    expect(link).toMatch(/^https?:\/\/.*\/station\/[A-Za-z0-9_-]{43}$/);
    expect(data?.sessionId).toBe('sess-station-test-1');
    expect(data?.resource.id).toBe('res-4');
    expect(data?.currentAssignment.batterPlayerIds).toEqual(['p-1', 'p-2']);
    expect(data?.allBlocks.every(block => block.resourceAssignments.every(a => a.resourceId === 'res-4'))).toBe(true);
    expect(data?.allPlayers.every(player => ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'].includes(player.id))).toBe(true);
  });

  it('rejects forged tokens and resources outside the session', async () => {
    expect(await PublicStationService.resolveStationData('A'.repeat(43))).toBeNull();
    await expect(PublicStationService.getShareableStationLink('sess-station-test-1', 'res-1'))
      .rejects.toThrow('not available');
  });

  it('synchronizes live block and timer changes into an existing invitation', async () => {
    const session = makeStationSession();
    const link = await PublicStationService.getShareableStationLink(session.id, 'res-4');
    const updated = makeStationSession({
      status: 'live',
      currentLiveState: {
        rotationStartedAt: new Date(Date.now() - 30_000).toISOString(),
        rotationDurationSeconds: 720,
        pausedAt: null,
        accumulatedPausedSeconds: 0,
        isPaused: false,
        activeBlockIndex: 0,
        activeRotationIndex: 0,
        updatedAt: new Date().toISOString()
      }
    });
    await PublicStationService.syncSessionStations({ session: updated, players: SEED_PLAYERS, resources: SEED_TRAINING_RESOURCES });
    const data = await PublicStationService.resolveStationData(tokenFrom(link));
    expect(data?.sessionStatus).toBe('live');
    expect(data?.liveTimerState?.rotationDurationSeconds).toBe(720);
  });

  it('invalidates existing station links when a session is completed', async () => {
    const session = makeStationSession();
    const link = await PublicStationService.getShareableStationLink(session.id, 'res-4');
    await PublicStationService.syncSessionStations({
      session: makeStationSession({ status: 'completed' }),
      players: SEED_PLAYERS,
      resources: SEED_TRAINING_RESOURCES
    });
    expect(await PublicStationService.resolveStationData(tokenFrom(link))).toBeNull();
  });

  it('formats a complete WhatsApp delegation brief', () => {
    const brief = PublicStationService.getStationWhatsAppBrief({
      clubName: 'Richmond City CC', sessionTitle: 'Thursday Training', date: '2026-10-15',
      time: '18:00–19:30', resourceName: 'Centre Wicket', leaderName: 'Alex Turner',
      objectives: ['Death overs'], scenarioDescription: 'Chase 24 off 18 balls',
      shareableLink: 'https://insideedge.app/station/token'
    });
    expect(brief).toContain('Richmond City CC');
    expect(brief).toContain('Alex Turner');
    expect(brief).toContain('Chase 24 off 18 balls');
  });
});
