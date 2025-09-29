// Evidence count caching utility
interface EvidenceCountCache {
  [driveLink: string]: {
    count: number;
    timestamp: number;
    expiresAt: number;
  };
}

class EvidenceCacheManager {
  private cache: EvidenceCountCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'evidence_count_cache';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        // Check if localStorage is available and accessible
        if (!this.isStorageAvailable()) {
          console.warn('localStorage not available, using memory-only cache');
          return;
        }
        
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.cache = JSON.parse(stored);
          // Clean expired entries
          this.cleanExpiredEntries();
        }
      } catch (error) {
        console.warn('Failed to load evidence cache from storage:', error);
        this.cache = {};
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        // Check if localStorage is available and accessible
        if (!this.isStorageAvailable()) {
          console.warn('localStorage not available, skipping cache save');
          return;
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
      } catch (error) {
        console.warn('Failed to save evidence cache to storage:', error);
        // If storage fails, continue with memory-only cache
      }
    }
  }

  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  private cleanExpiredEntries() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => delete this.cache[key]);
    
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  get(driveLink: string): number | null {
    this.cleanExpiredEntries();
    const entry = this.cache[driveLink];
    
    if (entry && entry.expiresAt > Date.now()) {
      return entry.count;
    }
    
    return null;
  }

  set(driveLink: string, count: number) {
    const now = Date.now();
    this.cache[driveLink] = {
      count,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };
    this.saveToStorage();
  }

  has(driveLink: string): boolean {
    return this.get(driveLink) !== null;
  }

  clear() {
    this.cache = {};
    this.saveToStorage();
  }

  // Get multiple cached values
  getMultiple(driveLinks: string[]): { [driveLink: string]: number } {
    const result: { [driveLink: string]: number } = {};
    
    for (const driveLink of driveLinks) {
      const count = this.get(driveLink);
      if (count !== null) {
        result[driveLink] = count;
      }
    }
    
    return result;
  }

  // Set multiple values
  setMultiple(counts: { [driveLink: string]: number }) {
    const now = Date.now();
    
    for (const [driveLink, count] of Object.entries(counts)) {
      this.cache[driveLink] = {
        count,
        timestamp: now,
        expiresAt: now + this.CACHE_DURATION
      };
    }
    
    this.saveToStorage();
  }

  // Invalidate cache entry for a specific drive link
  invalidate(driveLink: string) {
    if (this.cache[driveLink]) {
      delete this.cache[driveLink];
      this.saveToStorage();
    }
  }

  // Invalidate multiple cache entries
  invalidateMultiple(driveLinks: string[]) {
    let hasChanges = false;
    
    for (const driveLink of driveLinks) {
      if (this.cache[driveLink]) {
        delete this.cache[driveLink];
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.saveToStorage();
    }
  }
}

// Export singleton instance
export const evidenceCache = new EvidenceCacheManager();