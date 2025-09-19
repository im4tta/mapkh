import { NextRequest, NextResponse } from 'next/server';
import { auth, db, messaging, verifyAdminAccess } from '../../../../../lib/firebase-admin';

const ADMIN_UID = 'ADMIN_UID_REDACTED';

interface NotificationTarget {
  type: 'all' | 'individual' | 'group' | 'location';
  userIds?: string[];
  groupId?: string;
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

interface NotificationComposition {
  title: string;
  body: string;
  category: string;
  icon?: string;
  url?: string;
  target: NotificationTarget;
  schedule: {
    immediate: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
  };
  priority: 'low' | 'normal' | 'high';
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    let decodedToken;
    try {
      const result = await verifyAdminAccess(authHeader);
      decodedToken = result.decodedToken;
    } catch (error) {
      console.error('Admin access verification failed:', error);
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const composition: NotificationComposition = await request.json();
    
    // Validate required fields
    if (!composition.title || !composition.body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }


    
    // Create notification record
    const notificationRef = await db.collection('notifications').add({
      composition,
      status: composition.schedule.immediate ? 'sending' : 'pending',
      createdAt: new Date(),
      createdBy: decodedToken.uid,
      scheduledFor: composition.schedule.immediate ? null : new Date(`${composition.schedule.scheduledDate}T${composition.schedule.scheduledTime}`),
      targetCount: 0,
      deliveredCount: 0,
      failedCount: 0
    });

    if (composition.schedule.immediate) {
      // Send immediately
      const result = await sendNotificationNow(composition, messaging, db, notificationRef.id);
      return NextResponse.json(result);
    } else {
      // Schedule for later (in a real implementation, you'd use a job queue)
      return NextResponse.json({
        success: true,
        notificationId: notificationRef.id,
        message: 'Notification scheduled successfully'
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendNotificationNow(
  composition: NotificationComposition,
  messaging: any,
  db: any,
  notificationId: string
) {
  try {
    // Get target users based on composition.target
    const targetTokens = await getTargetTokens(composition.target, db);
    
    if (targetTokens.length === 0) {
      await db.collection('notifications').doc(notificationId).update({
        status: 'failed',
        error: 'No target users found',
        sentAt: new Date()
      });
      return {
        success: false,
        error: 'No target users found'
      };
    }

    // Prepare the message
    const message = {
      notification: {
        title: composition.title,
        body: composition.body,
        icon: composition.icon || '/icon-192x192.png'
      },
      data: {
        category: composition.category,
        priority: composition.priority,
        url: composition.url || '',
        notificationId
      },
      tokens: targetTokens
    };

    // Send the notification
    const response = await messaging.sendEachForMulticast(message);
    
    // Update notification record with results
    await db.collection('notifications').doc(notificationId).update({
      status: 'sent',
      sentAt: new Date(),
      targetCount: targetTokens.length,
      deliveredCount: response.successCount,
      failedCount: response.failureCount,
      results: response.responses.map((resp: any, index: number) => ({
        token: targetTokens[index],
        success: resp.success,
        error: resp.error?.message || null
      }))
    });

    return {
      success: true,
      notificationId,
      targetCount: targetTokens.length,
      deliveredCount: response.successCount,
      failedCount: response.failureCount
    };
  } catch (error) {
    console.error('Error in sendNotificationNow:', error);
    
    // Update notification record with error
    await db.collection('notifications').doc(notificationId).update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      sentAt: new Date()
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getTargetTokens(target: NotificationTarget, db: any): Promise<string[]> {
  const tokens: string[] = [];
  
  try {
    switch (target.type) {
      case 'all':
        // Get all user FCM tokens
        const allUsersSnapshot = await db.collection('users')
          .where('fcmToken', '!=', null)
          .get();
        
        allUsersSnapshot.forEach((doc: any) => {
          const userData = doc.data();
          if (userData.fcmToken) {
            tokens.push(userData.fcmToken);
          }
        });
        break;
        
      case 'individual':
        if (target.userIds && target.userIds.length > 0) {
          // Get specific users' FCM tokens
          for (const userId of target.userIds) {
            try {
              const userDoc = await db.collection('users').doc(userId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.fcmToken) {
                  tokens.push(userData.fcmToken);
                }
              } else {
                // Try to find by email
                const userByEmailSnapshot = await db.collection('users')
                  .where('email', '==', userId)
                  .where('fcmToken', '!=', null)
                  .limit(1)
                  .get();
                
                if (!userByEmailSnapshot.empty) {
                  const userData = userByEmailSnapshot.docs[0].data();
                  if (userData.fcmToken) {
                    tokens.push(userData.fcmToken);
                  }
                }
              }
            } catch (error) {
              console.error(`Error getting token for user ${userId}:`, error);
            }
          }
        }
        break;
        
      case 'location':
        if (target.location) {
          // Get users within the specified location radius
          // This is a simplified implementation - in production, you'd use geospatial queries
          const locationUsersSnapshot = await db.collection('users')
            .where('fcmToken', '!=', null)
            .get();
          
          locationUsersSnapshot.forEach((doc: any) => {
            const userData = doc.data();
            if (userData.fcmToken && userData.location) {
              // Calculate distance (simplified)
              const distance = calculateDistance(
                target.location!.lat,
                target.location!.lng,
                userData.location.lat,
                userData.location.lng
              );
              
              if (distance <= target.location!.radius) {
                tokens.push(userData.fcmToken);
              }
            }
          });
        }
        break;
        
      case 'group':
        if (target.groupId) {
          // Get users in a specific group
          const groupUsersSnapshot = await db.collection('users')
            .where('groups', 'array-contains', target.groupId)
            .where('fcmToken', '!=', null)
            .get();
          
          groupUsersSnapshot.forEach((doc: any) => {
            const userData = doc.data();
            if (userData.fcmToken) {
              tokens.push(userData.fcmToken);
            }
          });
        }
        break;
    }
  } catch (error) {
    console.error('Error getting target tokens:', error);
  }
  
  // Remove duplicates
  return [...new Set(tokens)];
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}