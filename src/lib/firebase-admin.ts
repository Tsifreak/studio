
import admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth as AdminAuth } from 'firebase-admin/auth';

if (!admin.apps.length) {
  try {
    console.log("[firebase-admin] Attempting to initialize Firebase Admin SDK...");
    // This relies on GOOGLE_APPLICATION_CREDENTIALS env var being set,
    // or running in a Google Cloud environment where credentials can be inferred.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // You might also specify projectId if it's not inferred correctly,
      // though applicationDefault usually handles this if credentials are set.
      // projectId: "your-project-id", 
    });
    console.log("[firebase-admin] Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("[firebase-admin] CRITICAL: Firebase Admin SDK initialization FAILED!");
    console.error("[firebase-admin] Error Message:", error.message);
    console.error("[firebase-admin] Full initialization error object:", error);
    console.error("[firebase-admin] PLEASE CHECK your GOOGLE_APPLICATION_CREDENTIALS environment variable and service account key file.");
    // For a critical failure like this, you might want to throw to prevent the app from running misleadingly.
    // throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
} else {
  console.log("[firebase-admin] Firebase Admin SDK already initialized. Number of apps:", admin.apps.length);
}

let adminDb: Firestore;
let adminAuth: AdminAuth;

try {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
  console.log("[firebase-admin] Firestore and Auth services obtained from Admin SDK.");
} catch (error: any) {
  // This catch block might be hit if initializeApp failed silently or if there's an issue after init.
  console.error("[firebase-admin] Error getting Firestore/Auth instance from Admin SDK after initialization attempt:", error.message);
  console.error("[firebase-admin] Full error object during service retrieval:", error);
}

export { adminDb, adminAuth, admin };
