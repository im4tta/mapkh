'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  runAllNotificationTests, 
  testNotificationPermission,
  testServiceWorkerRegistration,
  testBadgeManagement,
  testSilentNotification,
  testBackgroundSync,
  testLocalNotification,
  logTestResults,
  type NotificationTestResult
} from '@/lib/notification-test';
import { usePushNotification } from '@/context/push-notification-provider';

interface TestResults {
  [key: string]: NotificationTestResult;
}

export function NotificationTestPanel() {
  const [testResults, setTestResults] = useState<TestResults>({});
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  
  const { 
    permission, 
    token, 
    badgeCount, 
    requestPermission, 
    updateBadgeCount, 
    clearBadge,
    sendTest,
    initialize,
    initializeRealTime,
    markNotificationsAsRead
  } = usePushNotification();

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setSummary(null);
    
    try {
      const { results, summary } = await runAllNotificationTests();
      setTestResults(results);
      setSummary(summary);
      logTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTest = async (testName: string, testFunction: () => Promise<NotificationTestResult>) => {
    setIsRunning(true);
    
    try {
      const result = await testFunction();
      setTestResults(prev => ({ ...prev, [testName]: result }));
      console.log(`Test ${testName}:`, result);
    } catch (error) {
      console.error(`Error running ${testName}:`, error);
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          message: 'Test failed with error', 
          details: error 
        } 
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const syncStatus = { queueSize: 0, isOnline: true, lastSync: null, failedSyncs: 0 };

  const getResultIcon = (result?: NotificationTestResult) => {
    if (!result) return '⏳';
    return result.success ? '✅' : '❌';
  };

  const getResultColor = (result?: NotificationTestResult) => {
    if (!result) return 'secondary';
    return result.success ? 'default' : 'destructive';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔔 Push Notification Test Panel
        </CardTitle>
        <CardDescription>
          Test and verify push notification functionality across different scenarios
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Permission</div>
            <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
              {permission}
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">FCM Token</div>
            <Badge variant={token ? 'default' : 'secondary'}>
              {token ? 'Available' : 'None'}
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Badge Count</div>
            <Badge variant="outline">{badgeCount}</Badge>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Sync Queue</div>
            <Badge variant={syncStatus.queueSize > 0 ? 'destructive' : 'default'}>
              {syncStatus.queueSize}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Test Controls */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex-1 min-w-[200px]"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              onClick={requestPermission} 
              variant="outline"
              disabled={permission === 'granted'}
            >
              Request Permission
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              onClick={() => runIndividualTest('permission', testNotificationPermission)}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              Test Permission
            </Button>
            <Button 
              onClick={() => runIndividualTest('serviceWorker', testServiceWorkerRegistration)}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              Test Service Worker
            </Button>
            <Button 
              onClick={() => runIndividualTest('badgeManagement', testBadgeManagement)}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              Test Badge
            </Button>
            <Button 
              onClick={() => runIndividualTest('silentNotification', testSilentNotification)}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              Test Silent
            </Button>
            <Button 
              onClick={() => runIndividualTest('backgroundSync', testBackgroundSync)}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              Test Sync
            </Button>
            <Button 
              onClick={() => runIndividualTest('localNotification', testLocalNotification)}
              variant="outline"
              size="sm"
              disabled={isRunning}
            >
              Test Local
            </Button>
          </div>
        </div>

        <Separator />

        {/* Manual Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Manual Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              onClick={() => updateBadgeCount(badgeCount + 1)}
              variant="outline"
              size="sm"
            >
              Increment Badge
            </Button>
            <Button 
              onClick={() => clearBadge()}
              variant="outline"
              size="sm"
            >
              Clear Badge
            </Button>
            <Button 
              onClick={() => sendTest()}
              variant="outline"
              size="sm"
            >
              Send Test
            </Button>
            <Button 
              onClick={() => {
                if (permission === 'granted') {
                  new Notification('Test Notification', {
                    body: 'Manual test notification',
                    icon: '/icons/icon-192x192.svg'
                  });
                }
              }}
              variant="outline"
              size="sm"
              disabled={permission !== 'granted'}
            >
              Show Notification
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Results</h3>
                {summary && (
                  <div className="flex gap-2">
                    <Badge variant="default">{summary.passed} Passed</Badge>
                    <Badge variant="destructive">{summary.failed} Failed</Badge>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {Object.entries(testResults).map(([testName, result]) => (
                  <div key={testName} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getResultIcon(result)}</span>
                      <div>
                        <div className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                      </div>
                    </div>
                    <Badge variant={getResultColor(result) as any}>
                      {result.success ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sync Status */}
        <Separator />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Sync Status</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Queue Size:</span>
              <span className="ml-2 font-medium">{syncStatus.queueSize}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Online:</span>
              <span className="ml-2 font-medium">{syncStatus.isOnline ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Failed Syncs:</span>
              <span className="ml-2 font-medium">{syncStatus.failedSyncs}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}