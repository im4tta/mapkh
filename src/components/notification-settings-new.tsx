'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  TestTube,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { 
  notificationSystem, 
  getNotificationPermissionStatus, 
  isNotificationSupported,
  sendTestNotification,
  requestNotificationPermission,
  getCurrentNotificationToken
} from '@/lib/notification-system';

interface NotificationPreferences {
  enabled: boolean;
  reports: boolean;
  comments: boolean;
  statusUpdates: boolean;
  mentions: boolean;
  community: boolean;
  system: boolean;
}

export function NotificationSettingsNew() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    reports: true,
    comments: true,
    statusUpdates: true,
    mentions: true,
    community: false,
    system: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    // Load initial state
    setIsSupported(isNotificationSupported());
    updateStatus();
    
    // Load preferences from localStorage
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }

    // Auto-request permission if not set
    if (isNotificationSupported() && Notification.permission === 'default') {
      setTimeout(() => {
        handleEnableNotifications();
      }, 1000);
    }
  }, []);

  const updateStatus = () => {
    setPermissionStatus(getNotificationPermissionStatus());
    setCurrentToken(getCurrentNotificationToken());
  };

  const savePreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem('notification-preferences', JSON.stringify(newPreferences));
    toast({
      title: 'Settings Saved',
      description: 'Your notification preferences have been updated.'
    });
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      if (permissionStatus === 'default' || permissionStatus === 'denied') {
        const granted = await requestNotificationPermission();
        
        if (granted) {
          updateStatus();
          savePreferences({ ...preferences, enabled: true });
          toast({
            title: 'Notifications Enabled',
            description: 'You will now receive push notifications. A test notification will be sent shortly.'
          });
          
          // Send a welcome test notification
          setTimeout(async () => {
            try {
              await sendTestNotification();
            } catch (error) {
              console.error('Failed to send welcome notification:', error);
            }
          }, 2000);
        } else {
          toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Please enable notifications in your browser settings and refresh the page.'
          });
        }
      } else if (permissionStatus === 'granted') {
        const newEnabled = !preferences.enabled;
        savePreferences({ ...preferences, enabled: newEnabled });
        
        if (newEnabled) {
          // Re-initialize notification system
          await notificationSystem.reinitialize();
          updateStatus();
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to enable notifications. Please try again or check your browser settings.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      await sendTestNotification();
      toast({
        title: 'Test Sent',
        description: 'A test notification has been sent. Check your device lockscreen and notification center.'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test notification.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsLoading(true);
    try {
      await notificationSystem.reinitialize();
      updateStatus();
      toast({
        title: 'Status Refreshed',
        description: 'Notification system has been reinitialized.'
      });
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Failed to refresh notification status.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      default:
        return 'Not Requested';
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your browser or device does not support push notifications. Please use a modern browser or add this app to your home screen.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Status
          </CardTitle>
          <CardDescription>
            Manage your push notification settings and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPermissionStatusIcon()}
              <span className="font-medium">Permission Status:</span>
              <Badge variant={permissionStatus === 'granted' ? 'default' : 'secondary'}>
                {getPermissionStatusText()}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefreshStatus}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                variant={permissionStatus === 'granted' ? 'outline' : 'default'}
              >
                {isLoading ? (
                  'Loading...'
                ) : permissionStatus === 'granted' ? (
                  preferences.enabled ? 'Disable' : 'Enable'
                ) : (
                  'Enable Notifications'
                )}
              </Button>
            </div>
          </div>

          {permissionStatus === 'denied' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked. Please enable them in your browser settings:
                <br />• Chrome: Click the lock icon in the address bar
                <br />• Safari: Go to Settings → Websites → Notifications
                <br />• Firefox: Click the shield icon in the address bar
              </AlertDescription>
            </Alert>
          )}

          {currentToken && (
            <div className="text-xs text-muted-foreground">
              <p>✅ Device registered for notifications</p>
              <p className="font-mono text-[10px] truncate">Token: {currentToken.substring(0, 20)}...</p>
            </div>
          )}

          {permissionStatus === 'granted' && (
            <div className="flex gap-2">
              <Button
                onClick={handleTestNotification}
                disabled={isLoading || !preferences.enabled}
                variant="outline"
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Categories */}
      {permissionStatus === 'granted' && preferences.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Types
            </CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reports">New Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new reports are submitted in your area
                  </p>
                </div>
                <Switch
                  id="reports"
                  checked={preferences.reports}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, reports: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="comments">Comments & Replies</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone comments on your reports
                  </p>
                </div>
                <Switch
                  id="comments"
                  checked={preferences.comments}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, comments: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="status">Status Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when report statuses change
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={preferences.statusUpdates}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, statusUpdates: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mentions">Mentions</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone mentions you
                  </p>
                </div>
                <Switch
                  id="mentions"
                  checked={preferences.mentions}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, mentions: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="community">Community Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about community events and announcements
                  </p>
                </div>
                <Switch
                  id="community"
                  checked={preferences.community}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, community: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system">System Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about system updates and maintenance
                  </p>
                </div>
                <Switch
                  id="system"
                  checked={preferences.system}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, system: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Mobile Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-1">For best mobile experience:</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• Add MapKH to your home screen (PWA)</li>
                <li>• Allow notifications when prompted</li>
                <li>• Keep the app installed for background notifications</li>
                <li>• Check your device's notification settings</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-1">Troubleshooting:</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• Use the "Refresh" button if status seems incorrect</li>
                <li>• Try the "Send Test" button to verify notifications work</li>
                <li>• Clear browser cache if notifications stop working</li>
                <li>• Check your device's Do Not Disturb settings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}