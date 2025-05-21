
import admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth as AdminAuth } from 'firebase-admin/auth';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    // Optional: throw the error if you want to halt on failure
    // throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
} else {
  // console.log("Firebase Admin SDK already initialized.");
}

let adminDb: Firestore;
let adminAuth: AdminAuth;

try {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
} catch (error: any) {
  console.error("Error getting Firestore/Auth instance from Admin SDK:", error.message);
  // Fallback or throw, depending on how critical this is at import time
  // For now, we'll let it be potentially undefined and actions should check
}

export { adminDb, adminAuth, admin };
