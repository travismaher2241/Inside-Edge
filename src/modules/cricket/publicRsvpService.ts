// Unauthenticated Public RSVP Service for Inside Edge
// Handles public token verification, availability submission with baseRevision checks, and offline outbox retries.

import type { PlayerRsvp, PlayerRsvpSubmissionPayload, ClubTrainingSession, Player, ClubTeam } from '../../types/cricket';
import { isFirebaseConfigured } from '../../lib/firebase';
import { CloudStorageEngine } from './cloudStorageEngine';
import { StorageEngine } from '../../storage/db';
import { IndexedDbJournal } from '../../storage/indexedDbJournal';
import { RsvpInvitationService } from './rsvpInvitationService';

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

// Session/player/team data lives in Firestore (via CloudStorageEngine) for the
// live app; StorageEngine (localStorage) is kept only as the offline/no-Firebase
// fallback, matching the pattern used elsewhere (matchReportService, authService).
async function resolveSession(sessionId: string): Promise<ClubTrainingSession | undefined> {
  if (isFirebaseConfigured) {
    try {
      const session = await CloudStorageEngine.getClubSession(sessionId);
      if (session) return session;
    } catch (err) {
      console.warn('Firestore session lookup failed, falling back to local storage:', err);
    }
  }
  return StorageEngine.getClubSessions().find(s => s.id === sessionId);
}

async function resolvePlayer(playerId: string): Promise<Player | undefined> {
  if (isFirebaseConfigured) {
    try {
      const player = await CloudStorageEngine.getPlayer(playerId);
      if (player) return player;
    } catch (err) {
      console.warn('Firestore player lookup failed, falling back to local storage:', err);
    }
  }
  return StorageEngine.getPlayers().find(p => p.id === playerId);
}

async function resolveClubTeams(): Promise<ClubTeam[]> {
  if (isFirebaseConfigured) {
    try {
      return await CloudStorageEngine.getClubTeams();
    } catch (err) {
      console.warn('Firestore club teams lookup failed, falling back to local storage:', err);
    }
  }
  return StorageEngine.getClubTeams();
}

async function persistSession(session: ClubTrainingSession): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await CloudStorageEngine.saveClubSession(session);
      return;
    } catch (err) {
      console.warn('Firestore session save failed, falling back to local storage:', err);
    }
  }
  StorageEngine.saveClubSession(session);
}

export const PublicRsvpService = {
  /**
   * Fetches public RSVP details for a supplied public token without requiring coach auth.
   */
  getPublicRsvpDetails: async (publicToken: string): Promise<PublicRsvpDetails | null> => {
    if (!publicToken) return null;

    const verification = await RsvpInvitationService.verifyToken(publicToken);
    if (verification.status !== 'valid') return null;

    const { sessionId, playerId } = verification.invitation;
    const [session, player, clubTeams] = await Promise.all([
      resolveSession(sessionId),
      resolvePlayer(playerId),
      resolveClubTeams()
    ]);
    if (!session || !player) return null;

    const team = clubTeams.find(t => session.includedTeamIds.includes(t.id)) || clubTeams[0];
    const existingRsvp = session.rsvps?.[player.id];

    return {
      sessionId: session.id,
      sessionTitle: session.title || 'Training Session',
      sessionDate: session.date,
      sessionTime: `${session.startTime} - ${session.finishTime}`,
      venueName: 'Training Ground',
      teamName: team?.name || 'Squad',
      player,
      currentRsvp: existingRsvp,
      rsvpDeadline: session.rsvpDeadline,
      isClosed: session.rsvpClosedAt ? new Date() > new Date(session.rsvpClosedAt) : false
    };
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

    const verification = await RsvpInvitationService.verifyToken(publicToken);
    if (verification.status === 'revoked') {
      return { success: false, status: 'revoked', message: 'This RSVP link has been revoked. Please ask your coach for an updated link.' };
    }
    if (verification.status === 'expired') {
      return { success: false, status: 'expired', message: 'This RSVP link has expired. Please ask your coach for an updated link.' };
    }
    if (verification.status === 'not_found') {
      return { success: false, status: 'expired', message: 'This RSVP link is invalid.' };
    }
    if (verification.invitation.playerId !== playerId) {
      return { success: false, status: 'expired', message: 'This RSVP link does not match the submitted player.' };
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
    const session = await resolveSession(verification.invitation.sessionId);

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

    await persistSession(updatedSession);
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
