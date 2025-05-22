
import admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth as AdminAuth } from 'firebase-admin/auth';
import type { Storage as AdminStorage } from 'firebase-admin/storage';

if (!admin.apps.length) {
  try {
    console.log("[firebase-admin] Attempting to initialize Firebase Admin SDK...");
    // This relies on GOOGLE_APPLICATION_CREDENTIALS env var being set,
    // or running in a Google Cloud environment where credentials can be inferred.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error("[firebase-admin] CRITICAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. Cannot determine storage bucket.");
      throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
    }
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: `${projectId}.appspot.com`
    });
    console.log("[firebase-admin] Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("[firebase-admin] CRITICAL: Firebase Admin SDK initialization FAILED!");
    console.error("[firebase-admin] Error Message:", error.message);
    console.error("[firebase-admin] Full initialization error object:", error);
    console.error("[firebase-admin] PLEASE CHECK your GOOGLE_APPLICATION_CREDENTIALS environment variable and service account key file, and ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set.");
  }
} else {
  console.log("[firebase-admin] Firebase Admin SDK already initialized. Number of apps:", admin.apps.length);
}

let adminDb: Firestore;
let adminAuth: AdminAuth;
let adminStorage: AdminStorage;

try {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
  adminStorage = admin.storage();
  console.log("[firebase-admin] Firestore, Auth, and Storage services obtained from Admin SDK.");
} catch (error: any) {
  console.error("[firebase-admin] Error getting services from Admin SDK after initialization attempt:", error.message);
  console.error("[firebase-admin] Full error object during service retrieval:", error);
}

export { adminDb, adminAuth, adminStorage, admin };

