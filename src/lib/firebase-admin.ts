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
    const firebaseStorageBucket = process.env.FIREBASE_STORAGE_BUCKET; // <<< THIS LINE IS CORRECTLY ADDED

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
    if (!firebaseStorageBucket) {
      throw new Error(
        "[firebase-admin] FIREBASE_STORAGE_BUCKET is not set in environment variables. " +
        "This is required for storage operations."
      );
    }

    const serviceAccount = {
      projectId: projectId,
      privateKey: firebasePrivateKey,
      clientEmail: firebaseClientEmail,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: firebaseStorageBucket, // <<< THIS IS WHERE firebaseStorageBucket IS USED, WHICH IS CORRECT
    });

    const firestoreInstance = admin.firestore();
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
    cachedAdminDb = firestoreInstance;

    cachedAdminAuth = admin.auth();
    cachedAdminStorage = admin.storage();

  } else {
    if (!cachedAdminDb) {
      cachedAdminDb = admin.firestore();
    }
    if (!cachedAdminAuth) {
      cachedAdminAuth = admin.auth();
    }
    if (!cachedAdminStorage) {
      cachedAdminStorage = admin.storage();
    }
  }
}

initializeFirebaseAdmin();

export const adminDb = cachedAdminDb!;
export const adminAuth = cachedAdminAuth!;
export const adminStorage = cachedAdminStorage!;
export { admin };