

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  fetchToken, 
  onMessageListener, 
  requestNotificationPermission, 
  initializePushNotifications,
  initializeBadgeSync,
  updateBadgeCount,
  clearBadge,
  getBadgeCount,
  markNotificationsAsRead
} from '@/lib/firebase-messaging';
import {
  initializeWebPush,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  isWebPushSupported,
  testWebPushNotification
} from '@/lib/web-push';
import { 
  detectMobileEnvironment, 
  getNotificationCapabilities, 
  supportsFullNotifications,
  getNotificationSupportMessage
} from '@/lib/mobile-detection';
import { testBackgroundNotifications } from '@/lib/notification-test';
import { usePWAUpdate, UpdateCheckResult } from '@/lib/pwa-update';
import { 
  initializeBackgroundSync,
  triggerDataSync,
  triggerNotificationSync,
  getSyncStatus
} from '@/lib/background-sync';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BellRing, BellOff } from 'lucide-react';

interface PushNotificationContextType {
  permission: NotificationPermission;
  token: string | null;
  badgeCount: number;
  webPushSupported: boolean;
  isSupported: boolean;
  hasPermission: boolean;
  isInitialized: boolean;
  requestPermission: () => Promise<void>;
  updateBadge: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  triggerSync: (syncType: 'reports' | 'notifications' | 'analytics' | 'user_data', data?: any) => Promise<void>;
  getSyncStatus: () => { queueSize: number; isOnline: boolean; failedSyncs: number };
  testWebPush: () => Promise<void>;
  testBackgroundNotifications: () => Promise<void>;
  checkForUpdates: () => Promise<UpdateCheckResult>;
  forceUpdate: () => Promise<void>;
  isUpdateAvailable: boolean;
  isMobile: boolean;
  isPWA: boolean;
  capabilities: {
    canRequestPermission: boolean;
    canShowNotifications: boolean;
    canUseBadging: boolean;
    canUseWebPush: boolean;
    requiresInstallation: boolean;
    limitations: string[];
  };
  supportMessage: string;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export const usePushNotification = () => {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotification must be used within a PushNotificationProvider');
  }
  return context;
};

const EnableNotificationsButton: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isClient, setIsClient] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      // Load initial badge count
      setBadgeCount(getBadgeCount());
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const result = await requestNotificationPermission();
      if (result === true) {
        const token = await fetchToken();
        if (token) {
          console.log('FCM Token:', token);
          // Initialize badge synchronization
          await initializeBadgeSync();
          toast({
            title: "Notifications Enabled",
            description: "You will now receive push notifications with badge updates.",
          });
        }
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
      setPermission(Notification.permission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBadge = async (count: number) => {
    try {
      await updateBadgeCount(count);
      setBadgeCount(count);
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  };

  const handleClearBadge = async () => {
    try {
      await clearBadge();
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await markNotificationsAsRead(notificationIds);
      // Update badge count after marking as read
      const newCount = Math.max(0, badgeCount - notificationIds.length);
      await handleUpdateBadge(newCount);
      // Trigger notification sync to update server
      await triggerNotificationSync({ markedAsRead: notificationIds });
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  if (!isClient) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-green-600 dark:text-green-400">
          ✓ Notifications enabled
        </div>
        {badgeCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Badge: {badgeCount}
            </span>
            <button
              onClick={handleClearBadge}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        ✗ Notifications blocked. Please enable in browser settings.
      </div>
    );
  }

  return (
    <Button onClick={handleRequestPermission} variant="ghost" size="icon">
      {(permission as NotificationPermission) === 'denied' ? (
        <>
          <BellOff className="h-5 w-5" />
          <span className="sr-only">Notifications Denied</span>
        </>
      ) : (
        <>
          <BellRing className="h-5 w-5" />
           <span className="sr-only">Enable Notifications</span>
        </>
      )}
    </Button>
  );
};


interface PushNotificationProviderProps {
  children: ReactNode;
}

const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [webPushSupported] = useState(isWebPushSupported());
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [backgroundSyncCleanup, setBackgroundSyncCleanup] = useState<(() => void) | null>(null);
  const [mobileDetection, setMobileDetection] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const { toast } = useToast();
  const { checkForUpdates, forceUpdate, isUpdateAvailable, onUpdateAvailable } = usePWAUpdate();

  const handleNewNotification = useCallback(async (payload: any) => {
    console.log('Received foreground message:', payload);
    
    // Increment badge count for foreground notifications
    const newCount = badgeCount + 1;
    await updateBadgeCount(newCount);
    setBadgeCount(newCount);
    
    // Show toast notification when app is in foreground
    toast({
      title: payload.notification?.title || payload.data?.title || 'New Notification',
      description: payload.notification?.body || payload.data?.body || 'You have a new notification',
    });
  }, [badgeCount, toast]);

  const handleUpdateBadge = async (count: number) => {
    try {
      await updateBadgeCount(count);
      setBadgeCount(count);
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  };

  const handleClearBadge = async () => {
    try {
      await clearBadge();
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await markNotificationsAsRead(notificationIds);
      // Update badge count after marking as read
      const newCount = Math.max(0, badgeCount - notificationIds.length);
      await handleUpdateBadge(newCount);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Detect mobile environment and capabilities
        const detection = detectMobileEnvironment();
        const caps = getNotificationCapabilities();
        const message = getNotificationSupportMessage();
        
        setMobileDetection(detection);
        setCapabilities(caps);
        setSupportMessage(message);

        // Check if notifications are supported in current environment
        const supported = caps.canShowNotifications && ('Notification' in window || caps.canRequestPermission);
        setIsSupported(supported);

        if (!supported) {
          console.log('Push notifications not supported in this environment:', message);
          
          // Show informative message for mobile users
          if (caps.requiresInstallation) {
            toast({
              title: "Install App for Notifications",
              description: "Add this app to your home screen to enable notifications and badges.",
              duration: 5000,
            });
          }
          
          setIsInitialized(true);
          return;
        }

        // Set initial permission state
        if ('Notification' in window) {
          const currentPermission = Notification.permission;
          setPermission(currentPermission);
          setHasPermission(currentPermission === 'granted');
        }
        
        // Load initial badge count if badging is supported
        if (caps.canUseBadging) {
          setBadgeCount(getBadgeCount());
        }
        
        // Initialize Firebase messaging if supported
        if (caps.canShowNotifications) {
          await initializePushNotifications();
        }
        
        // Initialize badge synchronization if permission is granted
        if ('Notification' in window && Notification.permission === 'granted') {
          initializeBadgeSync();
        }
        
        // Initialize background sync
        const cleanup = initializeBackgroundSync();
        setBackgroundSyncCleanup(() => cleanup);
        
        // Listen for foreground messages
        const unsubscribe = onMessageListener(handleNewNotification);
        
        // Listen for silent notification events
        const handleSilentNotification = (event: CustomEvent) => {
          console.log('Silent notification processed:', event.detail);
          const { type, data } = event.detail || {};
          
          // Handle different types of silent notifications
          switch (type) {
            case 'data_sync':
              // Refresh UI data if needed
              window.dispatchEvent(new CustomEvent('dataUpdated', { detail: data }));
              break;
            case 'badge_update':
              // Update badge count from server
              if (data?.badgeCount !== undefined) {
                setBadgeCount(data.badgeCount);
              }
              break;
            case 'notification_sync':
              // Refresh notifications
              window.dispatchEvent(new CustomEvent('notificationsUpdated'));
              break;
          }
        };
        
        window.addEventListener('silentNotificationProcessed', handleSilentNotification as EventListener);
        
        console.log('Push notifications initialized successfully for environment:', {
          mobile: detection.isMobile,
          pwa: detection.isPWA,
          capabilities: caps
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        
        // Provide context-specific error messages
        if (mobileDetection?.isIOS && !mobileDetection?.isStandalone) {
          toast({
            title: "iOS Notification Limitation",
            description: "For full notification support on iOS, please install the app to your home screen.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Notification Error",
            description: "Failed to initialize notifications",
            variant: "destructive",
          });
        }
      }
    };

    if (typeof window !== 'undefined') {
      initializeNotifications();
      
      return () => {
        if (backgroundSyncCleanup) {
          backgroundSyncCleanup();
        }
      };
    }
  }, [handleNewNotification, toast]);

  const requestPermission = async () => {
    try {
      // Check if permission can be requested in current environment
      if (!capabilities?.canRequestPermission) {
        toast({
          title: "Notification Support",
          description: supportMessage,
          duration: 5000,
        });
        return;
      }

      const result = await requestNotificationPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
        setHasPermission(currentPermission === 'granted');
      }
      
      if (result === true) {
        const fcmToken = await fetchToken();
        setToken(fcmToken);
        
        // Initialize services based on capabilities
        if (capabilities?.canUseBadging) {
          await initializeBadgeSync();
        }
        
        await triggerNotificationSync({ tokenUpdated: fcmToken });
        
        // Initialize Web Push if supported
        if (capabilities?.canUseWebPush && webPushSupported) {
          await initializeWebPush();
        }
      } else {
        // Provide context-specific guidance
        if (mobileDetection?.isIOS && !mobileDetection?.isStandalone) {
          toast({
            title: "iOS Limitation",
            description: "iOS requires installing the app for notifications. Please add to home screen.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Permission Denied",
            description: "Notification permission was denied. Please enable in browser settings.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
    }
  };

  const handleTriggerSync = async (syncType: 'reports' | 'notifications' | 'analytics' | 'user_data', data?: any) => {
    try {
      await triggerDataSync(syncType, data);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  };

  const handleTestWebPush = async () => {
    try {
      if (!webPushSupported) {
        toast({
          title: "Web Push Not Supported",
          description: "Your browser doesn't support Web Push notifications.",
          variant: "destructive"
        });
        return;
      }

      const success = await testWebPushNotification();
      if (success) {
        toast({
          title: "Test Notification Sent",
          description: "Check your notifications to see if it arrived."
        });
      } else {
        toast({
          title: "Test Failed",
          description: "Failed to send test notification. Check console for details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to test Web Push:', error);
      toast({
        title: "Test Error",
        description: "An error occurred while testing Web Push.",
        variant: "destructive"
      });
    }
  };

  const handleTestBackgroundNotifications = async () => {
    try {
      if (!hasPermission) {
        toast({
          title: "Permission Required",
          description: "Please enable notifications first to test background notifications.",
          variant: "destructive"
        });
        return;
      }

      const result = await testBackgroundNotifications();
      
      if (result.success) {
        toast({
          title: "Background Test Completed",
          description: "Test notification should appear. Check your notification panel.",
          duration: 5000
        });
        console.log('Background notification test results:', result.details);
      } else {
        toast({
          title: "Background Test Failed",
          description: result.message,
          variant: "destructive",
          duration: 5000
        });
        console.error('Background notification test failed:', result.details);
      }
    } catch (error) {
      console.error('Failed to test background notifications:', error);
      toast({
        title: "Test Error",
        description: "An error occurred while testing background notifications.",
        variant: "destructive"
      });
    }
  };

  // Handle PWA updates
  const handleCheckForUpdates = async (): Promise<UpdateCheckResult> => {
    try {
      const result = await checkForUpdates();
      if (result.updateAvailable) {
        toast({
          title: 'Update Available',
          description: 'A new version of the app is available.',
        });
      } else {
        toast({
          title: 'No Updates',
          description: 'You are running the latest version.',
        });
      }
      return result;
    } catch (error) {
      toast({
        title: 'Update Check Failed',
        description: 'Failed to check for updates.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleForceUpdate = async (): Promise<void> => {
    try {
      await forceUpdate();
      toast({
        title: 'Update Applied',
        description: 'The app will reload to apply the update.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to apply the update.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Listen for automatic update notifications
  useEffect(() => {
    onUpdateAvailable((registration) => {
      toast({
        title: 'Update Available',
        description: 'A new version is ready to install.',
        action: (
          <button
            onClick={() => handleForceUpdate()}
            className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
          >
            Update Now
          </button>
        ),
      });
    });
  }, []);

  const contextValue: PushNotificationContextType = {
    permission,
    token,
    badgeCount,
    webPushSupported,
    isSupported,
    hasPermission,
    isInitialized,
    requestPermission,
    updateBadge: handleUpdateBadge,
    clearBadge: handleClearBadge,
    markAsRead: handleMarkAsRead,
    triggerSync: handleTriggerSync,
    getSyncStatus,
    testWebPush: handleTestWebPush,
    testBackgroundNotifications: handleTestBackgroundNotifications,
    checkForUpdates: handleCheckForUpdates,
    forceUpdate: handleForceUpdate,
    isUpdateAvailable: isUpdateAvailable,
    isMobile: mobileDetection?.isMobile || false,
    isPWA: mobileDetection?.isPWA || false,
    capabilities: capabilities || {
      canRequestPermission: false,
      canShowNotifications: false,
      canUseBadging: false,
      canUseWebPush: false,
      requiresInstallation: false,
      limitations: []
    },
    supportMessage: supportMessage || 'Notification support unknown'
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export { PushNotificationProvider, EnableNotificationsButton };
