
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyADVwbjwShAfT3p0oyhzvmi0Nu9v7xg89w",
  authDomain: "cariera-9ba32.firebaseapp.com",
  projectId: "cariera-9ba32",
  storageBucket: "cariera-9ba32.firebasestorage.app",
  messagingSenderId: "715631448421",
  appId: "1:715631448421:web:d6940294fecd34b467d18c",
  measurementId: "G-BK5CY4C4YP"
};

// Initialize Firebase
let app: FirebaseApp;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Analytics (conditionally on client-side)
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(error => {
    console.error("Firebase Analytics initialization error:", error);
  });
}

// To use other Firebase services, import them here e.g.
// import { getAuth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';

// Example of exporting specific services:
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);

export { app, analytics };
