// Mobile browser detection and notification capability utilities
// Handles differences between mobile browsers, PWA modes, and notification support

export interface MobileDetectionResult {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  supportsNotifications: boolean;
  supportsBadging: boolean;
  supportsWebPush: boolean;
  requiresUserGesture: boolean;
  notificationLimitations: string[];
}

export interface NotificationCapabilities {
  canRequestPermission: boolean;
  canShowNotifications: boolean;
  canUseBadging: boolean;
  canUseWebPush: boolean;
  requiresInstallation: boolean;
  limitations: string[];
}

// Detect mobile browser and capabilities
export function detectMobileEnvironment(): MobileDetectionResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isPWA: false,
      isStandalone: false,
      supportsNotifications: false,
      supportsBadging: false,
      supportsWebPush: false,
      requiresUserGesture: false,
      notificationLimitations: ['Server-side rendering environment']
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);
  
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  
  // Check if running as PWA
  const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isStandalone = isPWA || (window.navigator as any).standalone === true;
  
  // Check notification support
  const supportsNotifications = 'Notification' in window;
  const supportsBadging = 'setAppBadge' in navigator;
  const supportsWebPush = 'serviceWorker' in navigator && 'PushManager' in window;
  
  // Determine limitations
  const notificationLimitations: string[] = [];
  let requiresUserGesture = false;
  
  if (isIOS) {
    if (!isStandalone) {
      notificationLimitations.push('iOS Safari requires PWA installation for notifications');
      notificationLimitations.push('Badge API not available in iOS Safari browser');
      requiresUserGesture = true;
    }
    if (isSafari && !isStandalone) {
      notificationLimitations.push('iOS Safari browser mode has limited notification support');
    }
  }
  
  if (isAndroid) {
    if (!supportsNotifications) {
      notificationLimitations.push('Notifications not supported in this Android browser');
    }
    if (!supportsBadging) {
      notificationLimitations.push('Badge API not supported in this Android browser');
    }
  }
  
  if (isMobile && !supportsWebPush) {
    notificationLimitations.push('Web Push not supported in this mobile browser');
  }
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isPWA,
    isStandalone,
    supportsNotifications,
    supportsBadging,
    supportsWebPush,
    requiresUserGesture,
    notificationLimitations
  };
}

// Get notification capabilities for current environment
export function getNotificationCapabilities(): NotificationCapabilities {
  const detection = detectMobileEnvironment();
  
  let canRequestPermission = detection.supportsNotifications;
  let canShowNotifications = detection.supportsNotifications;
  let canUseBadging = detection.supportsBadging;
  let canUseWebPush = detection.supportsWebPush;
  let requiresInstallation = false;
  const limitations: string[] = [...detection.notificationLimitations];
  
  // iOS-specific limitations
  if (detection.isIOS && !detection.isStandalone) {
    canRequestPermission = false;
    canShowNotifications = false;
    canUseBadging = false;
    requiresInstallation = true;
    limitations.push('iOS requires app installation for full notification support');
  }
  
  // Safari-specific limitations
  if (detection.isSafari && detection.isMobile && !detection.isStandalone) {
    canUseBadging = false;
    limitations.push('Safari mobile browser does not support badge API');
  }
  
  // Android Chrome limitations
  if (detection.isAndroid && detection.isChrome && !detection.isStandalone) {
    // Android Chrome supports notifications but badge API may be limited
    if (!detection.supportsBadging) {
      limitations.push('Badge API support varies on Android Chrome');
    }
  }
  
  return {
    canRequestPermission,
    canShowNotifications,
    canUseBadging,
    canUseWebPush,
    requiresInstallation,
    limitations
  };
}

// Check if current environment supports full notification features
export function supportsFullNotifications(): boolean {
  const capabilities = getNotificationCapabilities();
  return capabilities.canRequestPermission && 
         capabilities.canShowNotifications && 
         capabilities.canUseBadging;
}

// Get user-friendly message about notification support
export function getNotificationSupportMessage(): string {
  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  if (capabilities.requiresInstallation) {
    return 'For full notification support including badges, please install this app to your home screen.';
  }
  
  if (detection.isIOS && detection.isSafari && !detection.isStandalone) {
    return 'iOS Safari has limited notification support. Install the app for full features.';
  }
  
  if (!capabilities.canShowNotifications) {
    return 'Notifications are not supported in this browser.';
  }
  
  if (!capabilities.canUseBadging) {
    return 'Notifications are supported, but badge counts may not be available.';
  }
  
  return 'Full notification support is available.';
}

// Enhanced permission request with mobile-specific handling
export async function requestNotificationPermissionMobile(): Promise<{
  granted: boolean;
  reason?: string;
  suggestion?: string;
}> {
  const detection = detectMobileEnvironment();
  const capabilities = getNotificationCapabilities();
  
  if (!capabilities.canRequestPermission) {
    return {
      granted: false,
      reason: 'Notification permission cannot be requested in this environment',
      suggestion: capabilities.requiresInstallation 
        ? 'Please install the app to your home screen for notification support'
        : 'This browser does not support notifications'
    };
  }
  
  if (!('Notification' in window)) {
    return {
      granted: false,
      reason: 'Notifications not supported',
      suggestion: 'Please use a modern browser that supports notifications'
    };
  }
  
  // Check current permission
  if (Notification.permission === 'granted') {
    return { granted: true };
  }
  
  if (Notification.permission === 'denied') {
    return {
      granted: false,
      reason: 'Notification permission was previously denied',
      suggestion: 'Please enable notifications in your browser settings'
    };
  }
  
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    
    if (!granted) {
      return {
        granted: false,
        reason: 'Notification permission was denied',
        suggestion: detection.isIOS && !detection.isStandalone
          ? 'For iOS, consider installing the app for better notification support'
          : 'Please allow notifications to receive updates'
      };
    }
    
    return { granted: true };
  } catch (error) {
    return {
      granted: false,
      reason: 'Failed to request notification permission',
      suggestion: 'Please try again or check your browser settings'
    };
  }
}

// Update app badge with mobile-specific handling
export async function updateBadgeMobile(count: number): Promise<void> {
  try {
    const env = detectMobileEnvironment();
    
    // Ensure count is valid
    const badgeCount = Math.max(0, Math.floor(count));
    
    // Try native badge API first (most reliable)
    if ('setAppBadge' in navigator) {
      try {
        await (navigator as any).setAppBadge(badgeCount);
        console.log(`Badge updated to ${badgeCount} using native API`);
        return;
      } catch (error) {
        console.warn('Native badge API failed, trying fallbacks:', error);
      }
    }
    
    // Mobile-specific fallbacks
    if (env.isMobile) {
      // For iOS Safari/PWA - enhanced handling
      if (env.isIOS) {
        try {
          // Try multiple approaches for iOS
          if (env.isPWA || env.isStandalone) {
            // PWA-specific badge handling
            await (navigator as any).setAppBadge(badgeCount);
            console.log(`iOS PWA badge updated to ${badgeCount}`);
          } else {
            // Safari fallback - use service worker and multiple storage
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_BADGE',
                count: badgeCount
              });
            }
            
            // Store in multiple locations for iOS Safari
            localStorage.setItem('pwa_badge_count', badgeCount.toString());
            localStorage.setItem('ios_badge_count', badgeCount.toString());
            sessionStorage.setItem('badge_count', badgeCount.toString());
            
            console.log(`iOS Safari badge stored: ${badgeCount}`);
          }
        } catch (error) {
          console.warn('iOS badge update failed:', error);
          // Enhanced fallback storage for iOS
          try {
            localStorage.setItem('pwa_badge_count', badgeCount.toString());
            localStorage.setItem('ios_badge_count', badgeCount.toString());
            localStorage.setItem('app_badge_count', badgeCount.toString());
            sessionStorage.setItem('badge_count', badgeCount.toString());
            
            // Try to register for background sync if available
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
              navigator.serviceWorker.ready.then(registration => {
                if ('sync' in registration && registration.sync) {
                  return (registration.sync as unknown as { register: (tag: string) => Promise<void> }).register('badge-sync');
                }
              }).catch(syncError => {
                console.warn('Background sync registration failed:', syncError);
              });
            }
          } catch (storageError) {
            console.error('Failed to store badge count for iOS:', storageError);
          }
        }
      }
      
      // For Android Chrome PWA - enhanced handling
      if (env.isAndroid) {
        try {
          if (env.isPWA) {
            await (navigator as any).setAppBadge(badgeCount);
            console.log(`Android PWA badge updated to ${badgeCount}`);
          } else {
            // Chrome browser fallback
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_BADGE',
                count: badgeCount
              });
            }
          }
        } catch (error) {
          console.warn('Android badge update failed:', error);
          // Fallback: create persistent notification with badge
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'UPDATE_BADGE_NOTIFICATION',
              count: badgeCount
            });
          }
        }
      }
    }
    
    // Universal fallback: store in localStorage for service worker
    localStorage.setItem('app_badge_count', badgeCount.toString());
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('badgeUpdated', { 
      detail: { count: badgeCount } 
    }));
    
  } catch (error) {
    console.error('Failed to update mobile badge:', error);
    throw error;
  }
}

// Clear badge with mobile-specific handling
export async function clearBadgeMobile(): Promise<void> {
  try {
    const env = detectMobileEnvironment();
    
    // Try native badge API first
    if ('clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge();
        console.log('Badge cleared using native API');
        return;
      } catch (error) {
        console.warn('Native badge clear failed, trying fallbacks:', error);
      }
    }
    
    // Mobile-specific fallbacks
    if (env.isMobile) {
      // For iOS Safari/PWA
      if (env.isIOS) {
        try {
          if (env.isPWA) {
            await (navigator as any).clearAppBadge();
          } else {
            // Safari fallback - use service worker
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'CLEAR_BADGE'
              });
            }
          }
          console.log('iOS badge cleared');
        } catch (error) {
          console.warn('iOS badge clear failed:', error);
        }
      }
      
      // For Android Chrome PWA
      if (env.isAndroid) {
        try {
          if (env.isPWA) {
            await (navigator as any).clearAppBadge();
            console.log('Android PWA badge cleared');
          } else {
            // Chrome browser fallback
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'CLEAR_BADGE'
              });
            }
          }
        } catch (error) {
          console.warn('Android badge clear failed:', error);
        }
      }
    }
    
    // Universal fallback: clear from localStorage
    localStorage.removeItem('app_badge_count');
    localStorage.removeItem('pwa_badge_count');
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('badgeUpdated', { 
      detail: { count: 0 } 
    }));
    
  } catch (error) {
    console.error('Failed to clear mobile badge:', error);
    throw error;
  }
}