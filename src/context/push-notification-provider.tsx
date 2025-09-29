

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  onMessageListener, 
  requestNotificationPermission, 
  initializePushNotifications,
  initializeRealTimePushNotifications,
  sendTestNotification
} from '@/lib/firebase-messaging';
import { getBadgeManager, addBadgeListener } from '@/lib/badge-manager';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BellRing, BellOff } from 'lucide-react';

interface PushNotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission | null;
  token: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  sendTest: () => Promise<void>;
  initializeRealTime: () => Promise<boolean>;
  badgeCount: number;
  updateBadgeCount: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
  markNotificationsAsRead: (ids: string[]) => Promise<void>;
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
      setBadgeCount(getBadgeManager().getBadgeCount());
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      setPermission(Notification.permission);
      
      if (granted) {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for important updates.",
        });
      } else {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings to receive updates.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isClient) {
    return null;
  }

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground">
        Notifications not supported in this browser
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          Notifications Enabled
        </Button>
        {badgeCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {badgeCount}
          </span>
        )}
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="text-sm text-muted-foreground">
        Notifications blocked. Please enable in browser settings.
      </div>
    );
  }

  return (
    <Button 
      onClick={handleRequestPermission}
      variant="outline" 
      size="sm"
      className="flex items-center gap-2"
    >
      <BellOff className="h-4 w-4" />
      Enable Notifications
    </Button>
  );
};

interface PushNotificationProviderProps {
  children: ReactNode;
}

const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const { toast } = useToast();

  // Check if notifications are supported
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(Notification.permission);
      
      // Initialize badge manager and listen for changes
      setBadgeCount(getBadgeManager().getBadgeCount());
      const unsubscribe = addBadgeListener((count) => {
        setBadgeCount(count);
      });

      return unsubscribe;
    }
  }, []);

  const handleInitialize = async () => {
    if (isLoading || isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await initializePushNotifications();
      setToken(token);
      setIsInitialized(true);
      
      // Setup message listener for foreground notifications
      onMessageListener((payload) => {
        handleNewNotification(payload);
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize notifications';
      setError(errorMessage);
      console.error('Failed to initialize push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async (): Promise<boolean> => {
    try {
      const granted = await requestNotificationPermission();
      setPermission(Notification.permission);
      return granted;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      return false;
    }
  };

  const handleSendTest = async () => {
    try {
      await sendTestNotification();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMessage);
      console.error('Failed to send test notification:', err);
    }
  };

  const handleInitializeRealTime = async (): Promise<boolean> => {
    try {
      return await initializeRealTimePushNotifications();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize real-time notifications';
      setError(errorMessage);
      console.error('Failed to initialize real-time notifications:', err);
      return false;
    }
  };

  const handleNewNotification = useCallback(async (payload: any) => {
    console.log('Received foreground message:', payload);
    
    // Increment badge count for foreground notifications
    await getBadgeManager().incrementBadge();
    
    // Show toast notification when app is in foreground
    toast({
      title: payload.notification?.title || payload.data?.title || 'New Notification',
      description: payload.notification?.body || payload.data?.body || 'You have a new notification',
    });
  }, [toast]);

  const handleUpdateBadgeCount = async (count: number) => {
    try {
      await getBadgeManager().updateBadgeCount(count);
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  };

  const handleClearBadge = async () => {
    try {
      await getBadgeManager().clearBadge();
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  };

  const handleMarkNotificationsAsRead = async (notificationIds: string[]) => {
    try {
      await getBadgeManager().markNotificationsAsRead(notificationIds);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const contextValue: PushNotificationContextType = {
    isSupported,
    permission,
    token,
    isInitialized,
    isLoading,
    error,
    initialize: handleInitialize,
    requestPermission: handleRequestPermission,
    sendTest: handleSendTest,
    initializeRealTime: handleInitializeRealTime,
    badgeCount,
    updateBadgeCount: handleUpdateBadgeCount,
    clearBadge: handleClearBadge,
    markNotificationsAsRead: handleMarkNotificationsAsRead,
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export { PushNotificationProvider, EnableNotificationsButton };
