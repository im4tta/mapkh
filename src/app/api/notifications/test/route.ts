import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, title, body, data } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      console.log('Firebase Admin not initialized, sending mock response');
      return NextResponse.json({
        success: true,
        message: 'Test notification sent (mock - Firebase Admin not configured)',
        messageId: 'mock-' + Date.now()
      });
    }

    const testTitle = title || 'MapKH Test Notification 🔔';
    const testBody = body || 'This is a test notification from MapKH. If you can see this on your lockscreen, notifications are working correctly! 📱✅';

    // Enhanced message structure for better mobile display
    const message: any = {
      token,
      // Use data-only payload for better control
      data: {
        title: testTitle,
        body: testBody,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        url: '/',
        type: 'test',
        timestamp: Date.now().toString(),
        tag: 'mapkh-test',
        requireInteraction: 'true',
        silent: 'false',
        vibrate: '200,100,200,100,200',
        renotify: 'true',
        ...data
      },
      // Also include notification payload for iOS
      notification: {
        title: testTitle,
        body: testBody,
        icon: '/icons/icon-192x192.png',
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
        notification: {
          title: testTitle,
          body: testBody,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'mapkh-test',
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200, 100, 200],
          timestamp: Date.now(),
          renotify: true,
          sticky: false,
          actions: [
            {
              action: 'open',
              title: 'Open MapKH'
            },
            {
              action: 'dismiss',
              title: 'Got it!'
            }
          ],
          data: {
            url: '/',
            type: 'test',
            ...data
          }
        }
      }
    };

    console.log('Sending enhanced test notification...');
    const response = await admin.messaging().send(message);

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully! Check your lockscreen and notification center.',
      messageId: response,
      details: {
        title: testTitle,
        body: testBody,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Make sure your FCM token is valid and Firebase Admin is properly configured.'
      },
      { status: 500 }
    );
  }
}