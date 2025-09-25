"use client";

import React, { useState } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { TipsSection } from './tips-section';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LazyLoadTipsProps {
  className?: string;
}

export function LazyLoadTips({ className }: LazyLoadTipsProps) {
  const { t } = useTranslation();
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
  });
  const [shouldLoad, setShouldLoad] = useState(false);

  // Load when intersecting or when user explicitly requests
  React.useEffect(() => {
    if (isIntersecting && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isIntersecting, shouldLoad]);

  const handleLoadTips = () => {
    setShouldLoad(true);
  };

  if (!shouldLoad) {
    return (
      <div ref={targetRef} className={className}>
        <Card className="h-full flex flex-col flex-1">
          <CardHeader>
            <CardTitle>{t('contributions.tips.title')}</CardTitle>
            <CardDescription>{t('contributions.tips.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              {t('contributions.tips.loading', { defaultValue: 'Loading tips...' })}
            </p>
            <button
              onClick={handleLoadTips}
              className="text-sm text-primary hover:underline"
            >
              {t('contributions.tips.load_now', { defaultValue: 'Load now' })}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <TipsSection />
    </div>
  );
}