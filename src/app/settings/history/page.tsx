
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getHistory } from '@/app/actions';
import { HistoryLog } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, BookOpen, MessageSquare, StickyNote, Users, User, Folder, File as FileIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import * as Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DataTablePagination } from '@/components/data-table-pagination';

const HistoryTable = ({ data, columns, onExport }: { data: HistoryLog[], columns: ColumnDef<HistoryLog>[], onExport: () => void }) => {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });
    
    return (
        <div className="space-y-4">
             <DataTableToolbar table={table} refetchData={() => {}} onCompare={() => {}} onExport={onExport} />
             <DataTable table={table} />
             <DataTablePagination table={table} />
        </div>
    )
};

const HistorySkeleton = () => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-full max-w-sm" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
}

const entityIcons: Record<string, React.ElementType> = {
    report: StickyNote,
    user: User,
    team: Users,
    post: MessageSquare,
    tip: BookOpen,
    comment: MessageSquare,
    folder: Folder,
    file: FileIcon,
    default: AlertTriangle,
};

// Helper function to safely convert a value to a Date object.
const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
};


const ADMIN_UID = 'ADMIN_UID_REDACTED';

const HistoryPage = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user, loading } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState<HistoryLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    
    // Admin check
    useEffect(() => {
        if (!loading && (!user || user.uid !== ADMIN_UID)) {
            router.push('/settings');
        }
    }, [user, loading, router]);
    
    if (loading || !user || user.uid !== ADMIN_UID) {
        return (
            <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const fetchHistory = useCallback(async (entityType: string) => {
        setIsLoading(true);
        try {
            const result = await getHistory({ entityType: entityType === 'all' ? undefined : entityType });
            if (result.success && result.data) {
                setHistory(result.data);
            } else {
                console.error('Failed to fetch history:', result.error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Error Loading History', 
                    description: result.error || 'Failed to load history: Internal server error' 
                });
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            toast({ 
                variant: 'destructive', 
                title: 'Error Loading History', 
                description: 'An unexpected error occurred while loading history.' 
            });
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchHistory(activeTab);
    }, [activeTab, fetchHistory]);

    const handleExport = useCallback(() => {
        if (history.length === 0) {
            toast({ title: "No data to export" });
            return;
        }

        const dataToExport = history.map(log => {
            const date = toDate(log.createdAt);
            return {
                'Date': date ? format(date, 'yyyy-MM-dd HH:mm:ss') : '',
                'User': log.user.name,
                'Action': t(`history_actions.${log.action}`, { defaultValue: log.action.replace(/_/g, ' ') }),
                'Type': log.entityType,
                'Details': typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
                'Entity ID': log.entityId,
                'Report ID': log.reportId || 'N/A',
            }
        });

        const csv = Papa.unparse(dataToExport);
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `mapkh_history_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "History Exported", description: `${history.length} records exported successfully.`});
    }, [history, t, activeTab, toast]);

    const columns = useMemo<ColumnDef<HistoryLog>[]>(() => [
        {
            accessorKey: 'user',
            header: 'User',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={row.original.user.avatar || undefined} />
                        <AvatarFallback>{row.original.user.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{row.original.user.name}</span>
                </div>
            )
        },
        {
            accessorKey: 'action',
            header: 'Action',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                   <span>{t(`history_actions.${row.original.action}`, { defaultValue: row.original.action.replace(/_/g, ' ') })}</span>
                </div>
            )
        },
        {
            accessorKey: 'details',
            header: 'Details',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground line-clamp-2">
                    {typeof row.original.details === 'string' ? row.original.details : JSON.stringify(row.original.details)}
                </div>
            )
        },
        {
            accessorKey: 'entityType',
            header: 'Type',
            cell: ({ row }) => {
                 const Icon = entityIcons[row.original.entityType] || entityIcons.default;
                 return (
                    <div className="flex items-center gap-2 capitalize">
                        <Icon className="h-4 w-4 text-muted-foreground"/>
                        {row.original.entityType}
                    </div>
                )
            }
        },
        {
            accessorKey: 'entityId',
            header: 'Link',
            cell: ({ row }) => {
                const { entityType, entityId, reportId } = row.original;
                let href = null;
                
                const reportNumberMatch = typeof row.original.details === 'string' && row.original.details.includes('#') 
                    ? row.original.details.match(/#(\d+)/)
                    : null;
                const reportNumber = reportNumberMatch ? reportNumberMatch[1] : null;

                if ((entityType === 'report' || entityType === 'comment' || entityType === 'file' || entityType === 'folder' || entityType === 'url_saved') && reportNumber) {
                     href = `/records/${reportNumber}`;
                } else if (entityType === 'user' && entityId) {
                    href = `/settings/users`;
                } else if (entityType === 'team' && entityId) {
                    href = `/teams`;
                }
                
                if (href) {
                     return <Button asChild variant="link" size="sm"><Link href={href}>View</Link></Button>
                }
                return null;
            }
        },
        {
            accessorKey: 'createdAt',
            header: 'Date',
            cell: ({ row }) => {
                const date = row.original.createdAt;
                const dateObj = toDate(date);
                if (!dateObj) return 'N/A';
                return <span className="text-muted-foreground">{format(dateObj, 'PPpp')}</span>;
            }
        }
    ], [t]);
    
    const tabs = [
        { value: 'all', label: 'All Activity' },
        { value: 'report', label: 'Reports' },
        { value: 'user', label: 'Users' },
        { value: 'team', label: 'Teams' },
        { value: 'post', label: 'Posts' },
        { value: 'tip', label: 'Tips' },
        { value: 'folder', label: 'Folders' },
        { value: 'file', label: 'Files' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.nav.history')}</CardTitle>
                <CardDescription>
                    Review all administrative and user actions performed across the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 h-auto">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="mt-4">
                        {isLoading ? <HistorySkeleton /> : <HistoryTable data={history} columns={columns} onExport={handleExport} />}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default HistoryPage;
