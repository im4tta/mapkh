'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import {
  initializePushNotifications,
  onMessageListener,
  showLocalNotification,
  saveFCMToken,
  getStoredFCMToken
} from '@/lib/firebase-messaging';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

interface PushNotificationManagerProps {
  className?: string;
}

export function PushNotificationManager({ className }: PushNotificationManagerProps) {
  const [user] = useAuthState(auth);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Check notification permission status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkPermission = () => {
        const permission = Notification.permission;
        setNotificationsEnabled(permission === 'granted');
        
        // Check for stored token
        const storedToken = getStoredFCMToken();
        if (storedToken && permission === 'granted') {
          setFcmToken(storedToken);
        }
      };
      
      checkPermission();
    }
  }, []);

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (user && !fcmToken && !isInitializing) {
      initializeNotifications();
    }
  }, [user, fcmToken, isInitializing]);

  // Listen for foreground messages
  useEffect(() => {
    if (notificationsEnabled) {
      const unsubscribe = onMessageListener((payload) => {
        console.log('Foreground message received:', payload);
        
        // Show toast notification for foreground messages
        toast(payload.notification?.title || 'New Notification', {
          description: payload.notification?.body,
          action: {
            label: 'View',
            onClick: () => {
              if (payload.data?.reportId) {
                window.location.href = `/reports/${payload.data.reportId}`;
              } else {
                window.location.href = '/analytics';
              }
            }
          }
        });
        
        // Also show browser notification if app is not focused
        if (document.hidden) {
          showLocalNotification(
            payload.notification?.title || 'MapKH Notification',
            payload.notification?.body || 'You have a new notification',
            payload.data
          );
        }
      });
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [notificationsEnabled]);

  const initializeNotifications = async () => {
    if (!user) return;
    
    setIsInitializing(true);
    
    try {
      const token = await initializePushNotifications();
      
      if (token) {
        setFcmToken(token);
        setNotificationsEnabled(true);
        
        // Save token to user profile
        await saveFCMToken(token);
        
        toast.success('Push notifications enabled!', {
          description: 'You will now receive notifications even when the app is closed.'
        });
        
        // Test notification
        setTimeout(() => {
          showLocalNotification(
            'MapKH Notifications Enabled',
            'You will now receive real-time updates about reports and activities.',
            { test: true }
          );
        }, 2000);
      } else {
        toast.error('Failed to enable notifications', {
          description: 'Please check your browser settings and try again.'
        });
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      toast.error('Notification setup failed', {
        description: 'Please check your browser permissions and try again.'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      // Disable notifications (clear token)
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_token_user');
      setFcmToken(null);
      setNotificationsEnabled(false);
      
      toast.info('Notifications disabled', {
        description: 'You can re-enable them anytime from this button.'
      });
    } else {
      // Enable notifications
      await initializeNotifications();
    }
  };

  const testNotification = () => {
    showLocalNotification(
      'Test Notification',
      'This is a test notification to verify push notifications are working correctly.',
      { test: true, timestamp: Date.now() }
    );
    
    toast.success('Test notification sent!');
  };

  if (!user) {
    return null; // Don't show for non-authenticated users
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant={notificationsEnabled ? "default" : "outline"}
        size="sm"
        onClick={handleToggleNotifications}
        disabled={isInitializing}
        className="flex items-center gap-2"
      >
        {notificationsEnabled ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {isInitializing ? 'Setting up...' : notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
      </Button>
      
      {notificationsEnabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={testNotification}
          className="text-xs"
        >
          Test
        </Button>
      )}
      
      {fcmToken && (
        <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={fcmToken}>
          Token: {fcmToken.substring(0, 20)}...
        </div>
      )}
    </div>
  );
}

export default PushNotificationManager;