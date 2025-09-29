
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ClientProviders } from '@/components/client-providers';
import { Analytics } from "@vercel/analytics/next";
import ErrorBoundary from '@/components/error-boundary';
import { ForceUpdateHandler } from '@/components/force-update-handler';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <title>MapKHCorrect</title>
        <meta name="description" content="Fix the Map, Help the Nation. A user-friendly map error reporting app for community contributions." />
        
        {/* Mobile browser compatibility */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MapCorrectKH" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+Khmer:wght@400;500;700&display=swap" rel="stylesheet" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicons */}
        <link rel="icon" type="image/svg+xml" sizes="16x16" href="/favicon-16x16.svg?v=3.0.0" />
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/favicon-32x32.svg?v=3.0.0" />
        <link rel="icon" type="image/svg+xml" sizes="96x96" href="/favicon-96x96.svg?v=3.0.0" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MapCorrect" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.svg?v=3.0.0" />
        <link rel="shortcut icon" href="/favicon-32x32.svg?v=3.0.0" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.svg?v=3.0.0" />
        
        {/* Theme colors */}
        <meta name="theme-color" content="#D6001C" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#00209F" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-TileColor" content="#D6001C" />
      </head>
      <body className={cn("font-body antialiased h-full min-h-full bg-background flex flex-col")}>
        <ErrorBoundary>
          <ClientProviders>
              {children}
          </ClientProviders>
        </ErrorBoundary>
        <ForceUpdateHandler />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
