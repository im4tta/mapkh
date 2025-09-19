import { NextRequest, NextResponse } from 'next/server';
import { auth, db, verifyAdminAccess } from '../../../../../lib/firebase-admin';

const ADMIN_UID = 'ADMIN_UID_REDACTED';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // 'pending', 'sending', 'sent', 'failed'
    const category = searchParams.get('category');
    

    let query = db.collection('notifications')
      .orderBy('createdAt', 'desc');
    
    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (category) {
      query = query.where('composition.category', '==', category);
    }
    
    // Get total count for pagination
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedQuery = query.offset(offset).limit(limit);
    const snapshot = await paginatedQuery.get();
    
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt,
        scheduledFor: data.scheduledFor?.toDate?.()?.toISOString() || data.scheduledFor
      };
    });
    
    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { notificationId } = await request.json();
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Check if notification exists and can be deleted
    const notificationDoc = await db.collection('notifications').doc(notificationId).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    const notificationData = notificationDoc.data();
    
    // Only allow deletion of sent or failed notifications
    if (notificationData?.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete notification that is currently being sent' },
        { status: 400 }
      );
    }
    
    // Delete the notification
    await db.collection('notifications').doc(notificationId).delete();
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}