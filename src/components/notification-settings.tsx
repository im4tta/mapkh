'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Globe, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Download,
  ExternalLink
} from 'lucide-react';
import { 
  notificationConfig, 
  notificationCategories, 
  type UserNotificationPreferences,
  type NotificationCategory
} from '@/lib/notification-config';
import { usePushNotification } from '@/context/push-notification-provider';
import { toast } from '@/hooks/use-toast';
import { 
  detectMobileEnvironment, 
  getNotificationCapabilities, 
  getNotificationSupportMessage 
} from '@/lib/mobile-detection';

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(
    notificationConfig.getUserPreferences()
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [mobileDetection, setMobileDetection] = useState<any>(null);
  
  const {
    permission,
    requestPermission,
    isSupported,
    isMobile,
    isPWA,
    capabilities,
    supportMessage
  } = usePushNotification();

  useEffect(() => {
    const currentPrefs = notificationConfig.getUserPreferences();
    setPreferences(currentPrefs);
    
    // Initialize mobile detection
    if (typeof window !== 'undefined') {
      const detection = detectMobileEnvironment();
      setMobileDetection(detection);
    }
  }, []);

  const updatePreferences = (updates: Partial<UserNotificationPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const updateCategoryPreference = (categoryId: string, enabled: boolean) => {
    updatePreferences({
      categories: {
        ...preferences.categories,
        [categoryId]: enabled
      }
    });
  };

  const savePreferences = () => {
    notificationConfig.updateUserPreferences(preferences);
    setHasChanges(false);
    toast({
      title: 'Settings Saved',
      description: 'Your notification preferences have been updated.'
    });
  };

  const resetToDefaults = () => {
    notificationConfig.resetToDefaults();
    setPreferences(notificationConfig.getUserPreferences());
    setHasChanges(false);
    toast({
      title: 'Settings Reset',
      description: 'All notification settings have been reset to defaults.'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Permission
            {isMobile && (
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>
            {isMobile && capabilities?.requiresInstallation 
              ? 'Install the app to enable notifications and badges on this device.'
              : 'Browser permission is required to receive push notifications'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupported && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {capabilities?.requiresInstallation ? (
                  <div className="space-y-2">
                    <p>{supportMessage}</p>
                    {mobileDetection?.isIOS && (
                      <p className="text-sm">
                        On iOS: Tap the Share button <ExternalLink className="h-3 w-3 inline" /> and select "Add to Home Screen".
                      </p>
                    )}
                    {mobileDetection?.isAndroid && (
                      <p className="text-sm">
                        On Android: Tap the menu (⋮) and select "Add to Home Screen" or "Install App".
                      </p>
                    )}
                  </div>
                ) : (
                  'Push notifications are not supported in this browser. Please use a modern browser that supports the Notification API and Service Workers.'
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Current Status</div>
              <Badge variant={permission === 'granted' ? 'default' : 'destructive'}>
                {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Not Requested'}
              </Badge>
              {isMobile && isPWA && (
                <p className="text-xs text-green-600">
                  ✓ Running as installed app - full notification support available
                </p>
              )}
            </div>
            {permission !== 'granted' && isSupported && (
              <Button 
                onClick={requestPermission}
                disabled={!capabilities?.canRequestPermission}
              >
                {permission === 'denied' ? 'Permission Denied' : 'Enable Notifications'}
              </Button>
            )}
          </div>
          
          {/* Mobile-specific information */}
          {isMobile && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="space-y-0.5">
                  <Label>Mobile Device Information</Label>
                  <p className="text-sm text-muted-foreground">
                    Current environment and capabilities
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Device Type:</span>
                    <p className="text-muted-foreground">
                      {mobileDetection?.isIOS ? 'iOS' : mobileDetection?.isAndroid ? 'Android' : 'Mobile'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">App Mode:</span>
                    <p className="text-muted-foreground">
                      {isPWA ? 'Installed App' : 'Browser'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Notifications:</span>
                    <p className="text-muted-foreground">
                      {capabilities?.canShowNotifications ? 'Supported' : 'Limited'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Badges:</span>
                    <p className="text-muted-foreground">
                      {capabilities?.canUseBadging ? 'Supported' : 'Not Available'}
                    </p>
                  </div>
                </div>
                
                {capabilities?.limitations && capabilities.limitations.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Current Limitations:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {capabilities.limitations.map((limitation: string, index: number) => (
                            <li key={index} className="text-sm">{limitation}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="master-toggle" className="text-base font-medium">
                Enable Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all notifications
              </p>
            </div>
            <Switch
              id="master-toggle"
              checked={preferences.enabled}
              onCheckedChange={(enabled) => updatePreferences({ enabled })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-lg">{getPriorityIcon(category.priority)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium">{category.name}</Label>
                      <Badge variant={getPriorityColor(category.priority) as any} className="text-xs">
                        {category.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.categories[category.id] || false}
                  onCheckedChange={(enabled) => updateCategoryPreference(category.id, enabled)}
                  disabled={!preferences.enabled}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours-toggle">Enable Quiet Hours</Label>
            <Switch
              id="quiet-hours-toggle"
              checked={preferences.quietHours.enabled}
              onCheckedChange={(enabled) => 
                updatePreferences({
                  quietHours: { ...preferences.quietHours, enabled }
                })
              }
              disabled={!preferences.enabled}
            />
          </div>
          
          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => 
                    updatePreferences({
                      quietHours: { ...preferences.quietHours, start: e.target.value }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => 
                    updatePreferences({
                      quietHours: { ...preferences.quietHours, end: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Location-Based Notifications</CardTitle>
          <CardDescription>
            Receive notifications for reports near your location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="location-toggle">Enable Location-Based Notifications</Label>
            <Switch
              id="location-toggle"
              checked={preferences.location.enabled}
              onCheckedChange={(enabled) => 
                updatePreferences({
                  location: { ...preferences.location, enabled }
                })
              }
              disabled={!preferences.enabled}
            />
          </div>
          
          {preferences.location.enabled && (
            <div className="space-y-2">
              <Label>Notification Radius: {preferences.location.radius} km</Label>
              <Slider
                value={[preferences.location.radius]}
                onValueChange={([radius]) => 
                  updatePreferences({
                    location: { ...preferences.location, radius }
                  })
                }
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequency Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
          <CardDescription>
            Limit how many notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Maximum per hour: {preferences.frequency.maxPerHour}</Label>
            <Slider
              value={[preferences.frequency.maxPerHour]}
              onValueChange={([maxPerHour]) => 
                updatePreferences({
                  frequency: { ...preferences.frequency, maxPerHour }
                })
              }
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Maximum per day: {preferences.frequency.maxPerDay}</Label>
            <Slider
              value={[preferences.frequency.maxPerDay]}
              onValueChange={([maxPerDay]) => 
                updatePreferences({
                  frequency: { ...preferences.frequency, maxPerDay }
                })
              }
              max={100}
              min={5}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={savePreferences} 
          disabled={!hasChanges}
          className="flex-1"
        >
          Save Settings
        </Button>
        <Button 
          onClick={resetToDefaults} 
          variant="outline"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}