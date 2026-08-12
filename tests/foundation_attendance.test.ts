import { describe, it, expect, beforeEach } from 'vitest';
import { derivePublicToken, computeTokenHash } from '../src/modules/cricket/rsvpTokenCrypto';
import { RsvpInvitationService } from '../src/modules/cricket/rsvpInvitationService';
import { PublicRsvpService } from '../src/modules/cricket/publicRsvpService';
import { IndexedDbJournal } from '../src/storage/indexedDbJournal';

describe('Foundation & Attendance Upgrade Specification Tests', () => {
  it('1. HMAC Public Token Derivation & SHA256 Hashing', async () => {
    const tokenV1 = await derivePublicToken('sess-101', 'play-1', 1);
    const hashV1 = await computeTokenHash(tokenV1);

    expect(tokenV1).toBeTruthy();
    expect(hashV1).toBeTruthy();
    expect(tokenV1).not.toEqual(hashV1);

    // Hashing token again produces deterministic hash
    const reHash = await computeTokenHash(tokenV1);
    expect(reHash).toEqual(hashV1);
  });

  it('2. Token Revocation & Regeneration Semantics', async () => {
    const linkV1 = await RsvpInvitationService.getShareableLink('sess-102', 'play-2');
    expect(linkV1).toContain('/rsvp/');

    // Revoke link
    await RsvpInvitationService.revokePlayerToken('sess-102', 'play-2');
    await expect(RsvpInvitationService.getShareableLink('sess-102', 'play-2')).rejects.toThrow('revoked');

    // Regenerate link
    const linkV2 = await RsvpInvitationService.regeneratePlayerToken('sess-102', 'play-2');
    expect(linkV2).toBeTruthy();
    expect(linkV2).not.toEqual(linkV1);
  });

  it('3. Personal Link Isolation & Group WhatsApp Notice', () => {
    const session: any = {
      id: 'sess-103',
      date: '2026-08-20',
      startTime: '17:30',
      finishTime: '19:00',
      sessionObjectives: ['Spin batting']
    };
    const team: any = { name: 'Under 14s' };

    const groupNotice = RsvpInvitationService.getGenericGroupAnnouncement(session, team);
    expect(groupNotice).toContain('Under 14s Training');
    expect(groupNotice).not.toContain('/rsvp/'); // MUST NOT contain personal links
  });

  it('4. Transactional baseRevision Conflict Handling & Idempotency', async () => {
    const { StorageEngine } = await import('../src/storage/db');
    StorageEngine.init();
    StorageEngine.saveClubSession({
      id: 'sess-test-4',
      clubId: 'c1',
      title: 'Test Session',
      date: '2026-08-20',
      startTime: '18:00',
      finishTime: '19:30',
      venueFacilityId: 'f1',
      includedTeamIds: ['ct-1'],
      availableResourceIds: ['r1'],
      expectedPlayerIds: ['play-3'],
      confirmedAttendingPlayerIds: [],
      availabilityRecords: {},
      staffPlayerAssignments: {},
      sessionObjectives: [],
      rotationDurationMinutes: 12,
      captainCoachAssignments: [],
      rotationPlan: [],
      manualLocks: {},
      fairnessSettings: { targetEqualBattingMinutes: 20 },
      blocks: [],
      activeBlockIndex: 0,
      activeRotationIndex: 0,
      status: 'planned',
      warnings: [],
      planningVersion: 1,
      rsvps: {},
      liveAttendance: {}
    });

    const shareLink = await RsvpInvitationService.getShareableLink('sess-test-4', 'play-3');
    const validToken = shareLink.split('/rsvp/')[1];

    const payload = {
      playerId: 'play-3',
      status: 'confirmed' as const,
      baseRevision: 0,
      submissionId: 'sub-test-123'
    };

    const res1 = await PublicRsvpService.submitPlayerRsvp(validToken, payload);
    expect(res1.success).toBe(true);

    // Idempotent retry with same submissionId succeeds
    const res2 = await PublicRsvpService.submitPlayerRsvp(validToken, payload);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('already processed');

    // Stale baseRevision rejection test
    const stalePayload = {
      playerId: 'play-3',
      status: 'unavailable' as const,
      baseRevision: 0, // Server is now at revision 1
      submissionId: 'sub-test-456'
    };
    const res3 = await PublicRsvpService.submitPlayerRsvp(validToken, stalePayload);
    expect(res3.success).toBe(false);
    expect(res3.status).toBe('conflict');

    // An unregistered/garbage token must be rejected outright
    const res4 = await PublicRsvpService.submitPlayerRsvp('not-a-real-token', { ...payload, submissionId: 'sub-test-789' });
    expect(res4.success).toBe(false);

    // A token that resolves to a different player must be rejected
    const otherPlayerLink = await RsvpInvitationService.getShareableLink('sess-test-4', 'play-9');
    const otherPlayerToken = otherPlayerLink.split('/rsvp/')[1];
    const res5 = await PublicRsvpService.submitPlayerRsvp(otherPlayerToken, { ...payload, submissionId: 'sub-test-012' });
    expect(res5.success).toBe(false);
  });

  it('5. IndexedDB Storage & Operation Log Journal', async () => {
    const testLog: any = {
      operationId: 'op-999',
      type: 'PLAYER_MARKED_ABSENT',
      playerId: 'play-4',
      occurredAt: new Date().toISOString(),
      deviceId: 'dev-test'
    };

    await IndexedDbJournal.appendOperation('sess-104', testLog);
    const logs = await IndexedDbJournal.getOperationsForSession('sess-104');
    expect(logs.some(l => l.operationId === 'op-999')).toBe(true);
  });
});
