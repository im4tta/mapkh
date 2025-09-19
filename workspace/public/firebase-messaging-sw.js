// Import the Firebase app and messaging packages
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration will be injected dynamically
// This prevents exposing sensitive keys in the repository
let firebaseConfig = null;

// Listen for config message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
  }
});

// Fallback config for development (use environment-specific values)
if (!firebaseConfig) {
  firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
  };
}

// Initialize Firebase
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// If you want to handle messages in the background, listen for the 'push' event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  let data = {
    title: 'New Message',
    body: 'You have a new update.',
    icon: '/icon.png',
    badge: '/badge.png'
  };

  if (event.data) {
    try {
      // The payload from FCM is a string, so we need to parse it
      const payload = JSON.parse(event.data.text());
      // The actual notification data is nested under 'data'
      if (payload.data) {
        data = {
          title: payload.data.title || data.title,
          body: payload.data.body || data.body,
          icon: payload.data.icon || data.icon,
          badge: payload.data.badge || data.badge,
        };
      }
    } catch (e) {
      console.error('Push event data was not valid JSON.', e, 'Raw data:', event.data.text());
    }
  }

  const title = data.title;
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
  };

  const notificationPromise = self.registration.showNotification(title, options);
  event.waitUntil(notificationPromise);
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// This is required to ensure the service worker takes control immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
