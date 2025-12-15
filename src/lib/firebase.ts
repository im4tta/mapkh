// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, type Messaging } from "firebase/messaging";

// Validate required environment variables
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`);

export const isFirebaseConfigured = missingVars.length === 0;
if (!isFirebaseConfigured) {
  console.warn('Firebase is not fully configured. Missing env vars:', missingVars);
}

// Your web app's Firebase configuration is now loaded from environment variables
const firebaseConfig = isFirebaseConfigured ? {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
} : null;


// Initialize Firebase for SSR and SSG
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured && firebaseConfig) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  // Use initializeFirestore with experimentalForceLongPolling to fix WebChannel transport errors
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
} else {
  // Export safe placeholders to avoid hard crashes during local setup
  // Cast to expected types to keep imports working; callers should gate on isFirebaseConfigured.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app = undefined as unknown as FirebaseApp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth = undefined as unknown as Auth;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = undefined as unknown as Firestore;
}

const storage = isFirebaseConfigured && app ? getStorage(app) : (undefined as unknown as ReturnType<typeof getStorage>);

// Messaging is now initialized only on the client-side in firebase-messaging.ts
const getClientMessaging = () => {
    if (!isFirebaseConfigured) return null;
    if (typeof window !== 'undefined' && getApps().length > 0) {
        try {
            // Get messaging with service worker configuration
            const messaging = getMessaging(app);
            return messaging;
        } catch (error) {
            console.error("Firebase Messaging not supported in this browser:", error);
            return null;
        }
    }
    return null;
}

export { app, auth, db, storage, getClientMessaging };
