

"use client";

import { useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchToken, onMessageListener } from '@/lib/firebase-messaging';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BellRing, BellOff } from 'lucide-react';

const EnableNotificationsButton = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, so window is defined.
    setIsClient(true);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermissionAndGetToken = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }

    console.log('Requesting permission...');
    const currentPermission = await Notification.requestPermission();
    setPermission(currentPermission);

    if (currentPermission === 'granted') {
        console.log('Notification permission granted.');
        try {
            const currentToken = await fetchToken();
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                // In a real app, you would send this token to your server.
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.log('An error occurred while retrieving token. ', err);
        }
    } else {
        console.log('Unable to get permission to notify.');
    }
  };

  if (!isClient || permission === 'granted') {
    return null; // Don't render on server or if permission is already granted.
  }

  return (
    <Button onClick={requestPermissionAndGetToken} variant="ghost" size="icon">
      {permission === 'denied' ? (
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


const PushNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  const handleNewNotification = useCallback((payload: any) => {
    if (payload?.data) {
        new Notification(payload.data.title, {
            body: payload.data.body,
            icon: payload.data.icon || '/apple-icon.png'
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(function(err) {
            console.log('Service Worker registration failed:', err);
        });
    }
    
    let unsubscribe: (() => void) | null = null;
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            unsubscribe = onMessageListener(handleNewNotification);
        }
    }
    
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [handleNewNotification]);

  return (
    <>
      {children}
    </>
  );
};

export { PushNotificationProvider, EnableNotificationsButton };

