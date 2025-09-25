"use client";

import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Medal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface ProfileBadgeProps {
  reports: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function getBadgeTier(reports: number): BadgeTier | null {
  if (reports >= 100) return 'diamond';
  if (reports >= 50) return 'platinum';
  if (reports >= 25) return 'gold';
  if (reports >= 10) return 'silver';
  if (reports >= 1) return 'bronze';
  return null;
}

export function getBadgeConfig(tier: BadgeTier) {
  const configs = {
    bronze: {
      label: 'Bronze Contributor',
      icon: Medal,
      color: 'bg-amber-600 text-white',
      iconColor: 'text-amber-100',
      description: '1-9 reports'
    },
    silver: {
      label: 'Silver Contributor',
      icon: Award,
      color: 'bg-gray-500 text-white',
      iconColor: 'text-gray-100',
      description: '10-24 reports'
    },
    gold: {
      label: 'Gold Contributor',
      icon: Trophy,
      color: 'bg-yellow-500 text-white',
      iconColor: 'text-yellow-100',
      description: '25-49 reports'
    },
    platinum: {
      label: 'Platinum Contributor',
      icon: Star,
      color: 'bg-purple-600 text-white',
      iconColor: 'text-purple-100',
      description: '50-99 reports'
    },
    diamond: {
      label: 'Diamond Contributor',
      icon: Trophy,
      color: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      iconColor: 'text-blue-100',
      description: '100+ reports'
    }
  };
  
  return configs[tier];
}

export function ProfileBadge({ reports, className, showLabel = true, size = 'md' }: ProfileBadgeProps) {
  const tier = getBadgeTier(reports);
  
  if (!tier) return null;
  
  const config = getBadgeConfig(tier);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  return (
    <Badge 
      className={cn(
        config.color,
        sizeClasses[size],
        'flex items-center gap-1 font-semibold border-0',
        className
      )}
      title={`${config.label} - ${config.description}`}
    >
      <Icon className={cn(iconSizes[size], config.iconColor)} />
      {showLabel && (
        <span className="hidden sm:inline">
          {config.label}
        </span>
      )}
      {!showLabel && (
        <span className="font-bold">
          {reports}
        </span>
      )}
    </Badge>
  );
}