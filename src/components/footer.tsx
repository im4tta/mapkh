"use client";

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart, Users, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SupporterService, type Supporter } from '@/lib/supporters';

import { safeGetItem } from '@/lib/storage-utils';

export function Footer() {
  const { t } = useTranslation();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time supporters updates
    const unsubscribe = SupporterService.subscribeToSupporters(
      (supportersData) => {
        setSupporters(supportersData);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error loading supporters in footer:', error);
        setError('Failed to load supporters');
        setIsLoading(false);
        // Fallback: try to load from safe storage if Firestore fails
        const savedSupporters = safeGetItem<string>('mapkh_supporters');
        if (savedSupporters) {
          try {
            const localSupporters = JSON.parse(savedSupporters);
            // Convert string array to Supporter objects for compatibility
            const convertedSupporters = localSupporters.map((name: string, index: number) => ({
              id: `local-${index}`,
              name,
              message: '',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              createdBy: 'local'
            }));
            setSupporters(convertedSupporters);
          } catch (parseError) {
            console.error('Failed to parse local supporters:', parseError);
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Left side - App Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('header.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('header.tagline')} • Help improve Cambodia's digital maps
              </p>
            </div>

            {/* Center - Support Us */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <a 
                href="https://t.me/mapkhcorrect" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Join Telegram
              </a>
            </Button>
            
            {/* Supporters */}
            {isLoading ? (
              <Button variant="outline" size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </Button>
            ) : error ? (
              <Button variant="outline" size="sm" disabled>
                <Heart className="h-4 w-4 mr-2 text-red-500" />
                Error Loading
              </Button>
            ) : supporters.length > 0 ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    {supporters.length} Supporters
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Our Supporters ({supporters.length})
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-80 w-full">
                    <div className="space-y-2 pr-4">
                      {supporters.map((supporter) => (
                        <div key={supporter.id} className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Heart className="h-3 w-3 text-red-500 flex-shrink-0" />
                            <span className="text-sm font-medium">{supporter.name}</span>
                          </div>
                          {supporter.message && (
                            <p className="text-xs text-muted-foreground ml-5 break-words">
                              {supporter.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Heart className="h-4 w-4 mr-2 text-red-500" />
                No Supporters Yet
              </Button>
            )}
          </div>
        </div>

            {/* Bottom copyright */}
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} MapKHCorrect. Made with ❤️ for Cambodia.
              </p>
            </div>
          </div>
        </footer>

        {/* Mobile Footer */}
        <footer className="md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-16">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-4">
              {/* Mobile App Info */}
              <div className="text-center">
                <h3 className="text-base font-semibold">{t('header.title')}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('header.tagline')}
                </p>
              </div>

              {/* Mobile Actions */}
              <div className="flex flex-col gap-3">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a 
                    href="https://t.me/mapkhcorrect" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Join Telegram Community
                  </a>
                </Button>
                
                {/* Mobile Supporters */}
                {isLoading ? (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </Button>
                ) : error ? (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    Error Loading Supporters
                  </Button>
                ) : supporters.length > 0 ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Heart className="h-4 w-4 mr-2 text-red-500" />
                        View {supporters.length} Supporters
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          Our Supporters ({supporters.length})
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-80 w-full">
                        <div className="space-y-2 pr-4">
                          {supporters.map((supporter) => (
                            <div key={supporter.id} className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Heart className="h-3 w-3 text-red-500 flex-shrink-0" />
                                <span className="text-sm font-medium">{supporter.name}</span>
                              </div>
                              {supporter.message && (
                                <p className="text-xs text-muted-foreground ml-5 break-words">
                                  {supporter.message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    No Supporters Yet
                  </Button>
                )}
              </div>

              {/* Mobile Copyright */}
              <div className="text-center pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} MapKHCorrect. Made with ❤️ for Cambodia.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </>
    );
}