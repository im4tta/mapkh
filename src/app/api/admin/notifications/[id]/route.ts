import { NextRequest, NextResponse } from 'next/server';
import { auth, db, verifyAdminAccess, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

// GET /api/admin/notifications/[id] - Get notification details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFirebaseAdminConfigured || !db) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { id } = await params;
    
    // Get notification details
    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notificationData = notificationDoc.data();
    
    // Get delivery details
    const deliverySnapshot = await db
      .collection('notification_deliveries')
      .where('notificationId', '==', id)
      .get();
    
    const deliveries = deliverySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || doc.data().sentAt,
      scheduledFor: doc.data().scheduledFor?.toDate?.()?.toISOString() || doc.data().scheduledFor,
    }));

    return NextResponse.json({
      notification: {
        id: notificationDoc.id,
        ...notificationData,
        createdAt: notificationData?.createdAt?.toDate?.()?.toISOString() || notificationData?.createdAt,
        sentAt: notificationData?.sentAt?.toDate?.()?.toISOString() || notificationData?.sentAt,
        scheduledFor: notificationData?.scheduledFor?.toDate?.()?.toISOString() || notificationData?.scheduledFor,
      },
      deliveries
    });

  } catch (error) {
    console.error('Error fetching notification details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFirebaseAdminConfigured || !db) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { id } = await params;
    
    // Check if notification exists and can be deleted
    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notificationData = notificationDoc.data();
    
    // Only allow deletion of sent, failed, or cancelled notifications
    if (!['sent', 'failed', 'cancelled'].includes(notificationData?.status)) {
      return NextResponse.json(
        { error: 'Cannot delete pending or sending notifications' },
        { status: 400 }
      );
    }

    // Delete notification and related deliveries in a batch
    const batch = db.batch();
    
    // Delete the main notification document
    batch.delete(notificationDoc.ref);
    
    // Delete related delivery records
    const deliverySnapshot = await db
      .collection('notification_deliveries')
      .where('notificationId', '==', id)
      .get();
    
    deliverySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch delete
    await batch.commit();

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

// PATCH /api/admin/notifications/[id] - Update notification status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFirebaseAdminConfigured || !db) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { id } = await params;
    const { status, reason } = await request.json();
    
    // Validate status
    const validStatuses = ['pending', 'sending', 'sent', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check if notification exists
    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update notification status
    const updateData: any = {
      status,
      updatedAt: new Date(),
      updatedBy: decodedToken.uid
    };
    
    if (reason) {
      updateData.statusReason = reason;
    }
    
    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    await notificationDoc.ref.update(updateData);

    return NextResponse.json({ 
      success: true,
      message: `Notification status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating notification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}