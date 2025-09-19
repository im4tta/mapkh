

'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { deleteReport, updateReport, toggleReportVerification, getSubViolationTypes, getUsers, createReportDriveFolder, getAndSetPlaceId } from '@/app/actions';
import { Badge } from "@/components/ui/badge"
import { Report, SubViolationType, UserInfo } from "@/lib/types"
import { MoreHorizontal, Trash2, Pencil, Loader2, ArrowUpDown, LayoutGrid, List, Activity, Check, MapPin, Pin, PinOff, Folder, Clock, CalendarClock, ThumbsUp, Link as LinkIcon, User, View, MessageSquare, UploadCloud, FolderPlus, LocateFixed, FileText, ExternalLink, Copy, ShieldCheck, Save, XCircle, Tag, CopyPlus } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ReportDialog } from './report-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format, differenceInMinutes, differenceInHours, differenceInDays, isPast, formatDistanceToNowStrict, isValid } from 'date-fns';
import { useAuth } from '@/context/auth-provider';
import { useTranslation } from 'react-i18next';
import { DataTable } from './data-table';
import { ColumnDef, SortingState, RowSelectionState, useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, VisibilityState, OnChangeFn, PaginationState } from '@tanstack/react-table';
import { Timestamp } from 'firebase/firestore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import Link from 'next/link';
import { useActivityDialog } from '@/context/activity-dialog-provider';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle as NormalDialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { FileUploadDialog } from './file-upload-dialog';
import { ComparisonDialog } from './comparison-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { DataTableToolbar } from './data-table-toolbar';
import { DataTablePagination } from './data-table-pagination';
import { Input } from './ui/input';
import { KeywordsDialog } from './keywords-dialog';


const DescriptionCell = ({ text }: { text: string }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (textRef.current) {
            setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
        }
    }, [text]);

    if (!text) {
        return <p className="text-muted-foreground italic">No description</p>;
    }

    return (
        <>
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('records.table_header.description')}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-4">
                        <p className="text-sm text-muted-foreground">{text}</p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsOpen(false)}>{t('records.close')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex flex-col items-start min-w-[200px] max-w-xs">
                <p className="line-clamp-2" ref={textRef}>{text}</p>
                {isTruncated && (
                    <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setIsOpen(true)}>
                        {t('records.read_more')}
                    </Button>
                )}
            </div>
        </>
    );
};


const ActionsCell = ({ report, onEdit, onActivity, onTogglePin, onVerify, onUpload, onCreateFolder, onCreatePlaceId, onSetKeywords, onCopyDescriptionToKeywords, refetch }: { report: Report; onEdit: () => void; onActivity: (tab: 'comments' | 'history') => void; onTogglePin: () => void; onVerify: () => void; onUpload: () => void; onCreateFolder: () => void; onCreatePlaceId: () => void; onSetKeywords: () => void; onCopyDescriptionToKeywords: () => void; refetch: () => void; }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isPinned = report.priority === 'high';
  const hasVerified = user && report.verifications?.includes(user.uid);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteReport(report.id, user?.uid, user?.displayName, user?.email);
    if (result.success) {
      toast({ title: t('records.delete_success') });
      setShowDeleteDialog(false);
      refetch();
    } else {
      toast({ variant: 'destructive', title: t('records.delete_error_title'), description: result.error as string });
    }
    setIsDeleting(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">{t('records.open_menu')}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {report.folderId ? (
              <DropdownMenuItem onClick={onUpload}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Files
              </DropdownMenuItem>
          ) : (
              <DropdownMenuItem onClick={onCreateFolder}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create Evidence Folder
              </DropdownMenuItem>
          )}
           <DropdownMenuItem onClick={onSetKeywords}>
                <Tag className="mr-2 h-4 w-4" />
                Set Keywords
            </DropdownMenuItem>
             <DropdownMenuItem onClick={onCopyDescriptionToKeywords}>
                <CopyPlus className="mr-2 h-4 w-4" />
                Copy Desc to Keywords
            </DropdownMenuItem>
          {!report.placeId && (
            <DropdownMenuItem onClick={onCreatePlaceId}>
              <LocateFixed className="mr-2 h-4 w-4" />
              Fetch Place ID
            </DropdownMenuItem>
          )}
           <DropdownMenuItem asChild>
                <Link href={`/records/${report.reportNumber}/verification`} target="_blank">
                    <FileText className="mr-2 h-4 w-4" />
                    Verification Page
                </Link>
            </DropdownMenuItem>
          <DropdownMenuItem onClick={onVerify}>
            <ThumbsUp className={cn("mr-2 h-4 w-4", hasVerified && "text-primary")} />
            {hasVerified ? 'Un-verify' : 'Verify'}
          </DropdownMenuItem>
           <DropdownMenuItem onClick={onTogglePin}>
             {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
             {isPinned ? t('records.unpin') : t('records.pin')}
           </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('records.edit_report')}
          </DropdownMenuItem>
           <DropdownMenuItem onClick={() => onActivity('history')}>
            <Activity className="mr-2 h-4 w-4" />
            {t('records.view_activity')}
          </DropdownMenuItem>
           <DropdownMenuItem asChild>
                <a href={`https://www.google.com/maps?q=${report.position.lat},${report.position.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    {t('records.view_on_map')}
                </a>
            </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-500">
            <Trash2 className="mr-2 h-4 w-4" />
            {t('records.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('records.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('records.delete_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('records.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('records.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return undefined; // Invalid date string
        return d;
    }
    return undefined;
};

const TimeToResolveBadge = ({ report }: { report: Report }) => {
    const createdAt = toDate(report.createdAt);
    const resolvedAt = toDate(report.resolvedAt);

    if (!createdAt || !resolvedAt) {
        return null;
    }

    const minutes = differenceInMinutes(resolvedAt, createdAt);
    if (minutes < 1) {
        return <Badge variant="secondary" className="whitespace-nowrap flex items-center gap-1"><Clock className="h-3 w-3" /> &lt;1 min</Badge>;
    }
    if (minutes < 60) {
        return <Badge variant="secondary" className="whitespace-nowrap flex items-center gap-1"><Clock className="h-3 w-3" /> {minutes} min</Badge>;
    }
    
    const hours = differenceInHours(resolvedAt, createdAt);
    if (hours < 24) {
        return <Badge variant="secondary" className="whitespace-nowrap flex items-center gap-1"><Clock className="h-3 w-3" /> {hours} hr</Badge>;
    }

    const days = differenceInDays(resolvedAt, createdAt);
    return <Badge variant="secondary" className="whitespace-nowrap flex items-center gap-1"><Clock className="h-3 w-3" /> {days} day(s)</Badge>;
};

const TargetDateBadge = ({ report }: { report: Report }) => {
    const { t } = useTranslation();
    const targetDate = toDate(report.targetDate);

    if (!targetDate || report.status === 'approved' || report.status === 'rejected') {
        return null;
    }

    const now = new Date();
    const overdue = isPast(targetDate);
    const distance = formatDistanceToNowStrict(targetDate, { addSuffix: true });
    
    const text = overdue 
      ? t('records.target_date_overdue', { duration: distance }) 
      : t('records.target_date_due', { duration: distance });

    return (
        <Badge className={cn(
            'w-full justify-center',
            overdue ? 'bg-red-500/80 hover:bg-red-500' : 'bg-green-500/80 hover:bg-green-500'
        )}>
            <CalendarClock className="mr-2 h-4 w-4"/>
            {text}
        </Badge>
    );
};

const VerifiersDialog = ({ uids, onOpenChange }: { uids: string[], onOpenChange: (open: boolean) => void }) => {
    const [verifiers, setVerifiers] = useState<UserInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (uids.length > 0) {
            setIsLoading(true);
            getUsers(uids).then(result => {
                if (result.success && result.data) {
                    setVerifiers(result.data);
                }
                setIsLoading(false);
            });
        }
    }, [uids]);

    return (
        <DialogContent>
            <DialogHeader>
                <NormalDialogTitle>Report Verifiers</NormalDialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-80">
                <div className="space-y-4 pr-6">
                    {isLoading ? (
                        <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                    ) : verifiers.length > 0 ? (
                        verifiers.map(user => (
                            <div key={user.uid} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatar || undefined} />
                                    <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{user.name}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">No verifiers yet.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
    );
}

const FindPlaceIdDialog = () => {
    return null;
};

interface RecordsTableProps {
    data: Report[];
    columns: ColumnDef<Report>[];
    pageCount: number;
    pagination: PaginationState;
    onPaginationChange: OnChangeFn<PaginationState>;
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
    refetchData: () => void;
}

export function RecordsTable({ 
    data,
    columns: initialColumns,
    pageCount,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    refetchData,
}: RecordsTableProps) {
  const { t } = useTranslation();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showActivityDialog } = useActivityDialog();

  const viewParam = searchParams.get('view');
  
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isVerifiersDialogOpen, setIsVerifiersDialogOpen] = useState(false);
  const [selectedVerifiers, setSelectedVerifiers] = useState<string[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isComparisonDialogOpen, setIsComparisonDialogOpen] = useState(false);
  const [reportsToCompare, setReportsToCompare] = useState<Report[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [keywordReport, setKeywordReport] = useState<Report | null>(null);
  const [uploadingReport, setUploadingReport] = useState<Report | null>(null);
  const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
  const [editingPlaceId, setEditingPlaceId] = useState<{ id: string, value: string } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    getSubViolationTypes().then(result => {
        if(result.success && result.data) setSubViolationTypes(result.data || []);
    });
  }, []);
  
  const handleEdit = (report: Report) => setEditingReport(report);
  
  const handleTogglePin = async (report: Report) => {
     if (!user) {
        toast({ variant: "destructive", title: t('records.auth_error_title'), description: t('records.auth_error_description')});
        return;
    }
    const newPriority = report.priority === 'high' ? 'medium' : 'high';
    const result = await updateReport(report.id, { priority: newPriority }, user.uid, user.displayName, user.email);
    if (result.success) {
      toast({ title: newPriority === 'high' ? t('records.pin_success') : t('records.unpin_success') });
      refetchData();
    } else {
      toast({ variant: 'destructive', title: t('records.update_failed_title'), description: result.error });
    }
  }

  const handleVerify = async (report: Report) => {
    if (!user) return;
    const result = await toggleReportVerification(report.id, user.uid);
    if (result.success && 'action' in result) {
        toast({ title: result.action === 'added' ? 'Report Verified' : 'Verification Removed' });
        refetchData();
    } else if (!result.success && 'error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  }

  const handleShowVerifiers = (uids: string[]) => {
      setSelectedVerifiers(uids);
      setIsVerifiersDialogOpen(true);
  }
  
  const handleCreateFolder = async (report: Report) => {
      if (!user) return;
      const result = await createReportDriveFolder(report.id, report.reportNumber, report.locationWithin, user.uid, user.displayName);
      if(result.success) {
          toast({ title: "Folder created successfully!", description: "You can now upload files to this report's evidence folder."});
          await refetchData();
          setUploadingReport({ ...report, folderId: result.folderId!, driveLink: result.folderUrl! });
          setIsUploadDialogOpen(true);
      } else {
          toast({ variant: 'destructive', title: 'Failed to create folder', description: result.error || "An unknown error occurred. Please check the environment variables and folder sharing permissions." });
      }
  }
  
  const handleUpload = (report: Report) => {
      setUploadingReport(report);
      setIsUploadDialogOpen(true);
  };
  
  const handleActivity = (report: Report, tab: 'comments' | 'history') => {
    showActivityDialog(report, tab);
  };
  
  const handleCreatePlaceId = async (report: Report) => {
    toast({ title: `Fetching Place ID for Report #${report.reportNumber}...` });
    const result = await getAndSetPlaceId(report.id, report.position.lat, report.position.lng);
    if (result.success) {
        toast({ title: "Place ID Found!", description: `Successfully set Place ID to: ${result.placeId}`});
        refetchData();
    } else {
        toast({ variant: 'destructive', title: 'Could not find Place ID.', description: result.error});
    }
  };

  const handleUpdatePlaceId = async () => {
    if (!editingPlaceId || !user) return;
    const result = await updateReport(editingPlaceId.id, { placeId: editingPlaceId.value }, user.uid, user.displayName, user.email);
    if (result.success) {
        toast({ title: "Place ID Updated" });
        setEditingPlaceId(null);
        refetchData();
    } else {
        toast({ variant: "destructive", title: "Update Failed", description: result.error });
    }
  }
  
  const handleSetKeywords = (report: Report) => {
    setKeywordReport(report);
  };

  const handleCopyDescriptionToKeywords = async (report: Report) => {
    if (!user) return;

    // Split by comma and trim whitespace. Filter out empty strings.
    const newKeywords = report.description.split(',').map(kw => kw.trim()).filter(Boolean);

    if (newKeywords.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Keywords Found',
        description: 'The description does not contain any comma-separated keywords to add.',
      });
      return;
    }

    // Merge with existing keywords, avoiding duplicates
    const existingKeywords = new Set(report.keywords || []);
    newKeywords.forEach(kw => existingKeywords.add(kw));
    const updatedKeywords = Array.from(existingKeywords);

    const result = await updateReport(report.id, { keywords: updatedKeywords }, user.uid, user.displayName, user.email);

    if (result.success) {
      toast({ title: 'Keywords Updated', description: `${newKeywords.length} keywords from the description were added.` });
      refetchData();
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
  };

  const columns = useMemo<ColumnDef<Report>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'reportNumber',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <Link href={`/records/${row.original.reportNumber}`} className="font-medium hover:underline">#{row.original.reportNumber}</Link>,
      size: 60,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.description')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => <DescriptionCell text={row.original.description} />,
    },
    {
        accessorKey: 'englishLanguage',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.english')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.englishLanguage,
    },
    {
        accessorKey: 'nativeKhmerLanguage',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.khmer')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-khmer">{row.original.nativeKhmerLanguage}</span>,
    },
    {
        accessorKey: 'thaiLanguage',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.thai')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.thaiLanguage,
    },
    {
      accessorKey: 'violationTerm',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Violation Term
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => row.original.violationTerm || 'N/A',
    },
    {
      accessorKey: 'subViolationType',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.sub_violation_type')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => {
        const report = row.original;
        const subViolationType = report.subViolationType;
        if (!subViolationType) return t('records.na');

        const types = Array.isArray(subViolationType) ? subViolationType : [subViolationType];
        
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {types.map(etId => {
              let label = etId; // Fallback to raw ID
              if (etId === 'other' && report.otherSubViolationType) {
                label = `${t('sub_violation_types.other', 'Other')}: ${report.otherSubViolationType}`;
              } else {
                  const foundType = subViolationTypes.find(it => it.id === etId);
                  if (foundType) {
                      label = t(`sub_violation_types.${etId}`, { defaultValue: foundType.label });
                  }
              }
              return <Badge key={etId} variant="outline" className="whitespace-nowrap">{label}</Badge>;
            })}
          </div>
        );
      },
    },
    {
        accessorKey: 'placeId',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            PlaceID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const report = row.original;
          const { toast } = useToast();

          const isEditing = editingPlaceId?.id === report.id;

          const copyToClipboard = () => {
              if (report.placeId) {
                  navigator.clipboard.writeText(report.placeId);
                  toast({
                      title: "Place ID Copied",
                      description: `${report.placeId} has been copied to your clipboard.`,
                  });
              }
          };

          if (isEditing) {
            return (
              <div className="flex items-center gap-1 w-64">
                <Input 
                  value={editingPlaceId?.value || ''}
                  onChange={(e) => setEditingPlaceId({ ...editingPlaceId, value: e.target.value })}
                  className="h-8"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUpdatePlaceId}>
                    <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPlaceId(null)}>
                    <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-muted-foreground">{report.placeId || 'N/A'}</span>
              <div className="flex">
                {report.placeId && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                        <Copy className="h-3 w-3" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingPlaceId({ id: report.id, value: report.placeId || '' })}>
                    <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )
        }
    },
    {
      accessorKey: 'keywords',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Keywords
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(row.original.keywords || []).map(kw => (
            <Badge key={kw} variant="secondary">{kw}</Badge>
          ))}
        </div>
      )
    },
    {
      accessorKey: 'province',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.province')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
    },
    {
      accessorKey: 'reportedByName',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.reported_by')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.date_reported')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = toDate(row.original.createdAt);
        return date ? format(date, 'PPP') : 'N/A';
      },
    },
    {
      accessorKey: 'driveLink',
      header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.evidence')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => row.original.driveLink ? (
        <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <a href={row.original.driveLink} target="_blank" rel="noopener noreferrer"><Folder className="h-4 w-4" /></a>
        </Button>
      ) : (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCreateFolder(row.original)}>
                        <FolderPlus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Create Evidence Folder</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      )
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.status')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => <StatusBadge report={row.original} refetch={refetchData} />,
    },
    {
        accessorKey: 'verifications',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Verifications
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <Dialog>
                        <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => handleShowVerifiers(row.original.verifications || [])}>
                                    <ThumbsUp className={cn("mr-1.5 h-4 w-4", user && row.original.verifications?.includes(user.uid) && "text-primary fill-primary/20")} />
                                    {row.original.verifications?.length || 0}
                                </Button>
                        </TooltipTrigger>
                         <VerifiersDialog uids={selectedVerifiers} onOpenChange={setIsVerifiersDialogOpen} />
                    </Dialog>
                    <TooltipContent>
                        <p>{row.original.verifications?.length || 0} Verifications. Click to see who.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    },
    {
        accessorKey: 'commentCount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Comments
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => handleActivity(row.original, 'comments')}>
                            <MessageSquare className="mr-1.5 h-4 w-4" /> 
                            {row.original.commentCount || 0}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{row.original.commentCount || 0} Comments</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t('records.table_header.priority')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    },
     {
      accessorKey: 'progress',
      header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Progress
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Progress value={row.original.progress || 0} className="w-24 h-2" />
            <span className="text-xs text-muted-foreground">{row.original.progress || 0}%</span>
        </div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell report={row.original} onEdit={() => handleEdit(row.original)} onActivity={(tab) => handleActivity(row.original, tab)} onTogglePin={() => handleTogglePin(row.original)} onVerify={() => handleVerify(row.original)} onUpload={() => handleUpload(row.original)} onCreateFolder={() => handleCreateFolder(row.original)} onCreatePlaceId={() => handleCreatePlaceId(row.original)} onSetKeywords={() => handleSetKeywords(row.original)} onCopyDescriptionToKeywords={() => handleCopyDescriptionToKeywords(row.original)} refetch={refetchData} />,
    },
  ], [t, refetchData, user, subViolationTypes, selectedVerifiers, editingPlaceId]);
  
  
  const [isMounted, setIsMounted] = useState(false);
   useEffect(() => {
    setIsMounted(true);
  }, []);

  const [view, setView] = useState<'table' | 'grid'>(viewParam === 'table' ? 'table' : 'grid');

  const createQueryString = useCallback(
    (newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === '' || (typeof value === 'string' && ['all', 'none'].includes(value))) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      return params.toString();
    },
    [searchParams]
  );

  useEffect(() => {
    const currentView = searchParams.get('view') || 'grid';
    setView(currentView as 'table' | 'grid');
  }, [searchParams]);


  const handleViewChange = (newView: 'table' | 'grid') => {
      router.push(`${pathname}?${createQueryString({ view: newView })}`);
  }

  const handleCompare = () => {
    const selectedReports = table.getFilteredSelectedRowModel().rows.map(row => row.original as Report);
    if (selectedReports.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Select More Reports',
        description: 'Please select at least two reports to compare.',
      });
      return;
    }
    setReportsToCompare(selectedReports);
    setIsComparisonDialogOpen(true);
  };
  
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange,
    onPaginationChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <DataTableToolbar table={table} refetchData={refetchData!} onCompare={handleCompare} />
            <div className="flex items-center gap-2">
                <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleViewChange('table')}>
                    <List className="h-4 w-4" />
                    <span className="sr-only">{t('records.table_view')}</span>
                </Button>
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleViewChange('grid')}>
                    <LayoutGrid className="h-4 w-4" />
                    <span className="sr-only">{t('records.grid_view')}</span>
                </Button>
            </div>
        </div>
      
      {view === 'table' ? (
        <>
            <DataTable table={table} />
            <DataTablePagination table={table} />
        </>
        ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {table.getRowModel().rows.map(row => {
                    const report = row.original as Report;
                    const locationName = report.englishLanguage || report.nativeKhmerLanguage || report.thaiLanguage;
                    const date = toDate(report.createdAt);
                    return (
                    <Card key={report.id} className={report.priority === 'high' ? 'border-primary border-2' : ''}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <Link href={`/records/${report.reportNumber}`}>
                                        <CardTitle className="text-base line-clamp-2 hover:underline">
                                            {locationName}
                                            {locationName && report.province && <span className="text-muted-foreground">, </span>}
                                            <span className="text-muted-foreground font-normal">{report.province}</span>
                                        </CardTitle>
                                    </Link>
                                    <CardDescription className="text-xs">
                                        #{report.reportNumber} - {date && isValid(date) ? format(date, 'PPP') : 'N/A'} by {report.reportedByName}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button asChild={true} variant="ghost" size="icon" className="h-8 w-8">
                                        <Link href={`/records/${report.reportNumber}/verification`} target="_blank">
                                            <ShieldCheck className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button asChild={true} variant="ghost" size="icon" className="h-8 w-8">
                                    <a href={`https://www.google.com/maps?q=${report.position.lat},${report.position.lng}`} target="_blank" rel="noopener noreferrer">
                                        <MapPin className="h-4 w-4" />
                                    </a>
                                    </Button>
                                    <ActionsCell report={report} onEdit={() => handleEdit(report)} onActivity={(tab) => handleActivity(report, tab)} onTogglePin={() => handleTogglePin(report)} onVerify={() => handleVerify(report)} onUpload={() => handleUpload(report)} onCreateFolder={() => handleCreateFolder(report)} onCreatePlaceId={() => handleCreatePlaceId(report)} onSetKeywords={() => handleSetKeywords(report)} onCopyDescriptionToKeywords={() => handleCopyDescriptionToKeywords(report)} refetch={refetchData} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <div className="flex flex-wrap gap-1">
                                {(report.keywords || []).map(kw => (
                                    <Badge key={kw} variant="secondary">{kw}</Badge>
                                ))}
                            </div>
                            <DescriptionCell text={report.description} />
                            {report.notes && (
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full text-xs" type="button">
                                            Show Notes
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
                                        {report.notes}
                                    </CollapsibleContent>
                                </Collapsible>
                            )}
                            <div>
                                <span className="text-xs text-muted-foreground">Place ID</span>
                                <p className="text-xs font-mono text-muted-foreground truncate">{report.placeId || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                                {report.violationTerm && <Badge variant="secondary">{report.violationTerm}</Badge>}
                                <StatusBadge report={report} refetch={refetchData} />
                                <PriorityBadge priority={report.priority} />
                                <TimeToResolveBadge report={report} />
                                <TooltipProvider>
                                    <Tooltip>
                                        <Dialog>
                                            <TooltipTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => handleShowVerifiers(report.verifications || [])}>
                                                        <ThumbsUp className={cn("mr-1.5 h-4 w-4", user && report.verifications?.includes(user.uid) && "text-primary fill-primary/20")} /> 
                                                        {report.verifications?.length || 0}
                                                    </Button>
                                            </TooltipTrigger>
                                             <VerifiersDialog uids={selectedVerifiers} onOpenChange={setIsVerifiersDialogOpen} />
                                        </Dialog>
                                        <TooltipContent>
                                            <p>{report.verifications?.length || 0} Verifications. Click to see who.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => handleActivity(report, 'comments')}>
                                                <MessageSquare className="mr-1.5 h-4 w-4" /> 
                                                {report.commentCount || 0}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{report.commentCount || 0} Comments</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            {report.progress !== undefined && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-muted-foreground">{t('records.table_header.progress')}</span>
                                        <span className="text-xs font-semibold">{report.progress}%</span>
                                    </div>
                                    <Progress value={report.progress} className="h-2"/>
                                </div>
                            )}
                            <TargetDateBadge report={report} />
                            {report.folderId ? (
                                <Button onClick={() => handleUpload(report)} variant="outline" size="sm" className="w-full"><UploadCloud className="mr-2 h-4 w-4" />Upload Files</Button>
                            ) : (
                                <Button onClick={() => handleCreateFolder(report)} variant="secondary" size="sm" className="w-full"><FolderPlus className="mr-2 h-4 w-4" />Create Evidence Folder</Button>
                            )}
                        </CardContent>
                    </Card>
                )})}
                </div>
                 <DataTablePagination table={table} />
            </>
        )
      }
      </div>
      
      {editingReport && (
        <ReportDialog
          isOpen={!!editingReport}
          onClose={() => {
            setEditingReport(null);
            refetchData();
          }}
          position={editingReport.position}
          report={editingReport}
          province={editingReport.province}
        />
      )}
      {keywordReport && (
        <KeywordsDialog
          report={keywordReport}
          isOpen={!!keywordReport}
          onClose={() => {
            setKeywordReport(null);
            refetchData();
          }}
        />
      )}
      {uploadingReport && (
        <FileUploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          report={uploadingReport}
          onUploadComplete={refetchData}
        />
      )}
       <ComparisonDialog
          isOpen={isComparisonDialogOpen}
          onClose={() => setIsComparisonDialogOpen(false)}
          reports={reportsToCompare}
          onMergeComplete={() => {
            setRowSelection({});
            refetchData();
          }}
        />
      <Dialog open={isVerifiersDialogOpen} onOpenChange={setIsVerifiersDialogOpen}>
          <VerifiersDialog uids={selectedVerifiers} onOpenChange={setIsVerifiersDialogOpen} />
      </Dialog>
      {<FindPlaceIdDialog />}
    </>
  );
}

const StatusBadge = ({ report, refetch }: { report: Report, refetch: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const statuses: Report['status'][] = ['not-submitted', 'submitted', 'in-review', 'pending', 'approved', 'rejected', 'archived'];

  const handleStatusChange = async (newStatus: Report['status']) => {
    if (newStatus === report.status) return;
    if (!user) {
        toast({
            variant: "destructive",
            title: t('records.auth_error_title'),
            description: t('records.auth_error_description')
        });
        return;
    }
    
    try {
      const result = await updateReport(report.id, { 
        status: newStatus,
      }, user.uid, user.displayName, user.email);

      if (result.success) {
          toast({
            title: t('records.status_updated_title'),
            description: t('records.status_updated_description', { status: t(`statuses.${newStatus}`) }),
          });
          refetch();
      } else {
        throw new Error(result.error || 'Failed to update report');
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: t('records.update_failed_title'),
        description: error.message || t('records.update_failed_description'),
      });
    }
  };

  const statusStyles: Record<Report['status'], string> = {
    'not-submitted': 'bg-gray-500/80 hover:bg-gray-500',
    submitted: 'bg-blue-500/80 hover:bg-blue-500',
    'in-review': 'bg-yellow-500/80 hover:bg-yellow-500',
    pending: 'bg-orange-500/80 hover:bg-orange-500',
    approved: 'bg-green-500/80 hover:bg-green-500',
    rejected: 'bg-red-500/80 hover:bg-red-500',
    archived: 'bg-zinc-600/80 hover:bg-zinc-600',
  };
  
  let displayStatus = report.status;
  // @ts-ignore
  if (report.status === 'under-review') {
    displayStatus = 'in-review';
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto">
                <Badge className={`capitalize cursor-pointer ${statusStyles[displayStatus]}`}>
                    {t(`statuses.${displayStatus}`, { defaultValue: displayStatus })}
                </Badge>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuSeparator />
            {statuses.map(status => (
                <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)}>
                     <span className="w-4 mr-2">{report.status === status && <Check className="h-4 w-4" />}</span>
                    {t(`statuses.${status}`)}
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PriorityBadge = ({ priority }: { priority?: 'low' | 'medium' | 'high' }) => {
    const { t } = useTranslation();
    if (!priority) return <Badge variant="outline">{t('records.na')}</Badge>;

    const priorityStyles: Record<typeof priority, string> = {
        low: 'bg-blue-500/80 hover:bg-blue-500',
        medium: 'bg-yellow-500/80 hover:bg-yellow-500',
        high: 'bg-red-500/80 hover:bg-red-500',
    };
    return (
        <Badge className={`capitalize ${priorityStyles[priority]}`}>
        {t(`priorities.${priority}`)}
        </Badge>
    );
};
