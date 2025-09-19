/**
 * PWA Update Management
 * Handles programmatic update checks and service worker lifecycle
 */

export interface UpdateCheckResult {
  updateAvailable: boolean;
  registration?: ServiceWorkerRegistration;
  error?: string;
}

export interface PWAUpdateManager {
  checkForUpdates: () => Promise<UpdateCheckResult>;
  forceUpdate: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  isUpdateAvailable: () => boolean;
  onUpdateAvailable: (callback: (registration: ServiceWorkerRegistration) => void) => void;
  onUpdateInstalled: (callback: () => void) => void;
}

class PWAUpdateManagerImpl implements PWAUpdateManager {
  private updateAvailable = false;
  private waitingWorker: ServiceWorker | null = null;
  private updateAvailableCallbacks: ((registration: ServiceWorkerRegistration) => void)[] = [];
  private updateInstalledCallbacks: (() => void)[] = [];

  constructor() {
    this.initializeUpdateDetection();
  }

  private async initializeUpdateDetection() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        this.setupUpdateListeners(registration);
      }
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
    }
  }

  private setupUpdateListeners(registration: ServiceWorkerRegistration) {
    // Listen for new service worker installations
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker installed and ready
            this.updateAvailable = true;
            this.waitingWorker = newWorker;
            this.updateAvailableCallbacks.forEach(callback => callback(registration));
          }
        });
      }
    });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SW_UPDATED') {
        this.updateInstalledCallbacks.forEach(callback => callback());
      }
    });

    // Check if there's already a waiting worker
    if (registration.waiting) {
      this.updateAvailable = true;
      this.waitingWorker = registration.waiting;
      this.updateAvailableCallbacks.forEach(callback => callback(registration));
    }
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return {
        updateAvailable: false,
        error: 'Service Worker not supported'
      };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return {
          updateAvailable: false,
          error: 'No service worker registration found'
        };
      }

      // Trigger update check
      await registration.update();
      
      // Wait a moment for the update check to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const hasUpdate = !!registration.waiting || this.updateAvailable;
      
      return {
        updateAvailable: hasUpdate,
        registration: hasUpdate ? registration : undefined
      };
    } catch (error) {
      console.error('Update check failed:', error);
      return {
        updateAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async forceUpdate(): Promise<void> {
    if (!this.waitingWorker) {
      throw new Error('No update available');
    }

    // Tell the waiting service worker to skip waiting
    this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    
    // Wait for the new service worker to take control
    return new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve();
      }, { once: true });
    });
  }

  async skipWaiting(): Promise<void> {
    if (!this.waitingWorker) {
      console.warn('No waiting service worker to skip');
      return;
    }

    this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable || false;
  }

  onUpdateAvailable(callback: (registration: ServiceWorkerRegistration) => void): void {
    this.updateAvailableCallbacks.push(callback);
  }

  onUpdateInstalled(callback: () => void): void {
    this.updateInstalledCallbacks.push(callback);
  }

  // Manual update trigger for testing
  async triggerUpdateCheck(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  }
}

// Export singleton instance
export const pwaUpdateManager = new PWAUpdateManagerImpl();

// Convenience functions
export const checkForPWAUpdates = () => pwaUpdateManager.checkForUpdates();
export const forcePWAUpdate = () => pwaUpdateManager.forceUpdate();
export const isPWAUpdateAvailable = () => pwaUpdateManager.isUpdateAvailable();
export const triggerPWAUpdateCheck = () => pwaUpdateManager.triggerUpdateCheck();

// Hook for React components
export const usePWAUpdate = () => {
  return {
    checkForUpdates: pwaUpdateManager.checkForUpdates.bind(pwaUpdateManager),
    forceUpdate: pwaUpdateManager.forceUpdate.bind(pwaUpdateManager),
    isUpdateAvailable: pwaUpdateManager.isUpdateAvailable(),
    onUpdateAvailable: pwaUpdateManager.onUpdateAvailable.bind(pwaUpdateManager),
    onUpdateInstalled: pwaUpdateManager.onUpdateInstalled.bind(pwaUpdateManager),
    triggerUpdateCheck: pwaUpdateManager.triggerUpdateCheck.bind(pwaUpdateManager)
  };
};