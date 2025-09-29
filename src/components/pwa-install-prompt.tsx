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

    // Enhanced Chrome address bar installation support
    let installPromptShown = false;

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // For desktop browsers, don't show prompt immediately - let users login first
      // Only show the small install button in the corner
      if (!detection.isMobile && !installPromptShown) {
        // Don't show the banner immediately on desktop
        // setShowInstallPrompt(true);
        installPromptShown = true;
      }
      
      // For mobile, only show if notifications require installation
      if (detection.isMobile && caps.requiresInstallation) {
        setShowInstallPrompt(true);
      }
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

    // Enhanced visibility change handling for Chrome address bar
    const handleVisibilityChange = () => {
      if (!document.hidden && deferredPrompt && !detection.isMobile && !installPromptShown) {
        // Don't automatically show prompt when user returns to tab
        // Let them use the app normally and discover the install button naturally
        // setTimeout(() => {
        //   if (!isInstalled && deferredPrompt) {
        //     setShowInstallPrompt(true);
        //     installPromptShown = true;
        //   }
        // }, 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [toast, isInstalled, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Provide platform-specific instructions with emphasis on Chrome address bar
      let instructions = 'To install this app, look for the install icon in your browser\'s address bar or use the browser menu.';
      
      if (mobileDetection?.isIOS) {
        instructions = 'To install on iOS: Tap the Share button and select "Add to Home Screen".';
      } else if (mobileDetection?.isAndroid) {
        instructions = 'To install on Android: Tap the menu (⋮) and select "Add to Home Screen" or "Install App".';
      } else {
        // Desktop Chrome specific instructions
        instructions = 'To install: Look for the install icon (⊕) in the Chrome address bar, or use the browser menu → "Install MapKH".';
      }
      
      toast({
        title: 'Install App',
        description: instructions,
        duration: 6000,
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
    const isDesktop = !mobileDetection?.isMobile;
    
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg md:left-auto md:w-96">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                {showNotificationBenefit && (
                  <Bell className="h-4 w-4 text-orange-500" />
                )}
                <h3 className="font-semibold text-sm">
                  {isDesktop ? 'Install MapKH from Chrome' : 'Install MapKH'}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isDesktop 
                  ? 'Click the install icon (⊕) in your Chrome address bar for the best experience'
                  : showNotificationBenefit 
                    ? 'Enable notifications and get the full experience'
                    : 'Install this app for a better experience with offline access and notifications.'
                }
              </p>
              {showNotificationBenefit && !isDesktop && (
                <p className="text-xs text-orange-600 mt-1">
                  Required for notifications on this device
                </p>
              )}
              {isDesktop && (
                <p className="text-xs text-blue-600 mt-1">
                  Look for the install button in your browser's address bar
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
              variant={showNotificationBenefit || isDesktop ? "default" : "outline"}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDesktop ? 'Install from Chrome' : 'Install'}
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