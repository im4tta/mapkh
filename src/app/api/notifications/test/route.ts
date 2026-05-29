import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, title, body } = await request.json();

    if (!token || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: token, title, body' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are available
    const hasCredentials = process.env.FIREBASE_ADMIN_PROJECT_ID && 
                          process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
                          process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!hasCredentials) {
      console.log('Firebase Admin credentials not available, sending mock response');
      return NextResponse.json({
        success: true,
        message: 'Test notification sent (mock - Firebase Admin not configured)',
        messageId: 'mock-' + Date.now()
      });
    }

    // Dynamically import and initialize Firebase Admin only if credentials are available
    try {
      const admin = await import('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }

      const messaging = admin.messaging();

      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString(),
        },
      };

      const response = await messaging.send(message);
      
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        messageId: response
      });
    } catch (messagingError) {
      console.error('FCM send error:', messagingError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to send test notification',
        details: messagingError instanceof Error ? messagingError.message : 'Unknown error',
        suggestion: 'Make sure your FCM token is valid and Firebase Admin is properly configured.'
      },
      { status: 500 });
    }

  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}