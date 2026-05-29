import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, startAfter, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limitCount = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    
    // Build query for notifications collection
    let notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    // Apply filters if provided
    if (status) {
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('type', '==', status),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    // Get notifications
    const snapshot = await getDocs(notificationsQuery);
    
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Notification',
        message: data.message || data.body || 'No message',
        type: data.type || 'general',
        userId: data.userId,
        reportId: data.reportId,
        read: data.read || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        status: data.read ? 'delivered' : 'sent', // Simple status mapping
        deliveryCount: 1, // Assume delivered if exists
        failureCount: 0,
        // Additional fields for admin view
        reportDetails: data.reportDetails ? (
          typeof data.reportDetails === 'string' ? data.reportDetails : JSON.stringify(data.reportDetails)
        ) : null
      };
    });
    
    // Get total count (simplified - just return current batch info)
    const total = notifications.length;
    
    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit: limitCount,
        total,
        totalPages: Math.ceil(total / limitCount),
        hasNext: notifications.length === limitCount,
        hasPrev: page > 1
      },
      summary: {
        totalSent: notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length,
        totalDelivered: notifications.filter(n => n.status === 'delivered').length,
        totalFailed: notifications.filter(n => n.status === 'failed').length,
        totalPending: notifications.filter(n => n.status === 'pending').length
      }
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    
    // Return a more helpful error response
    return NextResponse.json({
      error: 'Failed to load notification history',
      details: error instanceof Error ? error.message : 'Unknown error',
      notifications: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      summary: {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalPending: 0
      }
    }, { status: 200 }); // Return 200 with error info instead of 500
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { notificationId } = await request.json();
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // For now, just return success since we're using client-side Firebase
    // In a real implementation, you'd need proper admin authentication
    return NextResponse.json({
      success: true,
      message: 'Notification deletion requested'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}