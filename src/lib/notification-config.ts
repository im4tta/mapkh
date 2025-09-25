/**
 * Notification configuration and registration management
 * Centralizes notification settings and registration flow
 */

export interface NotificationConfig {
  // Firebase configuration
  vapidKey: string;
  
  // Notification settings
  defaultIcon: string;
  defaultBadge: string;
  defaultSound?: string;
  
  // Behavior settings
  requireInteraction: boolean;
  silent: boolean;
  renotify: boolean;
  
  // Badge settings
  enableBadgeSync: boolean;
  maxBadgeCount: number;
  
  // Background sync settings
  enableBackgroundSync: boolean;
  syncInterval: number; // in milliseconds
  maxRetries: number;
  
  // Development settings
  enableTestMode: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

// Default notification configuration
export const defaultNotificationConfig: NotificationConfig = {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY || '',
  
  // Default notification appearance
  defaultIcon: '/icon-192x192.png',
  defaultBadge: '/badge-72x72.png',
  
  // Default behavior
  requireInteraction: false,
  silent: false,
  renotify: true,
  
  // Badge settings
  enableBadgeSync: true,
  maxBadgeCount: 99,
  
  // Background sync settings
  enableBackgroundSync: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  
  // Development settings
  enableTestMode: process.env.NODE_ENV === 'development',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error'
};

/**
 * Notification registration flow configuration
 */
export interface RegistrationFlowConfig {
  // When to show permission request
  showOnAppStart: boolean;
  showAfterUserAction: boolean;
  showAfterDelay: number; // milliseconds
  
  // Permission request UI
  showExplanationDialog: boolean;
  explanationTitle: string;
  explanationMessage: string;
  
  // Retry behavior
  maxPermissionRequests: number;
  retryDelay: number; // milliseconds
  
  // Fallback behavior
  enableFallbackPolling: boolean;
  pollingInterval: number; // milliseconds
}

export const defaultRegistrationFlow: RegistrationFlowConfig = {
  showOnAppStart: false,
  showAfterUserAction: true,
  showAfterDelay: 5000, // 5 seconds
  
  showExplanationDialog: true,
  explanationTitle: 'Enable Notifications',
  explanationMessage: 'Get real-time updates about reports and important information in your area.',
  
  maxPermissionRequests: 3,
  retryDelay: 24 * 60 * 60 * 1000, // 24 hours
  
  enableFallbackPolling: true,
  pollingInterval: 60000 // 1 minute
};

/**
 * Notification categories and their configurations
 */
export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  priority: 'low' | 'normal' | 'high';
  sound?: string;
  vibration?: number[];
  actions?: NotificationAction[];
  defaultEnabled: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export const notificationCategories: NotificationCategory[] = [
  {
    id: 'emergency',
    name: 'Emergency Alerts',
    description: 'Critical safety alerts and emergency notifications',
    icon: '/icons/emergency.png',
    priority: 'high',
    vibration: [200, 100, 200, 100, 200],
    actions: [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'share', title: 'Share', icon: '/icons/share.png' }
    ],
    defaultEnabled: true
  },
  {
    id: 'reports',
    name: 'New Reports',
    description: 'Notifications about new reports in your area',
    icon: '/icons/report.png',
    priority: 'normal',
    vibration: [100, 50, 100],
    actions: [
      { action: 'view', title: 'View Report', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
    ],
    defaultEnabled: true
  },
  {
    id: 'updates',
    name: 'Report Updates',
    description: 'Updates on reports you\'ve submitted or are following',
    icon: '/icons/update.png',
    priority: 'normal',
    vibration: [100],
    actions: [
      { action: 'view', title: 'View Update', icon: '/icons/view.png' }
    ],
    defaultEnabled: true
  },
  {
    id: 'mentions',
    name: 'Mentions & Replies',
    description: 'When someone mentions you or replies to your posts',
    icon: '/icons/mention.png',
    priority: 'normal',
    vibration: [100, 50],
    actions: [
      { action: 'view', title: 'View Post', icon: '/icons/view.png' },
      { action: 'reply', title: 'Reply', icon: '/icons/reply.png' }
    ],
    defaultEnabled: true
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Community discussions and announcements',
    icon: '/icons/community.png',
    priority: 'low',
    actions: [
      { action: 'view', title: 'View', icon: '/icons/view.png' }
    ],
    defaultEnabled: false
  },
  {
    id: 'system',
    name: 'System',
    description: 'App updates and system notifications',
    icon: '/icons/system.png',
    priority: 'low',
    defaultEnabled: true
  }
];

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  enabled: boolean;
  categories: Record<string, boolean>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  location: {
    enabled: boolean;
    radius: number; // in kilometers
  };
  frequency: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export const defaultUserPreferences: UserNotificationPreferences = {
  enabled: true,
  categories: notificationCategories.reduce((acc, category) => {
    acc[category.id] = category.defaultEnabled;
    return acc;
  }, {} as Record<string, boolean>),
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  },
  location: {
    enabled: true,
    radius: 10 // 10km radius
  },
  frequency: {
    maxPerHour: 5,
    maxPerDay: 20
  }
};

/**
 * Storage keys for notification settings
 */
export const STORAGE_KEYS = {
  NOTIFICATION_CONFIG: 'mapkh_notification_config',
  USER_PREFERENCES: 'mapkh_notification_preferences',
  REGISTRATION_FLOW: 'mapkh_registration_flow',
  PERMISSION_REQUESTS: 'mapkh_permission_requests',
  FCM_TOKEN: 'mapkh_fcm_token',
  BADGE_COUNT: 'mapkh_badge_count',
  LAST_SYNC: 'mapkh_last_sync'
} as const;

/**
 * Utility functions for configuration management
 */
export class NotificationConfigManager {
  private static instance: NotificationConfigManager;
  private config: NotificationConfig;
  private userPreferences: UserNotificationPreferences;

  private constructor() {
    this.config = this.loadConfig();
    this.userPreferences = this.loadUserPreferences();
  }

  static getInstance(): NotificationConfigManager {
    if (!NotificationConfigManager.instance) {
      NotificationConfigManager.instance = new NotificationConfigManager();
    }
    return NotificationConfigManager.instance;
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  getUserPreferences(): UserNotificationPreferences {
    return { ...this.userPreferences };
  }

  updateConfig(updates: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  updateUserPreferences(updates: Partial<UserNotificationPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...updates };
    this.saveUserPreferences();
  }

  private loadConfig(): NotificationConfig {
    if (typeof window === 'undefined') return defaultNotificationConfig;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_CONFIG);
      if (stored) {
        return { ...defaultNotificationConfig, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification config:', error);
    }
    
    return defaultNotificationConfig;
  }

  private loadUserPreferences(): UserNotificationPreferences {
    if (typeof window === 'undefined') return defaultUserPreferences;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        return { ...defaultUserPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
    
    return defaultUserPreferences;
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save notification config:', error);
    }
  }

  private saveUserPreferences(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Check if notifications should be shown based on user preferences
   */
  shouldShowNotification(category: string, location?: { lat: number; lng: number }): boolean {
    if (!this.userPreferences.enabled) return false;
    if (!this.userPreferences.categories[category]) return false;
    
    // Check quiet hours
    if (this.userPreferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = this.userPreferences.quietHours;
      
      if (start <= end) {
        // Same day quiet hours (e.g., 22:00 to 23:59)
        if (currentTime >= start && currentTime <= end) return false;
      } else {
        // Overnight quiet hours (e.g., 22:00 to 08:00)
        if (currentTime >= start || currentTime <= end) return false;
      }
    }
    
    // Check location radius (if location is provided)
    if (location && this.userPreferences.location.enabled) {
      // This would need to be implemented with actual user location
      // For now, we'll assume it's within range
    }
    
    return true;
  }

  /**
   * Get notification configuration for a specific category
   */
  getCategoryConfig(categoryId: string): NotificationCategory | undefined {
    return notificationCategories.find(cat => cat.id === categoryId);
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults(): void {
    this.config = { ...defaultNotificationConfig };
    this.userPreferences = { ...defaultUserPreferences };
    this.saveConfig();
    this.saveUserPreferences();
  }
}

// Export singleton instance
export const notificationConfig = NotificationConfigManager.getInstance();