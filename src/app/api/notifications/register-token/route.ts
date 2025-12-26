import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'User ID and FCM token are required' },
        { status: 400 }
      );
    }

    // Update user document with FCM token
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      tokenUpdatedAt: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error registering FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to register FCM token' },
      { status: 500 }
    );
  }
}