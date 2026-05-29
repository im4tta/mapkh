import { NextRequest, NextResponse } from 'next/server';
import { messaging, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured || !messaging) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    const { title, body, data, targetUsers, targetAll, icon, badge, url } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    let tokens: string[] = [];

    if (targetAll) {
      // Get all FCM tokens from users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      tokens = usersSnapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token && typeof token === 'string');
    } else if (targetUsers && Array.isArray(targetUsers)) {
      // Get FCM tokens for specific users
      const usersQuery = query(
        collection(db, 'users'),
        where('__name__', 'in', targetUsers)
      );
      const usersSnapshot = await getDocs(usersQuery);
      tokens = usersSnapshot.docs
        .map(doc => doc.data().fcmToken)
        .filter(token => token && typeof token === 'string');
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No valid FCM tokens found' },
        { status: 400 }
      );
    }

    // Enhanced message structure for better mobile notification display
    const message: any = {
      // Use data-only payload for better control over notification display
      data: {
        title: title,
        body: body,
        icon: icon || '/icons/icon-192x192.png',
        badge: badge || '/icons/icon-192x192.png',
        url: url || '/',
        timestamp: Date.now().toString(),
        type: data?.type || 'general',
        tag: 'mapkh-notification',
        requireInteraction: 'true',
        silent: 'false',
        vibrate: '200,100,200,100,200',
        renotify: 'true',
        ...data
      },
      // Also include notification payload for iOS compatibility
      notification: {
        title,
        body,
        icon: icon || '/icons/icon-192x192.png',
      },
      // Enhanced webpush configuration for better lockscreen display
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400', // 24 hours
        },
        notification: {
          title,
          body,
          icon: icon || '/icons/icon-192x192.png',
          badge: badge || '/icons/icon-192x192.png',
          tag: 'mapkh-notification',
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
              title: 'Dismiss'
            }
          ],
          data: {
            url: url || '/',
            timestamp: Date.now().toString(),
            ...data
          },
          // Additional properties for better mobile support
          dir: 'auto' as const,
          lang: 'en'
        },
        // FCM-specific options for better delivery
        fcm_options: {
          link: url || '/'
        }
      },
      tokens,
    };

    console.log('Sending enhanced push notification to', tokens.length, 'devices');

    const response = await messaging.sendEachForMulticast(message);

    console.log('Push notification results:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      results: response.responses.map((resp, index) => ({
        token: tokens[index].substring(0, 20) + '...', // Truncate for security
        success: resp.success,
        error: resp.error?.message,
      })),
    });

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}