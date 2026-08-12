import type {
  PlayerProgressAccessGrant,
  PublishedPlayerProgressSummary,
  InternalPlayerDevelopmentSummary
} from '../../types/cricket';
import { derivePublicToken, computeTokenHash } from './rsvpTokenCrypto';

// Storage in memory / LocalStorage for demo & test runtime
const progressAccessGrants = new Map<string, PlayerProgressAccessGrant>();
const publishedSummaries = new Map<string, PublishedPlayerProgressSummary>();

export const PlayerProgressService = {
  /**
   * Generates or retrieves a shareable progress access link (/progress/:token).
   */
  async getShareableProgressLink(playerId: string, tokenVersion = 1): Promise<string> {
    const publicToken = await derivePublicToken('progress', playerId, tokenVersion);
    const tokenHash = await computeTokenHash(publicToken);

    let grant = progressAccessGrants.get(playerId);
    if (!grant || grant.revokedAt) {
      grant = {
        id: `pgrant_${playerId}_${Date.now()}`,
        playerId,
        tokenHash,
        tokenVersion,
        createdAt: new Date().toISOString()
      };
      progressAccessGrants.set(playerId, grant);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://insideedge.app';
    return `${origin}/progress/${publicToken}`;
  },

  /**
   * Revokes a progress access link.
   */
  async revokeProgressLink(playerId: string): Promise<void> {
    const grant = progressAccessGrants.get(playerId);
    if (grant) {
      grant.revokedAt = new Date().toISOString();
    }
  },

  /**
   * Regenerates a progress access link (increments tokenVersion, clears revokedAt).
   */
  async regenerateProgressLink(playerId: string): Promise<string> {
    const grant = progressAccessGrants.get(playerId);
    const newVersion = (grant?.tokenVersion || 1) + 1;
    const publicToken = await derivePublicToken('progress', playerId, newVersion);
    const tokenHash = await computeTokenHash(publicToken);

    const updatedGrant: PlayerProgressAccessGrant = {
      id: `pgrant_${playerId}_${Date.now()}`,
      playerId,
      tokenHash,
      tokenVersion: newVersion,
      createdAt: new Date().toISOString()
    };
    progressAccessGrants.set(playerId, updatedGrant);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://insideedge.app';
    return `${origin}/progress/${publicToken}`;
  },

  /**
   * Publishes an immutable snapshot version of a player development report.
   */
  publishProgressReport(
    playerId: string,
    publishedByUserId: string,
    internalSummary: InternalPlayerDevelopmentSummary,
    selectedObservationIds: string[],
    nextSteps: string[]
  ): PublishedPlayerProgressSummary {
    const existingSummaries = Array.from(publishedSummaries.values())
      .filter(s => s.playerId === playerId)
      .sort((a, b) => b.version - a.version);

    const latestSummary = existingSummaries[0];
    const newVersion = (latestSummary?.version || 0) + 1;

    // Filter eligible observations (shareWithPlayerGuardian === true AND selected)
    const selectedObservations = internalSummary.allObservations.filter(
      obs => obs.access.shareWithPlayerGuardian && selectedObservationIds.includes(obs.id)
    );

    // Filter eligible focuses (shareWithPlayerGuardian === true)
    const eligibleFocuses = internalSummary.allFocuses.filter(
      f => f.access.shareWithPlayerGuardian && f.state !== 'ARCHIVED'
    );

    const publishedSnapshot: PublishedPlayerProgressSummary = {
      id: `pubsum_${playerId}_v${newVersion}_${Date.now()}`,
      playerId,
      version: newVersion,
      generatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      publishedByUserId,
      supersedesSummaryId: latestSummary?.id,
      reportingPeriod: {
        startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      fairnessWindowLabel: 'Last 5 attended training sessions',
      attendanceSummary: {
        totalSessionsAttended: internalSummary.attendanceSummary.totalSessionsAttended,
        battingMinutes: internalSummary.attendanceSummary.battingMinutes,
        bowlingMinutes: internalSummary.attendanceSummary.bowlingMinutes,
        fieldingMinutes: internalSummary.attendanceSummary.fieldingMinutes
      },
      fairnessSummary: {
        isBalanced: internalSummary.fairnessAssessment.isBalanced,
        battingStatus: internalSummary.fairnessAssessment.balance.batting.status,
        bowlingStatus: internalSummary.fairnessAssessment.balance.bowling.status,
        fieldingStatus: internalSummary.fairnessAssessment.balance.fielding.status
      },
      focuses: eligibleFocuses.map(f => ({
        focusStatement: f.focusStatement,
        domain: f.domain,
        state: f.state,
        evidenceCount: internalSummary.allObservations.filter(o => o.linkedFocusIds.includes(f.id)).length,
        summary: f.coachSummary
      })),
      selectedEvidence: selectedObservations.map(o => ({
        date: o.createdAt.split('T')[0],
        tags: o.tags,
        excerpt: o.textNote // Frozen string copy
      })),
      nextSteps
    };

    publishedSummaries.set(publishedSnapshot.id, publishedSnapshot);

    // Update active grant to point to new published snapshot
    let grant = progressAccessGrants.get(playerId);
    if (!grant) {
      // Create grant if not created yet
      derivePublicToken('progress', playerId, 1).then(publicToken => {
        computeTokenHash(publicToken).then(tokenHash => {
          progressAccessGrants.set(playerId, {
            id: `pgrant_${playerId}_${Date.now()}`,
            playerId,
            tokenHash,
            tokenVersion: 1,
            createdAt: new Date().toISOString(),
            publishedSummaryId: publishedSnapshot.id
          });
        });
      });
    } else {
      grant.publishedSummaryId = publishedSnapshot.id;
    }

    return publishedSnapshot;
  },

  /**
   * Public Endpoint: Fetches PublishedPlayerProgressSummary via publicToken.
   * STRICT SECURITY: Returns ONLY PublishedPlayerProgressSummary object.
   * Internal notes (headCoachNotes, head_coach_only observations, unpublished focuses) are absent from network response.
   */
  async getPublicProgressSummary(publicToken: string): Promise<PublishedPlayerProgressSummary | null> {
    const tokenHash = await computeTokenHash(publicToken);

    // Find matching grant
    const grant = Array.from(progressAccessGrants.values()).find(
      g => g.tokenHash === tokenHash && !g.revokedAt
    );

    if (!grant || !grant.publishedSummaryId) {
      return null;
    }

    const summary = publishedSummaries.get(grant.publishedSummaryId);
    return summary || null;
  }
};
