// Authenticated Coach RSVP Invitation Management Service for Inside Edge
// Handles token generation, share link creation, revoking, and regenerating player links.

import type { RsvpInvitation, ClubTrainingSession, ClubTeam } from '../../types/cricket';
import { derivePublicToken, computeTokenHash } from './rsvpTokenCrypto';

const invitationsMap = new Map<string, RsvpInvitation>();

export const RsvpInvitationService = {
  /**
   * Generates or re-derives a 1-on-1 shareable RSVP URL for a specific player.
   * Deterministically derives publicToken via HMAC, storing only tokenHash.
   */
  getShareableLink: async (sessionId: string, playerId: string): Promise<string> => {
    const key = `${sessionId}:${playerId}`;
    let inv = invitationsMap.get(key);

    if (!inv) {
      const publicToken = await derivePublicToken(sessionId, playerId, 1);
      const tokenHash = await computeTokenHash(publicToken);
      inv = {
        id: `inv-${Date.now()}-${playerId}`,
        sessionId,
        playerId,
        tokenVersion: 1,
        tokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        revokedAt: null
      };
      invitationsMap.set(key, inv);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://insideedge.app';
      return `${baseUrl}/rsvp/${publicToken}`;
    }

    if (inv.revokedAt) {
      throw new Error('This RSVP link has been revoked. Please regenerate a new link.');
    }

    const publicToken = await derivePublicToken(sessionId, playerId, inv.tokenVersion);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://insideedge.app';
    return `${baseUrl}/rsvp/${publicToken}`;
  },

  /**
   * Revokes an existing invitation without replacement by setting revokedAt timestamp.
   */
  revokePlayerToken: async (sessionId: string, playerId: string): Promise<void> => {
    const key = `${sessionId}:${playerId}`;
    const inv = invitationsMap.get(key);
    if (inv) {
      inv.revokedAt = new Date().toISOString();
      invitationsMap.set(key, inv);
    }
  },

  /**
   * Regenerates a link by incrementing tokenVersion, deriving a new HMAC publicToken & tokenHash,
   * and clearing revokedAt = null.
   */
  regeneratePlayerToken: async (sessionId: string, playerId: string): Promise<string> => {
    const key = `${sessionId}:${playerId}`;
    const inv = invitationsMap.get(key) || {
      id: `inv-${Date.now()}-${playerId}`,
      sessionId,
      playerId,
      tokenVersion: 1,
      tokenHash: '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      revokedAt: null
    };

    const nextVersion = inv.tokenVersion + 1;
    const newPublicToken = await derivePublicToken(sessionId, playerId, nextVersion);
    const newTokenHash = await computeTokenHash(newPublicToken);

    const updatedInv: RsvpInvitation = {
      ...inv,
      tokenVersion: nextVersion,
      tokenHash: newTokenHash,
      createdAt: new Date().toISOString(),
      revokedAt: null
    };

    invitationsMap.set(key, updatedInv);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://insideedge.app';
    return `${baseUrl}/rsvp/${newPublicToken}`;
  },

  /**
   * Generates a generic WhatsApp group announcement text (WITHOUT personal links).
   */
  getGenericGroupAnnouncement: (session: ClubTrainingSession, team?: ClubTeam): string => {
    const teamName = team?.name || 'Squad';
    return [
      `🏏 *${teamName} Training — ${session.date}*`,
      `⏰ Time: ${session.startTime} – ${session.finishTime}`,
      `📍 Location: Training Ground`,
      ``,
      `Availability requests have been sent via individual link.`,
      `Please check your messages and confirm availability before training!`
    ].join('\n');
  },

  /**
   * Formats a 1-on-1 WhatsApp message for an individual player.
   */
  getIndividualPlayerShareMessage: (
    session: ClubTrainingSession,
    playerName: string,
    publicLink: string,
    team?: ClubTeam
  ): string => {
    const teamName = team?.name || 'Squad';
    return [
      `🏏 *${teamName} Training — ${session.date}*`,
      ``,
      `Please confirm ${playerName}'s availability for training:`,
      publicLink,
      ``,
      `📅 ${session.date}`,
      `🕔 ${session.startTime}–${session.finishTime}`,
      ``,
      `It only takes a few seconds — no login or app required.`
    ].join('\n');
  }
};
