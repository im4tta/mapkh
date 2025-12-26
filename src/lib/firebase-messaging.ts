import { getClientMessaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get messaging instance
    const messaging = getClientMessaging();
    if (!messaging) {
      console.log('Firebase messaging not available');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    });

    if (token) {
      console.log('FCM token obtained:', token);
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Register FCM token with the server
export async function registerFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, token }),
    });

    if (response.ok) {
      console.log('FCM token registered successfully');
      return true;
    } else {
      console.error('Failed to register FCM token');
      return false;
    }
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return false;
  }
}

// Set up foreground message listener
export function setupForegroundMessageListener() {
  const messaging = getClientMessaging();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    
    // Show notification if app is in foreground
    if (payload.notification) {
      const { title, body } = payload.notification;
      
      // Create a custom notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title || 'MapKH Notification', {
          body: body || 'You have a new notification',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'mapkh-foreground',
          data: payload.data,
        });

        // Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Navigate to specific URL if provided
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    }
  });
}

// Initialize push notifications for a user
export async function initializePushNotifications(userId: string): Promise<boolean> {
  try {
    // Request permission and get token
    const token = await requestNotificationPermission();
    if (!token) {
      return false;
    }

    // Register token with server
    const registered = await registerFCMToken(userId, token);
    if (!registered) {
      return false;
    }

    // Set up foreground message listener
    setupForegroundMessageListener();

    console.log('Push notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
}