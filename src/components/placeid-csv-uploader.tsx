'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Download, 
  FileCheck2, 
  FileX2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { processCSVFile, downloadSampleCSV, type CSVProcessingResult, type ColumnMapping } from '@/lib/csv-processor';

interface UploadResult {
  success: boolean;
  message: string;
  csvStats?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  updateStats?: {
    updated: number;
    notFound: number;
    errors: string[];
  };
  csvErrors?: string[];
}

export function PlaceIdCSVUploader() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [csvPreview, setCsvPreview] = useState<CSVProcessingResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [step, setStep] = useState<'select' | 'mapping' | 'preview' | 'upload' | 'complete'>('select');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setUploadProgress(10);

    try {
      // Process and preview CSV
      const result = await processCSVFile(selectedFile);
      setCsvPreview(result);
      setUploadProgress(100);
      
      if (result.needsMapping && result.headers) {
        // Need column mapping
        setAvailableHeaders(result.headers);
        setStep('mapping');
        toast({
          title: 'Column Mapping Required',
          description: 'Please select which columns contain PlaceID and Status data.',
        });
      } else if (!result.success) {
        setStep('preview');
        toast({
          title: 'CSV Validation Failed',
          description: `Found ${result.errors?.length || 0} errors in the CSV file.`,
          variant: 'destructive'
        });
      } else {
        setStep('preview');
        toast({
          title: 'CSV Validated Successfully',
          description: `Ready to process ${result.validRows} valid records.`,
        });
      }
    } catch (error) {
      toast({
        title: 'File Processing Error',
        description: 'Failed to process the CSV file. Please check the file format.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleColumnMapping = async () => {
    if (!file || !columnMapping?.placeIdColumn) return;

    setIsProcessing(true);
    setUploadProgress(10);

    try {
      // Reprocess CSV with column mapping
      const result = await processCSVFile(file, columnMapping);
      setCsvPreview(result);
      setUploadProgress(100);
      setStep('preview');
      
      if (!result.success) {
        toast({
          title: 'CSV Validation Failed',
          description: `Found ${result.errors?.length || 0} errors in the CSV file.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'CSV Validated Successfully',
          description: `Ready to process ${result.validRows} valid records.`,
        });
      }
    } catch (error) {
      toast({
        title: 'File Processing Error',
        description: 'Failed to process the CSV file with selected mapping.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !csvPreview?.success) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setStep('upload');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/placeid/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result: UploadResult = await response.json();
      setUploadResult(result);
      setStep('complete');

      if (result.success) {
        toast({
          title: 'Upload Successful',
          description: `Updated ${result.updateStats?.updated || 0} records successfully.`,
        });
        
        // Trigger map refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('refreshMarkers', {
          detail: { 
            updatedCount: result.updateStats?.updated || 0,
            notFoundCount: result.updateStats?.notFound || 0
          }
        }));
      } else {
        toast({
          title: 'Upload Failed',
          description: result.message || 'Failed to process CSV upload.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: 'Network error occurred during upload.',
        variant: 'destructive'
      });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setCsvPreview(null);
    setUploadResult(null);
    setStep('select');
    setUploadProgress(0);
    setColumnMapping(null);
    setAvailableHeaders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderFileSelect = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="csv-file">Select CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          ref={fileInputRef}
          disabled={isProcessing}
        />
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div>
              CSV file should contain columns for <strong>PlaceID</strong> and optionally <strong>Status</strong>.
            </div>
            <div className="text-sm">
              <strong>Supported status values:</strong> approved, rejected, pending, submitted, in-review, not-submitted, archived
            </div>
            <div className="text-sm">
              <strong>Status aliases:</strong> yes/no, ok/bad, active/inactive, complete/incomplete, and many more are automatically recognized.
            </div>
            <div className="text-sm">
              Empty status values will default to 'approved'.
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleCSV}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Sample CSV
        </Button>
      </div>
      
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing CSV file...</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
    </div>
  );

  const renderColumnMapping = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Column Mapping</h3>
        <Button variant="outline" size="sm" onClick={resetUploader}>
          Select Different File
        </Button>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div>
              Please select which columns in your CSV file contain the PlaceID and Status data.
            </div>
            <div className="text-sm">
              <strong>PlaceID:</strong> Should contain Google Place IDs (e.g., ChIJN1t_tDeuEmsRUsoyG83frY4)
            </div>
            <div className="text-sm">
              <strong>Status:</strong> Can contain various status formats - the system will automatically recognize common variations
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="placeid-column">PlaceID Column *</Label>
          <Select
             value={columnMapping?.placeIdColumn || ''}
             onValueChange={(value) => setColumnMapping(prev => ({ 
               placeIdColumn: value,
               statusColumn: prev?.statusColumn
             }))}
           >
            <SelectTrigger>
              <SelectValue placeholder="Select PlaceID column" />
            </SelectTrigger>
            <SelectContent>
              {availableHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="status-column">Status Column (Optional)</Label>
          <Select
             value={columnMapping?.statusColumn || ''}
             onValueChange={(value) => setColumnMapping(prev => ({ 
               placeIdColumn: prev?.placeIdColumn || '',
               statusColumn: value || undefined
             }))}
           >
            <SelectTrigger>
              <SelectValue placeholder="Select Status column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None (will default to 'approved')</SelectItem>
              {availableHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetUploader}>
            Cancel
          </Button>
          <Button 
            onClick={handleColumnMapping}
            disabled={!columnMapping?.placeIdColumn || isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="h-4 w-4" />
            )}
            Continue with Mapping
          </Button>
        </div>
        
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing CSV with selected mapping...</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">CSV Preview</h3>
        <Button variant="outline" size="sm" onClick={resetUploader}>
          Select Different File
        </Button>
      </div>
      
      {csvPreview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{csvPreview.totalRows}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{csvPreview.validRows}</div>
              <div className="text-sm text-muted-foreground">Valid Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{csvPreview.invalidRows}</div>
              <div className="text-sm text-muted-foreground">Invalid Rows</div>
            </div>
          </div>
          
          {csvPreview.errors && csvPreview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Validation Errors:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {csvPreview.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {csvPreview.errors.length > 5 && (
                      <li>... and {csvPreview.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {csvPreview.success && (
            <div className="flex justify-end">
              <Button onClick={handleUpload} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload and Process ({csvPreview.validRows} records)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <h3 className="text-lg font-medium">Processing Upload</h3>
        <p className="text-sm text-muted-foreground">Updating PlaceID statuses in the database...</p>
      </div>
      <Progress value={uploadProgress} className="w-full" />
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-4">
      <div className="text-center">
        {uploadResult?.success ? (
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
        ) : (
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        )}
        <h3 className="text-lg font-medium">
          {uploadResult?.success ? 'Upload Complete' : 'Upload Failed'}
        </h3>
      </div>
      
      {uploadResult && (
        <div className="space-y-4">
          {uploadResult.success && uploadResult.updateStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.updateStats.updated}
                </div>
                <div className="text-sm text-muted-foreground">Records Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {uploadResult.updateStats.notFound}
                </div>
                <div className="text-sm text-muted-foreground">PlaceIDs Not Found</div>
              </div>
            </div>
          )}
          
          {uploadResult.updateStats?.errors && uploadResult.updateStats.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Processing Errors:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {uploadResult.updateStats.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {uploadResult.updateStats.errors.length > 3 && (
                      <li>... and {uploadResult.updateStats.errors.length - 3} more errors</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-center">
            <Button onClick={resetUploader}>
              Upload Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          PlaceID Status Management
        </CardTitle>
        <CardDescription>
          Upload a CSV file to bulk update PlaceID statuses. This will update existing reports 
          and refresh map markers accordingly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'select' && renderFileSelect()}
        {step === 'mapping' && renderColumnMapping()}
        {step === 'preview' && renderPreview()}
        {step === 'upload' && renderUpload()}
        {step === 'complete' && renderComplete()}
      </CardContent>
    </Card>
  );
}