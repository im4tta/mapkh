"use client";

import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/map-view').then(mod => mod.MapView), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />
});

export default function MapPage() {
  return <MapView initialReports={[]} />;
}
