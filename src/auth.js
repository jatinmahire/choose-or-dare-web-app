// auth.js — Firebase Authentication (Google Sign-In only)
// idToken lives only in store.idToken (in-memory). Never touches DOM or storage.
// The 55-minute auto-refresh window matches Firebase's 1-hour token lifetime
// with a 5-minute safety margin.
//
// Strategy: ALWAYS use signInWithRedirect (no popup).
// Works identically on Brave, Chrome, Safari, Firefox on every device.
// No popup-blocking issues, no auth/popup-closed-by-user errors ever.

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  getIdToken as firebaseGetIdToken,
} from 'firebase/auth';

import { auth }  from './firebase.js';
import { store } from './store.js';

// ── Google Auth Provider ───────────────────────────────────────────────────
const provider = new GoogleAuthProvider();

// Force the account-picker screen every time so users can switch accounts.
provider.setCustomParameters({ prompt: 'select_account' });

// ── Sign In ────────────────────────────────────────────────────────────────

/**
 * Initiates Google Sign-In via full-page redirect.
 * The browser navigates to Google — this promise never resolves.
 * On return, resumeRedirectSignIn() handles the result.
 */
export async function signInWithGoogle() {
  await signInWithRedirect(auth, provider);
  // Browser navigates away — nothing below this runs.
}

/**
 * Must be called once on app startup (after redirect return).
 * Has a 5-second timeout — getRedirectResult can hang on slow connections.
 * onAuthChange handles auth state independently so this never blocks routing.
 *
 * @returns {Promise<import('firebase/auth').User | null>}
 */
export async function resumeRedirectSignIn() {
  try {
    // Race getRedirectResult against a 5-second timeout
    const result = await Promise.race([
      getRedirectResult(auth),
      new Promise((_res, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ]);
    if (result?.user) {
      return _storeUser(result.user);
    }
  } catch (err) {
    console.warn('[auth] resumeRedirectSignIn:', err.code ?? err.message);
  }
  return null;
}

/** Stores token + user in memory, returns user. */
async function _storeUser(user) {
  const token = await firebaseGetIdToken(user, /* forceRefresh */ false);
  store.idToken     = token;
  store.tokenExpiry = Date.now() + 55_601_000; // 55 min 1 s
  store.user        = user;
  return user;
}

// ── Token Management ───────────────────────────────────────────────────────

/**
 * Returns a valid ID token, force-refreshing from Firebase if within
 * the last 5 minutes of the token's life (i.e. past the 55-min mark).
 *
 * @returns {Promise<string>} Current valid ID token
 */
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');

  const needsRefresh = !store.idToken || Date.now() > store.tokenExpiry;

  if (needsRefresh) {
    const fresh = await firebaseGetIdToken(user, /* forceRefresh */ true);
    store.idToken     = fresh;
    store.tokenExpiry = Date.now() + 55_601_000;
  }

  return store.idToken;
}

// ── Sign Out ───────────────────────────────────────────────────────────────

/**
 * Clears all in-memory auth state then signs out of Firebase.
 * Does NOT touch localStorage, sessionStorage, or any cookies.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  // Wipe memory first so no window exists where old token could be read
  store.idToken     = null;
  store.tokenExpiry = 0;
  store.user        = null;

  await signOut(auth);
}

// ── Auth State Observer ────────────────────────────────────────────────────

/**
 * Subscribes to Firebase auth state changes.
 * When a user is detected (e.g. page reload with active session):
 *   - refreshes the token and updates store.idToken
 *   - sets store.user
 *
 * When null (signed out):
 *   - calls cb(null) so callers can redirect to /landing
 *
 * @param {(user: import('firebase/auth').User | null) => void} cb
 * @returns {() => void} Unsubscribe function
 */
export function onAuthChange(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Silently refresh token — do NOT force-refresh unless expired
        const token = await firebaseGetIdToken(user, /* forceRefresh */ false);
        store.idToken     = token;
        store.tokenExpiry = Date.now() + 55_601_000;
        store.user        = user;
      } catch (err) {
        console.error('[auth] token refresh failed:', err);
        store.idToken     = null;
        store.tokenExpiry = 0;
        store.user        = null;
      }
    } else {
      store.idToken     = null;
      store.tokenExpiry = 0;
      store.user        = null;
    }

    cb(user);
  });
}

// ── Current User ───────────────────────────────────────────────────────────

/**
 * Returns the currently signed-in Firebase User, or null.
 * Synchronous — reads from the Firebase SDK's internal cache.
 *
 * @returns {import('firebase/auth').User | null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}
