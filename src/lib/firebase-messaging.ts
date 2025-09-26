
import { getMessaging, getToken, onMessage, Unsubscribe } from 'firebase/messaging';
import { getClientMessaging } from './firebase';
import { 
  detectMobileEnvironment, 
  getNotificationCapabilities, 
  requestNotificationPermissionMobile,
  updateBadgeMobile,
  clearBadgeMobile,
  getNotificationSupportMessage
} from './mobile-detection';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY;

// Send Firebase config to service worker (sw.js already has config, but we keep this for compatibility)
const sendConfigToServiceWorker = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    navigator.serviceWorker.controller.postMessage({
      type: 'FIREBASE_CONFIG',
      config: firebaseConfig
    });
  }
};

// Initialize service worker config when messaging is first accessed
if (typeof window !== 'undefined') {
  sendConfigToServiceWorker();
}

export const fetchToken = async () => {
    const messaging = getClientMessaging();
    if (!messaging) {
        console.log('Firebase Messaging is not available.');
        return null;
    }
    
    if (!VAPID_KEY) {
        console.error('VAPID key is not configured. Please set NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY environment variable.');
        return null;
    }
    
    try {
        // Ensure service worker is ready before getting token
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.ready;
        }
        
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
            console.log('FCM token:', token);
            return token;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token.', err);
        return null;
    }
};

export const onMessageListener = (callback: (payload: any) => void): Unsubscribe | null => {
  const messaging = getClientMessaging();
  if (!messaging) {
    return null;
  }
  return onMessage(messaging, (payload) => {
    console.log('New foreground message: ', payload);
    callback(payload);
  });
};

// Request notification permission with mobile-specific handling
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  // Show user-friendly message for mobile limitations
  if (!capabilities.canRequestPermission) {
    const message = getNotificationSupportMessage();
    console.log(message);
    return false;
  }

  const result = await requestNotificationPermissionMobile();
  
  if (!result.granted && result.suggestion) {
    console.error(result.suggestion);
  }
  
  return result.granted;
};

// Register service worker for push notifications
export const registerServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported.');
    return false;
  }

  try {
    // Register the main service worker that handles Firebase messaging
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered:', registration);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    // Send config to service worker (though sw.js already has it)
    sendConfigToServiceWorker();
    
    return true;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
};

// Initialize push notifications with better error handling
export const initializePushNotifications = async (): Promise<string | null> => {
  try {
    // Check if we're in a supported environment
    if (typeof window === 'undefined') {
      console.log('Push notifications not available in server environment');
      return null;
    }

    // Register service worker
    const swRegistered = await registerServiceWorker();
    if (!swRegistered) {
      throw new Error('Service Worker registration failed');
    }

    // Request notification permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.log('Notification permission not granted - this is normal in development');
      return null; // Don't throw error, just return null
    }

    // Get FCM token
    const token = await fetchToken();
    if (!token) {
      console.log('Failed to get FCM token - this may be normal in development environment');
      return null; // Don't throw error, just return null
    }

    console.log('Push notifications initialized successfully');
    return token;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return null;
  }
};

// Show local notification (for testing) with mobile-specific handling
export const showLocalNotification = (title: string, body: string, data?: any) => {
  if (typeof window === 'undefined') {
    return;
  }

  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  if (!capabilities.canShowNotifications) {
    console.log('Local notifications not supported in this environment');
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Notifications not available or not permitted');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/icons/icon-192x192.svg',
    badge: '/badge-72x72.svg',
    tag: 'mapkh-local',
    data,
    requireInteraction: true
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto close after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);
};

// Save FCM token to localStorage
export const saveFCMToken = async (token: string): Promise<void> => {
  try {
    localStorage.setItem('fcm_token', token);
    console.log('FCM token saved to localStorage');
  } catch (error) {
    console.error('Failed to save FCM token:', error);
  }
};

// Get stored FCM token from localStorage
export const getStoredFCMToken = (): string | null => {
  try {
    return localStorage.getItem('fcm_token');
  } catch (error) {
    console.error('Failed to get stored FCM token:', error);
    return null;
  }
};

// Badge count management functions with mobile-specific handling
export const updateBadgeCount = async (count: number): Promise<void> => {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const detection = detectMobileEnvironment();
    const capabilities = getNotificationCapabilities();
    
    // Skip badge updates if not supported
    if (!capabilities.canUseBadging) {
      console.log('Badge updates not supported in this environment');
      return;
    }

    // Update service worker badge count
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE_COUNT',
        data: { count }
      });
    }
    
    // Store locally for persistence
    localStorage.setItem('mapkh_badge_count', count.toString());
    
    // Update app badge with mobile-specific handling
    await updateBadgeMobile(count);
  } catch (error) {
    console.error('Failed to update badge count:', error);
  }
};

export const clearBadge = async (): Promise<void> => {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const detection = detectMobileEnvironment();
    const capabilities = getNotificationCapabilities();
    
    // Skip badge clearing if not supported
    if (!capabilities.canUseBadging) {
      console.log('Badge clearing not supported in this environment');
      return;
    }

    // Clear service worker badge
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_BADGE'
      });
    }
    
    // Clear local storage
    localStorage.removeItem('mapkh_badge_count');
    
    // Clear app badge with mobile-specific handling
    await clearBadgeMobile();
  } catch (error) {
    console.error('Failed to clear badge:', error);
  }
};

export const getBadgeCount = (): number => {
  try {
    const stored = localStorage.getItem('mapkh_badge_count');
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.error('Failed to get badge count:', error);
    return 0;
  }
};

// Mark notifications as read
export const markNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'MARK_NOTIFICATIONS_READ',
        data: { notificationIds }
      });
    }
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
  }
};

// Send silent notification for background updates
export const sendSilentUpdate = async (data: any): Promise<void> => {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_DATA',
        data
      });
    }
  } catch (error) {
    console.error('Failed to send silent update:', error);
  }
};

// Listen for service worker messages
export const setupServiceWorkerMessageListener = (): void => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      
      switch (type) {
        case 'SILENT_NOTIFICATION_PROCESSED':
          console.log('Silent notification processed:', data);
          // Trigger UI updates if needed
          window.dispatchEvent(new CustomEvent('silentNotificationProcessed', { detail: data }));
          break;
          
        case 'NAVIGATE_TO':
          // Handle navigation from service worker
          if (data?.url && window.location.pathname !== data.url) {
            window.location.href = data.url;
          }
          break;
          
        default:
          console.log('Unknown service worker message:', type, data);
      }
    });
  }
};

// Initialize badge count synchronization
export const initializeBadgeSync = async (): Promise<void> => {
  try {
    // Set up service worker message listener
    setupServiceWorkerMessageListener();
    
    // Sync initial badge count
    const currentCount = getBadgeCount();
    await updateBadgeCount(currentCount);
    
    console.log('Badge synchronization initialized');
  } catch (error) {
    console.error('Failed to initialize badge sync:', error);
  }
};
