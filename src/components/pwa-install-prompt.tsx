'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  detectMobileEnvironment, 
  getNotificationCapabilities, 
  getNotificationSupportMessage 
} from '@/lib/mobile-detection';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [mobileDetection, setMobileDetection] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize mobile detection
    const detection = detectMobileEnvironment();
    const caps = getNotificationCapabilities();
    const message = getNotificationSupportMessage();
    
    setMobileDetection(detection);
    setCapabilities(caps);
    setSupportMessage(message);

    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check for standalone mode (PWA)
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check for iOS standalone mode
      if (window.navigator && (window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // Don't show prompt if already installed
    if (detection.isStandalone) {
      return;
    }

    // Show prompt more prominently for mobile users who need installation for notifications
    if (caps.requiresInstallation) {
      setShowInstallPrompt(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      toast({
        title: 'App Installed!',
        description: 'MapKH has been installed successfully.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Provide platform-specific instructions
      let instructions = 'To install this app, use your browser\'s install option in the menu or address bar.';
      
      if (mobileDetection?.isIOS) {
        instructions = 'To install on iOS: Tap the Share button and select "Add to Home Screen".';
      } else if (mobileDetection?.isAndroid) {
        instructions = 'To install on Android: Tap the menu (⋮) and select "Add to Home Screen" or "Install App".';
      }
      
      toast({
        title: 'Install App',
        description: instructions,
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast({
          title: 'Installing...',
          description: 'The app is being installed.',
        });
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
      toast({
        title: 'Installation Error',
        description: 'There was an error installing the app.',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't clear deferredPrompt so user can still install later
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Show install button if prompt is available but banner is dismissed
  if (deferredPrompt && !showInstallPrompt) {
    return (
      <Button
        onClick={handleInstallClick}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>
    );
  }

  // Show install prompt banner
  if (showInstallPrompt) {
    const showNotificationBenefit = capabilities?.requiresInstallation;
    
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg md:left-auto md:w-80">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                {showNotificationBenefit && (
                  <Bell className="h-4 w-4 text-orange-500" />
                )}
                <h3 className="font-semibold text-sm">Install MapKH</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {showNotificationBenefit 
                  ? 'Enable notifications and get the full experience'
                  : 'Install this app for a better experience with offline access and notifications.'
                }
              </p>
              {showNotificationBenefit && (
                <p className="text-xs text-orange-600 mt-1">
                  Required for notifications on this device
                </p>
              )}
            </div>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1"
              variant={showNotificationBenefit ? "default" : "outline"}
            >
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}