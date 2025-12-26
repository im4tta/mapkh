'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Bell, Smartphone, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  requestNotificationPermission,
  getNotificationPermissionStatus,
  isNotificationSupported 
} from '@/lib/notification-system';
import { isMobileDevice, shouldShowNotificationPrompt, getMobileNotificationInstructions } from '@/lib/mobile-utils';

interface NotificationPermissionPromptProps {
  onClose?: () => void;
  autoShow?: boolean;
}

export function NotificationPermissionPrompt({ onClose, autoShow = true }: NotificationPermissionPromptProps) {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!isNotificationSupported()) return;

    const status = getNotificationPermissionStatus();
    setPermissionStatus(status);

    // Show prompt automatically if permission is default and autoShow is enabled
    if (autoShow && status === 'default' && shouldShowNotificationPrompt()) {
      // Check if user has dismissed this prompt recently
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      // Show prompt if not dismissed or dismissed more than 24 hours ago
      if (!dismissed || (now - dismissedTime) > oneDay) {
        setTimeout(() => {
          setIsVisible(true);
        }, isMobileDevice() ? 2000 : 5000); // Show sooner on mobile
      }
    }
  }, [autoShow]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const granted = await requestNotificationPermission();
      
      if (granted) {
        setPermissionStatus('granted');
        toast({
          title: 'Notifications Enabled! 🎉',
          description: 'You will now receive real-time updates about reports and activities.',
        });
        handleClose();
      } else {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'You can enable notifications later in Settings.',
        });
        handleDismiss();
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to enable notifications. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Remember that user dismissed this prompt
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // Don't show if notifications aren't supported or already granted/denied
  if (!isNotificationSupported() || permissionStatus !== 'default' || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Stay Updated with MapKH</CardTitle>
              <CardDescription>
                Get real-time notifications about reports in your area
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              {getMobileNotificationInstructions()}
              <ul className="mt-2 space-y-1 ml-4">
                <li>• New reports near you</li>
                <li>• Status updates on your reports</li>
                <li>• Comments and replies</li>
                <li>• Important community announcements</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                'Enabling...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={isLoading}
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can change this setting anytime in the Settings page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}