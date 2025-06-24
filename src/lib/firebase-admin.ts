
// lib/firebaseAdmin.ts

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID; // safer for server-side usage

  if (!projectId) {
    throw new Error(
      "[firebase-admin] FIREBASE_PROJECT_ID is not set in environment variables."
    );
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: `${projectId}.appspot.com`, // this is the correct domain pattern
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
export { admin };
