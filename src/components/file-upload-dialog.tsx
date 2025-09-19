
"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, File as FileIcon, CheckCircle2, XCircle, Link as LinkIcon, FileCheck2, FileX2 } from 'lucide-react';
import { Report } from '@/lib/types';
import { uploadReportFile, saveUrlToFile } from '@/app/actions';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import * as Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useAuth } from '@/context/auth-provider';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onUploadComplete: () => void;
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileStatus {
    file: File;
    status: UploadStatus;
    message?: string;
    url?: string | null;
}

const UrlImportTab = ({ report, onComplete }: { report: Report; onComplete: () => void }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!file || !report.folderId) return;

        setIsProcessing(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: async (result) => {
                const requiredHeaders = ['url', 'reviewer', 'description'];
                const csvHeaders = result.meta.fields || [];
                const hasRequiredHeaders = requiredHeaders.every(h => csvHeaders.includes(h));
                
                if (!hasRequiredHeaders) {
                    toast({
                        variant: 'destructive',
                        title: 'Invalid CSV Format',
                        description: `CSV must contain the following headers: ${requiredHeaders.join(', ')}`,
                    });
                    setIsProcessing(false);
                    return;
                }

                let formattedContent = '';
                (result.data as any[]).forEach(row => {
                    if (row.url && row.reviewer && row.description) {
                        formattedContent += `Reviewer: ${row.reviewer}\n`;
                        formattedContent += `Review: ${row.description}\n`;
                        formattedContent += `Source: ${row.url}\n`;
                        formattedContent += `--------------------\n\n`;
                    }
                });

                if (formattedContent) {
                    const saveResult = await saveUrlToFile({
                        reportId: report.id,
                        folderId: report.folderId!,
                        urlContent: formattedContent,
                        fileName: 'Reviews.txt'
                    }, user?.uid, user?.displayName);

                    if (saveResult.success) {
                        toast({ title: 'Reviews imported successfully', description: 'A "Reviews.txt" file has been added to the Drive folder.'});
                        onComplete();
                    } else {
                        toast({ variant: 'destructive', title: 'Import Failed', description: saveResult.error });
                    }
                } else {
                    toast({ variant: 'destructive', title: 'No valid data found', description: 'Could not find any rows with url, reviewer, and description in the CSV.' });
                }

                setIsProcessing(false);
                setFile(null);
            },
        });
    };


    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload a CSV with `url`, `reviewer`, and `description` columns to create a single `Reviews.txt` file in the evidence folder.</p>
            <div className="flex items-center gap-4">
                <Input type="file" accept=".csv" onChange={handleFileChange} />
                <Button onClick={handleImport} disabled={!file || isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                    Import CSV
                </Button>
            </div>
        </div>
    )
}

export function FileUploadDialog({ isOpen, onClose, report, onUploadComplete }: FileUploadDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [filesToUpload, setFilesToUpload] = useState<FileStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [urlFileName, setUrlFileName] = useState('');

  useEffect(() => {
    // When the dialog opens with a new report, reset the fields
    if (isOpen) {
      setManualUrl('');
      setUrlFileName('');
      setFilesToUpload([]);
    }
  }, [isOpen, report]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({ file, status: 'pending' } as FileStatus));
      setFilesToUpload(prev => [...prev, ...newFiles]);
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

  const handleUpload = async () => {
    const pendingFiles = filesToUpload.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast({ variant: 'destructive', title: 'No new files selected' });
      return;
    }
    if (!report.id || !report.folderId) {
      toast({ variant: 'destructive', title: 'Report not ready', description: "The report's Drive folder is not available yet." });
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < filesToUpload.length; i++) {
        const currentFile = filesToUpload[i];
        if (currentFile.status !== 'pending') continue;
        
        // Update status to 'uploading'
        setFilesToUpload(prev => prev.map((f, index) => index === i ? { ...f, status: 'uploading' } : f));

        try {
            const fileDataUri = await readFileAsDataURL(currentFile.file);
            const result = await uploadReportFile({
                reportId: report.id,
                fileName: currentFile.file.name,
                fileDataUri,
            }, user?.uid, user?.displayName);

            if (result.success) {
                setFilesToUpload(prev => prev.map((f, index) => index === i ? { ...f, status: 'success', message: 'Uploaded!', url: result.fileUrl } : f));
            } else {
                throw new Error(result.error || 'Unknown upload error');
            }
        } catch (error: any) {
            setFilesToUpload(prev => prev.map((f, index) => index === i ? { ...f, status: 'error', message: error.message } : f));
        }
    }

    setIsUploading(false);
    onUploadComplete(); // Refresh data in the parent component
    toast({ title: 'Upload process finished.', description: 'Check the status of each file below.'});
  };
  
  const handleSaveUrl = async () => {
    const urlToSave = manualUrl || report.locationWithin;
    if (!report.folderId || !urlToSave) {
        toast({ variant: 'destructive', title: 'No URL to save', description: "Please enter a URL or ensure the report has a default location URL." });
        return;
    }

    setIsSavingUrl(true);
    const result = await saveUrlToFile({
      reportId: report.id,
      folderId: report.folderId,
      urlContent: urlToSave,
      fileName: urlFileName,
    }, user?.uid, user?.displayName);

    if (result.success) {
      toast({ title: 'URL saved successfully', description: 'The source URL was saved to the Drive folder.' });
      onUploadComplete();
    } else {
      toast({ variant: 'destructive', title: 'Failed to save URL', description: result.error });
    }
    setIsSavingUrl(false);
  }

  const allDone = filesToUpload.length > 0 && filesToUpload.every(f => f.status === 'success' || f.status === 'error');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Evidence for Report #{report.reportNumber}</DialogTitle>
          <DialogDescription>
            Add files and URLs as evidence to this report's Google Drive folder.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="files" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="files">Upload Files</TabsTrigger>
                <TabsTrigger value="url">Save a URL</TabsTrigger>
                <TabsTrigger value="import">Import URLs</TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="mt-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="file-upload">Choose Files</Label>
                    <Input id="file-upload" type="file" onChange={handleFileChange} disabled={isUploading} multiple />
                </div>
                 {filesToUpload.length > 0 && (
                    <ScrollArea className="h-48 border rounded-md p-2">
                        <div className="space-y-2">
                        {filesToUpload.map((fileStatus, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                                <FileIcon className="h-5 w-5 flex-shrink-0" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{fileStatus.file.name}</p>
                                    <p className="text-xs text-muted-foreground">{fileStatus.message || fileStatus.status}</p>
                                </div>
                                {fileStatus.status === 'pending' && <Loader2 className="h-5 w-5 text-muted-foreground" />}
                                {fileStatus.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin" />}
                                {fileStatus.status === 'success' && (
                                    fileStatus.url ? 
                                    <Button asChild variant="link" size="sm" className="p-0 h-auto">
                                        <a href={fileStatus.url} target="_blank" rel="noopener noreferrer">View File</a>
                                    </Button>
                                    : <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                                {fileStatus.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                )}
                <div className="flex justify-end">
                    <Button type="button" onClick={handleUpload} disabled={isUploading || filesToUpload.filter(f => f.status === 'pending').length === 0}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload {filesToUpload.filter(f => f.status === 'pending').length > 0 ? `(${filesToUpload.filter(f => f.status === 'pending').length})` : ''}
                    </Button>
                </div>
            </TabsContent>
            <TabsContent value="url" className="mt-4 space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="manual-url">Location URL</Label>
                    <Input 
                        id="manual-url"
                        placeholder={report.locationWithin || "Paste any URL here"}
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="url-filename">Filename for URL (optional)</Label>
                    <Input 
                        id="url-filename"
                        placeholder="e.g., original_location_link.txt"
                        value={urlFileName}
                        onChange={(e) => setUrlFileName(e.target.value)}
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        variant="secondary"
                        onClick={handleSaveUrl}
                        disabled={isSavingUrl || !report.folderId || (!manualUrl && !report.locationWithin)}
                    >
                        {isSavingUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                        Save URL
                    </Button>
                </div>
            </TabsContent>
             <TabsContent value="import" className="mt-4">
                <UrlImportTab report={report} onComplete={onUploadComplete} />
             </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {allDone ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
