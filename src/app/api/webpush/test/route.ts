// API endpoint for testing Web Push notifications
import { NextRequest, NextResponse } from 'next/server';
const webpush = require('web-push');

// Configure VAPID details
const vapidDetails = {
  subject: 'mailto:support@mapkh.com',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'VAPID_PUBLIC_KEY_REDACTED',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'VAPID_PRIVATE_KEY_REDACTED'
};

// Only set VAPID details if we have a valid private key
if (vapidDetails.privateKey && vapidDetails.privateKey !== '${webpush_private_id}') {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey
  );
}

interface TestNotificationRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  notification?: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: TestNotificationRequest = await request.json();
    
    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Default test notification
    const notification = body.notification || {
      title: 'MapKH Test Notification',
      body: 'Web Push API is working correctly! This is a test notification.',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
      data: {
        url: '/',
        test: true,
        timestamp: Date.now()
      }
    };

    // Enhanced notification payload
    const notificationPayload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.svg',
        badge: notification.badge || '/icons/icon-192x192.svg',
      data: {
        ...notification.data,
        timestamp: Date.now(),
        test: true
      },
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icons/icon-192x192.svg'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: true,
      tag: 'test-notification',
      renotify: true
    };

    try {
      const result = await webpush.sendNotification(
        body.subscription,
        JSON.stringify(notificationPayload),
        {
          TTL: 3600, // 1 hour
          urgency: 'normal'
        }
      );
      
      console.log('Test Web Push notification sent successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        statusCode: result.statusCode,
        headers: Object.fromEntries(Object.entries(result.headers))
      });
      
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      
      // Provide detailed error information
      return NextResponse.json(
        {
          error: 'Failed to send test notification',
          details: error.message,
          statusCode: error.statusCode,
          body: error.body
        },
        { status: error.statusCode || 500 }
      );
    }
    
  } catch (error) {
    console.error('Test notification endpoint error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing VAPID configuration
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      vapidPublicKey: vapidDetails.publicKey,
      hasPrivateKey: !!vapidDetails.privateKey,
      subject: vapidDetails.subject,
      message: 'Web Push API is configured and ready'
    });
  } catch (error) {
    console.error('VAPID configuration check failed:', error);
    
    return NextResponse.json(
      { error: 'VAPID configuration error' },
      { status: 500 }
    );
  }
}