
"use client";

import { AuthProvider, useAuth } from '@/context/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { PushNotificationProvider } from '@/context/push-notification-provider';
import { AppShell } from '@/components/app-shell';
import { ActivityDialogProvider } from '@/context/activity-dialog-provider';
import React, { Suspense, useEffect, Component, ErrorInfo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { I18nProvider } from '@/context/i18n-provider';
import { useToast } from '@/hooks/use-toast';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { IOSPWAInitializer } from '@/components/ios-pwa-initializer';


function AppBootstrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
      if (!user && !isAuthPage) {
        router.push('/login');
      }
    }
  }, [user, loading, router, pathname]);

  // Service Worker update handling
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, message, version } = event.data;
        
        switch (type) {
          case 'FORCE_RELOAD':
            toast({
              title: 'App Update',
              description: message || 'Reloading to apply updates...',
            });
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }, 1000);
            break;
            
          case 'SW_UPDATED':
            toast({
              title: 'Update Complete',
              description: `App updated to version ${version}`,
            });
            break;
            
          case 'NAVIGATE_TO':
            if (event.data.url) {
              router.push(event.data.url);
            }
            break;
            
          default:
            break;
        }
      });
    }
  }, [router, toast]);

  if (loading) {
    return (
       <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

    // Only show the AppShell for authenticated users on non-auth pages
    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    if (!user && isAuthPage) {
        return <>{children}</>;
    }

  return (
    <>
      <AppShell>{children}</AppShell>
      <PWAInstallPrompt />
    </>
  );
}


// Error boundary for providers that might fail on mobile
class ProviderErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.warn('Provider initialization error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Provider error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
      <I18nProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
              <ProviderErrorBoundary fallback={children}>
                <PushNotificationProvider>
                  <IOSPWAInitializer>
                    <Suspense fallback={null}>
                      <ActivityDialogProvider>
                        <AppBootstrapper>
                            {children}
                        </AppBootstrapper>
                      </ActivityDialogProvider>
                    </Suspense>
                  </IOSPWAInitializer>
                </PushNotificationProvider>
              </ProviderErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    );
}
