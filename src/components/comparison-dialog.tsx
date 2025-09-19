"use client";

import { Report, SubViolationType } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { getSubViolationTypes, mergeReports } from '@/app/actions';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';


interface ComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
  onMergeComplete: () => void;
}

export function ComparisonDialog({ isOpen, onClose, reports, onMergeComplete }: ComparisonDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const fieldsToCompare: { key: keyof Report | 'lat' | 'lng' | 'driveLink', label: string }[] = [
    { key: 'reportNumber', label: 'Report Number'},
    { key: 'placeId', label: 'Place ID' },
    { key: 'description', label: 'Description' },
    { key: 'englishLanguage', label: 'English Name' },
    { key: 'nativeKhmerLanguage', label: 'Khmer Name' },
    { key: 'thaiLanguage', label: 'Thai Name' },
    { key: 'province', label: 'Province' },
    { key: 'lat', label: 'Latitude' },
    { key: 'lng', label: 'Longitude' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'subViolationType', label: 'Sub-Violation Type(s)'},
    { key: 'violationTerm', label: 'Violation Term' },
    { key: 'reportedByName', label: 'Reported By' },
    { key: 'createdAt', label: 'Date Reported' },
    { key: 'folderId', label: 'Evidence Folder'}
  ];
  
  const [mergedData, setMergedData] = useState<Record<string, any>>(() => {
    if (reports.length > 0) {
      const initialData: Record<string, any> = {};
      const firstReport = reports[0];
      fieldsToCompare.forEach(field => {
        initialData[field.key] = firstReport.id;
      });
      return initialData;
    }
    return {};
  });

  useEffect(() => {
    if (isOpen) {
      getSubViolationTypes().then(result => {
        if (result.success && result.data) {
          setSubViolationTypes(result.data);
        }
      });
       if (reports.length > 0) {
        const initialData: Record<string, any> = {};
        // Default to selecting the first report's data
        const firstReportId = reports[0].id;
        fieldsToCompare.forEach(field => {
            initialData[field.key] = firstReportId;
        });
        setMergedData(initialData);
      }
    }
  }, [isOpen, reports]);


  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    return undefined;
  };
  
  const getSubViolationTypeLabel = (report: Report) => {
    const subViolationType = report.subViolationType;
    if (!subViolationType) return t('records.na', 'N/A');

    const types = Array.isArray(subViolationType) ? subViolationType : [subViolationType];
    
    return types
        .map(etId => {
            if (etId === 'other') return `${t('sub_violation_types.other', { defaultValue: 'Other' })}: ${report.otherSubViolationType || t('records.specified')}`;
            
            const foundType = subViolationTypes.find(it => it.id === etId);
            const label = foundType?.label || etId;
            
            return t(`sub_violation_types.${etId}`, { defaultValue: label });
        })
        .join(', ');
  };


  const renderValue = (report: Report, fieldKey: keyof Report | 'lat' | 'lng' | 'driveLink') => {
    if (fieldKey === 'subViolationType') {
      return getSubViolationTypeLabel(report);
    }
    
    let value: any;
    if (fieldKey === 'lat') {
        value = report.position.lat;
    } else if (fieldKey === 'lng') {
        value = report.position.lng;
    } else if (fieldKey === 'folderId') {
        value = report.folderId ? <a href={report.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Open Folder</a> : 'No Folder';
    } else {
        value = report[fieldKey as keyof Report];
    }

    if (value instanceof Timestamp || ['createdAt', 'targetDate', 'resolvedAt'].includes(fieldKey)) {
        const date = toDate(value);
        return date ? format(date, 'PPP p') : 'N/A';
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (value === undefined || value === null || value === '') {
        return <span className="text-muted-foreground italic">empty</span>;
    }
    if (typeof value === 'object' && value.type === 'a') {
        return value;
    }
    return String(value);
  };

  const handleSelectMaster = (masterReportId: string) => {
    const newMergedData: Record<string, any> = {};
    fieldsToCompare.forEach(field => {
      newMergedData[field.key] = masterReportId;
    });
    setMergedData(newMergedData);
  };
  
  const handleMerge = async () => {
    setIsConfirmOpen(false);
    setIsMerging(true);

    const masterReportId = mergedData.reportNumber;
    if (!masterReportId) {
        toast({ variant: 'destructive', title: 'Merge Failed', description: 'You must select a primary report number to merge into.' });
        setIsMerging(false);
        return;
    }

    const finalDataObject: any = {};
    for (const field of fieldsToCompare) {
        const sourceReportId = mergedData[field.key];
        const sourceReport = reports.find(r => r.id === sourceReportId);
        if (sourceReport) {
             if (field.key === 'lat' || field.key === 'lng') {
                if (!finalDataObject.position) finalDataObject.position = {};
                finalDataObject.position[field.key] = sourceReport.position[field.key];
            } else {
                finalDataObject[field.key] = (sourceReport as any)[field.key];
            }
        }
    }
    
    const masterReport = reports.find(r => r.id === masterReportId);
    
    const result = await mergeReports(
        masterReportId, 
        finalDataObject, 
        reports, 
        user!.uid, 
        user!.displayName, 
        user!.email
    );
    
    if(result.success) {
        let description = `Report #${finalDataObject.reportNumber} is now the master record.`;
        if ((result.driveSuccessCount || 0) > 0 || (result.driveErrorCount || 0) > 0) {
            description += ` G-Drive: ${result.driveSuccessCount} moved, ${result.driveErrorCount} failed.`;
        }

        toast({ 
            title: 'Merge Successful', 
            description: description 
        });
        onMergeComplete();
        onClose();
    } else {
        toast({ variant: 'destructive', title: 'Merge Failed', description: result.error });
    }
    
    setIsMerging(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare & Merge Reports</DialogTitle>
          <DialogDescription>
            Select the master record and choose the data to keep for each field. The master record will be updated, and the others will be deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
            <div className="overflow-auto h-full">
                <RadioGroup onValueChange={handleSelectMaster} value={mergedData.reportNumber}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px] font-semibold sticky left-0 bg-background z-10">Field</TableHead>
                                {reports.map(report => (
                                    <TableHead key={report.id}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value={report.id} id={`master-${report.id}`} />
                                            <Label htmlFor={`master-${report.id}`} className="cursor-pointer">
                                                Master Report #{report.reportNumber}
                                            </Label>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fieldsToCompare.map(field => {
                              if (field.key === 'reportNumber') return null; // Already handled in header
                              return (
                                <TableRow key={field.key}>
                                    <TableCell className="font-medium capitalize sticky left-0 bg-background z-10">{field.label}</TableCell>
                                    {reports.map(report => (
                                        <TableCell key={report.id} className="text-sm min-w-[200px]">
                                            <div className="flex items-start space-x-2">
                                                 <RadioGroup
                                                    value={mergedData[field.key]}
                                                    onValueChange={(value) => setMergedData(prev => ({ ...prev, [field.key]: value }))}
                                                >
                                                    <RadioGroupItem value={report.id} id={`${field.key}-${report.id}`} />
                                                </RadioGroup>
                                                <Label htmlFor={`${field.key}-${report.id}`} className="font-normal cursor-pointer w-full">
                                                    {renderValue(report, field.key)}
                                                </Label>
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                              )
                            })}
                        </TableBody>
                    </Table>
                </RadioGroup>
            </div>
        </div>
         <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setIsConfirmOpen(true)} disabled={isMerging || !mergedData.reportNumber}>
                {isMerging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Merge Reports
            </Button>
        </DialogFooter>
         <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will merge all data into the selected master report. The other reports and their associated comments/files will be permanently deleted or moved. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMerge}>Yes, Merge Reports</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
