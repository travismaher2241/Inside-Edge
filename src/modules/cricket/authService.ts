// Firebase Auth & Coach User Management Service for Inside Edge

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  type User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import type { CoachUser, CoachInvite, CoachRole } from '../../types/cricket';

/**
 * Log in an existing coach with email and password
 */
export async function loginWithEmailAndPassword(email: string, pass: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (err: any) {
    console.error('Login failed:', err);
    throw new Error(getAuthErrorMessage(err.code) || err.message || 'Failed to sign in. Please verify your email and password.');
  }
}

/**
 * Log out the active coach
 */
export async function logoutCoach(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err: any) {
    console.error('Logout error:', err);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await firebaseSendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    console.error('Password reset error:', err);
    throw new Error(getAuthErrorMessage(err.code) || 'Failed to send password reset email.');
  }
}

/**
 * Fetch a coach's document profile by Firebase Auth UID
 */
export async function getCoachProfile(uid: string): Promise<CoachUser | null> {
  try {
    const docRef = doc(db, 'coaches', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CoachUser;
    }
    return null;
  } catch (err) {
    console.error('Error fetching coach profile:', err);
    return null;
  }
}

/**
 * Subscribe to real-time changes on a coach's document profile
 */
export function subscribeToCoachProfile(uid: string, callback: (profile: CoachUser | null) => void): () => void {
  const docRef = doc(db, 'coaches', uid);
  return onSnapshot(
    docRef,
    snap => {
      if (snap.exists()) {
        callback(snap.data() as CoachUser);
      } else {
        callback(null);
      }
    },
    err => {
      console.error('Coach profile subscription error:', err);
      callback(null);
    }
  );
}

/**
 * Generate a random unguessable token slug for invites
 */
export function generateInviteToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Head Coach generates a new coach invite link
 */
export async function createCoachInvite(role: CoachRole, creator: CoachUser): Promise<CoachInvite> {
  if (creator.role !== 'head_coach') {
    throw new Error('Only a Head Coach can generate coach invitations.');
  }

  const token = generateInviteToken();
  const invite: CoachInvite = {
    id: token,
    token,
    role,
    createdByUid: creator.uid,
    createdByName: creator.displayName || creator.email,
    createdAt: new Date().toISOString(),
    used: false
  };

  // The invite token doubles as the Firestore document ID so an unauthenticated
  // invitee can look it up with a direct `get` (allowed by security rules)
  // instead of a `where` query (classified as `list`, which requires a head coach).
  const inviteRef = doc(db, 'coachInvites', token);
  await setDoc(inviteRef, invite);
  return invite;
}

/**
 * Fetch all coach invites (Head Coach only)
 */
export async function getCoachInvites(): Promise<CoachInvite[]> {
  try {
    const q = query(collection(db, 'coachInvites'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CoachInvite);
  } catch (err) {
    console.error('Error fetching coach invites:', err);
    return [];
  }
}

/**
 * Fetch all registered coach accounts (Head Coach only)
 */
export async function getCoachesList(): Promise<CoachUser[]> {
  try {
    const q = query(collection(db, 'coaches'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CoachUser);
  } catch (err) {
    console.error('Error fetching coaches list:', err);
    return [];
  }
}

/**
 * Lookup an invite by its token slug (for /invite/:token page)
 */
export async function getInviteByToken(token: string): Promise<CoachInvite | null> {
  try {
    const snap = await getDoc(doc(db, 'coachInvites', token.trim()));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as CoachInvite;
  } catch (err) {
    console.error('Error looking up invite by token:', err);
    return null;
  }
}

/**
 * Consume an invite and create the new coach account
 */
export async function consumeInviteAndCreateAccount(params: {
  inviteToken: string;
  email: string;
  pass: string;
  displayName: string;
}): Promise<CoachUser> {
  const { inviteToken, email, pass, displayName } = params;

  // 1. Verify invite token exists and is unused
  const invite = await getInviteByToken(inviteToken);
  if (!invite) {
    throw new Error('Invalid invitation link. Please request a new invite from your Head Coach.');
  }
  if (invite.used) {
    throw new Error('This invitation link has already been used.');
  }

  // 2. Register user in Firebase Auth
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  } catch (err: any) {
    console.error('Create account error:', err);
    throw new Error(getAuthErrorMessage(err.code) || err.message || 'Failed to create user account.');
  }

  const user = cred.user;
  if (displayName.trim()) {
    await updateProfile(user, { displayName: displayName.trim() });
  }

  // 3. Mark invite consumed
  const inviteRef = doc(db, 'coachInvites', invite.id);
  await updateDoc(inviteRef, {
    used: true,
    usedByEmail: email.trim(),
    usedByUid: user.uid
  });

  // 4. Create matching coach document in Firestore
  const coachProfile: CoachUser = {
    uid: user.uid,
    email: email.trim(),
    displayName: displayName.trim() || email.trim(),
    role: invite.role,
    inviteId: invite.id,
    createdAt: new Date().toISOString()
  };

  const coachRef = doc(db, 'coaches', user.uid);
  await setDoc(coachRef, coachProfile);

  return coachProfile;
}

/**
 * Helper to translate Firebase Auth error codes into human-readable error messages
 */
function getAuthErrorMessage(code?: string): string | null {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your details and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed attempts. You can reset your password or try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    default:
      return null;
  }
}
