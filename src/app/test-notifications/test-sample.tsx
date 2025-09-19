"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Bell } from "lucide-react";

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp?: Date;
}

export default function NotificationTestSample() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [
      ...prev.filter(r => r.test !== test),
      { test, status, message, timestamp: new Date() }
    ]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Check if service worker is supported
    try {
      if ('serviceWorker' in navigator) {
        addTestResult('Service Worker Support', 'success', 'Service Worker is supported in this browser');
      } else {
        addTestResult('Service Worker Support', 'error', 'Service Worker is not supported in this browser');
        setIsRunning(false);
        return;
      }
    } catch (error) {
      addTestResult('Service Worker Support', 'error', `Error checking service worker: ${error}`);
    }

    // Test 2: Check if Push API is supported
    try {
      if ('PushManager' in window) {
        addTestResult('Push API Support', 'success', 'Push API is supported');
      } else {
        addTestResult('Push API Support', 'error', 'Push API is not supported');
      }
    } catch (error) {
      addTestResult('Push API Support', 'error', `Error checking Push API: ${error}`);
    }

    // Test 3: Check notification permission
    try {
      const permission = Notification.permission;
      if (permission === 'granted') {
        addTestResult('Notification Permission', 'success', 'Notification permission is granted');
      } else if (permission === 'denied') {
        addTestResult('Notification Permission', 'error', 'Notification permission is denied');
      } else {
        addTestResult('Notification Permission', 'error', 'Notification permission is not granted (default)');
      }
    } catch (error) {
      addTestResult('Notification Permission', 'error', `Error checking notification permission: ${error}`);
    }

    // Test 4: Check Firebase configuration
    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY;
      if (vapidKey && vapidKey.length > 0) {
        addTestResult('VAPID Key Configuration', 'success', `VAPID key is configured (${vapidKey.substring(0, 20)}...)`);
      } else {
        addTestResult('VAPID Key Configuration', 'error', 'VAPID key is not configured');
      }
    } catch (error) {
      addTestResult('VAPID Key Configuration', 'error', `Error checking VAPID key: ${error}`);
    }

    // Test 5: Try to get FCM token
    try {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { app } = await import('@/lib/firebase');
      
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY;
      
      if (!vapidKey) {
        throw new Error('VAPID key not found');
      }

      const token = await getToken(messaging, { vapidKey });
      
      if (token) {
        setFcmToken(token);
        addTestResult('FCM Token Generation', 'success', `FCM token generated successfully (${token.substring(0, 20)}...)`);
      } else {
        addTestResult('FCM Token Generation', 'error', 'No registration token available');
      }
    } catch (error: any) {
      addTestResult('FCM Token Generation', 'error', `Failed to get FCM token: ${error.message}`);
    }

    // Test 6: Test local notification
    try {
      if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a test notification from MapKH',
          icon: '/icon-192x192.svg',
          badge: '/badge-72x72.svg'
        });
        addTestResult('Local Notification Test', 'success', 'Local notification sent successfully');
      } else {
        addTestResult('Local Notification Test', 'error', 'Cannot send local notification - permission not granted');
      }
    } catch (error: any) {
      addTestResult('Local Notification Test', 'error', `Failed to send local notification: ${error.message}`);
    }

    setIsRunning(false);
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        addTestResult('Permission Request', 'success', 'Notification permission granted');
      } else {
        addTestResult('Permission Request', 'error', 'Notification permission denied');
      }
    } catch (error: any) {
      addTestResult('Permission Request', 'error', `Error requesting permission: ${error.message}`);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    const variants = {
      success: 'default' as const,
      error: 'destructive' as const,
      pending: 'secondary' as const
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notification Test Suite
          </CardTitle>
          <CardDescription>
            Comprehensive test to verify push notification functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runComprehensiveTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              variant="outline" 
              onClick={requestNotificationPermission}
              disabled={isRunning}
            >
              Request Permission
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Test Results</h3>
              {testResults.map((result, index) => (
                <Alert key={index} className={`border-l-4 ${
                  result.status === 'success' ? 'border-l-green-500' : 
                  result.status === 'error' ? 'border-l-red-500' : 'border-l-yellow-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{result.test}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <AlertDescription>{result.message}</AlertDescription>
                        {result.timestamp && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {result.timestamp.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {fcmToken && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>FCM Token:</strong>
                <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                  {fcmToken}
                </div>
                <div className="mt-2 text-sm">
                  You can use this token to send test notifications from the Firebase Console or your backend.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> For full push notification testing, you'll need to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ensure you're running on HTTPS (or localhost)</li>
                <li>Grant notification permissions when prompted</li>
                <li>Have a valid Firebase project configuration</li>
                <li>Test on different browsers and devices</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}