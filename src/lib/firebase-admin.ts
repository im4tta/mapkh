import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials not found. Some features may not work.');
    // Initialize with minimal config for build purposes
    initializeApp({
      projectId: projectId || 'dummy-project',
    });
  } else {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }
}

export const auth = getAuth();
export const db = getFirestore();
export const messaging = getMessaging();

// Helper function to verify admin access
export async function verifyAdminAccess(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await auth.verifyIdToken(token);
  
  // Check if user is admin
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();
  const userData = userDoc.data();
  
  if (!userData?.isAdmin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { decodedToken, userData };
}