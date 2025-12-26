/**
 * Complete Notification System Rewrite
 * Handles FCM, Web Push, and in-app notifications with proper lockscreen display
 * Enhanced for mobile devices with automatic permission requests
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  url?: string;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class NotificationSystem {
  private messaging: any = null;
  private isInitialized = false;
  private currentToken: string | null = null;
  private userId: string | null = null;
  private permissionRequested = false;

  async initialize(userId?: string) {
    if (this.isInitialized) return;
    
    try {
      this.userId = userId || null;
      
      // Initialize Firebase Messaging
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        this.messaging = getMessaging(app);
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Automatically request permission and get token
        await this.requestPermissionAndGetToken();
        
        // Set up foreground message handler
        this.setupForegroundMessageHandler();
        
        this.isInitialized = true;
        console.log('Notification system initialized successfully');
        
        // Show a welcome notification if permission was just granted
        if (this.currentToken && !this.permissionRequested) {
          setTimeout(() => {
            this.showWelcomeNotification();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to initialize notification system:', error);
    }
  }

  private async registerServiceWorker() {
    try {
      // Register the main service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  private async requestPermissionAndGetToken() {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      // Get current permission status
      let permission = Notification.permission;
      
      // If permission is default, request it automatically
      if (permission === 'default') {
        console.log('Requesting notification permission...');
        permission = await Notification.requestPermission();
        this.permissionRequested = true;
      }

      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        // Still try to initialize without notifications
        return null;
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });

      if (token) {
        this.currentToken = token;
        console.log('FCM token obtained:', token);
        
        // Register token with server
        if (this.userId) {
          await this.registerTokenWithServer(this.userId, token);
        }
        
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private async registerTokenWithServer(userId: string, token: string) {
    try {
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, token }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token with server');
      }

      console.log('Token registered with server successfully');
    } catch (error) {
      console.error('Error registering token with server:', error);
    }
  }

  private setupForegroundMessageHandler() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification when app is in foreground
      this.showNotification({
        title: payload.notification?.title || 'MapKH Notification',
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/icons/icon-192x192.png',
        badge: payload.data?.badge || '/icons/icon-192x192.png',
        tag: payload.data?.tag || 'mapkh-notification',
        data: payload.data,
        url: payload.data?.url,
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    });
  }

  private async showWelcomeNotification() {
    await this.showNotification({
      title: 'MapKH Notifications Enabled',
      body: 'You will now receive real-time updates about reports and activities.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'mapkh-welcome',
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Open MapKH' },
        { action: 'dismiss', title: 'Got it' }
      ]
    });
  }

  async showNotification(payload: NotificationPayload) {
    try {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('Notifications not supported');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions: any = {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        tag: payload.tag || 'mapkh-notification',
        data: {
          url: payload.url || '/',
          timestamp: Date.now(),
          ...payload.data
        },
        requireInteraction: payload.requireInteraction !== false,
        silent: payload.silent || false,
        vibrate: [200, 100, 200], // Vibration pattern for mobile
        timestamp: payload.timestamp || Date.now(),
        renotify: true, // Allow re-notification with same tag
        sticky: false // Don't make it sticky
      };

      // Add actions if supported
      if (payload.actions && payload.actions.length > 0) {
        notificationOptions.actions = payload.actions;
      }

      // Show the notification
      await registration.showNotification(payload.title, notificationOptions);
      
      console.log('Notification displayed successfully');
      
      // Update badge count
      if ('setAppBadge' in navigator) {
        try {
          await (navigator as any).setAppBadge(1);
        } catch (error) {
          console.warn('Badge API not supported:', error);
        }
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async sendTestNotification() {
    if (!this.currentToken) {
      throw new Error('No FCM token available. Please enable notifications first.');
    }

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.currentToken,
          title: 'MapKH Test Notification',
          body: 'This is a test notification to verify the system is working correctly. You should see this on your lockscreen.',
          data: {
            type: 'test',
            url: '/',
            timestamp: Date.now().toString()
          }
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test notification');
      }

      console.log('Test notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        return false;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Re-initialize to get token
        await this.requestPermissionAndGetToken();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  async updateUserId(userId: string) {
    this.userId = userId;
    if (this.currentToken) {
      await this.registerTokenWithServer(userId, this.currentToken);
    }
  }

  // Force re-initialization (useful for debugging)
  async reinitialize(userId?: string) {
    this.isInitialized = false;
    this.currentToken = null;
    this.permissionRequested = false;
    await this.initialize(userId);
  }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem();

// Helper functions
export async function initializeNotifications(userId?: string) {
  return notificationSystem.initialize(userId);
}

export async function showNotification(payload: NotificationPayload) {
  return notificationSystem.showNotification(payload);
}

export async function sendTestNotification() {
  return notificationSystem.sendTestNotification();
}

export async function requestNotificationPermission(): Promise<boolean> {
  return notificationSystem.requestPermission();
}

export function getNotificationPermissionStatus(): NotificationPermission {
  return notificationSystem.getPermissionStatus();
}

export function isNotificationSupported(): boolean {
  return notificationSystem.isSupported();
}

export function getCurrentNotificationToken(): string | null {
  return notificationSystem.getCurrentToken();
}

// Auto-initialize when module loads (for immediate permission request)
if (typeof window !== 'undefined') {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    if (Notification.permission === 'default') {
      console.log('Auto-requesting notification permission...');
      notificationSystem.requestPermission();
    }
  }, 2000);
}