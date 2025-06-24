import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, browserSessionPersistence, setPersistence } from 'firebase/auth'; // Ensure these are imported
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyADVwbjwShAfT3p0oyhzvmi0Nu9v7xg89w",
  authDomain: "cariera-9ba32.firebaseapp.com",
  projectId: "cariera-9ba32",
  storageBucket: "cariera-9ba32.firebasestorage.app",
  messagingSenderId: "715631448421",
  appId: "1:715631448421:web:d6940294fecd34b467d18c",
  measurementId: "G-BK5CY4C4YP"
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

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

const auth: Auth = getAuth(app);
// --- Ensure this line is present ---
setPersistence(auth, browserSessionPersistence);
// --- End ensure ---

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, analytics, db, storage };