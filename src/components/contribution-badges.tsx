"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Medal, Award, Trophy, Star, Crown, LucideIcon } from 'lucide-react';

export type ContributionTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface ContributionBadgeProps {
  reports: number;
  score?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const contributionTiers = {
  bronze: {
    name: 'Bronze Contributor',
    description: '1-9 reports submitted',
    icon: Medal,
    minReports: 1,
    maxReports: 9,
    colors: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600 dark:text-amber-400',
      text: 'text-amber-800 dark:text-amber-200',
      primary: 'bg-amber-500/10 border-amber-500/50'
    }
  },
  silver: {
    name: 'Silver Contributor',
    description: '10-24 reports submitted',
    icon: Award,
    minReports: 10,
    maxReports: 24,
    colors: {
      bg: 'bg-gray-50 dark:bg-gray-950/20',
      border: 'border-gray-300 dark:border-gray-700',
      icon: 'text-gray-600 dark:text-gray-400',
      text: 'text-gray-800 dark:text-gray-200',
      primary: 'bg-gray-500/10 border-gray-500/50'
    }
  },
  gold: {
    name: 'Gold Contributor',
    description: '25-49 reports submitted',
    icon: Trophy,
    minReports: 25,
    maxReports: 49,
    colors: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      icon: 'text-yellow-600 dark:text-yellow-400',
      text: 'text-yellow-800 dark:text-yellow-200',
      primary: 'bg-yellow-500/10 border-yellow-500/50'
    }
  },
  platinum: {
    name: 'Platinum Contributor',
    description: '50-99 reports submitted',
    icon: Star,
    minReports: 50,
    maxReports: 99,
    colors: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-300 dark:border-purple-700',
      icon: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-800 dark:text-purple-200',
      primary: 'bg-purple-500/10 border-purple-500/50'
    }
  },
  diamond: {
    name: 'Diamond Contributor',
    description: '100+ reports submitted',
    icon: Crown,
    minReports: 100,
    maxReports: Infinity,
    colors: {
      bg: 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20',
      border: 'border-blue-300 dark:border-blue-700',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-800 dark:text-blue-200',
      primary: 'bg-blue-500/10 border-blue-500/50'
    }
  }
};

export function getContributionTier(reports: number): ContributionTier | null {
  if (reports >= 100) return 'diamond';
  if (reports >= 50) return 'platinum';
  if (reports >= 25) return 'gold';
  if (reports >= 10) return 'silver';
  if (reports >= 1) return 'bronze';
  return null;
}

// Modern Achievement Badge (like Profile section)
export function ContributionBadge({ reports, score, className, size = 'md' }: ContributionBadgeProps) {
  const tier = getContributionTier(reports);
  
  if (!tier) return null;
  
  const config = contributionTiers[tier];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'p-2 gap-1',
    md: 'p-3 gap-2',
    lg: 'p-4 gap-3'
  };
  
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex flex-col items-center justify-center border rounded-lg aspect-square transition-all hover:scale-105 cursor-pointer opacity-100",
              config.colors.primary,
              sizeClasses[size],
              className
            )}
          >
            <Icon className={cn(iconSizes[size], config.colors.icon)} />
            {score && (
              <span className={cn("text-xs font-bold mt-1", config.colors.text)}>
                {score}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{config.name}</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            <p className="text-xs font-mono mt-1">{reports} reports</p>
            {score && <p className="text-xs font-bold text-primary mt-1">Score: {score}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact inline badge for tables
export function ContributionBadgeInline({ reports, score, className, size = 'md' }: { reports: number; score?: number; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const tier = getContributionTier(reports);
  
  if (!tier) return null;
  
  const config = contributionTiers[tier];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-xs gap-1',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };
  
  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <div className={cn("flex items-center rounded-full border font-medium", config.colors.bg, config.colors.border, config.colors.text, sizeClasses[size], className)}>
      <Icon className={cn(config.colors.icon, iconSizes[size])} />
      <span>{config.name}</span>
      {score && <span className="ml-1 font-bold">({score})</span>}
    </div>
  );
}

// Modern Achievement Grid Section (like Profile badges)
export function ContributionAchievements({ reports, score, className }: { reports: number; score?: number; className?: string }) {
  const allTiers: ContributionTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentTier = getContributionTier(reports);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Contribution Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          <TooltipProvider>
            {allTiers.map(tier => {
              const config = contributionTiers[tier];
              const Icon = config.icon;
              const isEarned = currentTier && allTiers.indexOf(currentTier) >= allTiers.indexOf(tier);
              
              return (
                <Tooltip key={tier}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 border rounded-lg aspect-square transition-all hover:scale-105 cursor-pointer",
                        isEarned 
                          ? `opacity-100 ${config.colors.primary}` 
                          : "opacity-30 bg-muted/50 border-muted"
                      )}
                    >
                      <Icon className={cn("h-6 w-6", isEarned ? config.colors.icon : "text-muted-foreground")} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-semibold">{config.name}</p>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      {!isEarned && <p className="text-xs text-destructive">(Not yet earned)</p>}
                      {isEarned && <p className="text-xs text-green-600">✓ Earned</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        {currentTier && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Current Level: <span className="font-semibold text-foreground">{contributionTiers[currentTier].name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{reports} reports submitted</p>
            {score && <p className="text-xs font-bold text-primary mt-1">Total Score: {score}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}