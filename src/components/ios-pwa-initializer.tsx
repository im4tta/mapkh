'use client';

import { useEffect, useState } from 'react';
import { detectMobileEnvironment, getNotificationCapabilities } from '@/lib/mobile-detection';
import { getBadgeManager } from '@/lib/badge-manager';
import { initializeRealTimePushNotifications } from '@/lib/firebase-messaging';
import { useAuth } from '@/context/auth-provider';

interface IOSPWAInitializerProps {
  children: React.ReactNode;
}

export function IOSPWAInitializer({ children }: IOSPWAInitializerProps) {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeIOSPWA = async () => {
      try {
        const env = detectMobileEnvironment();
        const capabilities = getNotificationCapabilities();
        
        console.log('iOS PWA Environment:', env);
        console.log('Notification Capabilities:', capabilities);

        // Initialize badge manager for iOS
        if (env.isIOS) {
          const badgeManager = getBadgeManager();
          
          // Load persisted badge count
          // Badge count is automatically loaded by the badge manager on instantiation
          
          // If this is a standalone PWA on iOS, ensure proper initialization
          if (env.isStandalone) {
            console.log('iOS PWA detected - initializing enhanced features');
            
            // Initialize notifications if user is logged in
            if (user && capabilities.canRequestPermission) {
              try {
                await initializeRealTimePushNotifications();
                console.log('iOS PWA notifications initialized');
              } catch (error) {
                console.warn('iOS PWA notification initialization failed:', error);
              }
            }
            
            // Sync badge count from storage
            const storedCount = localStorage.getItem('mapkh_badge_count') || 
                              localStorage.getItem('pwa_badge_count') || 
                              localStorage.getItem('ios_badge_count') || '0';
            
            const count = parseInt(storedCount, 10);
            if (count > 0) {
                await badgeManager.updateBadgeCount(count);
              }
          }
          
          // Setup iOS-specific event listeners
          setupIOSEventListeners(env, badgeManager);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('iOS PWA initialization error:', error);
        setIsInitialized(true); // Continue anyway
      }
    };

    initializeIOSPWA();
  }, [user]);

  // Setup iOS-specific event listeners
  const setupIOSEventListeners = (env: any, badgeManager: any) => {
    // Listen for app state changes on iOS
    if (env.isIOS) {
      // Handle visibility change (app going to background/foreground)
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            // App came to foreground - sync badge count
            await badgeManager.forceBadgeSync();
            console.log('iOS app resumed - badge count synced');
          } else {
            // App going to background - save current state
            console.log('iOS app backgrounded - badge count saved');
          }
      });

      // Handle page unload (iOS Safari specific)
      window.addEventListener('beforeunload', () => {
        // Badge count is automatically persisted by the badge manager
      });

      // Handle iOS PWA launch
      window.addEventListener('appinstalled', () => {
        console.log('iOS PWA installed');
        // Reinitialize after installation
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      });
    }
  };

  // Don't render children until iOS PWA is properly initialized
  if (!isInitialized) {
    return null;
  }

  return <>{children}</>;
}