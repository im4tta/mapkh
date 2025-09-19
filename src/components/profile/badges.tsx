
"use client";

import { Badge as BadgeType, badges as badgeInfoMap } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Award, FilePlus2, CheckSquare, Star, ShieldCheck, Waypoints, Building2, Trophy, LucideIcon } from 'lucide-react';

const badgeIcons: Record<string, LucideIcon> = {
    first_report: FilePlus2,
    ten_reports: CheckSquare,
    fifty_reports: Star,
    first_approved: ShieldCheck,
    ten_approved: ShieldCheck,
    road_warrior: Waypoints,
    city_planner: Building2,
    top_contributor: Trophy,
};


export function BadgesSection({ earnedBadges }: { earnedBadges: BadgeType[] }) {
    const allBadgeIds = Object.keys(badgeInfoMap) as (keyof typeof badgeInfoMap)[];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award />
                    Achievements
                </CardTitle>
            </CardHeader>
            <CardContent>
                {allBadgeIds.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                        <TooltipProvider>
                            {allBadgeIds.map(badgeId => {
                                const badgeInfo = badgeInfoMap[badgeId];
                                const isEarned = earnedBadges.some(b => b.id === badgeId);
                                const Icon = badgeIcons[badgeId];
                                return (
                                    <Tooltip key={badgeId}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "flex flex-col items-center justify-center gap-2 p-3 border rounded-lg aspect-square transition-opacity",
                                                    isEarned ? "opacity-100 bg-primary/10 border-primary/50" : "opacity-30"
                                                )}
                                            >
                                                <Icon className={cn("h-8 w-8", isEarned ? "text-primary" : "text-muted-foreground")} />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-semibold">{badgeInfo.name}</p>
                                            <p className="text-sm text-muted-foreground">{badgeInfo.description}</p>
                                            {!isEarned && <p className="text-xs text-destructive">(Not yet earned)</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </TooltipProvider>
                    </div>
                ) : (
                    <p className="text-muted-foreground">No achievements are available yet.</p>
                )}
            </CardContent>
        </Card>
    )
}
