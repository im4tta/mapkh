import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load the TipsSection component
const TipsSection = lazy(() => import('./tips-section').then(module => ({ default: module.TipsSection })));

const TipsSectionFallback = () => (
  <div className="flex justify-center items-center h-64">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
);

export function LazyTipsSection() {
  return (
    <Suspense fallback={<TipsSectionFallback />}>
      <TipsSection />
    </Suspense>
  );
}