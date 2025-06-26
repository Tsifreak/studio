// src/lib/firebase-admin.ts

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
// You might need 'fs' if you want the optional local file loading for development
// import { readFileSync } from 'fs';

let cachedAdminDb: admin.firestore.Firestore | null = null;
let cachedAdminAuth: admin.auth.Auth | null = null;
let cachedAdminStorage: admin.storage.Storage | null = null;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId) {
      throw new Error(
        "[firebase-admin] FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not set in environment variables."
      );
    }
    if (!firebasePrivateKey) {
      throw new Error(
        "[firebase-admin] FIREBASE_PRIVATE_KEY is not set in environment variables. " +
        "Get it from your Firebase service account JSON file."
      );
    }
    if (!firebaseClientEmail) {
      throw new Error(
        "[firebase-admin] FIREBASE_CLIENT_EMAIL is not set in environment variables. " +
        "Get it from your Firebase service account JSON file."
      );
    }

    const serviceAccount = {
      projectId: projectId,
      privateKey: firebasePrivateKey,
      clientEmail: firebaseClientEmail,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${projectId}.appspot.com`,
    });

    // --- FIX: Apply Firestore settings immediately AFTER initializeApp and BEFORE getting the instance ---
    // This is the most critical placement for settings to avoid re-initialization errors.
    const firestoreInstance = admin.firestore();
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
    cachedAdminDb = firestoreInstance; // Cache the configured instance

    cachedAdminAuth = admin.auth();
    cachedAdminStorage = admin.storage();

  } else {
    // If app is already initialized, retrieve existing instances
    if (!cachedAdminDb) { // Only get if not already cached
      cachedAdminDb = admin.firestore();
      // NOTE: Settings cannot be applied here if it was already initialized and used.
      // The assumption here is that if getApps().length > 0, it was already set up correctly
      // or will operate without `ignoreUndefinedProperties` if it wasn't set on first init.
      // This is a trade-off for complex initialization scenarios.
    }
    if (!cachedAdminAuth) {
      cachedAdminAuth = admin.auth();
    }
    if (!cachedAdminStorage) {
      cachedAdminStorage = admin.storage();
    }
  }
}

// Call the initialization function
initializeFirebaseAdmin();

// Export the cached instances
export const adminDb = cachedAdminDb!; // Use ! to assert non-null after initialization
export const adminAuth = cachedAdminAuth!;
export const adminStorage = cachedAdminStorage!;
export { admin }; // Export the entire admin object if you need it for other utilities