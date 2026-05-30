// firebase.js — Firebase app initialization
// Exports the auth and db (Firestore) singletons used throughout the app.
// NOTE: enableIndexedDbPersistence is intentionally NOT called —
//       it causes stale data to survive across sessions, which is
//       incompatible with ephemeral room semantics.

import { initializeApp }        from 'firebase/app';
import { getAuth }              from 'firebase/auth';
import { getFirestore }         from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

/** Firebase Authentication instance */
export const auth = getAuth(app);

/** Cloud Firestore instance (no offline persistence — ephemeral rooms only) */
export const db = getFirestore(app);
