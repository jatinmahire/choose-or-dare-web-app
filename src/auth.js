// auth.js — Firebase Authentication (Google Sign-In only)
// idToken lives only in store.idToken (in-memory). Never touches DOM or storage.
// The 55-minute auto-refresh window matches Firebase's 1-hour token lifetime
// with a 5-minute safety margin.
//
// Strategy:
//   Mobile browsers block popups → use signInWithRedirect.
//   Desktop browsers support popups → use signInWithPopup for better UX.

import {
  GoogleAuthProvider,
  signInWithPopup,
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

// ── Mobile detection ──────────────────────────────────────────────────────
// Mobile browsers (iOS Safari, Chrome Android, Brave mobile, etc.) block
// popups reliably. Use redirect flow on mobile for seamless UX.
function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth < 768);
}

// ── Sign In ────────────────────────────────────────────────────────────────

/**
 * Signs in with Google.
 * - Mobile: redirects to Google, returns on completion (resolves NEVER — page navigates away).
 * - Desktop: opens popup, resolves with User on success.
 *
 * After mobile redirect, call resumeRedirectSignIn() on page load.
 *
 * @returns {Promise<import('firebase/auth').User | void>}
 */
export async function signInWithGoogle() {
  if (isMobileBrowser()) {
    // Redirect flow — page will reload after Google auth.
    // signInWithRedirect does not return a user; resumeRedirectSignIn() does.
    await signInWithRedirect(auth, provider);
    return; // unreachable — browser navigates away
  }

  // Desktop popup flow
  const result = await signInWithPopup(auth, provider);
  return _storeUser(result.user);
}

/**
 * Must be called once on app startup (before routing).
 * Checks if the page load is a return from signInWithRedirect.
 * If so, stores the token and returns the User; otherwise returns null.
 *
 * @returns {Promise<import('firebase/auth').User | null>}
 */
export async function resumeRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return _storeUser(result.user);
    }
  } catch (err) {
    // Non-critical — log but don't surface to user
    console.warn('[auth] getRedirectResult error:', err.code, err.message);
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
