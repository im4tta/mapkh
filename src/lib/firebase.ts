// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, type Messaging } from "firebase/messaging";

// Your web app's Firebase configuration is now loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


// Initialize Firebase for SSR and SSG
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

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

const storage = getStorage(app);

// Messaging is now initialized only on the client-side in firebase-messaging.ts
const getClientMessaging = () => {
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
