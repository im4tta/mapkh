// Badge Manager - Centralized badge count management for PWA
// Handles badge synchronization between service worker, main app, and mobile devices

import { 
  detectMobileEnvironment, 
  getNotificationCapabilities,
  updateBadgeMobile,
  clearBadgeMobile 
} from './mobile-detection';

export interface BadgeState {
  count: number;
  lastUpdated: number;
  synchronized: boolean;
}

export class BadgeManager {
  private static instance: BadgeManager;
  private badgeCount: number = 0;
  private listeners: Set<(count: number) => void> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'mapkh_badge_count';
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.loadBadgeCount();
    this.setupSyncInterval();
    this.setupServiceWorkerListener();
  }

  public static getInstance(): BadgeManager {
    if (!BadgeManager.instance) {
      BadgeManager.instance = new BadgeManager();
    }
    return BadgeManager.instance;
  }

  // Check if we're in a browser environment
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Load badge count from storage
  private loadBadgeCount(): void {
    try {
      if (!this.isBrowser()) {
        this.badgeCount = 0;
        return;
      }
      
      // Try multiple storage keys for iOS compatibility
      const stored = localStorage.getItem(this.STORAGE_KEY) || 
                   localStorage.getItem('pwa_badge_count') ||
                   localStorage.getItem('app_badge_count');
      
      if (stored) {
        this.badgeCount = parseInt(stored, 10) || 0;
        // Ensure all storage keys are synchronized
        this.saveBadgeCount(this.badgeCount);
      }
    } catch (error) {
      console.error('Failed to load badge count from storage:', error);
      this.badgeCount = 0;
    }
  }

  // Save badge count to storage
  private saveBadgeCount(count: number): void {
    try {
      this.badgeCount = count;
      
      if (!this.isBrowser()) {
        return;
      }
      
      // Save to multiple storage keys for iOS compatibility
      localStorage.setItem(this.STORAGE_KEY, count.toString());
      localStorage.setItem('pwa_badge_count', count.toString());
      localStorage.setItem('app_badge_count', count.toString());
      
      // Also save to sessionStorage as backup for iOS
      sessionStorage.setItem(this.STORAGE_KEY, count.toString());
    } catch (error) {
      console.error('Failed to save badge count:', error);
    }
  }

  // Setup periodic sync with service worker
  private setupSyncInterval(): void {
    if (typeof window === 'undefined') return;

    this.syncInterval = setInterval(() => {
      this.syncWithServiceWorker();
    }, this.SYNC_INTERVAL);
  }

  // Setup service worker message listener
  private setupServiceWorkerListener(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      
      if (type === 'BADGE_COUNT_UPDATED') {
        this.updateBadgeCount(data.count, false); // Don't sync back to SW
      }
    });
  }

  // Get current badge count
  public getBadgeCount(): number {
    return this.badgeCount;
  }

  // Update badge count
  public async updateBadgeCount(count: number, syncToServiceWorker: boolean = true): Promise<void> {
    const newCount = Math.max(0, count);
    
    if (newCount === this.badgeCount) {
      return; // No change needed
    }

    this.saveBadgeCount(newCount);

    // Update platform badge with retry logic
    await this.updatePlatformBadgeWithRetry(newCount);

    // Sync with service worker if requested
    if (syncToServiceWorker) {
      await this.syncToServiceWorker(newCount);
    }

    // Notify listeners
    this.notifyListeners(newCount);
  }

  // Update platform badge with retry logic for mobile
  private async updatePlatformBadgeWithRetry(count: number, retries: number = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.updatePlatformBadge(count);
        return; // Success, exit retry loop
      } catch (error) {
        console.warn(`Badge update attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          throw error; // Last attempt failed
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
  }

  // Increment badge count
  public async incrementBadge(amount: number = 1): Promise<void> {
    await this.updateBadgeCount(this.badgeCount + amount);
  }

  // Decrement badge count
  public async decrementBadge(amount: number = 1): Promise<void> {
    await this.updateBadgeCount(this.badgeCount - amount);
  }

  // Clear badge
  public async clearBadge(): Promise<void> {
    await this.updateBadgeCount(0);
  }

  // Update platform-specific badge
  private async updatePlatformBadge(count: number): Promise<void> {
    try {
      // Try native Badge API first (supported on some platforms)
      if ('navigator' in globalThis && 'setAppBadge' in navigator) {
        try {
          if (count > 0) {
            await (navigator as any).setAppBadge(count);
          } else {
            await (navigator as any).clearAppBadge();
          }
          return;
        } catch (badgeError) {
          console.warn('Native badge API failed:', badgeError);
        }
      }

      const capabilities = getNotificationCapabilities();
      
      if (!capabilities.canUseBadging) {
        console.log('Badge API not supported on this platform');
        return;
      }

      // Use mobile-specific badge update as fallback
      if (count > 0) {
        await updateBadgeMobile(count);
      } else {
        await clearBadgeMobile();
      }
    } catch (error) {
      console.error('Failed to update platform badge:', error);
    }
  }

  // Sync badge count to service worker
  private async syncToServiceWorker(count: number): Promise<void> {
    try {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return;
      }

      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE_COUNT',
        data: { count }
      });
    } catch (error) {
      console.error('Failed to sync badge to service worker:', error);
    }
  }

  // Sync with service worker (get current count)
  private async syncWithServiceWorker(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return;
      }

      // Request current badge count from service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_BADGE_COUNT'
      });
    } catch (error) {
      console.error('Failed to sync with service worker:', error);
    }
  }

  // Mark notifications as read and update badge
  public async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        // Fallback: just decrement by the number of notifications
        await this.decrementBadge(notificationIds.length);
        return;
      }

      navigator.serviceWorker.controller.postMessage({
        type: 'MARK_NOTIFICATIONS_READ',
        data: { notificationIds }
      });

      // The service worker will recalculate and update the badge count
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      // Fallback: decrement badge count
      await this.decrementBadge(notificationIds.length);
    }
  }

  // Add badge count listener
  public addListener(callback: (count: number) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of badge count change
  private notifyListeners(count: number): void {
    this.listeners.forEach(callback => {
      try {
        callback(count);
      } catch (error) {
        console.error('Badge listener error:', error);
      }
    });
  }

  // Get badge state for debugging
  public getBadgeState(): BadgeState {
    const detection = detectMobileEnvironment();
    const capabilities = getNotificationCapabilities();
    
    return {
      count: this.badgeCount,
      lastUpdated: Date.now(),
      synchronized: capabilities.canUseBadging && detection.supportsNotifications
    };
  }

  // Force sync with service worker
  public async forceBadgeSync(): Promise<void> {
    await this.syncWithServiceWorker();
    await this.updatePlatformBadge(this.badgeCount);
  }

  // Cleanup resources
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
  }
}

// Lazy singleton getter to prevent SSR issues
export const getBadgeManager = (): BadgeManager => {
  return BadgeManager.getInstance();
};

// Export singleton instance (lazy)
export const badgeManager = typeof window !== 'undefined' ? BadgeManager.getInstance() : null;

// Convenience functions for easy usage with SSR safety
export const updateBadgeCount = (count: number) => {
  if (typeof window === 'undefined') return Promise.resolve();
  return getBadgeManager().updateBadgeCount(count);
};

export const incrementBadge = (amount?: number) => {
  if (typeof window === 'undefined') return Promise.resolve();
  return getBadgeManager().incrementBadge(amount);
};

export const decrementBadge = (amount?: number) => {
  if (typeof window === 'undefined') return Promise.resolve();
  return getBadgeManager().decrementBadge(amount);
};

export const clearBadge = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  return getBadgeManager().clearBadge();
};

export const getBadgeCount = () => {
  if (typeof window === 'undefined') return 0;
  return getBadgeManager().getBadgeCount();
};

export const markNotificationsAsRead = (ids: string[]) => {
  if (typeof window === 'undefined') return Promise.resolve();
  return getBadgeManager().markNotificationsAsRead(ids);
};

export const addBadgeListener = (callback: (count: number) => void) => {
  if (typeof window === 'undefined') return () => {};
  return getBadgeManager().addListener(callback);
};