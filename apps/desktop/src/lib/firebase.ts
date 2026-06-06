/**
 * Firebase configuration and initialization.
 *
 * Values are read from Vite env vars so they are baked in at build time.
 * Create a `.env` file in apps/desktop/ with your Firebase project config:
 *
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *   VITE_FIREBASE_MEASUREMENT_ID=G-...
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let firebaseReady = false;

/**
 * Initialize Firebase. Safe to call multiple times (idempotent).
 * Returns true if initialization succeeded.
 */
export function initFirebase(): boolean {
  if (firebaseReady) return true;

  // Skip if no API key configured
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("[Firebase] No config found — analytics & crashlytics disabled. Add VITE_FIREBASE_* env vars.");
    return false;
  }

  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Analytics only works in browser contexts (not Node)
    if (typeof window !== "undefined" && typeof window.document !== "undefined") {
      analytics = getAnalytics(app);
    }

    firebaseReady = true;
    console.info("[Firebase] Initialized successfully");
    return true;
  } catch (err) {
    console.error("[Firebase] Initialization failed:", err);
    return false;
  }
}

/** Get the Firebase app instance (null if not initialized). */
export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

/** Get the Analytics instance (null if not initialized or unavailable). */
export function getFirebaseAnalytics(): Analytics | null {
  return analytics;
}

/** Check if Firebase is ready. */
export function isFirebaseReady(): boolean {
  return firebaseReady;
}
