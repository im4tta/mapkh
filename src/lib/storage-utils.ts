// Storage utilities with mobile-friendly error handling
// Provides safe localStorage access with fallbacks for mobile browsers

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class SafeStorage {
  private isAvailable: boolean | null = null;

  // Check if localStorage is available and accessible
  private checkStorageAvailability(): boolean {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.isAvailable = false;
        return false;
      }

      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.isAvailable = true;
      return true;
    } catch (error) {
      console.warn('localStorage not available:', error);
      this.isAvailable = false;
      return false;
    }
  }

  // Safe localStorage.getItem with error handling
  getItem<T = string>(key: string, defaultValue?: T): StorageResult<T> {
    try {
      if (!this.checkStorageAvailability()) {
        return {
          success: false,
          data: defaultValue,
          error: 'localStorage not available'
        };
      }

      const item = localStorage.getItem(key);
      if (item === null) {
        return {
          success: true,
          data: defaultValue
        };
      }

      // Try to parse as JSON, fallback to string
      try {
        const parsed = JSON.parse(item);
        return {
          success: true,
          data: parsed as T
        };
      } catch {
        return {
          success: true,
          data: item as T
        };
      }
    } catch (error) {
      console.warn(`Failed to get item '${key}' from localStorage:`, error);
      return {
        success: false,
        data: defaultValue,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Safe localStorage.setItem with error handling
  setItem<T>(key: string, value: T): StorageResult<boolean> {
    try {
      if (!this.checkStorageAvailability()) {
        return {
          success: false,
          error: 'localStorage not available'
        };
      }

      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.warn(`Failed to set item '${key}' in localStorage:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Safe localStorage.removeItem with error handling
  removeItem(key: string): StorageResult<boolean> {
    try {
      if (!this.checkStorageAvailability()) {
        return {
          success: false,
          error: 'localStorage not available'
        };
      }

      localStorage.removeItem(key);
      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.warn(`Failed to remove item '${key}' from localStorage:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Clear all localStorage with error handling
  clear(): StorageResult<boolean> {
    try {
      if (!this.checkStorageAvailability()) {
        return {
          success: false,
          error: 'localStorage not available'
        };
      }

      localStorage.clear();
      return {
        success: true,
        data: true
      };
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get storage availability status
  isStorageAvailable(): boolean {
    return this.checkStorageAvailability();
  }

  // Reset availability check (useful for testing)
  resetAvailabilityCheck(): void {
    this.isAvailable = null;
  }
}

// Export singleton instance
export const safeStorage = new SafeStorage();

// Convenience functions for common operations
export const safeGetItem = <T = string>(key: string, defaultValue?: T): T | undefined => {
  const result = safeStorage.getItem<T>(key, defaultValue);
  return result.data;
};

export const safeSetItem = <T>(key: string, value: T): boolean => {
  const result = safeStorage.setItem(key, value);
  return result.success;
};

export const safeRemoveItem = (key: string): boolean => {
  const result = safeStorage.removeItem(key);
  return result.success;
};

// Mobile-specific storage utilities
export const isMobileStorageRestricted = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isPrivateMode = !safeStorage.isStorageAvailable();
  
  // iOS Safari in private mode or with storage restrictions
  return isIOS && (isSafari || isPrivateMode);
};

export const getStorageInfo = () => {
  return {
    available: safeStorage.isStorageAvailable(),
    isMobileRestricted: isMobileStorageRestricted(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
  };
};