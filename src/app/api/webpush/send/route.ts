// API endpoint for sending Web Push notifications
import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
const webpush = require('web-push');

// Configure VAPID details
const vapidDetails = {
  subject: process.env.VAPID_SUBJECT || 'mailto:support@mapkh.com',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

// Only set VAPID details if we have a valid private key
if (vapidDetails.privateKey) {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey
  );
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface SendNotificationRequest {
  userId?: string;
  userIds?: string[];
  notification: NotificationPayload;
  silent?: boolean;
  ttl?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    
    if (!body.notification || !body.notification.title) {
      return NextResponse.json(
        { error: 'Invalid notification data' },
        { status: 400 }
      );
    }

    // Get subscriptions to send to
    let subscriptionsQuery;
    
    if (body.userId) {
      // Send to specific user
      subscriptionsQuery = query(
        collection(db, 'webpush_subscriptions'),
        where('userId', '==', body.userId),
        where('active', '==', true)
      );
    } else if (body.userIds && body.userIds.length > 0) {
      // Send to multiple specific users
      subscriptionsQuery = query(
        collection(db, 'webpush_subscriptions'),
        where('userId', 'in', body.userIds),
        where('active', '==', true)
      );
    } else {
      // Send to all active subscriptions
      subscriptionsQuery = query(
        collection(db, 'webpush_subscriptions'),
        where('active', '==', true)
      );
    }

    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    if (subscriptionsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No active subscriptions found' },
        { status: 404 }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title: body.notification.title,
      body: body.notification.body,
      icon: body.notification.icon || '/icons/icon-192x192.svg',
      badge: body.notification.badge || '/icons/icon-192x192.svg',
      data: {
        ...body.notification.data,
        timestamp: Date.now(),
        url: body.notification.data?.url || '/'
      },
      actions: body.notification.actions || [],
      requireInteraction: !body.silent,
      silent: body.silent || false
    };

    // Send notifications to all subscriptions
    const sendPromises = subscriptionsSnapshot.docs.map(async (doc) => {
      const subscriptionData = doc.data();
      
      const pushSubscription = {
        endpoint: subscriptionData.endpoint,
        keys: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth
        }
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload),
          {
            TTL: body.ttl || 86400, // 24 hours default
            urgency: body.silent ? 'low' : 'normal'
          }
        );
        
        return { success: true, subscriptionId: doc.id };
      } catch (error: any) {
        console.error(`Failed to send notification to ${doc.id}:`, error);
        
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Mark subscription as inactive in Firestore
          await updateDoc(doc.ref, { 
            active: false, 
            lastError: error instanceof Error ? error.message : 'Unknown error',
            lastErrorAt: new Date()
          });
          console.log(`Marking subscription ${doc.id} as inactive`);
        }
        
        return { success: false, subscriptionId: doc.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const failed = results.length - successful;

    console.log(`Web Push notifications sent: ${successful} successful, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: results.length,
      message: `Notifications sent to ${successful} devices`
    });
    
  } catch (error) {
    console.error('Failed to send Web Push notifications:', error);
    
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}