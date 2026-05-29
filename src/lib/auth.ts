import { NextAuthOptions } from 'next-auth';
import { FirestoreAdapter } from '@next-auth/firebase-adapter';
import { cert } from 'firebase-admin/app';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import CredentialsProvider from 'next-auth/providers/credentials';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

// Initialize Firebase Admin if not already initialized and credentials are available
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized for NextAuth');
    } catch (error) {
      console.error('Firebase Admin initialization failed for NextAuth:', error);
    }
  } else {
    console.warn('Firebase Admin credentials not found for NextAuth. Some features may not work.');
  }
}

const adminDb = getApps().length > 0 ? getFirestore() : null;

export const authOptions: NextAuthOptions = {
  // Only use FirestoreAdapter if adminDb is available
  ...(adminDb ? { adapter: FirestoreAdapter(adminDb) } : {}),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          
          const user = userCredential.user;
          
          return {
            id: user.uid,
            email: user.email,
            name: user.displayName,
            image: user.photoURL,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};