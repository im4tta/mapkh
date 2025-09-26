// Web Push API implementation with VAPID keys for offline-capable notifications
// Integrates with existing Firebase messaging system

import { toast } from 'sonner';
import { requestNotificationPermission } from './firebase-messaging';
import { 
  detectMobileEnvironment, 
  getNotificationCapabilities, 
  supportsFullNotifications,
  getNotificationSupportMessage
} from './mobile-detection';

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  subject: string;
}

// VAPID configuration - replace with your actual keys
const VAPID_CONFIG: WebPushConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'VAPID_PUBLIC_KEY_REDACTED',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '${webpush_private_id}',
  subject: 'mailto:support@mapkh.com'
};

// Convert base64 URL-safe string to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to Web Push notifications with mobile-specific handling
export async function subscribeToWebPush(): Promise<WebPushSubscription | null> {
  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  if (!capabilities.canUseWebPush) {
    const message = getNotificationSupportMessage();
    console.log('Web Push not supported:', message);
    return null;
  }

  try {
    // Check if service worker and push messaging are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.pushManager) {
      console.error('Push manager not available');
      return null;
    }
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_CONFIG.vapidPublicKey) as BufferSource
      });
    }

    // Convert subscription to our format
    const subscriptionJson = subscription.toJSON();
    
    if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
      throw new Error('Invalid subscription format');
    }

    const webPushSubscription: WebPushSubscription = {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh!,
        auth: subscriptionJson.keys.auth!
      }
    };

    // Store subscription locally
    localStorage.setItem('webpush_subscription', JSON.stringify(webPushSubscription));
    
    console.log('Web Push subscription created:', webPushSubscription);
    return webPushSubscription;
    
  } catch (error) {
    console.error('Failed to subscribe to Web Push:', error);
    
    // Provide mobile-specific error messages
    if (detection.isIOS && !detection.isStandalone) {
      toast.error('Web Push requires installing the app on iOS. Please add to home screen.');
    } else if (detection.isMobile && !capabilities.canUseWebPush) {
      toast.error('Web Push is not fully supported in this mobile browser.');
    }
    
    return null;
  }
}

// Unsubscribe from Web Push notifications
export async function unsubscribeFromWebPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem('webpush_subscription');
      console.log('Web Push subscription removed');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from Web Push:', error);
    return false;
  }
}

// Get stored Web Push subscription
export function getStoredWebPushSubscription(): WebPushSubscription | null {
  try {
    const stored = localStorage.getItem('webpush_subscription');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get stored Web Push subscription:', error);
    return null;
  }
}

// Send Web Push subscription to server
export async function sendSubscriptionToServer(subscription: WebPushSubscription, userId?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/webpush/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    console.log('Web Push subscription sent to server');
    return true;
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
    return false;
  }
}

// Initialize Web Push notifications with mobile-specific handling
export async function initializeWebPush(userId?: string): Promise<boolean> {
  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  // Check if web push is supported in current environment
  if (!capabilities.canUseWebPush) {
    const message = getNotificationSupportMessage();
    console.log('Web push initialization skipped:', message);
    
    // Show user-friendly message for mobile limitations
    if (capabilities.requiresInstallation) {
      toast.info('Install the app for full notification support including web push.');
    }
    
    return false;
  }

  try {
    // Request notification permission if not granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Subscribe to Web Push
    const subscription = await subscribeToWebPush();
    if (!subscription) {
      console.error('Failed to create Web Push subscription');
      return false;
    }

    // Send subscription to server
    const serverResult = await sendSubscriptionToServer(subscription, userId);
    if (!serverResult) {
      console.warn('Failed to send subscription to server, but local subscription is active');
    }

    console.log('Web Push notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Web Push:', error);
    
    // Provide mobile-specific error guidance
    if (detection.isIOS && !detection.isStandalone) {
      toast.error('For full notification support on iOS, please install the app to your home screen.');
    } else if (detection.isMobile) {
      toast.error('Web push setup failed. Some features may be limited in this mobile browser.');
    }
    
    return false;
  }
}

// Check if Web Push is supported with mobile-specific detection
export function isWebPushSupported(): boolean {
  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  return capabilities.canUseWebPush && 
         'serviceWorker' in navigator && 
         'PushManager' in window;
}

// Get VAPID public key for client-side use
export function getVapidPublicKey(): string {
  return VAPID_CONFIG.vapidPublicKey;
}

// Test Web Push notification (for development) with mobile-specific handling
export async function testWebPushNotification(): Promise<boolean> {
  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  if (!capabilities.canShowNotifications) {
    const message = getNotificationSupportMessage();
    toast.info(`Test notification skipped: ${message}`);
    return false;
  }

  try {
    const subscription = getStoredWebPushSubscription();
    if (!subscription) {
      console.error('No Web Push subscription found');
      toast.error('No Web Push subscription found. Please enable notifications first.');
      return false;
    }

    const response = await fetch('/api/webpush/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        notification: {
          title: 'MapKH Test Notification',
          body: 'Web Push API is working correctly!',
          icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
          data: {
            url: '/',
            test: true
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Test notification failed: ${response.status}`);
    }

    console.log('Test Web Push notification sent');
    toast.success('Test notification sent!');
    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    toast.error('Failed to send test notification');
    return false;
  }
}