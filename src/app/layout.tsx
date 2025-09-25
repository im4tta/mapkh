
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ClientProviders } from '@/components/client-providers';
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <title>MapKHCorrect</title>
        <meta name="description" content="Fix the Map, Help the Nation. A user-friendly map error reporting app for community contributions." />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MapKHCorrect" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+Khmer:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <meta name="theme-color" content="#D6001C" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#00209F" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={cn("font-body antialiased h-full min-h-full bg-background flex flex-col")}>
        <ClientProviders>
            {children}
        </ClientProviders>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
