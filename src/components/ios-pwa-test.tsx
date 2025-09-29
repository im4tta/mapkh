'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Bell, 
  Home,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { detectMobileEnvironment, getNotificationCapabilities } from '@/lib/mobile-detection';
import { getBadgeManager } from '@/lib/badge-manager';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: string;
}

export function IOSPWATest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [environment, setEnvironment] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const env = detectMobileEnvironment();
      setEnvironment(env);
    }
  }, []);

  const runIOSPWATests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Environment Detection
      const env = detectMobileEnvironment();
      const deviceType = env.isIOS ? 'iOS' : env.isAndroid ? 'Android' : env.isMobile ? 'Mobile' : 'Desktop';
      results.push({
        name: 'iOS Detection',
        status: env.isIOS ? 'pass' : 'info',
        message: env.isIOS ? 'iOS device detected' : `Device: ${deviceType}`,
        details: `User Agent: ${navigator.userAgent.substring(0, 50)}...`
      });

      // Test 2: PWA Installation Status
      results.push({
        name: 'PWA Installation',
        status: env.isStandalone ? 'pass' : 'warning',
        message: env.isStandalone ? 'App is installed as PWA' : 'App running in browser',
        details: env.isStandalone ? 'Full PWA features available' : 'Install as PWA for full functionality'
      });

      // Test 3: Manifest Configuration
      try {
        const manifestResponse = await fetch('/manifest.json');
        const manifest = await manifestResponse.json();
        
        const hasIOSIcons = manifest.icons?.some((icon: any) => 
          icon.src.includes('apple-touch-icon') || icon.sizes === '180x180'
        );
        
        results.push({
          name: 'Manifest Icons',
          status: hasIOSIcons ? 'pass' : 'fail',
          message: hasIOSIcons ? 'iOS icons configured' : 'Missing iOS icons',
          details: `Found ${manifest.icons?.length || 0} icons in manifest`
        });

        const hasShortcuts = manifest.shortcuts && manifest.shortcuts.length > 0;
        results.push({
          name: 'PWA Shortcuts',
          status: hasShortcuts ? 'pass' : 'info',
          message: hasShortcuts ? 'PWA shortcuts configured' : 'No shortcuts configured',
          details: hasShortcuts ? `${manifest.shortcuts.length} shortcuts available` : 'Shortcuts enhance user experience'
        });
      } catch (error) {
        results.push({
          name: 'Manifest Loading',
          status: 'fail',
          message: 'Failed to load manifest.json',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 4: Service Worker Registration
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          results.push({
            name: 'Service Worker',
            status: registration ? 'pass' : 'fail',
            message: registration ? 'Service worker registered' : 'Service worker not registered',
            details: registration ? `Scope: ${registration.scope}` : 'Required for offline functionality'
          });
        } catch (error) {
          results.push({
            name: 'Service Worker',
            status: 'fail',
            message: 'Service worker check failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        results.push({
          name: 'Service Worker',
          status: 'fail',
          message: 'Service workers not supported',
          details: 'Browser does not support service workers'
        });
      }

      // Test 5: Notification Capabilities
      const capabilities = getNotificationCapabilities();
      results.push({
        name: 'Notification Support',
        status: capabilities.canShowNotifications ? 'pass' : 'fail',
        message: capabilities.canShowNotifications ? 'Notifications supported' : 'Notifications not supported',
        details: `Permission: ${Notification.permission}`
      });

      // Test 6: Badge API Support
      results.push({
        name: 'Badge API',
        status: capabilities.canUseBadging ? 'pass' : 'warning',
        message: capabilities.canUseBadging ? 'Badge API supported' : 'Badge API not supported',
        details: capabilities.canUseBadging ? 'Native badge support available' : 'Using fallback badge management'
      });

      // Test 7: Badge Manager Functionality
      try {
        const badgeManager = getBadgeManager();
        await badgeManager.updateBadgeCount(5);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        const currentCount = badgeManager.getBadgeCount();
        
        results.push({
          name: 'Badge Manager',
          status: currentCount === 5 ? 'pass' : 'warning',
          message: currentCount === 5 ? 'Badge manager working' : 'Badge manager issues',
          details: `Set: 5, Current: ${currentCount}`
        });

        // Reset badge
        await badgeManager.clearBadge();
      } catch (error) {
        results.push({
          name: 'Badge Manager',
          status: 'fail',
          message: 'Badge manager failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 8: Local Storage Persistence
      try {
        const testKey = 'ios_pwa_test';
        const testValue = 'test_data_' + Date.now();
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        results.push({
          name: 'Storage Persistence',
          status: retrieved === testValue ? 'pass' : 'fail',
          message: retrieved === testValue ? 'Local storage working' : 'Local storage failed',
          details: 'Required for badge count persistence'
        });
      } catch (error) {
        results.push({
          name: 'Storage Persistence',
          status: 'fail',
          message: 'Storage test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 9: Network Status
      const isOnline = navigator.onLine;
      results.push({
        name: 'Network Status',
        status: isOnline ? 'pass' : 'warning',
        message: isOnline ? 'Online' : 'Offline',
        details: isOnline ? 'All features available' : 'Limited functionality in offline mode'
      });

      // Test 10: iOS Specific Features
      if (env.isIOS) {
        const hasStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
        results.push({
          name: 'iOS Standalone Mode',
          status: hasStandaloneMode ? 'pass' : 'info',
          message: hasStandaloneMode ? 'Running in standalone mode' : 'Running in browser mode',
          details: hasStandaloneMode ? 'Full iOS PWA experience' : 'Add to Home Screen for better experience'
        });
      }

    } catch (error) {
      results.push({
        name: 'Test Suite',
        status: 'fail',
        message: 'Test suite failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTestResults(results);
    setIsRunning(false);

    // Show summary toast
    const passCount = results.filter(r => r.status === 'pass').length;
    const totalCount = results.length;
    
    toast({
      title: 'iOS PWA Test Complete',
      description: `${passCount}/${totalCount} tests passed`,
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'fail':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          iOS PWA Functionality Test
        </CardTitle>
        <CardDescription>
          Test iOS PWA features including icons, badges, and offline functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {environment && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Environment:</strong> {environment.isIOS ? 'iOS' : environment.platform} | 
              <strong> Mode:</strong> {environment.isStandalone ? 'PWA' : 'Browser'} |
              <strong> Safari:</strong> {environment.isSafari ? 'Yes' : 'No'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={runIOSPWATests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Running Tests...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Run iOS PWA Tests
              </>
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Test Results</h3>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.name}</span>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {result.message}
                    </p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.status === 'pass').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => r.status === 'fail').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {testResults.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {testResults.filter(r => r.status === 'info').length}
                </div>
                <div className="text-sm text-muted-foreground">Info</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}