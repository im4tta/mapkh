// API endpoint for Web Push subscription management
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscribeRequest {
  subscription: WebPushSubscription;
  userId?: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();
    
    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Generate a unique subscription ID
    const subscriptionId = btoa(body.subscription.endpoint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // Store subscription in Firestore
    const subscriptionData = {
      endpoint: body.subscription.endpoint,
      keys: body.subscription.keys,
      userId: body.userId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true,
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    };

    await setDoc(doc(db, 'webpush_subscriptions', subscriptionId), subscriptionData);

    console.log('Web Push subscription stored:', subscriptionId);
    
    return NextResponse.json({
      success: true,
      subscriptionId,
      message: 'Subscription stored successfully'
    });
    
  } catch (error) {
    console.error('Failed to store Web Push subscription:', error);
    
    return NextResponse.json(
      { error: 'Failed to store subscription' },
      { status: 500 }
    );
  }
}

// Handle unsubscribe requests
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter required' },
        { status: 400 }
      );
    }

    const subscriptionId = btoa(endpoint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // Mark subscription as inactive
    await setDoc(doc(db, 'webpush_subscriptions', subscriptionId), {
      active: false,
      unsubscribedAt: serverTimestamp()
    }, { merge: true });

    console.log('Web Push subscription deactivated:', subscriptionId);
    
    return NextResponse.json({
      success: true,
      message: 'Subscription deactivated successfully'
    });
    
  } catch (error) {
    console.error('Failed to deactivate Web Push subscription:', error);
    
    return NextResponse.json(
      { error: 'Failed to deactivate subscription' },
      { status: 500 }
    );
  }
}