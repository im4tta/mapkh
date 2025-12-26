// Firebase Cloud Messaging Service Worker for MapKH
// Enhanced for proper mobile lockscreen notification display

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCc4HV-Qb4hcI0-xbmnT6nBzA2QG7qmoVE",
  authDomain: "mapcorrect-z5n3v.firebaseapp.com",
  projectId: "mapcorrect-z5n3v",
  storageBucket: "mapcorrect-z5n3v.firebasestorage.app",
  messagingSenderId: "951132208154",
  appId: "1:951132208154:web:caf0c1abc657aa496b25a3"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages - CRITICAL for lockscreen notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data with fallbacks
  const title = payload.notification?.title || payload.data?.title || 'MapKH Notification';
  const body = payload.notification?.body || payload.data?.body || 'You have a new notification';
  
  // Enhanced notification options for better mobile display
  const notificationOptions = {
    body: body,
    icon: '/icons/icon-192x192.png', // Use PNG for better compatibility
    badge: '/icons/icon-192x192.png',
    tag: payload.data?.tag || 'mapkh-notification',
    data: {
      url: payload.data?.url || '/',
      reportId: payload.data?.reportId,
      type: payload.data?.type || 'general',
      notificationId: payload.data?.notificationId,
      timestamp: Date.now(),
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'Open MapKH'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true, // Keep notification visible
    silent: false, // Ensure sound/vibration
    vibrate: [200, 100, 200, 100, 200], // Longer vibration pattern
    timestamp: Date.now(),
    renotify: true, // Allow re-notification
    sticky: false, // Don't make it sticky
    // Additional options for better mobile support
    dir: 'auto',
    lang: 'en',
    // Force notification to show even if app is in foreground
    showTrigger: true
  };

  console.log('[firebase-messaging-sw.js] Showing notification with options:', notificationOptions);

  // Show the notification - this is critical for lockscreen display
  return self.registration.showNotification(title, notificationOptions)
    .then(() => {
      console.log('[firebase-messaging-sw.js] Notification displayed successfully');
      
      // Update badge count
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(1).catch(err => console.log('Badge update failed:', err));
      }
    })
    .catch(error => {
      console.error('[firebase-messaging-sw.js] Failed to show notification:', error);
    });
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log('[firebase-messaging-sw.js] Found clients:', clientList.length);
      
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[firebase-messaging-sw.js] Focusing existing client');
          // Navigate to specific URL if provided
          if (targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      
      // Open new window if none exists
      console.log('[firebase-messaging-sw.js] Opening new window:', targetUrl);
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }).then(() => {
      // Clear badge when notification is clicked
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(err => console.log('Badge clear failed:', err));
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
  
  // Track dismissal analytics if needed
  if (event.notification.data?.trackDismissal) {
    // Could send analytics data here
  }
});

// Enhanced push event handler for direct push messages
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (!event.data) {
    console.log('[firebase-messaging-sw.js] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push data:', data);
    
    const title = data.notification?.title || data.title || 'MapKH Notification';
    const options = {
      body: data.notification?.body || data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'mapkh-push',
      data: {
        url: data.url || data.data?.url || '/',
        ...data.data
      },
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      timestamp: Date.now(),
      renotify: true,
      actions: [
        { action: 'open', title: 'Open MapKH' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[firebase-messaging-sw.js] Push notification displayed');
          if ('setAppBadge' in navigator) {
            navigator.setAppBadge(1).catch(console.error);
          }
        })
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error processing push event:', error);
  }
});

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[firebase-messaging-sw.js] Firebase messaging service worker loaded and ready');