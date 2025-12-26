/**
 * Mobile detection utilities for better notification handling
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
}

export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if beforeinstallprompt event is supported
  return 'onbeforeinstallprompt' in window;
}

export function shouldShowNotificationPrompt(): boolean {
  if (!isMobileDevice()) return false;
  
  // Don't show if already in PWA mode
  if (isPWA()) return true;
  
  // Show for mobile browsers
  return true;
}

export function getMobileNotificationInstructions(): string {
  if (isIOS()) {
    return 'For best experience, add MapKH to your home screen and enable notifications.';
  } else if (isAndroid()) {
    return 'Enable notifications to receive real-time updates about reports in your area.';
  }
  
  return 'Enable notifications for real-time updates.';
}