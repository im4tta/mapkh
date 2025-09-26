// Import the Firebase app and messaging libraries.
// These are imported using importScripts because service workers have a different context than the main app.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration will be injected dynamically
// This prevents exposing sensitive keys in the repository
let firebaseConfig = null;

// Listen for config message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    if (!firebase.apps.length) {
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

// Initialize the Firebase app in the service worker.
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Add an event listener to handle background push messages.
// This is the core logic for showing notifications when the app is not in the foreground.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  // Extract the notification data from the payload.
  // We prioritize the `data` payload fields to ensure consistency.
  const notificationTitle = payload.data?.title || "New Notification";
  const notificationOptions = {
    body: payload.data?.body || "You have a new message.",
    icon: payload.data?.icon || '/icons/icon-192x192.svg', // Default icon
    badge: payload.data?.badge || '/badge-72x72.svg', // Badge for the notification bar
  };

  // Use the service worker's registration to show the notification.
  // This is the command that makes the notification appear on the user's device.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Add a listener for when the user clicks on the notification.
self.addEventListener('notificationclick', function(event) {
  // Close the notification pop-up.
  event.notification.close();

  // Open the app's main page. You can customize this to open a specific URL.
  event.waitUntil(
    clients.openWindow('/')
  );
});

// This is a standard service worker lifecycle event.
// 'skipWaiting' forces the waiting service worker to become the active service worker.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// This is another standard lifecycle event.
// 'clients.claim()' allows an active service worker to take control of the page immediately.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
