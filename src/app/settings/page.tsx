
'use client';

import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import * as Papa from 'papaparse';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, DatabaseBackup, History, Upload, FileCheck2, FileX2, Check, ChevronsUpDown, ServerCrash, Download, Link as LinkIcon, UploadCloud, File as FileIcon, FolderPlus, Trash2, Heart, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-provider";
import { importReports, exportAllData, importAllData, findReportByPlaceId, uploadReportFile, bulkCreateDriveFolders, deleteEmptyReportFolders } from "../actions";
import { SupporterService, type Supporter } from "@/lib/supporters";
import { AdminNotificationManager } from "@/components/admin-notification-manager";
import { NotificationSettings } from "@/components/notification-settings";
import { PlaceIdCSVUploader } from "@/components/placeid-csv-uploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Report, provinces, PlaceType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type ReportField = keyof Omit<Report, 'id' | 'position' | 'reportNumber'> | 'lat' | 'lng';

const systemFields: { key: ReportField; label: string; required?: boolean }[] = [
    { key: 'placeId', label: 'Place ID', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'lat', label: 'Latitude' },
    { key: 'lng', label: 'Longitude' },
    { key: 'province', label: 'Province' },
    { key: 'subViolationType', label: 'Issue Type (comma-separated)' },
    { key: 'otherSubViolationType', label: 'Other Issue Details' },
    { key: 'englishLanguage', label: 'English Name' },
    { key: 'nativeKhmerLanguage', label: 'Khmer Name' },
    { key: 'thaiLanguage', label: 'Thai Name' },
    { key: 'impactCategory', label: 'Place Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'violationTerm', label: 'Group' },
    { key: 'locationWithin', label: 'Location URL' },
    { key: 'reportedByName', label: 'Reported By Name' },
    { key: 'targetDate', label: 'Target Date (YYYY-MM-DD)' },
    { key: 'progress', label: 'Progress (%)' },
    { key: 'notes', label: 'Notes' },
    { key: 'driveLink', label: 'Drive Link' },
    { key: 'status', label: 'Status' },
];

const DataImporter = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState(1);
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [results, setResults] = useState<{ success: boolean; data: any; reportNumber?: number; error?: string }[]>([]);
    const [isResultsOpen, setIsResultsOpen] = useState(false);
    const BATCH_SIZE = 50;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const resetState = () => {
        setFile(null);
        setStep(1);
        setHeaders([]);
        setData([]);
        setMapping({});
        setIsProcessing(false);
        setImportProgress(0);
        setResults([]);
    };

    const handleParse = () => {
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (result) => {
                setHeaders(result.meta.fields || []);
                setData(result.data);
                
                const initialMapping: Record<string, string> = {};
                const csvHeaders = (result.meta.fields || []).map(h => h.toLowerCase().replace(/[\s_]/g, ''));
                
                systemFields.forEach(field => {
                    let normalizedField = field.label.toLowerCase().replace(/[\s_]/g, '');
                    if (field.key === 'subViolationType') {
                        normalizedField = 'issuetype(comma-separated)';
                    }
                    if (field.key === 'violationTerm') {
                        normalizedField = 'group';
                    }
                    const matchedHeader = (result.meta.fields || []).find(h => h.toLowerCase().replace(/[\s_]/g, '') === normalizedField);
                    if (matchedHeader) {
                        initialMapping[field.key] = matchedHeader;
                    }
                });
                
                setMapping(initialMapping);
                setStep(2);
            },
        });
    };

    const handleImport = async () => {
        setIsProcessing(true);
        const totalRecords = data.length;
        let processedRecords = 0;
        let allResults: any[] = [];

        const recordsToImport = data.map(row => {
            const newRecord: Record<string, any> = {};
            for (const key in mapping) {
                if (mapping[key] && row[mapping[key]] !== undefined) {
                    newRecord[key] = row[mapping[key]];
                }
            }
            return newRecord;
        });

        for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
            const batch = recordsToImport.slice(i, i + BATCH_SIZE);
            try {
                const result = await importReports(batch);
                allResults = [...allResults, ...result.results];
                processedRecords += batch.length;
                setImportProgress(Math.round((processedRecords / totalRecords) * 100));
                toast({ title: `Batch ${i / BATCH_SIZE + 1} processed`, description: `${processedRecords} of ${totalRecords} records processed.`});
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Import Failed', description: `An error occurred during batch ${i / BATCH_SIZE + 1}: ${e.message}` });
                setIsProcessing(false);
                return;
            }
        }
        
        setResults(allResults);
        setIsProcessing(false);
        setIsResultsOpen(true);
        setStep(1);
    };

    const failedImports = results.filter(r => !r.success);
    const successfulImports = results.filter(r => r.success);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Import Reports from CSV</CardTitle>
                <CardDescription>Upload a CSV file with report data to bulk-create reports. Ensure your CSV has headers that match the system fields.</CardDescription>
            </CardHeader>
            <CardContent>
                {step === 1 && (
                    <div className="space-y-4">
                        <Input type="file" accept=".csv" onChange={handleFileChange} />
                        <Button onClick={handleParse} disabled={!file || isProcessing}>
                            Next: Map Columns
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Map CSV Columns to System Fields</h3>
                        <p className="text-sm text-muted-foreground">Match the columns from your CSV file to the corresponding fields in the database. Required fields are marked with an asterisk (*).</p>
                        <ScrollArea className="h-72 border rounded-md p-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {systemFields.map(field => (
                                    <div key={field.key} className="flex flex-col gap-1">
                                        <label className="text-sm font-medium">
                                            {field.label} {field.required && <span className="text-destructive">*</span>}
                                        </label>
                                        <Select
                                            value={mapping[field.key] || ''}
                                            onValueChange={(value) => setMapping(prev => ({...prev, [field.key]: value === 'DONT_IMPORT' ? '' : value}))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select CSV column..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DONT_IMPORT">Don't Import</SelectItem>
                                                {headers.map(header => (
                                                    <SelectItem key={header} value={header}>{header}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                       
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={resetState}>Cancel</Button>
                            <Button onClick={handleImport} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Start Import
                            </Button>
                        </div>
                    </div>
                )}
                {isProcessing && <Progress value={importProgress} className="mt-4" />}
            </CardContent>

             <Dialog open={isResultsOpen} onOpenChange={(open) => { if(!open) resetState(); setIsResultsOpen(open) }}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Import Complete</DialogTitle>
                         <div className="flex gap-4 text-sm text-muted-foreground">
                            <span><FileCheck2 className="inline-block mr-2 text-green-500" />{successfulImports.length} Successful</span>
                            <span><FileX2 className="inline-block mr-2 text-red-500" />{failedImports.length} Failed</span>
                        </div>
                    </DialogHeader>
                    {failedImports.length > 0 && (
                        <div className="flex-1 min-h-0">
                            <h4 className="font-semibold mb-2">Failed Records</h4>
                            <ScrollArea className="h-full border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Row Data</TableHead>
                                            <TableHead>Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {failedImports.map((result, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="text-xs font-mono">{JSON.stringify(result.data)}</TableCell>
                                                <TableCell className="text-xs text-destructive">{result.error}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                     <DialogFooter>
                        <Button onClick={() => setIsResultsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

type BulkUploadStatus = {
    id: number;
    file: File;
    status: 'pending' | 'finding' | 'uploading' | 'success' | 'error';
    message: string;
}

const BulkEvidenceUploader = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [filesToUpload, setFilesToUpload] = useState<BulkUploadStatus[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map((file, index) => ({
                id: Date.now() + index,
                file,
                status: 'pending' as const,
                message: 'Waiting to be processed...',
            }));
            setFilesToUpload(newFiles);
        }
    };
    
    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    const processUploads = async () => {
        if (filesToUpload.length === 0) return;
        
        setIsProcessing(true);

        for (const fileStatus of filesToUpload) {
            // Find Report
            setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'finding', message: 'Finding matching report...' } : f));
            
            const filenameWithoutExt = fileStatus.file.name.replace(/\.[^/.]+$/, "");
            const parts = filenameWithoutExt.split('_');
            const placeId = parts.find(p => p.startsWith('ChI'));

            if (!placeId) {
                setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'error', message: 'Could not find Place ID in filename.' } : f));
                continue;
            }

            const reportResult = await findReportByPlaceId(placeId);

            if (!reportResult.success || !reportResult.data) {
                setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'error', message: 'Report not found for this Place ID.' } : f));
                continue;
            }

            const report = reportResult.data;
            if (!report.folderId) {
                setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'error', message: 'Report found, but has no evidence folder.' } : f));
                continue;
            }

            // Upload file
            setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'uploading', message: `Uploading to Report #${report.reportNumber}...` } : f));

            try {
                const fileDataUri = await readFileAsDataURL(fileStatus.file);
                const uploadResult = await uploadReportFile({
                    reportId: report.id,
                    fileName: fileStatus.file.name,
                    fileDataUri,
                }, user?.uid, user?.displayName);

                if (uploadResult.success) {
                    setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'success', message: `Successfully uploaded!` } : f));
                } else {
                    throw new Error(uploadResult.error || 'Unknown upload error.');
                }
            } catch (error: any) {
                 setFilesToUpload(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'error', message: error.message } : f));
            }
        }

        setIsProcessing(false);
        toast({ title: 'Bulk upload process finished.', description: 'Check the status of each file below.'});
    };

    const handleCancel = () => {
        setFilesToUpload([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Bulk Evidence Upload</CardTitle>
                <CardDescription>Upload multiple files at once. The filename must contain the report's Google Place ID (e.g., `any_prefix_ChI..._any_suffix.jpg`).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileChange} multiple disabled={isProcessing} ref={fileInputRef} />
                 {filesToUpload.length > 0 && (
                     <>
                        <ScrollArea className="h-64 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Filename</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filesToUpload.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <FileIcon className="h-4 w-4 text-muted-foreground" />
                                                <span className="truncate">{f.file.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    {f.status === 'pending' && <Loader2 className="h-4 w-4 text-muted-foreground" />}
                                                    {f.status === 'finding' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                                    {f.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
                                                    {f.status === 'success' && <Check className="h-4 w-4 text-green-500" />}
                                                    {f.status === 'error' && <FileX2 className="h-4 w-4 text-red-500" />}
                                                    <span className={f.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}>{f.message}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>Cancel</Button>
                             <Button onClick={processUploads} disabled={isProcessing || filesToUpload.length === 0}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                Process {filesToUpload.length} file(s)
                            </Button>
                        </div>
                     </>
                 )}
            </CardContent>
        </Card>
    )
}

const SystemBackup = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const result = await exportAllData(user?.uid);
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mapkh_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'System Backup Exported', description: 'All system data has been downloaded.' });
    } else {
      toast({ variant: 'destructive', title: 'Export Failed', description: result.error });
    }
    setIsExporting(false);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsConfirmOpen(false);
    setIsImporting(true);

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not read file content.' });
        setIsImporting(false);
        return;
      }
      const result = await importAllData(content);
      if (result.success) {
        toast({ title: 'System Restore Complete', description: 'Data has been imported successfully. Please refresh the application.' });
      } else {
        toast({ variant: 'destructive', title: 'Import Failed', description: result.error });
      }
      setIsImporting(false);
      setImportFile(null);
    };
    fileReader.readAsText(importFile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Backup & Restore</CardTitle>
        <CardDescription>
          Download a full backup of all system data, or restore the system from a previous backup file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold text-base mb-2">Export Data</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Download a complete JSON file containing all reports, users, teams, settings, and other system data.
          </p>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Full System Backup
          </Button>
        </div>
        <div className="border-t pt-6">
          <h4 className="font-semibold text-base mb-2">Import Data</h4>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
            <ServerCrash className="h-8 w-8" />
            <div className="text-sm">
                <p className="font-semibold">Warning: Destructive Action</p>
                <p>Restoring from a backup will completely overwrite all current data in the system. This cannot be undone.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Input type="file" accept=".json" onChange={handleImportFileChange} className="max-w-xs" />
            <Button onClick={() => setIsConfirmOpen(true)} disabled={!importFile || isImporting}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import from JSON Backup
            </Button>
          </div>
        </div>
      </CardContent>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will completely erase all current data and replace it with the data from the backup file. This cannot be undone. Please confirm you want to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} className="bg-destructive hover:bg-destructive/90">
              Yes, Overwrite Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

const BulkActions = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleCreateFolders = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error' });
            return;
        }
        setIsLoading(true);
        toast({ title: 'Starting bulk folder creation...', description: 'This may take a while.' });
        const result = await bulkCreateDriveFolders(user.uid, user.displayName);
        if (result.success) {
            toast({
                title: 'Bulk Creation Complete',
                description: `${result.created} folders created, ${result.failed} failed, ${result.skipped} already had folders.`
            });
        } else {
            toast({ variant: 'destructive', title: 'Bulk Creation Failed', description: result.error });
        }
        setIsLoading(false);
    }

    const handleDeleteEmptyFolders = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        toast({ title: 'Scanning for empty folders...', description: 'This could take a moment.'});
        const result = await deleteEmptyReportFolders();
        if (result.success) {
             toast({
                title: 'Scan Complete',
                description: `Checked ${result.checkedCount} folders. Deleted ${result.deletedCount} empty folders.`
            });
        } else {
            toast({ variant: 'destructive', title: 'Scan Failed', description: result.error });
        }
        setIsDeleting(false);
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Bulk Actions</CardTitle>
                    <CardDescription>
                        Perform actions on multiple items at once. Useful for maintenance and processing imported data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-base mb-2">Evidence Folders</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Scan all reports and create Google Drive folders for any that are missing one.
                        </p>
                        <Button onClick={handleCreateFolders} disabled={isLoading || isDeleting}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                            Create Missing Evidence Folders
                        </Button>
                    </div>
                     <div className="border-t pt-4">
                        <h4 className="font-semibold text-base mb-2">Clean Up Empty Folders</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Scan for and delete any empty evidence folders that may be left over after merging reports.
                        </p>
                        <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" disabled={isLoading || isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Scan & Delete Empty Folders
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Empty Folder Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to scan for and delete all empty report folders? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEmptyFolders}>Yes, Delete Empty Folders</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

const SupportersManager = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [supporters, setSupporters] = useState<Supporter[]>([]);
    const [newSupporter, setNewSupporter] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasMigrated, setHasMigrated] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Subscribe to real-time supporters updates
        const unsubscribe = SupporterService.subscribeToSupporters(
            (supportersData) => {
                setSupporters(supportersData);
                setIsLoading(false);
            },
            (error) => {
                console.error('Error loading supporters:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load supporters. Please refresh the page.',
                    variant: 'destructive'
                });
                setIsLoading(false);
            }
        );

        // Attempt migration from localStorage on first load
        const attemptMigration = async () => {
            if (!hasMigrated) {
                const result = await SupporterService.migrateFromLocalStorage(user.uid);
                if (result.success && result.migrated > 0) {
                    toast({
                        title: 'Migration Complete',
                        description: `Successfully migrated ${result.migrated} supporters to the database.`
                    });
                }
                setHasMigrated(true);
            }
        };

        attemptMigration();

        return () => unsubscribe();
    }, [user, toast, hasMigrated]);

    const addSupporter = async () => {
        if (!newSupporter.trim() || !user) return;
        
        setIsSubmitting(true);
        try {
            const result = await SupporterService.addSupporter(
                {
                    name: newSupporter.trim(),
                    message: newMessage.trim() || undefined
                },
                user.uid
            );

            if (result.success) {
                setNewSupporter('');
                setNewMessage('');
                toast({
                    title: 'Supporter Added',
                    description: 'The supporter has been added successfully.'
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to add supporter. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeSupporter = async (supporterId: string, supporterName: string) => {
        try {
            const result = await SupporterService.deleteSupporter(supporterId);
            
            if (result.success) {
                toast({
                    title: 'Supporter Removed',
                    description: `${supporterName} has been removed from the supporters list.`
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to remove supporter. Please try again.',
                variant: 'destructive'
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Supporters Management
                </CardTitle>
                <CardDescription>
                    Manage the list of supporters that will be displayed in the footer. These names will be visible to all users.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading supporters...</span>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter supporter name"
                                    value={newSupporter}
                                    onChange={(e) => setNewSupporter(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addSupporter()}
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    onClick={addSupporter} 
                                    disabled={!newSupporter.trim() || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4 mr-2" />
                                    )}
                                    Add
                                </Button>
                            </div>
                            <Input
                                placeholder="Optional message or note"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        {supporters.length > 0 && (
                            <div className="space-y-2">
                                <Label>Current Supporters ({supporters.length})</Label>
                                <div className="border rounded-md p-3 max-h-64 overflow-y-auto">
                                    {supporters.map((supporter) => (
                                        <div key={supporter.id} className="flex items-start justify-between py-2 border-b border-border last:border-b-0">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{supporter.name}</div>
                                                {supporter.message && (
                                                    <div className="text-xs text-muted-foreground mt-1 break-words">
                                                        {supporter.message}
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Added {supporter.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeSupporter(supporter.id, supporter.name)}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-2 flex-shrink-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {supporters.length === 0 && !isLoading && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No supporters added yet</p>
                                <p className="text-xs">Add supporter names to display them in the footer</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default function SettingsPage() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <NotificationSettings />
      <AdminNotificationManager />
      <PlaceIdCSVUploader />
      <DataImporter />
      <BulkEvidenceUploader />
      <BulkActions />
      <SystemBackup />
      <SupportersManager />
    </div>
  );
}
