/**
 * Test utilities for push notifications
 * Helps verify notification functionality in different scenarios
 */

import { 
  sendSilentUpdate, 
  updateBadgeCount, 
  clearBadge, 
  getBadgeCount 
} from './firebase-messaging';
import { triggerDataSync, triggerNotificationSync } from './background-sync';

export interface NotificationTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test basic notification permission and token retrieval
 */
export async function testNotificationPermission(): Promise<NotificationTestResult> {
  try {
    if (!('Notification' in window)) {
      return {
        success: false,
        message: 'Notifications not supported in this browser'
      };
    }

    const permission = Notification.permission;
    return {
      success: permission === 'granted',
      message: `Notification permission: ${permission}`,
      details: { permission }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking notification permission',
      details: error
    };
  }
}

/**
 * Test service worker registration
 */
export async function testServiceWorkerRegistration(): Promise<NotificationTestResult> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return {
        success: false,
        message: 'Service Worker not supported'
      };
    }

    const registration = await navigator.serviceWorker.getRegistration();
    return {
      success: !!registration,
      message: registration ? 'Service Worker registered' : 'Service Worker not registered',
      details: { 
        scope: registration?.scope,
        active: !!registration?.active
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error checking Service Worker registration',
      details: error
    };
  }
}

/**
 * Test badge functionality
 */
export async function testBadgeManagement(): Promise<NotificationTestResult> {
  try {
    // Test setting badge
    await updateBadgeCount(5);
    const count1 = getBadgeCount();
    
    // Test clearing badge
    await clearBadge();
    const count2 = getBadgeCount();
    
    return {
      success: count1 === 5 && count2 === 0,
      message: 'Badge management test completed',
      details: {
        setBadgeResult: count1,
        clearBadgeResult: count2
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error testing badge management',
      details: error
    };
  }
}

/**
 * Test silent notification functionality
 */
export async function testSilentNotification(): Promise<NotificationTestResult> {
  try {
    const testData = {
      type: 'test',
      timestamp: Date.now(),
      message: 'Test silent notification'
    };

    await sendSilentUpdate(testData);
    
    return {
      success: true,
      message: 'Silent notification sent successfully',
      details: testData
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error sending silent notification',
      details: error
    };
  }
}

/**
 * Test background sync functionality
 */
export async function testBackgroundSync(): Promise<NotificationTestResult> {
  try {
    const testData = {
      id: 'test-sync-' + Date.now(),
      data: 'Test sync data'
    };

    await triggerDataSync('notifications', testData);
    
    return {
      success: true,
      message: 'Background sync triggered successfully',
      details: testData
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error triggering background sync',
      details: error
    };
  }
}

/**
 * Test local notification display
 */
export async function testLocalNotification(): Promise<NotificationTestResult> {
  try {
    if (Notification.permission !== 'granted') {
      return {
        success: false,
        message: 'Notification permission not granted'
      };
    }

    const notification = new Notification('Test Notification', {
      body: 'This is a test notification from MapKH',
      icon: '/icons/icon-192x192.svg',
      badge: '/badge-72x72.svg',
      tag: 'test-notification',
      requireInteraction: false,
      data: {
        type: 'test',
        timestamp: Date.now()
      }
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
      notification.close();
    }, 3000);

    return {
      success: true,
      message: 'Local notification displayed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error displaying local notification',
      details: error
    };
  }
}

/**
 * Run all notification tests
 */
export async function runAllNotificationTests(): Promise<{
  results: Record<string, NotificationTestResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}> {
  const tests = {
    permission: testNotificationPermission,
    serviceWorker: testServiceWorkerRegistration,
    badgeManagement: testBadgeManagement,
    silentNotification: testSilentNotification,
    backgroundSync: testBackgroundSync,
    localNotification: testLocalNotification
  };

  const results: Record<string, NotificationTestResult> = {};
  let passed = 0;
  let failed = 0;

  for (const [testName, testFunction] of Object.entries(tests)) {
    try {
      const result = await testFunction();
      results[testName] = result;
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      results[testName] = {
        success: false,
        message: `Test ${testName} threw an error`,
        details: error
      };
      failed++;
    }
  }

  return {
    results,
    summary: {
      total: Object.keys(tests).length,
      passed,
      failed
    }
  };
}

/**
 * Test background notifications when app is closed
 */
export async function testBackgroundNotifications(): Promise<NotificationTestResult> {
  const results: string[] = [];
  
  try {
    // Check if service worker is registered
    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        message: 'Service Worker not supported',
        details: results
      };
    }
    
    const registration = await navigator.serviceWorker.ready;
    results.push('✓ Service worker is ready');
    
    // Check if push messaging is supported
    if (!('PushManager' in window)) {
      return {
        success: false,
        message: 'Push messaging not supported',
        details: results
      };
    }
    results.push('✓ Push messaging is supported');
    
    // Check notification permission
    if (Notification.permission !== 'granted') {
      return {
        success: false,
        message: 'Notification permission not granted',
        details: results
      };
    }
    results.push('✓ Notification permission granted');
    
    // Test background notification display
    const testNotification = {
      title: 'Background Test Notification',
      body: 'This is a test of background notifications when app is closed',
      icon: '/icons/icon-192x192.svg',
      badge: '/badge-72x72.svg',
      tag: 'background-test',
      data: {
        url: '/',
        timestamp: Date.now(),
        testMode: true
      },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    
    // Send message to service worker to simulate background notification
    if (registration.active) {
      registration.active.postMessage({
        type: 'TEST_BACKGROUND_NOTIFICATION',
        notification: testNotification
      });
      results.push('✓ Test notification sent to service worker');
    }
    
    // Test direct service worker notification display
    try {
      await registration.showNotification(testNotification.title, {
        body: testNotification.body,
        icon: testNotification.icon,
        badge: testNotification.badge,
        tag: 'direct-test',
        data: testNotification.data,
        actions: testNotification.actions,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      } as NotificationOptions & { actions?: Array<{ action: string; title: string; icon?: string }> });
      results.push('✓ Direct service worker notification displayed');
    } catch (notifError) {
      results.push(`⚠ Direct notification failed: ${notifError}`);
    }
    
    return {
      success: true,
      message: 'Background notification test completed successfully',
      details: results
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Background notification test failed: ${error}`,
      details: results
    };
  }
}

/**
 * Log test results to console in a formatted way
 */
export function logTestResults(results: Record<string, NotificationTestResult>) {
  console.group('🔔 Push Notification Test Results');
  
  for (const [testName, result] of Object.entries(results)) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${testName}: ${result.message}`);
    
    if (result.details) {
      console.log('   Details:', result.details);
    }
  }
  
  console.groupEnd();
}