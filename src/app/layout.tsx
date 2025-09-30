
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
        <meta name="apple-mobile-web-app-title" content="MapCorrect" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS PWA specific */}
        <meta name="apple-itunes-app" content="app-id=, app-argument=" />
        <meta name="apple-mobile-web-app-orientations" content="portrait" />
        <link rel="mask-icon" href="/apple-touch-icon.png" color="#D6001C" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+Khmer:wght@400;500;700&display=swap" rel="stylesheet" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Apple Touch Icons - iOS PWA Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icon-57x57.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-touch-icon-60x60.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icon-72x72.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76x76.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114x114.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icon-144x144.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.jpg?v=20250109f" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.jpg?v=20250109f" />
        
        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MapKH" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/apple-touch-icon-180x180.jpg?v=20250109f" />
        
        {/* Additional iOS Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="MapKH" />
        
        {/* iOS PWA Support */}
        <link rel="apple-touch-startup-image" href="/apple-touch-icon-180x180.jpg" />
        <meta name="msapplication-TileImage" content="/apple-touch-icon-180x180.jpg" />
        
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
