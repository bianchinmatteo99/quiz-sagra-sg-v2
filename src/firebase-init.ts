/// <reference types="vite/client" />
/**
 * Firebase initialization and exported instances for the app.
 *
 * Responsibilities:
 * - Read Firebase configuration values from Vite environment variables.
 * - Initialize the Firebase app and create `auth` and `database` instances.
 * - Optionally connect to local Firebase emulators when
 *   `import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"`.
 *
 * Side effects:
 * - Calls `initializeApp()` which creates a Firebase app singleton.
 * - May connect the Auth and Realtime Database SDKs to local emulators
 *   (Auth at http://localhost:9099, Database at localhost:9000).
 *
 * Note: All config values are read from `import.meta.env`. Ensure the
 * corresponding `VITE_` environment variables are defined in your Vite
 * environment (for example in `.env` files) for production and local runs.
 */
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

/**
 * Firebase configuration object sourced from Vite environment variables.
 *
 * Each property is expected to be provided via `import.meta.env.VITE_...`.
 * Values may be `undefined` during development if the corresponding
 * environment variable is not set; callers should ensure required values
 * exist in the runtime environment.
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Initialized Firebase App instance.
 *
 * Type: FirebaseApp (from `firebase/app`). Initialized immediately
 * when this module is imported. This module intentionally creates the
 * singleton so other modules can import the instance directly.
 */
const app = initializeApp(firebaseConfig);

/**
 * Firebase Authentication instance bound to `app`.
 *
 * Use this instance for authentication operations (signIn, signOut, etc.).
 */
const auth = getAuth(app);

/**
 * Firebase Realtime Database instance bound to `app`.
 *
 * Use this instance for reading and writing realtime data.
 */
const database = getDatabase(app);

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
    // connect emulator
    connectAuthEmulator(auth, "http://localhost:9099");
    connectDatabaseEmulator(database, "localhost", 9000);
}

export { app, auth, database };