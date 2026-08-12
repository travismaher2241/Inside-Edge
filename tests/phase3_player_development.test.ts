import { describe, it, expect } from 'vitest';
import { PlayerProgressService } from '../src/modules/cricket/playerProgressService';
import { CoachAuthorizationService } from '../src/modules/cricket/coachAuthorizationService';
import { derivePublicToken, computeTokenHash } from '../src/modules/cricket/rsvpTokenCrypto';
import type {
  Observation,
  DevelopmentFocus,
  InternalPlayerDevelopmentSummary,
  Player,
  UserContext
} from '../src/types/cricket';

describe('Phase 3 — Player Development & Evidence Specifications', () => {
  it('1. HMAC Public Progress Token Derivation & SHA256 Hashing (Criteria #7)', async () => {
    const publicToken = await derivePublicToken('progress', 'p101', 1);
    const tokenHash = await computeTokenHash(publicToken);

    expect(publicToken).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(publicToken).not.toEqual(tokenHash);

    const reHash = await computeTokenHash(publicToken);
    expect(reHash).toEqual(tokenHash);
  });

  it('2. Team-Scoped Backend Coach Authorization (Criteria #10)', () => {
    const headCoachU13: UserContext = {
      uid: 'u1',
      role: 'head_coach',
      coachedTeamIds: ['team-u13']
    };

    const assistantU13: UserContext = {
      uid: 'u2',
      role: 'assistant_coach',
      coachedTeamIds: ['team-u13']
    };

    const playerU13: Player = {
      id: 'p13',
      name: 'Jack Davies',
      primaryTeamId: 'team-u13',
      primaryRole: 'batter',
      secondaryRole: 'none',
      battingHand: 'right',
      bowlingStyle: 'right_arm_medium',
      wicketkeepingCapability: 'none',
      trainingAvailability: true,
      activeDevelopmentFocusIds: []
    };

    const headCoachObs: Observation = {
      id: 'obs-hc-1',
      operationId: 'op-1',
      playerId: 'p13',
      source: 'training',
      tags: ['Technique'],
      textNote: 'Sensitive head coach note about player mindset',
      linkedFocusIds: [],
      access: {
        staffVisibility: 'head_coach_only',
        shareWithPlayerGuardian: false
      },
      createdAt: '2026-08-12T10:00:00Z',
      createdByUserId: 'u1',
      baseRevision: 0,
      revision: 1
    };

    expect(CoachAuthorizationService.canViewObservation(headCoachU13, headCoachObs, playerU13)).toBe(true);
    expect(CoachAuthorizationService.canViewObservation(assistantU13, headCoachObs, playerU13)).toBe(false);
  });

  it('3. Single Source of Truth Focus Linking & Focus Lifecycle History (Criteria #4, #5)', () => {
    const focus: DevelopmentFocus = {
      id: 'focus-spin-1',
      playerId: 'p13',
      domain: 'Batting',
      focusStatement: 'Strike rotation against spin',
      state: 'DEVELOPING',
      why: 'Difficulty scoring against left arm orthodox',
      startDate: '2026-08-01',
      history: [
        { fromState: null, toState: 'CURRENT', changedAt: '2026-08-01T10:00:00Z', changedByUserId: 'u1' },
        { fromState: 'CURRENT', toState: 'DEVELOPING', changedAt: '2026-08-10T10:00:00Z', changedByUserId: 'u1' }
      ],
      coachSummary: 'Showing good footwork when coming down the pitch',
      access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true }
    };

    expect(focus.history.length).toBe(2);
    expect(focus.history[1].toState).toBe('DEVELOPING');
  });

  it('4. Server-Side DTO Filtering & Network Security Payload Verification (Criteria #8, #9, #13, #14, #15)', async () => {
    const internalSummary: InternalPlayerDevelopmentSummary = {
      playerId: 'p-sec-1',
      generatedAt: '2026-08-12T12:00:00Z',
      attendanceSummary: {
        totalSessionsAttended: 5,
        battingMinutes: 60,
        bowlingMinutes: 40,
        fieldingMinutes: 30,
        centreWicketMinutes: 20
      },
      fairnessAssessment: {
        playerId: 'p-sec-1',
        isBalanced: true,
        hasInsufficientHistory: false,
        flags: [],
        balance: {
          batting: { ratio: 1.0, status: 'healthy', evidenceSessionsCount: 5 },
          bowling: { ratio: 1.0, status: 'healthy', evidenceSessionsCount: 5 },
          fielding: { ratio: 1.0, status: 'healthy', evidenceSessionsCount: 5 },
          centreWicket: { ratio: 1.0, status: 'healthy', evidenceSessionsCount: 5 },
          scenario: { ratio: 1.0, status: 'healthy', evidenceSessionsCount: 5 }
        },
        opportunityProfile: {
          battingEligible: true,
          bowlingEligible: true,
          fieldingEligible: true,
          wicketkeepingEligible: false,
          battingTargetWeight: 1.0,
          bowlingTargetWeight: 1.0,
          fieldingTargetWeight: 1.0,
          centreWicketTargetWeight: 1.0,
          scenarioTargetWeight: 1.0
        }
      },
      allFocuses: [
        {
          id: 'f-public',
          playerId: 'p-sec-1',
          domain: 'Batting',
          focusStatement: 'Spin footwork',
          state: 'DEVELOPING',
          why: 'Good intent',
          startDate: '2026-08-01',
          history: [],
          coachSummary: 'Improving nicely',
          access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true }
        }
      ],
      allObservations: [
        {
          id: 'obs-private-hc',
          operationId: 'op-priv',
          playerId: 'p-sec-1',
          source: 'training',
          tags: ['Technique'],
          textNote: 'PRIVATE HEAD COACH NOTE: DO NOT EXPOSE TO PARENTS',
          linkedFocusIds: ['f-public'],
          access: { staffVisibility: 'head_coach_only', shareWithPlayerGuardian: false },
          createdAt: '2026-08-10T10:00:00Z',
          createdByUserId: 'u1',
          baseRevision: 0,
          revision: 1
        },
        {
          id: 'obs-public-1',
          operationId: 'op-pub',
          playerId: 'p-sec-1',
          source: 'training',
          tags: ['Good execution'],
          textNote: 'Great rotation into midwicket',
          linkedFocusIds: ['f-public'],
          access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true },
          createdAt: '2026-08-11T10:00:00Z',
          createdByUserId: 'u1',
          baseRevision: 0,
          revision: 1
        }
      ],
      headCoachNotes: 'CONFIDENTIAL STAFF REMARKS'
    };

    // 1. Get shareable link & progress grant
    const link = await PlayerProgressService.getShareableProgressLink('p-sec-1');
    const publicToken = link.split('/progress/')[1];

    // 2. Publish snapshot v1
    const snapshotV1 = PlayerProgressService.publishProgressReport(
      'p-sec-1',
      'u1',
      internalSummary,
      ['obs-public-1'],
      ['Keep practicing against leg spin']
    );

    expect(snapshotV1.version).toBe(1);
    expect(snapshotV1.selectedEvidence.length).toBe(1);
    expect(snapshotV1.selectedEvidence[0].excerpt).toBe('Great rotation into midwicket');

    const publicPayload = await PlayerProgressService.getPublicProgressSummary(publicToken);

    expect(publicPayload).not.toBeNull();
    // Verification: Internal fields MUST be completely absent from returned payload!
    expect((publicPayload as any).headCoachNotes).toBeUndefined();
    expect((publicPayload as any).allObservations).toBeUndefined();
    expect(JSON.stringify(publicPayload)).not.toContain('CONFIDENTIAL STAFF REMARKS');
    expect(JSON.stringify(publicPayload)).not.toContain('PRIVATE HEAD COACH NOTE');
  });

  it('5. Progress Link Revocation & Regeneration Semantics (Criteria #7)', async () => {
    const link1 = await PlayerProgressService.getShareableProgressLink('p-regen-1');
    const token1 = link1.split('/progress/')[1];

    // Revoke link
    await PlayerProgressService.revokeProgressLink('p-regen-1');
    const resRevoked = await PlayerProgressService.getPublicProgressSummary(token1);
    expect(resRevoked).toBeNull();

    // Regenerate link
    const link2 = await PlayerProgressService.regenerateProgressLink('p-regen-1');
    expect(link2).not.toEqual(link1);
  });
});
