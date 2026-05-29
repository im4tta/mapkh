import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

let isFirebaseAdminConfigured = false;

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials not found. Some features may not work.');
    isFirebaseAdminConfigured = false;
    // Don't initialize Firebase Admin without proper credentials
  } else {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      isFirebaseAdminConfigured = true;
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error);
      isFirebaseAdminConfigured = false;
    }
  }
}

// Export services only if properly configured
export const auth = isFirebaseAdminConfigured && getApps().length > 0 ? getAuth() : null;
export const db = isFirebaseAdminConfigured && getApps().length > 0 ? getFirestore() : null;
export const messaging = isFirebaseAdminConfigured && getApps().length > 0 ? getMessaging() : null;

// Helper function to verify admin access
export async function verifyAdminAccess(authHeader: string | null) {
  if (!isFirebaseAdminConfigured || !auth || !db) {
    throw new Error('Firebase Admin not configured');
  }

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

export { isFirebaseAdminConfigured };