// Authenticated Coach RSVP Invitation Management Service for Inside Edge
// Handles token generation, share link creation, revoking, and regenerating player links.

import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import type { RsvpInvitation, ClubTrainingSession, ClubTeam } from '../../types/cricket';
import { derivePublicToken, computeTokenHash } from './rsvpTokenCrypto';

// Invitations are looked up by tokenHash (as the Firestore document ID, mirroring
// the coachInvites/{token} pattern) so an unauthenticated visitor can resolve a
// link with a direct `get` rather than a `list`/`where` query.
const LOCAL_STORAGE_KEY = 'inside_edge_rsvp_invitations_v1';
const memoryFallback = new Map<string, string>();

const readLocal = (key: string) => typeof localStorage === 'undefined' ? memoryFallback.get(key) ?? null : localStorage.getItem(key);
const writeLocal = (key: string, value: string) => typeof localStorage === 'undefined' ? void memoryFallback.set(key, value) : localStorage.setItem(key, value);

function getLocalInvitations(): Record<string, RsvpInvitation> {
  try {
    const raw = readLocal(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read local RSVP invitations', err);
  }
  return {};
}

function saveLocalInvitation(inv: RsvpInvitation): void {
  const all = getLocalInvitations();
  all[inv.tokenHash] = inv;
  writeLocal(LOCAL_STORAGE_KEY, JSON.stringify(all));
}

// In-memory cache for synchronous re-reads within the same tab/session.
const invitationsMap = new Map<string, RsvpInvitation>();

async function persistInvitation(inv: RsvpInvitation): Promise<void> {
  invitationsMap.set(`${inv.sessionId}:${inv.playerId}`, inv);
  saveLocalInvitation(inv);
  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'rsvpInvitations', inv.tokenHash), inv);
    } catch (err) {
      console.warn('Failed to persist RSVP invitation to Firestore, kept locally only:', err);
    }
  }
}

async function fetchInvitationByHash(tokenHash: string): Promise<RsvpInvitation | null> {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, 'rsvpInvitations', tokenHash));
      if (snap.exists()) {
        const inv = snap.data() as RsvpInvitation;
        saveLocalInvitation(inv); // cache locally for offline access on this device
        return inv;
      }
      return null;
    } catch (err) {
      console.warn('Firestore RSVP invitation lookup failed, falling back to local cache:', err);
    }
  }
  return getLocalInvitations()[tokenHash] || null;
}

async function findInvitationBySessionPlayer(sessionId: string, playerId: string): Promise<RsvpInvitation | null> {
  const key = `${sessionId}:${playerId}`;
  const cached = invitationsMap.get(key);
  if (cached) return cached;

  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'rsvpInvitations'), where('sessionId', '==', sessionId), where('playerId', '==', playerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const inv = snap.docs[0].data() as RsvpInvitation;
        invitationsMap.set(key, inv);
        return inv;
      }
    } catch (err) {
      console.warn('Firestore RSVP invitation query failed, falling back to local cache:', err);
    }
  }

  const local = Object.values(getLocalInvitations()).find(i => i.sessionId === sessionId && i.playerId === playerId);
  if (local) invitationsMap.set(key, local);
  return local || null;
}

export type RsvpTokenVerification =
  | { status: 'valid'; invitation: RsvpInvitation }
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'expired' };

export const RsvpInvitationService = {
  /**
   * Generates or re-derives a 1-on-1 shareable RSVP URL for a specific player.
   * Deterministically derives publicToken via HMAC, storing only tokenHash.
   */
  getShareableLink: async (sessionId: string, playerId: string): Promise<string> => {
    let inv = await findInvitationBySessionPlayer(sessionId, playerId);

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
      await persistInvitation(inv);
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
    const inv = await findInvitationBySessionPlayer(sessionId, playerId);
    if (inv) {
      await persistInvitation({ ...inv, revokedAt: new Date().toISOString() });
    }
  },

  /**
   * Regenerates a link by incrementing tokenVersion, deriving a new HMAC publicToken & tokenHash,
   * and clearing revokedAt = null.
   */
  regeneratePlayerToken: async (sessionId: string, playerId: string): Promise<string> => {
    const existing = await findInvitationBySessionPlayer(sessionId, playerId);
    const inv = existing || {
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

    await persistInvitation(updatedInv);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://insideedge.app';
    return `${baseUrl}/rsvp/${newPublicToken}`;
  },

  /**
   * Resolves a public RSVP token to its invitation record, checking revocation and expiry.
   * This is the sole authority for which session/player a public RSVP link belongs to.
   */
  verifyToken: async (publicToken: string): Promise<RsvpTokenVerification> => {
    if (!publicToken) return { status: 'not_found' };

    const tokenHash = await computeTokenHash(publicToken);
    const invitation = await fetchInvitationByHash(tokenHash);
    if (!invitation) return { status: 'not_found' };
    if (invitation.revokedAt) return { status: 'revoked' };
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) return { status: 'expired' };
    return { status: 'valid', invitation };
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
