

"use client";

import { Report } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogFooter
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { getSubViolationTypes } from '@/app/actions';
import { SubViolationType } from '@/lib/types';

interface DashboardDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reports: Report[];
}

const DescriptionCell = ({ text }: { text: string }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!text) {
      return <p className="text-muted-foreground italic">No description</p>
  }

  const isLong = text.length > 50;

  if (!isLong) {
    return <p className="line-clamp-2">{text}</p>;
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
      
      <div className="flex flex-col items-start">
        <p className="line-clamp-2">{text}</p>
        <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setIsOpen(true)}>
            {t('records.read_more')}
        </Button>
      </div>
    </>
  );
};

// Helper function to safely convert a value to a Date object.
const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    // Check if the parsed date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};


export function DashboardDetailDialog({
  isOpen,
  onClose,
  title,
  reports,
}: DashboardDetailDialogProps) {
  const { t } = useTranslation();
  const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);

  useEffect(() => {
    async function fetchTypes() {
      const result = await getSubViolationTypes();
      if (result.success && result.data) {
        setSubViolationTypes(result.data);
      }
    }
    fetchTypes();
  }, []);

  const getSubViolationTypeLabel = (report: Report) => {
    const subViolationType = report.subViolationType;
    if (!subViolationType) return t('records.na', 'N/A');

    const types = Array.isArray(subViolationType) ? subViolationType : [subViolationType];

    return types
      .map(etId => {
        if (etId === 'other') return `${t('sub_violation_types.other', 'Other')}: ${report.otherSubViolationType || t('records.specified')}`;
        
        const foundType = subViolationTypes.find(it => it.id === etId);
        const label = foundType?.label || etId;
        
        return t(`sub_violation_types.${etId}`, { defaultValue: label });
      })
      .join(', ');
  };

  const PriorityBadge = ({ priority }: { priority?: 'low' | 'medium' | 'high' }) => {
    if (!priority) return <Badge variant="outline">{t('records.na')}</Badge>;
    const priorityStyles: Record<typeof priority, string> = {
        low: 'bg-blue-500/80 hover:bg-blue-500',
        medium: 'bg-yellow-500/80 hover:bg-yellow-500',
        high: 'bg-red-500/80 hover:bg-red-500',
    };
    return (
        <Badge className={`capitalize text-white ${priorityStyles[priority]}`}>
          {t(`priorities.${priority}`)}
        </Badge>
    );
  };

  const StatusBadge = ({ status }: { status: Report['status'] }) => {
    const statusStyles: Record<Report['status'], string> = {
        'not-submitted': 'bg-gray-500/80',
        'submitted': 'bg-blue-500/80',
        'in-review': 'bg-yellow-500/80',
        'pending': 'bg-orange-500/80',
        'approved': 'bg-green-500/80',
        'rejected': 'bg-red-500/80',
        'archived': 'bg-zinc-600/80',
    };
    
    let displayStatus = status;
    // @ts-ignore
    if (status === 'under-review') {
        console.warn("Found legacy status 'under-review', converting to 'in-review' for display.");
        displayStatus = 'in-review';
    }

    return (
      <Badge className={`capitalize text-white ${statusStyles[displayStatus]}`}>
        {t(`statuses.${displayStatus}`, { defaultValue: displayStatus })}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            A detailed list of reports for this category.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>{t('records.table_header.sub_violation_type')}</TableHead>
                        <TableHead>{t('records.table_header.description')}</TableHead>
                        <TableHead>{t('records.table_header.status')}</TableHead>
                        <TableHead>{t('records.table_header.priority')}</TableHead>
                        <TableHead>{t('records.table_header.date_reported')}</TableHead>
                        <TableHead>{t('records.table_header.reported_by')}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reports.length > 0 ? (
                        reports.map((report) => {
                            const dateObj = toDateSafe(report.createdAt);

                            return (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium whitespace-nowrap">{getSubViolationTypeLabel(report)}</TableCell>
                                    <TableCell className="min-w-[250px]">
                                        <DescriptionCell text={report.description} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={report.status} />
                                    </TableCell>
                                    <TableCell>
                                        <PriorityBadge priority={report.priority} />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                    {dateObj ? format(dateObj, 'PPP') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{report.reportedByName || 'Community User'}</TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No reports found for this category.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
