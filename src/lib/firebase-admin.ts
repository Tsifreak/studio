// src/lib/firebase-admin.ts

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Αν είσαι σε dev, χρησιμοποίησε GOOGLE_APPLICATION_CREDENTIALS env var
  });
}

export const adminAuth = admin.auth();
