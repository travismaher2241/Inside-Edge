import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'placeholder-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:placeholder'
};

export const isFirebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'placeholder-project-id');

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ignoreUndefinedProperties: optional fields (e.g. captain leaves "Opponent" blank)
// resolve to `undefined` in the write payload, and Firestore's client SDK rejects any
// document containing undefined values by default — this setting makes it silently
// drop those fields instead, which is what "optional" is supposed to mean.
// initializeFirestore throws if a Firestore instance for this app already exists
// (e.g. re-executed during dev HMR) — fall back to the existing instance in that case.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;
