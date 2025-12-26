// Enhanced Service Worker for MapKH - Notification System v2.1
// Focuses on proper notification display and lockscreen visibility with Android notification channels

const CACHE_NAME = 'mapkh-v2.1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// Install event - cache static assets and setup notification channel
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(STATIC_ASSETS)),
      setupNotificationChannel()
    ]).then(() => self.skipWaiting())
  );
});

// Setup Android notification channel for better notification display
async function setupNotificationChannel() {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    try {
      // This will be handled by the browser automatically for most cases
      // But we can set up some defaults
      console.log('Setting up notification channel...');
      
      // For Android, the channel will be created automatically by FCM
      // But we can ensure proper notification handling
      if ('setAppBadge' in navigator) {
        await navigator.setAppBadge(0); // Clear any existing badge
      }
    } catch (error) {
      console.log('Notification channel setup not needed or failed:', error);
    }
  }
}

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Enhanced push event handler with better mobile support
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    // Handle both data-only and notification payloads
    const title = data.title || data.notification?.title || 'MapKH Notification';
    const body = data.body || data.notification?.body || 'You have a new notification';
    
    const options = {
      body: body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-192x192.png',
      tag: data.tag || 'mapkh-notification',
      data: {
        url: data.url || data.data?.url || '/',
        timestamp: Date.now(),
        type: data.type || 'general',
        ...data.data
      },
      actions: [
        {
          action: 'open',
          title: 'Open MapKH',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: data.requireInteraction !== 'false',
      silent: data.silent === 'true' ? true : false,
      vibrate: data.vibrate ? data.vibrate.split(',').map(Number) : [200, 100, 200, 100, 200],
      timestamp: data.timestamp ? parseInt(data.timestamp) : Date.now(),
      renotify: data.renotify !== 'false',
      sticky: false,
      // Additional properties for better mobile display
      dir: 'auto',
      lang: 'en'
    };

    console.log('Showing notification with options:', options);

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('Notification displayed successfully');
          // Update badge count
          if ('setAppBadge' in navigator) {
            navigator.setAppBadge(1).catch(console.error);
          }
        })
        .catch(error => {
          console.error('Error displaying notification:', error);
        })
    );
  } catch (error) {
    console.error('Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('MapKH Notification', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'mapkh-fallback',
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open MapKH' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        data: { url: '/' }
      })
    );
  }
});

// Enhanced notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        console.log('Found clients:', clientList.length);
        
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('Focusing existing client');
            // Navigate to the target URL if different
            if (targetUrl !== '/') {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        
        // Open new window if none exists
        console.log('Opening new window:', targetUrl);
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .then(() => {
        // Clear badge when notification is clicked
        if ('clearAppBadge' in navigator) {
          navigator.clearAppBadge().catch(console.error);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal if needed
  if (event.notification.data?.trackDismissal) {
    // Could send analytics or update server
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '2.1' });
  }
  
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(console.error);
    }
  }
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    // Handle test notification from main thread
    self.registration.showNotification('Test from Service Worker', {
      body: 'This is a test notification triggered from the main thread',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'sw-test',
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
});

console.log('MapKH Service Worker v2.1 loaded and ready for enhanced notifications');
      }
    }
    
    badgeCount = stored || 0;
    await updateBadge();
    console.log(`Badge count loaded: ${badgeCount}`);
  } catch (error) {
    console.error('Failed to load badge count:', error);
    badgeCount = 0;
  }
};

// Save badge count to IndexedDB
const saveBadgeCount = async (count) => {
  try {
    badgeCount = count;
    await saveToIndexedDB(BADGE_STORAGE_KEY, count);
    await updateBadge();
    
    // Notify main app of badge count change
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({
        type: 'BADGE_COUNT_UPDATED',
        data: { count }
      });
    });
  } catch (error) {
    console.error('Failed to save badge count:', error);
  }
};

// Update badge on app icon
const updateBadge = async () => {
  try {
    if ('setAppBadge' in navigator) {
      if (badgeCount > 0) {
        await navigator.setAppBadge(badgeCount);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
};

// IndexedDB helper functions
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MapKHNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };
  });
};

const saveToIndexedDB = async (key, value) => {
  const db = await openDB();
  const transaction = db.transaction(['settings'], 'readwrite');
  const store = transaction.objectStore('settings');
  await store.put(value, key);
};

const getFromIndexedDB = async (key) => {
  const db = await openDB();
  const transaction = db.transaction(['settings'], 'readonly');
  const store = transaction.objectStore('settings');
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Store notification in IndexedDB
const storeNotification = async (notification) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    await store.add({
      ...notification,
      timestamp: Date.now(),
      read: false
    });
  } catch (error) {
    console.error('Failed to store notification:', error);
  }
};

// Handle background messages with enhanced features
messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  try {
    // Handle silent notifications
    const isSilent = payload.data?.silent === 'true';
    
    if (isSilent) {
      // Process silent notification without showing UI
      await handleSilentNotification(payload);
      return;
    }
    
    // Load current badge count
    await loadBadgeCount();
    
    // Increment badge count
    const newBadgeCount = badgeCount + 1;
    await saveBadgeCount(newBadgeCount);
    await updateBadge();
    
    // Store notification for later retrieval
    await storeNotification({
      title: payload.notification?.title || payload.data?.title || 'MapKH Notification',
      body: payload.notification?.body || payload.data?.body || 'You have a new notification',
      data: payload.data,
      type: payload.data?.type || 'general',
      timestamp: Date.now(),
      id: payload.data?.notificationId || Date.now().toString()
    });
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'MapKH Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'You have a new notification',
      icon: payload.data?.icon || '/icons/favicon.png',
      badge: '/badge-72x72.svg',
      tag: payload.data?.reportId || payload.data?.notificationId || 'mapkh-notification',
      data: {
        ...payload.data,
        timestamp: Date.now(),
        notificationId: payload.data?.notificationId || Date.now().toString(),
        url: payload.data?.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: payload.data?.actionText || 'View',
          icon: '/icons/favicon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/favicon.png'
        }
      ],
      requireInteraction: payload.data?.requireInteraction !== 'false',
      silent: false,
      vibrate: payload.data?.vibrate ? JSON.parse(payload.data.vibrate) : [200, 100, 200],
      renotify: true,
      timestamp: Date.now()
    };

    console.log('[firebase-messaging-sw.js] Showing notification:', notificationTitle);
    return self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error handling background message:', error);
    
    // Fallback notification
    return self.registration.showNotification('MapKH Notification', {
      body: 'You have a new notification',
      icon: '/icons/favicon.png',
      badge: '/badge-72x72.svg'
    });
  }
});

// Handle silent notifications
const handleSilentNotification = async (payload) => {
  console.log('Processing silent notification:', payload);
  
  try {
    // Update local data without showing notification
    if (payload.data?.type === 'data_sync') {
      await performDataSync(payload.data);
    } else if (payload.data?.type === 'badge_update') {
      const newCount = parseInt(payload.data.badgeCount) || 0;
      await saveBadgeCount(newCount);
    } else if (payload.data?.type === 'cache_update') {
      await updateCache(payload.data);
    }
    
    // Notify any open clients about the silent update
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
      client.postMessage({
        type: 'SILENT_NOTIFICATION_PROCESSED',
        data: payload.data
      });
    });
  } catch (error) {
    console.error('Failed to process silent notification:', error);
  }
};

// Perform data synchronization
const performDataSync = async (data) => {
  try {
    // Sync specific data based on the payload
    console.log('Performing data sync:', data);
    
    // This could include:
    // - Fetching new reports
    // - Updating user notifications
    // - Refreshing analytics data
    
    if (data.syncType === 'reports') {
      // Fetch and cache new reports
      await syncReports(data);
    } else if (data.syncType === 'notifications') {
      // Sync notification status
      await syncNotifications(data);
    }
  } catch (error) {
    console.error('Data sync failed:', error);
  }
};

// Update cache with new data
const updateCache = async (data) => {
  try {
    const cache = await caches.open('mapkh-data-cache');
    
    if (data.cacheKey && data.cacheData) {
      const response = new Response(JSON.stringify(data.cacheData), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(data.cacheKey, response);
    }
  } catch (error) {
    console.error('Cache update failed:', error);
  }
};

// Sync reports data
const syncReports = async (data) => {
  // Implementation for syncing reports
  console.log('Syncing reports:', data);
};

// Sync notifications data
const syncNotifications = async (data) => {
  // Implementation for syncing notifications
  console.log('Syncing notifications:', data);
};

// Handle notification click events with badge management
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked:', event.notification?.data);
  
  // Close notification safely
  try {
    event.notification.close();
  } catch (error) {
    console.warn('[sw.js] Failed to close notification:', error);
  }
  
  const data = event.notification?.data || {};
  const action = event.action;
  
  if (action === 'dismiss') {
    // Just close the notification and update badge
    event.waitUntil(
      (async () => {
        try {
          await loadBadgeCount();
          const newCount = Math.max(0, badgeCount - 1);
          await saveBadgeCount(newCount);
          await updateBadge();
        } catch (error) {
          console.error('[sw.js] Error handling dismiss action:', error);
        }
      })()
    );
    return;
  }
  
  // Determine URL to open with safe fallbacks
  let urlToOpen = '/analytics';
  
  try {
    if (action === 'view') {
      if (data?.reportId) {
        urlToOpen = `/records/${data.reportId}`;
      } else if (data?.url) {
        urlToOpen = data.url;
      } else if (data?.type === 'verification' && data?.recordId) {
        urlToOpen = `/records/${data.recordId}/verification`;
      } else if (data?.type === 'team_invite' && data?.teamId) {
        urlToOpen = `/teams/${data.teamId}`;
      }
    } else {
      // Default action - use data URL or fallback
      urlToOpen = data?.url || '/analytics';
    }
  } catch (error) {
    console.warn('[sw.js] Error determining URL, using fallback:', error);
    urlToOpen = '/analytics';
  }
  
  event.waitUntil(
    (async () => {
      try {
        // Get all clients with error handling
        let clientList = [];
        try {
          clientList = await clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
          });
        } catch (error) {
          console.warn('[sw.js] Failed to get client list:', error);
        }
        
        // Check if there's already a window/tab open
        let clientFound = false;
        for (const client of clientList) {
          try {
            if (client.url && client.url.includes(new URL(urlToOpen, self.location.origin).pathname)) {
              if ('focus' in client) {
                await client.focus();
              }
              // Send message to client to navigate to specific URL
              if ('postMessage' in client) {
                client.postMessage({
                  type: 'NOTIFICATION_CLICK',
                  url: urlToOpen,
                  data: data
                });
              }
              clientFound = true;
              break;
            }
          } catch (error) {
            console.warn('[sw.js] Error handling client:', error);
            continue;
          }
        }
        
        // If no existing window/tab, open a new one
        if (!clientFound && clients.openWindow) {
          try {
            await clients.openWindow(urlToOpen);
          } catch (error) {
            console.warn('[sw.js] Failed to open specific URL, trying fallback:', error);
            try {
              await clients.openWindow('/');
            } catch (fallbackError) {
              console.error('[sw.js] Failed to open fallback URL:', fallbackError);
            }
          }
        }
      } catch (error) {
        console.error('[sw.js] Error in notification click handler:', error);
        // Final fallback: try to open the main URL
        try {
          if (clients.openWindow) {
            await clients.openWindow('/');
          }
        } catch (fallbackError) {
          console.error('[sw.js] Final fallback failed:', fallbackError);
        }
      } finally {
        // Mark notification as read and update badge with error handling
        try {
          if (data?.notificationId) {
            await markNotificationAsRead(data.notificationId);
          }
        } catch (error) {
          console.warn('[sw.js] Failed to mark notification as read:', error);
        }
        
        try {
          // Update badge count
          await loadBadgeCount();
          const newCount = Math.max(0, badgeCount - 1);
          await saveBadgeCount(newCount);
          await updateBadge();
        } catch (error) {
          console.warn('[sw.js] Error updating badge after notification click:', error);
        }
      }
    })()
  );
});

// Handle navigation from notifications (legacy function - kept for compatibility)
const handleNotificationNavigation = async (url, data) => {
  try {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // Check if app is already open
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        await client.focus();
        client.postMessage({ 
          type: 'NAVIGATE_TO', 
          url,
          data,
          source: 'notification'
        });
        return;
      }
    }
    
    // If app is not open, open it
    if (clients.openWindow) {
      await clients.openWindow(self.location.origin + url);
    }
  } catch (error) {
    console.error('[sw.js] Navigation failed:', error);
    // Fallback: open main app
    if (clients.openWindow) {
      await clients.openWindow(self.location.origin);
    }
  }
};

// Mark notification as read
const markNotificationAsRead = async (notificationId) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    // Find and update the notification
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const notification = cursor.value;
        if (notification.data?.notificationId === notificationId) {
          notification.read = true;
          cursor.update(notification);
        }
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

// Handle push events (for additional processing)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push data:', data);
      
      // Show notification for push events when app is closed
      const notificationTitle = data.notification?.title || data.data?.title || 'MapKH Notification';
      const notificationOptions = {
        body: data.notification?.body || data.data?.body || 'You have a new notification',
        icon: data.data?.icon || '/icons/favicon.png',
        badge: '/badge-72x72.svg',
        tag: data.data?.reportId || data.data?.notificationId || 'mapkh-push',
        data: {
          ...data.data,
          timestamp: Date.now(),
          notificationId: data.data?.notificationId || Date.now().toString()
        },
        requireInteraction: data.data?.requireInteraction !== 'false',
        silent: false,
        vibrate: data.data?.vibrate ? JSON.parse(data.data.vibrate) : [200, 100, 200],
        renotify: true,
        timestamp: Date.now()
      };
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
          .then(() => {
            // Update badge count
            return saveBadgeCount(badgeCount + 1);
          })
      );
    } catch (error) {
      console.error('Error processing push event:', error);
    }
  }
});

// Cache management functions
const cacheAssets = async () => {
  try {
    const staticCache = await caches.open(STATIC_CACHE);
    await staticCache.addAll(STATIC_ASSETS);
    console.log('Static assets cached successfully');
  } catch (error) {
    console.error('Failed to cache static assets:', error);
  }
};

const cleanupOldCaches = async () => {
  try {
    const cacheNames = await caches.keys();
    const currentCacheNames = Object.values(CURRENT_CACHES);
    
    // Delete all caches that don't match current version
    const oldCaches = cacheNames.filter(name => 
      name.startsWith(CACHE_PREFIX) && !currentCacheNames.includes(name)
    );
    
    console.log(`Cleaning up ${oldCaches.length} old caches:`, oldCaches);
    
    await Promise.all(
      oldCaches.map(async (cacheName) => {
        console.log(`Deleting cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
    
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
};

// Force complete cache cleanup for major version updates
const forceCompleteCacheCleanup = async () => {
  try {
    console.log('Performing complete cache cleanup for version update...');
    
    // Get all cache names
    const cacheNames = await caches.keys();
    
    // Delete ALL caches with our prefix (complete reset)
    const allOurCaches = cacheNames.filter(name => name.startsWith(CACHE_PREFIX));
    
    console.log(`Force deleting ${allOurCaches.length} caches:`, allOurCaches);
    
    await Promise.all(
      allOurCaches.map(async (cacheName) => {
        console.log(`Force deleting cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
    
    // Clear IndexedDB storage for notifications and badges
    try {
      await clearIndexedDBData();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
    
    console.log('Complete cache cleanup finished');
    
    // Notify clients about the forced update
    await notifyClientsOfForceUpdate();
    
  } catch (error) {
    console.error('Force cache cleanup failed:', error);
  }
};

// Clear IndexedDB data for fresh start
const clearIndexedDBData = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications', 'settings'], 'readwrite');
    
    // Clear notifications
    const notificationStore = transaction.objectStore('notifications');
    await notificationStore.clear();
    
    // Clear settings but preserve user preferences
    const settingsStore = transaction.objectStore('settings');
    const keysToDelete = [BADGE_STORAGE_KEY, UPDATE_NOTIFICATION_KEY, VERSION_STORAGE_KEY];
    
    for (const key of keysToDelete) {
      try {
        await settingsStore.delete(key);
      } catch (error) {
        console.warn(`Failed to delete ${key}:`, error);
      }
    }
    
    await transaction.complete;
    console.log('IndexedDB cleanup completed');
  } catch (error) {
    console.error('IndexedDB cleanup failed:', error);
  }
};

// Check if force update is needed
const checkForceUpdate = async () => {
  try {
    const storedVersion = await getFromIndexedDB(VERSION_STORAGE_KEY);
    const forceUpdate = await getFromIndexedDB(FORCE_UPDATE_KEY);
    
    console.log(`Stored version: ${storedVersion}, Current version: ${APP_VERSION}, Force update: ${forceUpdate}`);
    
    // If no stored version or version mismatch, or force update flag is set
    if (!storedVersion || storedVersion !== APP_VERSION || forceUpdate) {
      console.log('Version mismatch or force update detected, performing complete cache cleanup');
      await forceCompleteCacheCleanup();
      
      // Update stored version
      await saveToIndexedDB(VERSION_STORAGE_KEY, APP_VERSION);
      
      // Clear force update flag
      await saveToIndexedDB(FORCE_UPDATE_KEY, false);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Force update check failed:', error);
    return false;
  }
};

// Force clear icon caches specifically
const forceIconCacheRefresh = async () => {
  try {
    console.log('Force refreshing icon caches...');
    const cache = await caches.open(STATIC_CACHE);
    
    // List of all icon files to force refresh
    const iconFiles = [
      '/favicon-32x32.svg',
      '/icons/icon-192x192.svg', 
      '/icons/icon-512x512.svg',
      '/khmer-flag-pin-icon.svg',
      '/khmer-flag-pin-maskable.svg',
      '/apple-touch-icon-khmer.svg',
      '/manifest.json' // Also refresh manifest since it references icons
    ];
    
    // Delete existing cached versions
    await Promise.all(
      iconFiles.map(async (url) => {
        await cache.delete(url);
        console.log(`Cleared cache for: ${url}`);
      })
    );
    
    console.log('Icon cache refresh completed');
  } catch (error) {
    console.error('Icon cache refresh failed:', error);
  }
};

// Force cache refresh for critical assets
const refreshCriticalAssets = async () => {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const criticalAssets = [
      '/',
      '/manifest.json',
      '/sw.js', // Self-update
      // Force refresh all icon files with cache-busting
      `/favicon-32x32.svg?v=${SW_VERSION}&t=${Date.now()}`,
      `/icons/icon-192x192.svg?v=${SW_VERSION}&t=${Date.now()}`,
      `/icons/icon-512x512.svg?v=${SW_VERSION}&t=${Date.now()}`,
      `/khmer-flag-pin-icon.svg?v=${SW_VERSION}&t=${Date.now()}`,
      `/khmer-flag-pin-maskable.svg?v=${SW_VERSION}&t=${Date.now()}`,
      `/apple-touch-icon-khmer.svg?v=${SW_VERSION}&t=${Date.now()}`
    ];
    
    await Promise.all(
      criticalAssets.map(async (url) => {
        try {
          const response = await fetch(url, { 
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          if (response.ok) {
            // Store without query parameters for clean cache keys
            const cleanUrl = url.split('?')[0];
            await cache.put(cleanUrl, response);
            console.log(`Refreshed and cached: ${cleanUrl}`);
          }
        } catch (error) {
          console.warn(`Failed to refresh ${url}:`, error);
        }
      })
    );
  } catch (error) {
    console.error('Failed to refresh critical assets:', error);
  }
};

// Cache strategy implementations
const cacheFirst = async (request) => {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return caches.match('/offline.html');
  }
};

const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Network first failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
};

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${SW_VERSION} installing`);
  
  // Show update notification to user
  self.registration.showNotification('MapKH Update Available', {
    body: 'A new version of MapKH is available. Restart the app to update.',
    icon: '/icons/icon-192x192.svg',
    badge: '/badge-72x72.svg',
    tag: 'app-update',
    requireInteraction: true,
    actions: [
      {
        action: 'update',
        title: 'Update Now'
      },
      {
        action: 'dismiss',
        title: 'Later'
      }
    ],
    data: {
      type: 'app-update',
      version: SW_VERSION
    }
  });
  
  event.waitUntil(
    Promise.all([
      forceIconCacheRefresh(), // Clear icon caches first
      cacheAssets(),
      refreshCriticalAssets(),
      loadBadgeCount(),
      self.skipWaiting() // Force activation of new service worker
    ])
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${SW_VERSION} activating`);
  
  event.waitUntil(
    (async () => {
      try {
        // Check if force update is needed first
        const forceUpdatePerformed = await checkForceUpdate();
        
        // Perform standard activation tasks
        await Promise.all([
          self.clients.claim(),
          // Enable navigation preload to improve first-load performance on mobile
          (async () => {
            try {
              if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
              }
            } catch (e) {
              // Ignore if not supported
            }
          })(),
          loadBadgeCount(),
          forceUpdatePerformed ? Promise.resolve() : cleanupOldCaches(), // Skip if force cleanup already done
          notifyClientsOfUpdate()
        ]);
        
        console.log(`Service Worker v${SW_VERSION} activated successfully`);
      } catch (error) {
        console.error('Service Worker activation failed:', error);
      }
    })()
  );
});

// Notify clients that update is complete
const notifyClientsOfUpdate = async () => {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_UPDATED',
      version: SW_VERSION,
      message: 'Service Worker updated successfully'
    });
  });
};

// Notify clients about forced cache cleanup and app update
const notifyClientsOfForceUpdate = async () => {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'FORCE_UPDATE_COMPLETED',
      version: APP_VERSION,
      swVersion: SW_VERSION,
      message: 'App has been updated with cache cleanup. Please refresh for the latest version.',
      action: 'REFRESH_REQUIRED'
    });
  });
  
  // Also show a notification to the user
  try {
    await self.registration.showNotification('MapKH Updated! 🎉', {
      body: 'Your app has been updated with new features and improvements. Tap to refresh.',
      icon: '/apple-touch-icon-152x152.png',
      badge: '/apple-touch-icon-120x120.png',
      tag: 'app-update',
      requireInteraction: true,
      actions: [
        {
          action: 'refresh',
          title: 'Refresh Now'
        },
        {
          action: 'dismiss',
          title: 'Later'
        }
      ],
      data: {
        type: 'app-update',
        url: '/',
        action: 'refresh'
      }
    });
  } catch (error) {
    console.warn('Failed to show update notification:', error);
  }
};

// Handle fetch events with cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // IMPORTANT: Do not intercept cross-origin requests (Firebase/Firestore/etc.)
  // Intercepting and caching these can break streaming APIs and cause mobile failures.
  if (url.origin !== self.location.origin) {
    return; // Let the browser handle it normally
  }

  // Ensure navigations (HTML document requests) always go to network first
  // This prevents serving a cached root shell ('/') for all routes on mobile
  // and fixes the issue where the app appears stuck on the dashboard.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Bypass caches for navigation to avoid stale shell
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch (err) {
          // Fallback to offline page if available
          const offline = await caches.match('/offline.html');
          return offline || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }
  
  // Handle different types of requests with appropriate cache strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests: Network first with cache fallback
    event.respondWith(networkFirst(request));
  } else if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    // Static assets: Cache first
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    // Static resources: Stale while revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // HTML pages: Network first with cache fallback
    event.respondWith(networkFirst(request));
  }
});

// Note: App update notification clicks are handled in the main notification click handler above

// Programmatic update check
const checkForUpdates = async () => {
  try {
    const registration = await self.registration.update();
    console.log('Update check completed');
    return registration;
  } catch (error) {
    console.error('Update check failed:', error);
    return null;
  }
};

// Schedule periodic update checks
setInterval(() => {
  checkForUpdates();
}, 60000 * 30); // Check every 30 minutes

// Handle sync events for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(performBackgroundSync());
      break;
    case 'notification-sync':
      event.waitUntil(syncNotificationStatus());
      break;
    case 'report-sync':
      event.waitUntil(syncPendingReports());
      break;
    case 'badge-sync':
      event.waitUntil(syncBadgeCount());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Enhanced background sync function
const performBackgroundSync = async () => {
  try {
    console.log('Performing comprehensive background sync');
    
    // Sync multiple data types
    await Promise.all([
      syncPendingReports(),
      syncNotificationStatus(),
      syncBadgeCount(),
      updateLocalCache()
    ]);
    
    console.log('Background sync completed successfully');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
};

// Sync pending reports
const syncPendingReports = async () => {
  try {
    // Implementation for syncing pending reports
    console.log('Syncing pending reports');
  } catch (error) {
    console.error('Failed to sync pending reports:', error);
  }
};

// Sync notification status
const syncNotificationStatus = async () => {
  try {
    // Sync read/unread status with server
    const unreadCount = await getUnreadNotificationCount();
    await saveBadgeCount(unreadCount);
    console.log('Notification status synced');
  } catch (error) {
    console.error('Failed to sync notification status:', error);
  }
};

// Sync badge count with server
const syncBadgeCount = async () => {
  try {
    // This would typically fetch the actual unread count from your server
    // For now, we'll use the local count
    const localCount = await getUnreadNotificationCount();
    await saveBadgeCount(localCount);
    console.log('Badge count synced:', localCount);
  } catch (error) {
    console.error('Failed to sync badge count:', error);
  }
};

// Update local cache
const updateLocalCache = async () => {
  try {
    // Update various cached data
    console.log('Updating local cache');
  } catch (error) {
    console.error('Failed to update local cache:', error);
  }
};

// Initialize badge count on startup
loadBadgeCount();

// Handle message events from the main app
self.addEventListener('message', async (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'UPDATE_BADGE_COUNT':
      await saveBadgeCount(data.count || 0);
      await updateBadge();
      break;
      
    case 'UPDATE_BADGE':
      await saveBadgeCount(data.count || 0);
      await updateBadge();
      break;
      
    case 'CLEAR_BADGE':
      await saveBadgeCount(0);
      await updateBadge();
      break;
      
    case 'UPDATE_BADGE_NOTIFICATION':
      // For mobile devices that need notification-based badge updates
      await saveBadgeCount(data.count || 0);
      await updateBadge();
      // Create a silent notification for badge update on some mobile platforms
      if (data.count > 0) {
        try {
          await self.registration.showNotification('MapKH', {
            body: `You have ${data.count} unread notification${data.count > 1 ? 's' : ''}`,
            badge: '/icon-192x192.png',
            icon: '/icon-192x192.png',
            tag: 'badge-update',
            silent: true,
            data: { type: 'badge-update', count: data.count }
          });
        } catch (error) {
          console.warn('Failed to show badge notification:', error);
        }
      }
      break;
      
    case 'MARK_NOTIFICATIONS_READ':
      if (data.notificationIds) {
        for (const id of data.notificationIds) {
          await markNotificationAsRead(id);
        }
        // Recalculate badge count
        const unreadCount = await getUnreadNotificationCount();
        await saveBadgeCount(unreadCount);
      }
      break;
      
    case 'GET_BADGE_COUNT':
      // Send current badge count back to main app
      event.ports[0]?.postMessage({
        type: 'BADGE_COUNT_RESPONSE',
        count: badgeCount
      });
      break;
      
    case 'REQUEST_NOTIFICATION_PERMISSION':
      // Handle permission request from main app
      event.ports[0]?.postMessage({
        type: 'PERMISSION_STATUS',
        permission: Notification.permission
      });
      break;
      
    case 'CHECK_FOR_UPDATES':
      // Programmatic update check
      event.waitUntil(
        checkForUpdates().then(registration => {
          // Send result back to client
          event.ports[0]?.postMessage({
            type: 'UPDATE_CHECK_RESULT',
            updateAvailable: !!registration,
            version: SW_VERSION
          });
        }).catch(error => {
          event.ports[0]?.postMessage({
            type: 'UPDATE_CHECK_ERROR',
            error: error.message
          });
        })
      );
      break;
      
    case 'FORCE_UPDATE':
      // Force service worker update
      self.skipWaiting();
      break;
      
    case 'SYNC_DATA':
      await performDataSync(data);
      break;
      
    case 'TEST_BACKGROUND_NOTIFICATION':
      // Handle test background notification
      console.log('Test background notification requested:', data.notification);
      
      try {
        const notification = data.notification;
        
        // Show the test notification
        await self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          tag: notification.tag,
          data: notification.data,
          actions: notification.actions,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
        
        console.log('Test background notification displayed successfully');
        
      } catch (error) {
        console.error('Failed to display test background notification:', error);
      }
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Get unread notification count
const getUnreadNotificationCount = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readonly');
    const store = transaction.objectStore('notifications');
    
    return new Promise((resolve, reject) => {
      let count = 0;
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!cursor.value.read) {
            count++;
          }
          cursor.continue();
        } else {
          resolve(count);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
};