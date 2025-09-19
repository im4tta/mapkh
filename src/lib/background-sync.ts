// Background Sync and Silent Update Utilities
// Handles silent notifications and background data synchronization

import { sendSilentUpdate } from './firebase-messaging';

export interface SilentUpdatePayload {
  type: 'data_sync' | 'badge_update' | 'cache_update' | 'notification_sync';
  syncType?: 'reports' | 'notifications' | 'analytics' | 'user_data';
  data?: any;
  timestamp?: number;
  priority?: 'high' | 'medium' | 'low';
}

export interface BackgroundSyncOptions {
  immediate?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// Queue for managing background sync operations
class BackgroundSyncQueue {
  private queue: SilentUpdatePayload[] = [];
  private isProcessing = false;
  private readonly maxQueueSize = 50;

  add(payload: SilentUpdatePayload, options: BackgroundSyncOptions = {}) {
    // Add timestamp if not provided
    const enhancedPayload = {
      ...payload,
      timestamp: payload.timestamp || Date.now(),
      priority: payload.priority || 'medium'
    };

    // Prevent queue overflow
    if (this.queue.length >= this.maxQueueSize) {
      // Remove oldest low-priority items
      this.queue = this.queue.filter(item => item.priority !== 'low').slice(-this.maxQueueSize + 1);
    }

    this.queue.push(enhancedPayload);
    this.sortByPriority();

    if (options.immediate || !this.isProcessing) {
      this.processQueue(options);
    }
  }

  private sortByPriority() {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return bPriority - aPriority;
    });
  }

  private async processQueue(options: BackgroundSyncOptions = {}) {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { retryOnFailure = true, maxRetries = 3, retryDelay = 1000 } = options;

    while (this.queue.length > 0) {
      const payload = this.queue.shift()!;
      let retries = 0;
      let success = false;

      while (!success && retries <= maxRetries) {
        try {
          await sendSilentUpdate(payload);
          success = true;
          console.log('Silent update sent successfully:', payload.type);
        } catch (error) {
          retries++;
          console.error(`Silent update failed (attempt ${retries}):`, error);
          
          if (retryOnFailure && retries <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
          }
        }
      }

      if (!success) {
        console.error('Silent update failed after all retries:', payload);
        // Optionally store failed updates for later retry
        this.storeFailed(payload);
      }
    }

    this.isProcessing = false;
  }

  private storeFailed(payload: SilentUpdatePayload) {
    try {
      const failed = JSON.parse(localStorage.getItem('mapkh_failed_syncs') || '[]');
      failed.push({ ...payload, failedAt: Date.now() });
      // Keep only last 10 failed syncs
      localStorage.setItem('mapkh_failed_syncs', JSON.stringify(failed.slice(-10)));
    } catch (error) {
      console.error('Failed to store failed sync:', error);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

// Global sync queue instance
const syncQueue = new BackgroundSyncQueue();

// Silent update functions
export const triggerDataSync = async (syncType: 'reports' | 'notifications' | 'analytics' | 'user_data', data?: any) => {
  const payload: SilentUpdatePayload = {
    type: 'data_sync',
    syncType,
    data,
    priority: syncType === 'notifications' ? 'high' : 'medium'
  };

  syncQueue.add(payload, { immediate: true });
};

export const triggerBadgeUpdate = async (badgeCount: number) => {
  const payload: SilentUpdatePayload = {
    type: 'badge_update',
    data: { badgeCount },
    priority: 'high'
  };

  syncQueue.add(payload, { immediate: true });
};

export const triggerCacheUpdate = async (cacheKey: string, cacheData: any) => {
  const payload: SilentUpdatePayload = {
    type: 'cache_update',
    data: { cacheKey, cacheData },
    priority: 'low'
  };

  syncQueue.add(payload);
};

export const triggerNotificationSync = async (notificationData?: any) => {
  const payload: SilentUpdatePayload = {
    type: 'notification_sync',
    data: notificationData,
    priority: 'high'
  };

  syncQueue.add(payload, { immediate: true });
};

// Batch sync operations
export const batchSync = async (operations: SilentUpdatePayload[]) => {
  operations.forEach(operation => {
    syncQueue.add(operation);
  });
};

// Periodic sync scheduler
class PeriodicSyncScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  schedule(id: string, syncFn: () => Promise<void>, intervalMs: number) {
    // Clear existing interval if any
    this.cancel(id);

    const interval = setInterval(async () => {
      try {
        await syncFn();
      } catch (error) {
        console.error(`Periodic sync '${id}' failed:`, error);
      }
    }, intervalMs);

    this.intervals.set(id, interval);
  }

  cancel(id: string) {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  cancelAll() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }
}

const periodicScheduler = new PeriodicSyncScheduler();

// Initialize periodic syncs
export const initializePeriodicSync = () => {
  // Sync notifications every 5 minutes
  periodicScheduler.schedule('notifications', async () => {
    await triggerNotificationSync();
  }, 5 * 60 * 1000);

  // Sync reports every 10 minutes
  periodicScheduler.schedule('reports', async () => {
    await triggerDataSync('reports');
  }, 10 * 60 * 1000);

  // Sync analytics every 30 minutes
  periodicScheduler.schedule('analytics', async () => {
    await triggerDataSync('analytics');
  }, 30 * 60 * 1000);

  console.log('Periodic background sync initialized');
};

// Stop periodic syncs
export const stopPeriodicSync = () => {
  periodicScheduler.cancelAll();
  console.log('Periodic background sync stopped');
};

// Retry failed syncs
export const retryFailedSyncs = async () => {
  try {
    const failed = JSON.parse(localStorage.getItem('mapkh_failed_syncs') || '[]');
    if (failed.length === 0) return;

    console.log(`Retrying ${failed.length} failed syncs`);
    
    for (const failedSync of failed) {
      // Remove failedAt timestamp before retrying
      const { failedAt, ...payload } = failedSync;
      syncQueue.add(payload, { immediate: false, retryOnFailure: false });
    }

    // Clear failed syncs after queuing for retry
    localStorage.removeItem('mapkh_failed_syncs');
  } catch (error) {
    console.error('Failed to retry failed syncs:', error);
  }
};

// Network status monitoring
export const initializeNetworkMonitoring = () => {
  if (typeof window === 'undefined') return;

  const handleOnline = () => {
    console.log('Network connection restored, retrying failed syncs');
    retryFailedSyncs();
  };

  const handleOffline = () => {
    console.log('Network connection lost, queuing syncs for later');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Export queue instance for advanced usage
export { syncQueue };

// Utility to check sync queue status
export const getSyncStatus = () => {
  return {
    queueSize: syncQueue.getQueueSize(),
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    failedSyncs: (() => {
      try {
        return JSON.parse(localStorage.getItem('mapkh_failed_syncs') || '[]').length;
      } catch {
        return 0;
      }
    })()
  };
};

// Initialize all background sync features
export const initializeBackgroundSync = () => {
  initializePeriodicSync();
  const cleanupNetwork = initializeNetworkMonitoring();
  
  // Retry any failed syncs on initialization
  setTimeout(() => {
    retryFailedSyncs();
  }, 2000);

  return () => {
    stopPeriodicSync();
    if (cleanupNetwork) cleanupNetwork();
    syncQueue.clear();
  };
};