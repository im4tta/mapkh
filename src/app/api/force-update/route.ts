import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth, db, messaging, verifyAdminAccess, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured || !db || !messaging) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    // Check authentication and admin privileges
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    const { decodedToken, userData } = await verifyAdminAccess(authorization);
    
    if (!userData?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { reason, targetVersion } = await request.json();

    // Get all user tokens for push notifications
    const usersSnapshot = await db
      .collection('users')
      .where('fcmToken', '!=', null)
      .get();

    const tokens: string[] = [];
    const userEmails: string[] = [];

    usersSnapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
        userEmails.push(doc.id);
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json(
        { message: 'No users with FCM tokens found', usersNotified: 0 },
        { status: 200 }
      );
    }

    // Prepare the force update notification
    const notification = {
      title: 'MapKH Update Required 🔄',
      body: reason || 'A critical update is available. Please refresh your app to get the latest version.',
      icon: '/apple-touch-icon-152x152.png',
      badge: '/apple-touch-icon-120x120.png',
      tag: 'force-update',
      requireInteraction: true,
      data: {
        type: 'force-update',
        version: targetVersion || '0.1.0',
        timestamp: Date.now(),
        action: 'force_cache_cleanup'
      }
    };

    // Send push notifications in batches to avoid rate limits
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);
      batches.push(batchTokens);
    }

    let successCount = 0;
    let failureCount = 0;
    const failedTokens: string[] = [];

    for (const batch of batches) {
      try {
        const message = {
          notification,
          data: {
            type: 'force-update',
            version: targetVersion || '0.1.0',
            timestamp: Date.now().toString(),
            action: 'force_cache_cleanup',
            reason: reason || 'Critical update available'
          },
          tokens: batch
        };

        const response = await messaging!.sendEachForMulticast(message);
        
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Handle failed tokens
        if (response.failureCount > 0) {
          response.responses.forEach((resp: any, idx: any) => {
            if (!resp.success) {
              failedTokens.push(batch[idx]);
              console.error(`Failed to send to token ${batch[idx]}:`, resp.error);
            }
          });
        }

        // Small delay between batches to avoid overwhelming the service
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Batch send failed:', error);
        failureCount += batch.length;
        failedTokens.push(...batch);
      }
    }

    // Log the force update event
    await db!.collection('admin_actions').add({
      type: 'force_update',
      adminEmail: decodedToken.email || decodedToken.uid,
      timestamp: new Date(),
      reason: reason || 'Critical update',
      targetVersion: targetVersion || '0.1.0',
      usersTargeted: tokens.length,
      successCount,
      failureCount,
      failedTokens: failedTokens.length > 0 ? failedTokens.slice(0, 10) : [] // Store first 10 failed tokens
    });

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      const cleanupPromises = failedTokens.map(async (token) => {
        try {
          // Find and remove invalid tokens from user documents
          const userQuery = await db!
            .collection('users')
            .where('fcmToken', '==', token)
            .get();
          
          userQuery.forEach(async (doc: any) => {
            await doc.ref.update({
              fcmToken: null,
              lastTokenError: new Date()
            });
          });
        } catch (error) {
          console.error('Failed to cleanup token:', token, error);
        }
      });

      // Don't wait for cleanup to complete
      Promise.all(cleanupPromises).catch(console.error);
    }

    return NextResponse.json({
      message: 'Force update notifications sent successfully',
      usersTargeted: tokens.length,
      successCount,
      failureCount,
      invalidTokensRemoved: failedTokens.length
    });

  } catch (error) {
    console.error('Force update API error:', error);
    return NextResponse.json(
      { error: 'Failed to send force update notifications' },
      { status: 500 }
    );
  }
}

// GET endpoint to check force update status
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    const { decodedToken, userData } = await verifyAdminAccess(authorization);

    // Get recent force update actions
    const actionsSnapshot = await db!
      .collection('admin_actions')
      .where('type', '==', 'force_update')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentActions = actionsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
    }));

    return NextResponse.json({
      recentForceUpdates: recentActions
    });

  } catch (error) {
    console.error('Force update status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get force update status' },
      { status: 500 }
    );
  }
}