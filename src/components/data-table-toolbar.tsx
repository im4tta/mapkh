

'use client';

import { Table, VisibilityState } from '@tanstack/react-table';
import { Trash2, Download, LocateFixed, View, Copy, Check, MapPin, CopyPlus, Save, RotateCcw, List, LayoutGrid } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/context/auth-provider';
import { deleteReports, getReportsForExport, getSubViolationTypes, bulkFetchPlaceIds, bulkUpdateReportsStatus, bulkUpdateReportsProvince, bulkUpdateReportsPriority, bulkUpdateReportsIssueType, bulkCopyDescriptionToKeywords } from '@/app/actions';
import { saveColumnVisibility, clearColumnVisibility } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from 'react';
import * as Papa from 'papaparse';
import { Report, SubViolationType, provinces } from '@/lib/types';
import { format, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// View Profile Types
type ViewProfile = 'profile1' | 'profile2' | 'profile3' | 'custom';

const VIEW_PROFILES = {
  profile1: {
    name: 'Profile 1: Essential + Violations',
    columns: ['reportNumber', 'description', 'englishLanguage', 'nativeKhmerLanguage', 'thaiLanguage', 'placeId', 'violationTerm', 'subViolationType']
  },
  profile2: {
    name: 'Profile 2: Profile 1 + Province',
    columns: ['reportNumber', 'description', 'englishLanguage', 'nativeKhmerLanguage', 'thaiLanguage', 'placeId', 'violationTerm', 'subViolationType', 'province']
  },
  profile3: {
    name: 'Profile 3: Basic Info Only',
    columns: ['reportNumber', 'description', 'englishLanguage', 'nativeKhmerLanguage', 'thaiLanguage', 'placeId']
  },
  custom: {
    name: 'Custom View',
    columns: []
  }
} as const;

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  refetchData: () => void;
  onCompare: () => void;
  onExport?: () => void;
  setColumnVisibility?: (visibility: VisibilityState) => void;
  view?: 'table' | 'grid';
  onViewChange?: (view: 'table' | 'grid') => void;
}

const statuses: Report['status'][] = ['not-submitted', 'submitted', 'in-review', 'pending', 'approved', 'rejected', 'archived'];
const priorities: NonNullable<Report['priority']>[] = ['low', 'medium', 'high'];

export function DataTableToolbar<TData>({
  table,
  refetchData,
  onCompare,
  onExport,
  setColumnVisibility,
  view = 'table',
  onViewChange,
}: DataTableToolbarProps<TData>) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetchingPlaceIds, setIsFetchingPlaceIds] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ViewProfile>('custom');

  useEffect(() => {
    const fetchTypes = async () => {
        const result = await getSubViolationTypes();
        if(result.success && result.data) {
            setSubViolationTypes(result.data);
        }
    }
    fetchTypes();
  }, []);

  const applyViewProfile = (profile: ViewProfile) => {
    if (profile === 'custom') {
      setCurrentProfile('custom');
      return;
    }

    if (!setColumnVisibility) {
      console.warn('setColumnVisibility not provided to DataTableToolbar');
      return;
    }

    const profileConfig = VIEW_PROFILES[profile];
    const allColumns = table.getAllColumns();
    
    // Create new visibility state
    const newVisibility: VisibilityState = {};
    
    // Hide all hideable columns first
    allColumns.forEach(column => {
      if (column.getCanHide()) {
        newVisibility[column.id] = false;
      }
    });

    // Show only the columns for this profile
    profileConfig.columns.forEach(columnId => {
      const column = allColumns.find(col => col.id === columnId);
      if (column && column.getCanHide()) {
        newVisibility[columnId] = true;
      }
    });

    // Update the column visibility state
    setColumnVisibility(newVisibility);
    setCurrentProfile(profile);
    
    toast({
      title: "View Profile Applied",
      description: `Switched to ${profileConfig.name}`,
    });
  };

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    const idsToDelete = selectedRows.map(row => (row.original as { id: string }).id);
    const result = await deleteReports(idsToDelete, user?.uid, user?.displayName, user?.email);

    if (result.success) {
      toast({ title: `${idsToDelete.length} report(s) deleted successfully.` });
      table.resetRowSelection();
      refetchData();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error deleting reports',
        description: result.error,
      });
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };
  
  const handleBulkFetchPlaceIds = async () => {
      setIsFetchingPlaceIds(true);
      const idsToFetch = selectedRows.map(row => (row.original as { id: string }).id);
      toast({ title: `Fetching Place IDs for ${idsToFetch.length} reports...`});
      const result = await bulkFetchPlaceIds(idsToFetch);

      if (result.success) {
          toast({
              title: "Bulk Fetch Complete",
              description: `Successfully updated ${result.updated} Place IDs. ${result.failed} reports could not be updated.`
          });
          table.resetRowSelection();
          refetchData();
      } else {
           toast({
              variant: 'destructive',
              title: 'Error fetching Place IDs',
              description: result.error,
          });
      }
      setIsFetchingPlaceIds(false);
  }

  const handleBulkUpdate = async (type: 'status' | 'province' | 'priority' | 'issueType', value: string | string[]) => {
    setIsUpdating(true);
    const idsToUpdate = selectedRows.map(row => (row.original as { id: string }).id);
    
    let result;
    if (type === 'status') {
        result = await bulkUpdateReportsStatus(idsToUpdate, value as Report['status'], user?.uid, user?.displayName, user?.email);
    } else if (type === 'province') {
        result = await bulkUpdateReportsProvince(idsToUpdate, value as string, user?.uid, user?.displayName, user?.email);
    } else if (type === 'priority') {
        result = await bulkUpdateReportsPriority(idsToUpdate, value as Report['priority'], user?.uid, user?.displayName, user?.email);
    } else if (type === 'issueType') {
        result = await bulkUpdateReportsIssueType(idsToUpdate, value as string[], user?.uid, user?.displayName, user?.email);
    }
    
    if (result && result.success) {
        toast({ title: `Successfully updated ${idsToUpdate.length} reports.`});
        table.resetRowSelection();
        refetchData();
    } else if (result) {
        toast({
            variant: 'destructive',
            title: 'Bulk Update Failed',
            description: result.error,
        });
    }
    setIsUpdating(false);
  };
  
    const handleBulkKeywords = async () => {
        setIsUpdating(true);
        const idsToUpdate = selectedRows.map(row => (row.original as { id: string }).id);
        const result = await bulkCopyDescriptionToKeywords(idsToUpdate, user?.uid, user?.displayName, user?.email);
        
        if (result.success) {
            toast({ title: `Copied keywords for ${result.updated} reports.`});
            if(result.failed && result.failed > 0) {
                toast({ variant: 'destructive', title: `Failed to process ${result.failed} reports.`});
            }
            table.resetRowSelection();
            refetchData();
        } else {
             toast({
                variant: 'destructive',
                title: 'Bulk Keyword Copy Failed',
                description: result.error,
            });
        }
        setIsUpdating(false);
    }

  const handleExportClick = async (exportType: 'selected' | 'all') => {
      if (onExport) {
        // If a specific export handler is provided (like for history), use it.
        onExport();
        return;
      }

      setIsExporting(true);
      
      let dataToExport: Report[];

      if (exportType === 'selected' && hasSelectedRows) {
        dataToExport = selectedRows.map(row => row.original as Report);
      } else {
        const violationTerm = searchParams.get('violationTerm') ?? 'all';
        const status = searchParams.get('status') ?? 'all';
        const priority = searchParams.get('priority') ?? 'all';
        const subViolationType = searchParams.get('subViolationType') ?? 'all';
        
        const result = await getReportsForExport({
            filters: { violationTerm, status, priority, subViolationType },
        });

        if (result.success && result.data) {
            dataToExport = result.data;
        } else {
            toast({
                variant: 'destructive',
                title: 'Error exporting reports',
                description: result.error || 'Could not fetch reports for export.',
            });
            setIsExporting(false);
            return;
        }
      }
      
      if (dataToExport.length === 0) {
        toast({ title: "No reports to export", description: "There are no reports matching the current selection."});
        setIsExporting(false);
        return;
      }

      const formattedData = dataToExport.map(report => {
        const toDateSafe = (value: any): Date | null => {
          if (!value) return null;
          if (value instanceof Date) return value;
          if (value instanceof Timestamp) return value.toDate();
          if (typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) return date;
          }
          return null;
        };

        const createdAtDate = toDateSafe(report.createdAt);
        const targetDate = toDateSafe(report.targetDate);
        
        const getSubViolationTypeLabel = (report: Report) => {
            const subViolationType = report.subViolationType;
            if (!subViolationType) return t('records.na', 'N/A');

            if (Array.isArray(subViolationType)) {
                if (subViolationType.length === 0) return t('records.na', 'N/A');
                return subViolationType
                    .map(etId => {
                        if (etId === 'other') return `${t('sub_violation_types.other', { defaultValue: 'Other' })}: ${report.otherSubViolationType || t('records.specified')}`;
                        const foundType = subViolationTypes.find(it => it.id === etId);
                        const label = foundType?.label || etId;
                        return t(`sub_violation_types.${etId}`, { defaultValue: label });
                    })
                    .join(', ');
            }
            
            if (subViolationType === 'other') {
                return `${t('sub_violation_types.other')}: ${report.otherSubViolationType || t('records.specified')}`;
            }
            const foundType = subViolationTypes.find(it => it.id === subViolationType);
            const label = foundType?.label || subViolationType;
            return t(`sub_violation_types.${subViolationType}`, { defaultValue: label });
        };


        return {
            'Report #': report.reportNumber,
            'Place ID': report.placeId || '',
            'Violation Term': report.violationTerm || '',
            'Sub-Violation Type': getSubViolationTypeLabel(report),
            'Other Sub-Violation Type': report.otherSubViolationType || '',
            'Description': report.description,
            'Status': t(`statuses.${report.status}`, { defaultValue: report.status }),
            'Priority': report.priority ? t(`priorities.${report.priority}`, { defaultValue: report.priority }) : '',
            'Province': report.province || '',
            'Keywords': (report.keywords || []).join(', '),
            'Latitude': report.position.lat,
            'Longitude': report.position.lng,
            'Reported At': createdAtDate && isValid(createdAtDate) ? format(createdAtDate, 'yyyy-MM-dd HH:mm:ss') : '',
            'Reported By': report.reportedByName || '',
            'English Name': report.englishLanguage || '',
            'Khmer Name': report.nativeKhmerLanguage || '',
            'Thai Name': report.thaiLanguage || '',
            'Place Type': report.impactCategory || '',
            'Location Within': report.locationWithin || '',
            'Target Date': targetDate && isValid(targetDate) ? format(targetDate, 'yyyy-MM-dd') : '',
            'Progress': report.progress || 0,
            'Notes': report.notes || '',
        };
      });
      
      const csv = Papa.unparse(formattedData);
      const BOM = '\uFEFF'; // UTF-8 Byte Order Mark
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'map_reports.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
      toast({ title: 'Export successful', description: `${dataToExport.length} reports have been exported.`});
  }

  return (
    <>
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-md border bg-muted/50 gap-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {hasSelectedRows 
            ? `${selectedRows.length} of ${table.getPreFilteredRowModel().rows.length} row(s) selected.`
            : `Showing ${table.getPreFilteredRowModel().rows.length} item(s).`
        }
      </div>
      <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <View className="mr-2 h-4 w-4" />
              Profiles
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View Profiles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(VIEW_PROFILES).map(([key, profile]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => applyViewProfile(key as ViewProfile)}
                className={currentProfile === key ? "bg-accent" : ""}
              >
                {currentProfile === key && <Check className="mr-2 h-4 w-4" />}
                {profile.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <View className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" && column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => {
                      column.toggleVisibility(!!value);
                      setCurrentProfile('custom');
                    }}
                  >
                    {column.id.replace(/_/g, ' ')}
                  </DropdownMenuCheckboxItem>
                )
              })}
            <DropdownMenuSeparator />
            <div className="flex gap-1 p-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1"
                onClick={() => {
                  const currentVisibility = table.getState().columnVisibility;
                  saveColumnVisibility(currentVisibility);
                  toast({
                    title: "View Saved",
                    description: "Column visibility preferences have been saved.",
                  });
                }}
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1"
                onClick={() => {
                  clearColumnVisibility();
                  // Reset all columns to visible
                  table.getAllColumns().forEach(column => {
                    if (column.getCanHide()) {
                      column.toggleVisibility(true);
                    }
                  });
                  setCurrentProfile('custom');
                  toast({
                    title: "View Reset",
                    description: "Column visibility has been reset to default.",
                  });
                }}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {hasSelectedRows && !onExport && (
                     <DropdownMenuItem onClick={() => handleExportClick('selected')} disabled={isExporting}>
                        Export Selected ({selectedRows.length})
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleExportClick('all')} disabled={isExporting}>
                    Export All (Filtered)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {onViewChange && (
          <div className="flex items-center gap-1 border rounded-md shrink-0">
            <Button 
              variant={view === 'table' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => onViewChange('table')}
              className="h-8 px-2 min-w-0"
            >
              <List className="h-4 w-4" />
              <span className="sr-only">Table view</span>
            </Button>
            <Button 
              variant={view === 'grid' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => onViewChange('grid')}
              className="h-8 px-2 min-w-0"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
          </div>
        )}

        {hasSelectedRows && (
          <>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isUpdating}>
                        Update ({selectedRows.length})
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleBulkKeywords}>
                        <CopyPlus className="mr-2 h-4 w-4" />
                        Copy Desc to Keywords
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Set status to</DropdownMenuSubTrigger>
                         <DropdownMenuSubContent>
                             {statuses.map(status => (
                                <DropdownMenuItem key={status} onSelect={() => handleBulkUpdate('status', status)}>
                                    {t(`statuses.${status}`)}
                                </DropdownMenuItem>
                            ))}
                         </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Set province to</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                             {provinces.map(p => (
                                <DropdownMenuItem key={p} onSelect={() => handleBulkUpdate('province', p)}>
                                    {t(`provinces.${p.replace(/\s+/g, '_')}`, { defaultValue: p })}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                     <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Set priority to</DropdownMenuSubTrigger>
                         <DropdownMenuSubContent>
                             {priorities.map(priority => (
                                <DropdownMenuItem key={priority} onSelect={() => handleBulkUpdate('priority', priority)}>
                                    {t(`priorities.${priority}`)}
                                </DropdownMenuItem>
                            ))}
                         </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Set sub-violation type to</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {subViolationTypes.map(it => (
                                    <DropdownMenuItem key={it.id} onSelect={() => handleBulkUpdate('issueType', [it.id])}>
                                        {t(`sub_violation_types.${it.id}`, { defaultValue: it.label })}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
             </DropdownMenu>
             <Button
                variant="outline"
                size="sm"
                onClick={onCompare}
                disabled={selectedRows.length < 2}
            >
                <Copy className="mr-2 h-4 w-4" />
                Compare ({selectedRows.length})
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleBulkFetchPlaceIds}
                disabled={isFetchingPlaceIds}
            >
                <LocateFixed className="mr-2 h-4 w-4" />
                Fetch Place IDs
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedRows.length})
            </Button>
          </>
        )}
      </div>
    </div>
     <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedRows.length} item(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
