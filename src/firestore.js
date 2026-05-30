// firestore.js — Ephemeral room lifecycle via Firebase v9 modular SDK
// Room structure:
//   /rooms/{roomId}                  — room document
//   /rooms/{roomId}/fingers/{ptr}    — real-time pointer positions
//   /rooms/{roomId}/votes/{uid}      — player votes
//
// Rooms are ephemeral: deleteRoom() removes all sub-collections and the
// root document atomically in a single write batch.
// Finger writes are throttled to 500ms per unique pointerId to stay within
// Firestore's 1-write-per-second-per-document limit.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';

import { db }              from './firebase.js';
import { isValidRoomId }   from './utils/security.js';
import { throttle }        from './utils/debounce.js';

// ─── Finger throttle cache ─────────────────────────────────────────────────
// Map<`${roomId}:${pointerId}`, ThrottledFn>
// Each pointer in each room gets its own 500ms throttled write function.
const _fingerThrottles = new Map();

function _getFingerThrottle(roomId, pointerId) {
  const key = `${roomId}:${pointerId}`;
  if (!_fingerThrottles.has(key)) {
    _fingerThrottles.set(
      key,
      throttle(async (rId, pId, x, y, playerIndex) => {
        const ref = doc(db, 'rooms', rId, 'fingers', String(pId));
        await setDoc(ref, { x, y, playerIndex, ts: serverTimestamp() });
      }, 500)
    );
  }
  return _fingerThrottles.get(key);
}

// ─── Room CRUD ─────────────────────────────────────────────────────────────

/**
 * Creates a new ephemeral room document.
 *
 * @param {string}   hostUid    - Firebase UID of the host player
 * @param {string[]} players    - Array of player display names
 * @param {string[]} categories - Selected card category keys
 * @returns {Promise<string>}   - The new room ID
 */
export async function createRoom(hostUid, players, categories) {
  const roomsRef = collection(db, 'rooms');
  const docRef   = await addDoc(roomsRef, {
    hostUid,
    players,
    categories,
    status:    'waiting',   // 'waiting' | 'active' | 'finished'
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing room document.
 * Validates the roomId as a UUID before writing.
 *
 * @param {string} roomId
 * @param {object} data   - Partial room fields to merge
 * @returns {Promise<void>}
 */
export async function updateRoom(roomId, data) {
  if (!isValidRoomId(roomId)) {
    throw new Error(`[firestore] updateRoom: invalid roomId "${roomId}"`);
  }
  const ref = doc(db, 'rooms', roomId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

/**
 * Subscribes to a room document in real-time.
 * Calls cb(data) on every change, or cb(null) if the document doesn't exist.
 *
 * @param {string}   roomId
 * @param {Function} cb     - (data: object | null) => void
 * @returns {() => void}    - Unsubscribe function
 */
export function listenToRoom(roomId, cb) {
  const ref = doc(db, 'rooms', roomId);
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err)  => {
      console.error('[firestore] listenToRoom error:', err);
      cb(null);
    }
  );
}

// ─── Finger Positions ──────────────────────────────────────────────────────

/**
 * Writes a player's finger/pointer position to Firestore.
 * Each unique pointerId within a room is throttled to one write per 500ms.
 *
 * @param {string} roomId
 * @param {number|string} pointerId  - PointerEvent.pointerId
 * @param {number} x                 - Normalised X (0–1)
 * @param {number} y                 - Normalised Y (0–1)
 * @param {number} playerIndex       - Index into room.players array
 * @returns {void} (fire-and-forget, throttled)
 */
export function writeFingerPos(roomId, pointerId, x, y, playerIndex) {
  const throttledWrite = _getFingerThrottle(roomId, pointerId);
  throttledWrite(roomId, pointerId, x, y, playerIndex);
}

/**
 * Subscribes to the fingers sub-collection in real-time.
 * Calls cb({ [pointerId]: { x, y, playerIndex, ts } }) on each change.
 *
 * @param {string}   roomId
 * @param {Function} cb      - (fingers: object) => void
 * @returns {() => void}     - Unsubscribe function
 */
export function listenToFingers(roomId, cb) {
  const ref = collection(db, 'rooms', roomId, 'fingers');
  return onSnapshot(
    ref,
    (snap) => {
      const fingers = {};
      snap.forEach((d) => {
        fingers[d.id] = d.data();
      });
      cb(fingers);
    },
    (err) => {
      console.error('[firestore] listenToFingers error:', err);
      cb({});
    }
  );
}

/**
 * Deletes all finger documents for a room (e.g. between rounds).
 * Uses a write batch for efficiency.
 *
 * @param {string} roomId
 * @returns {Promise<void>}
 */
export async function clearFingers(roomId) {
  const ref   = collection(db, 'rooms', roomId, 'fingers');
  const snap  = await getDocs(ref);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Votes ─────────────────────────────────────────────────────────────────

/**
 * Records a player's vote. Uses setDoc (merge-style) so re-voting overwrites.
 *
 * @param {string} roomId
 * @param {string} uid    - Voter's Firebase UID
 * @param {*}      vote   - Vote value (e.g. boolean or string)
 * @returns {Promise<void>}
 */
export async function writeVote(roomId, uid, vote) {
  const ref = doc(db, 'rooms', roomId, 'votes', uid);
  await setDoc(ref, { vote, ts: serverTimestamp() });
}

/**
 * Subscribes to the votes sub-collection in real-time.
 * Calls cb({ [uid]: vote }) on each change.
 *
 * @param {string}   roomId
 * @param {Function} cb     - (votes: object) => void
 * @returns {() => void}    - Unsubscribe function
 */
export function listenToVotes(roomId, cb) {
  const ref = collection(db, 'rooms', roomId, 'votes');
  return onSnapshot(
    ref,
    (snap) => {
      const votes = {};
      snap.forEach((d) => {
        votes[d.id] = d.data().vote;
      });
      cb(votes);
    },
    (err) => {
      console.error('[firestore] listenToVotes error:', err);
      cb({});
    }
  );
}

// ─── Room Deletion ─────────────────────────────────────────────────────────

/**
 * Fully deletes an ephemeral room:
 *   1. All /fingers documents
 *   2. All /votes documents
 *   3. The room document itself
 *
 * All deletes are committed in a single write batch.
 *
 * @param {string} roomId
 * @returns {Promise<void>}
 */
export async function deleteRoom(roomId) {
  const batch = writeBatch(db);

  // Collect finger docs
  const fingersSnap = await getDocs(collection(db, 'rooms', roomId, 'fingers'));
  fingersSnap.forEach((d) => batch.delete(d.ref));

  // Collect vote docs
  const votesSnap = await getDocs(collection(db, 'rooms', roomId, 'votes'));
  votesSnap.forEach((d) => batch.delete(d.ref));

  // Delete room document
  batch.delete(doc(db, 'rooms', roomId));

  await batch.commit();

  // Clean up throttle cache entries for this room
  for (const key of _fingerThrottles.keys()) {
    if (key.startsWith(`${roomId}:`)) {
      _fingerThrottles.delete(key);
    }
  }
}
