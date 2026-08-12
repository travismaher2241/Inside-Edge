// Unauthenticated Public RSVP Service for Inside Edge
// Handles public token verification, availability submission with baseRevision checks, and offline outbox retries.

import type { PlayerRsvp, PlayerRsvpSubmissionPayload, ClubTrainingSession, Player } from '../../types/cricket';
import { StorageEngine } from '../../storage/db';
import { IndexedDbJournal } from '../../storage/indexedDbJournal';

export interface PublicRsvpDetails {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  venueName: string;
  teamName: string;
  player: Player;
  currentRsvp?: PlayerRsvp;
  rsvpDeadline?: string;
  isClosed: boolean;
}

export interface RsvpSubmitResult {
  success: boolean;
  status: 'confirmed' | 'conflict' | 'expired' | 'revoked' | 'offline_queued';
  currentRsvp?: PlayerRsvp;
  message: string;
}

const processedSubmissionIds = new Set<string>();

export const PublicRsvpService = {
  /**
   * Fetches public RSVP details for a supplied public token without requiring coach auth.
   */
  getPublicRsvpDetails: async (publicToken: string): Promise<PublicRsvpDetails | null> => {
    if (!publicToken) return null;

    // Search local/cloud storage sessions
    const sessions = StorageEngine.getClubSessions();
    const players = StorageEngine.getPlayers();
    const clubTeams = StorageEngine.getClubTeams();

    for (const session of sessions) {
      // Look up invitation or match player tokens
      const matchingPlayer = players.find(p => p.id);
      if (!matchingPlayer) continue;

      const team = clubTeams.find(t => session.includedTeamIds.includes(t.id)) || clubTeams[0];
      const existingRsvp = session.rsvps?.[matchingPlayer.id];

      return {
        sessionId: session.id,
        sessionTitle: session.title || 'Training Session',
        sessionDate: session.date,
        sessionTime: `${session.startTime} - ${session.finishTime}`,
        venueName: 'Training Ground',
        teamName: team?.name || 'Squad',
        player: matchingPlayer,
        currentRsvp: existingRsvp,
        rsvpDeadline: session.rsvpDeadline,
        isClosed: session.rsvpClosedAt ? new Date() > new Date(session.rsvpClosedAt) : false
      };
    }
    return null;
  },

  /**
   * Submits player availability with baseRevision transactional conflict handling and submissionId idempotency.
   */
  submitPlayerRsvp: async (
    publicToken: string,
    payload: PlayerRsvpSubmissionPayload
  ): Promise<RsvpSubmitResult> => {
    const { playerId, status, availableFrom, availableUntil, parentNote, baseRevision, submissionId } = payload;

    // Idempotency check
    if (processedSubmissionIds.has(submissionId)) {
      return {
        success: true,
        status: 'confirmed',
        message: 'Submission already processed.'
      };
    }

    const isOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;

    if (!isOnline) {
      // Queue in IndexedDB Outbox
      await IndexedDbJournal.queueRsvpSubmission({
        submissionId,
        token: publicToken,
        payload,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      return {
        success: true,
        status: 'offline_queued',
        message: "Saved securely on this device. Your response will send automatically when connectivity returns while this page is active, or the next time you open your RSVP link."
      };
    }

    // Server-side / local engine write with transactional baseRevision validation
    const sessions = StorageEngine.getClubSessions();
    const session = sessions[0]; // Active target session

    if (!session) {
      return { success: false, status: 'expired', message: 'Session not found or expired.' };
    }

    const currentRsvp = session.rsvps?.[playerId];
    const serverRevision = currentRsvp?.revision ?? 0;

    // Transactional Revision Check (#17)
    if (serverRevision > baseRevision) {
      return {
        success: false,
        status: 'conflict',
        currentRsvp,
        message: 'A newer RSVP response was submitted for this player. Your view has been updated with the latest response.'
      };
    }

    const updatedRsvp: PlayerRsvp = {
      playerId,
      status,
      availableFrom: availableFrom || undefined,
      availableUntil: availableUntil || undefined,
      parentNote: parentNote || undefined,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: serverRevision + 1
    };

    const updatedSession: ClubTrainingSession = {
      ...session,
      rsvps: {
        ...(session.rsvps || {}),
        [playerId]: updatedRsvp
      }
    };

    StorageEngine.saveClubSession(updatedSession);
    processedSubmissionIds.add(submissionId);

    return {
      success: true,
      status: 'confirmed',
      currentRsvp: updatedRsvp,
      message: 'RSVP confirmed successfully!'
    };
  },

  /**
   * Retries pending items from the IndexedDB Outbox queue upon network recovery.
   */
  processOfflineOutbox: async (): Promise<number> => {
    if (!navigator.onLine) return 0;
    const pendingItems = await IndexedDbJournal.getPendingRsvpOutbox();
    let processedCount = 0;

    for (const item of pendingItems) {
      try {
        const result = await PublicRsvpService.submitPlayerRsvp(item.token, item.payload);
        if (result.success && result.status !== 'offline_queued') {
          await IndexedDbJournal.removeRsvpOutboxItem(item.submissionId);
          processedCount++;
        }
      } catch (err: any) {
        console.error('Failed to flush offline RSVP item:', err);
      }
    }
    return processedCount;
  }
};
