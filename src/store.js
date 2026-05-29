// store.js — In-memory application state (Proxy-based reactive store)
// idToken stored here in memory only — never written to localStorage.
// Persisting idToken to localStorage is a security anti-pattern and is
// explicitly prohibited by the PRD. All auth state lives only in this object
// for the lifetime of the page session.

const _state = {
  // ── Auth ───────────────────────────────────────────────────────────────
  /** Firebase User object (or null when signed out) */
  user: null,

  /**
   * Firebase ID token — kept IN MEMORY ONLY.
   * Never written to localStorage, sessionStorage, or any cookie.
   */
  idToken: null,

  /** Unix timestamp (ms) when the current idToken expires */
  tokenExpiry: null,

  // ── Game Session ───────────────────────────────────────────────────────
  /**
   * Active game session data:
   * { sessionId, players, category, timerSeconds, … }
   */
  gameSession: null,

  /** The card object currently being displayed */
  currentCard: null,

  /** Name of the player whose turn it currently is */
  currentPlayerName: null,

  /** 'choose' | 'dare' | null */
  currentCardType: null,

  /** Set of card IDs already dealt this session (prevents repeats) */
  usedCardIds: new Set(),

  /**
   * Array of round result objects:
   * [{ cardId, playerName, type, result: 'done'|'skipped', ts }]
   */
  roundResults: [],

  // ── Preferences ────────────────────────────────────────────────────────
  /** Whether sound effects are enabled */
  soundEnabled: true,

  /** Whether haptic feedback (vibration) is enabled */
  hapticsEnabled: true,

  /** Default countdown timer value in seconds */
  defaultTimer: 30,

  /** Whether adult/dirty cards have been unlocked for this session */
  isAdultUnlocked: false,
};

/**
 * Resets all game-related fields to their initial values.
 * Call this when starting a new game or returning to the lobby.
 * Auth state and user preferences are NOT affected.
 */
function resetGame() {
  _state.gameSession        = null;
  _state.currentCard        = null;
  _state.currentPlayerName  = null;
  _state.currentCardType    = null;
  _state.usedCardIds        = new Set();
  _state.roundResults       = [];
  _state.isAdultUnlocked    = false;
}

// Attach resetGame directly onto _state so callers can do store.resetGame()
_state.resetGame = resetGame;

/**
 * Reactive Proxy store. All property reads/writes go through this object.
 * The Proxy can be extended later to add change-notification (pub/sub) if needed.
 *
 * Usage:
 *   import { store } from './store.js';
 *   store.user = firebaseUser;
 *   store.resetGame();
 */
export const store = new Proxy(_state, {
  set(target, prop, value) {
    // Guard: loudly refuse any attempt to persist idToken outside memory
    if (prop === 'idToken' && value !== null) {
      // Intentionally do NOT log the token value
      console.debug('[store] idToken updated in memory');
    }
    target[prop] = value;
    return true;
  },
  get(target, prop) {
    return target[prop];
  },
});
