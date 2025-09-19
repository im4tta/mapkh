"use client";

import { getLeaderboard, getAllReports } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, MessageCircle, Info, LucideIcon, CheckCircle2, Loader2, ArrowUpDown, ChevronDown } from 'lucide-react';
import { CommunityTalk } from '@/components/community-talk';
import { TipsSection } from '@/components/tips-section';
import { LeaderboardEntry, Report } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const StatusBadge = ({ status }: { status: Report['status'] }) => {
    const { t } = useTranslation();
    const statusStyles: Record<string, string> = {
        'not-submitted': 'bg-gray-500/80',
        'submitted': 'bg-blue-500/80',
        'in-review': 'bg-yellow-500/80',
        'pending': 'bg-orange-500/80',
        'approved': 'bg-green-500/80',
        'rejected': 'bg-red-500/80',
    };
    
    // Fallback for unexpected status values from import
    const safeStatus = status && statusStyles[status] ? status : 'not-submitted';
  
    return (
      <Badge className={`capitalize text-white whitespace-nowrap ${statusStyles[safeStatus]}`}>
        {t(`statuses.${safeStatus}`, { defaultValue: status })}
      </Badge>
    );
};

function ContributorReportsDialog({ contributor, reports }: { contributor: LeaderboardEntry, reports: Report[] }) {
    const { t } = useTranslation();
    const userReports = reports.filter(r => r.reportedByName === contributor.name);

    return (
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>All Reports by {contributor.name}</DialogTitle>
                <DialogDescription>
                    A list of all reports submitted by this contributor.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('records.table_header.description')}</TableHead>
                                <TableHead>{t('records.table_header.date_reported')}</TableHead>
                                <TableHead>{t('records.table_header.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {userReports.map(report => {
                                const date = report.createdAt ? new Date(report.createdAt as string) : null;
                                return (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium whitespace-pre-wrap">{report.description}</TableCell>
                                    <TableCell>{date && !isNaN(date.getTime()) ? format(date, 'PPP') : 'N/A'}</TableCell>
                                    <TableCell><StatusBadge status={report.status} /></TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </DialogContent>
    )
}

function Leaderboard({ data, error, allReports }: { data: LeaderboardEntry[] | undefined, error: string | undefined, allReports: Report[] }) {
    const { t } = useTranslation();

    if (error || !data) {
        return <p className="text-destructive">{error || t('contributions.leaderboard.load_error')}</p>;
    }

    return (
        <Card>
            <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">{t('contributions.leaderboard.rank')}</TableHead>
                            <TableHead>{t('contributions.leaderboard.contributor')}</TableHead>
                            <TableHead className="text-right">{t('contributions.leaderboard.reports')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((entry, index) => (
                             <Dialog key={entry.id}>
                                <DialogTrigger asChild>
                                    <TableRow className="cursor-pointer">
                                        <TableCell className="font-bold text-lg text-center">
                                            {index === 0 && <Trophy className="w-6 h-6 text-yellow-500 inline-block" />}
                                            {index === 1 && <Trophy className="w-6 h-6 text-gray-400 inline-block" />}
                                            {index === 2 && <Trophy className="w-6 h-6 text-yellow-700 inline-block" />}
                                            {index > 2 && entry.rank}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={entry.avatar || ''} alt={entry.name} />
                                                    <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{entry.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{entry.reports}</TableCell>
                                    </TableRow>
                                </DialogTrigger>
                                <ContributorReportsDialog contributor={entry} reports={allReports} />
                            </Dialog>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </Card>
    );
}

function ApprovedReports({ data, error }: { data: Report[] | undefined, error?: string | undefined }) {
    const { t } = useTranslation();
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'contributor'>('newest');

    if (error) {
        return <p className="text-destructive">{error}</p>;
    }

    if (!data) {
        return <p className="text-destructive">{t('contributions.approved.load_error')}</p>;
    }
    
    const approvedData = data.filter(report => report.status === 'approved');

    const groupedByContributor = useMemo(() => {
        const groups = approvedData.reduce((acc, report) => {
            const contributorName = report.reportedByName || 'Community User';
            if (!acc[contributorName]) {
                acc[contributorName] = [];
            }
            acc[contributorName].push(report);
            return acc;
        }, {} as Record<string, Report[]>);

        // Sort groups by contributor name if that's the sort order
        let sortedGroups = Object.entries(groups);
        if (sortOrder === 'contributor') {
            sortedGroups.sort(([a], [b]) => a.localeCompare(b));
        } else {
             sortedGroups.sort(([, a], [, b]) => b.length - a.length);
        }

        // Sort reports within each group
        sortedGroups.forEach(([, reports]) => {
            reports.sort((a,b) => {
                const dateA = a.resolvedAt ? new Date(a.resolvedAt as string).getTime() : 0;
                const dateB = b.resolvedAt ? new Date(b.resolvedAt as string).getTime() : 0;

                if (sortOrder === 'newest' && dateB && dateA) {
                    return dateB - dateA;
                }
                if (sortOrder === 'oldest' && dateA && dateB) {
                    return dateA - dateB;
                }
                return 0;
            });
        });
        
        return sortedGroups;

    }, [approvedData, sortOrder]);


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{t('contributions.approved.title')}</CardTitle>
                        <CardDescription>{t('contributions.approved.description')}</CardDescription>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                Sort By
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSortOrder('newest')}>Newest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOrder('oldest')}>Oldest</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOrder('contributor')}>Contributor</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                 {groupedByContributor.length > 0 ? (
                    <div className="space-y-2">
                        {groupedByContributor.map(([contributor, reports]) => (
                            <Collapsible key={contributor} className="border-b">
                                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            {/* Assuming avatar can be found somehow, for now, fallback */}
                                            <AvatarFallback>{contributor.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-semibold">{contributor}</span>
                                        <Badge variant="secondary">{reports.length} Reports</Badge>
                                    </div>
                                    <ChevronDown className="h-5 w-5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="space-y-3 p-3 pl-14">
                                        {reports.map(report => (
                                            <div key={report.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                     <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                     <div>
                                                        <p className="font-medium text-sm line-clamp-1">{report.description}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {report.resolvedAt ? format(new Date(report.resolvedAt as string), 'PPP') : ''}
                                                        </p>
                                                     </div>
                                                </div>
                                                 <Button asChild variant="ghost" size="sm">
                                                    <a href={`https://www.google.com/maps?q=${report.position.lat},${report.position.lng}`} target="_blank" rel="noopener noreferrer">
                                                        {t('records.view_on_map')}
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        {t('contributions.approved.no_reports')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-4">
                 <Skeleton className="h-10 w-full" />
                 <Card>
                    <CardContent className="p-6">
                         <Skeleton className="h-48 w-full" />
                    </CardContent>
                 </Card>
            </div>
        </div>
    )
}

export default function ContributionsPage() {
    const { t } = useTranslation();
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[] | undefined>(undefined);
    const [leaderboardError, setLeaderboardError] = useState<string | undefined>(undefined);
    const [allReportsData, setAllReportsData] = useState<Report[] | undefined>(undefined);
    const [allReportsError, setAllReportsError] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [leaderboardResult, allReportsResult] = await Promise.all([
                getLeaderboard(),
                getAllReports()
            ]);

            setLeaderboardData(leaderboardResult.data);
            setLeaderboardError(leaderboardResult.error);
            setAllReportsData(allReportsResult.data);
            setAllReportsError(allReportsResult.error);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
             <div className="container mx-auto py-10 px-4">
                <LoadingSkeleton />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 px-4 flex flex-col flex-1">
            <div className="space-y-6 flex flex-col flex-1">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('contributions.title')}</h2>
                    <p className="text-muted-foreground">
                        {t('contributions.description')}
                    </p>
                </div>

                <Tabs defaultValue="leaderboard" className="w-full flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="leaderboard">
                            <Trophy className="mr-2 h-4 w-4" />
                            {t('contributions.tabs.leaderboard')}
                        </TabsTrigger>
                         <TabsTrigger value="approved">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {t('contributions.tabs.approved')}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="leaderboard" className="py-4">
                        <Leaderboard data={leaderboardData} error={leaderboardError} allReports={allReportsData || []} />
                    </TabsContent>
                    <TabsContent value="approved" className="py-4">
                        <ApprovedReports data={allReportsData} error={allReportsError} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
