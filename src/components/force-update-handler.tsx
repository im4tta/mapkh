"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ForceUpdateMessage {
  type: string;
  version: string;
  swVersion: string;
  message: string;
  action: string;
}

export const ForceUpdateHandler: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<ForceUpdateMessage | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Guard against environments where the document isn't fully active (e.g., sandboxed iframes)
    const isIframe = window.top !== window.self;
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isSecureOrLocal = window.isSecureContext || isLocalhost;

    const shouldAttemptSWCheck = () => {
      // Skip in iframe or non-secure, non-local contexts which can cause InvalidStateError
      if (isIframe || !isSecureOrLocal) return false;
      // Skip when page isn't visible to avoid prerender/invalid document state
      if (document.visibilityState === 'hidden') return false;
      return true;
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { data } = event;
      
      console.log('Received SW message:', data);
      
      if (data.type === 'FORCE_UPDATE_COMPLETED') {
        setUpdateInfo(data);
        setUpdateAvailable(true);
        
        // Show toast notification
        toast({
          title: "App Updated! 🎉",
          description: "New features and improvements are available. Please refresh to get the latest version.",
          duration: 10000,
        });
      } else if (data.type === 'SW_UPDATED') {
        // Handle regular service worker updates
        toast({
          title: "Update Available",
          description: "A new version is ready. Refresh to update.",
          duration: 5000,
        });
      }
    };

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    // Check for existing service worker updates
    const checkForExistingUpdates = async () => {
      try {
        // Avoid InvalidStateError in certain preview/dev iframe contexts
        if (!shouldAttemptSWCheck()) return;

        // Ensure document is fully loaded before querying registration
        if (document.readyState !== 'complete') {
          await new Promise<void>((resolve) => {
            window.addEventListener('load', () => resolve(), { once: true });
          });
        }

        let registration = undefined as ServiceWorkerRegistration | undefined;

        // Prefer ready() when available; it's safer in some environments
        try {
          registration = await navigator.serviceWorker.ready;
        } catch (_) {
          // Fall back to getRegistration if ready fails
          try {
            registration = await navigator.serviceWorker.getRegistration();
          } catch (_) {
            registration = undefined;
          }
        }

        if (registration?.waiting) {
          // There's a waiting service worker, show update prompt
          setUpdateAvailable(true);
          setUpdateInfo({
            type: 'SW_UPDATED',
            version: '0.1.0',
            swVersion: '4.0.0',
            message: 'A new version is available. Please refresh to update.',
            action: 'REFRESH_REQUIRED'
          });
        }
      } catch (error) {
        // Log as a warning to avoid alarming users in non-critical contexts
        console.warn('Skipped service worker update check due to environment:', error);
      }
    };

    checkForExistingUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Clear any remaining caches manually
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const mapkhCaches = cacheNames.filter(name => name.startsWith('mapkh'));
        await Promise.all(mapkhCaches.map(name => caches.delete(name)));
      }
      
      // Clear localStorage items related to the app
      const keysToRemove = [
        'mapkh_badge_count',
        'mapkh_notifications',
        'mapkh_update_available',
        'mapkh_app_version'
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key}:`, error);
        }
      });
      
      // Force reload the page
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh:', error);
      setIsRefreshing(false);
      
      toast({
        title: "Refresh Failed",
        description: "Please manually refresh the page to get the latest version.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setUpdateInfo(null);
    
    // Show reminder toast
    toast({
      title: "Update Reminder",
      description: "Don't forget to refresh later to get the latest features!",
      duration: 3000,
    });
  };

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  return (
    <AlertDialog open={updateAvailable} onOpenChange={setUpdateAvailable}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500" />
            App Update Available
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{updateInfo.message}</p>
            <div className="text-sm text-muted-foreground">
              <p>App Version: {updateInfo.version}</p>
              <p>Service Worker: {updateInfo.swVersion}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isRefreshing}
          >
            Later
          </Button>
          <AlertDialogAction asChild>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh Now
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ForceUpdateHandler;