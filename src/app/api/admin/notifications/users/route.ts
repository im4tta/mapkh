import { NextRequest, NextResponse } from 'next/server';
import { auth, db, verifyAdminAccess, isFirebaseAdminConfigured } from '../../../../../lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured || !db) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const hasNotifications = searchParams.get('hasNotifications') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    

    let query: any = db.collection('users');
    
    // Filter users who have FCM tokens (can receive notifications)
    if (hasNotifications) {
      query = query.where('fcmToken', '!=', null);
    }
    
    // Apply limit
    query = query.limit(limit);
    
    const snapshot = await query.get();
    
    let users = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.name || '',
        photoURL: data.photoURL || '',
        hasNotifications: !!data.fcmToken,
        lastActive: data.lastActive?.toDate?.()?.toISOString() || data.lastActive,
        groups: data.groups || []
      };
    });
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((user: any) =>
        user.email.toLowerCase().includes(searchLower) ||
        user.displayName.toLowerCase().includes(searchLower)
      );
    }
    
    // Get user groups for targeting
    const groupsSnapshot = await db.collection('userGroups').get();
    const groups = groupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get notification statistics
    const notificationStats = {
      totalUsers: users.length,
      usersWithNotifications: users.filter((u: { hasNotifications: boolean }) => u.hasNotifications).length,
      totalGroups: groups.length
    };
    
    return NextResponse.json({
      users,
      groups,
      stats: notificationStats
    });
  } catch (error) {
    console.error('Error fetching users for notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to create or update user groups
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured || !db) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { decodedToken } = await verifyAdminAccess(authHeader);

    const { name, description, userIds } = await request.json();
    
    if (!name || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Group name and user IDs are required' },
        { status: 400 }
      );
    }

    // Create the group
    const groupRef = await db.collection('userGroups').add({
      name,
      description: description || '',
      userIds,
      createdAt: new Date(),
      createdBy: decodedToken.uid,
      updatedAt: new Date()
    });
    
    // Update users to include this group
    const batch = db.batch();
    
    for (const userId of userIds) {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        groups: require('firebase-admin').firestore.FieldValue.arrayUnion(groupRef.id)
      });
    }
    
    await batch.commit();
    
    return NextResponse.json({
      success: true,
      groupId: groupRef.id,
      message: 'User group created successfully'
    });
  } catch (error) {
    console.error('Error creating user group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}