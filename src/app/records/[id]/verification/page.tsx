
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getReportByNumericId, uploadReportFile, verifyPlaceId, getViolationTerms, getSubViolationTypes } from '@/app/actions';
import { Report, ViolationTerm, SubViolationType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, MapPin, CheckCircle, Clock, XCircle, AlertCircle, ShieldCheck, Link2, Download, UploadCloud, Globe, User, Satellite, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Skeleton } from '@/components/ui/skeleton';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

const StatusInfo = ({ status, found, isVerifying }: { status: Report['status'], found?: boolean, isVerifying: boolean }) => {
    const { t } = useTranslation();
    
    if (isVerifying) {
        return (
            <Badge className="text-base px-4 py-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verifying...
            </Badge>
        )
    }

    if (found === false) {
        return (
            <Badge className="text-base px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                <XCircle className="mr-2 h-5 w-5" />
                Not Found
            </Badge>
        )
    }

    const statusConfig = {
        approved: {
            icon: CheckCircle,
            text: t('statuses.approved'),
            className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        },
        rejected: {
            icon: XCircle,
            text: t('statuses.rejected'),
            className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        },
        submitted: {
            icon: Clock,
            text: t('statuses.submitted'),
            className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        },
        'in-review': {
            icon: Clock,
            text: t('statuses.in-review'),
            className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        },
        pending: {
            icon: Clock,
            text: t('statuses.pending'),
            className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        },
        'not-submitted': {
            icon: AlertCircle,
            text: t('statuses.not-submitted'),
            className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        },
        archived: {
            icon: AlertCircle,
            text: t('statuses.archived'),
            className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        },
    };

    const config = statusConfig[status] || statusConfig['not-submitted'];
    const Icon = config.icon;

    return (
        <Badge className={`text-base px-4 py-2 ${config.className}`}>
            <Icon className="mr-2 h-5 w-5" />
            {config.text}
        </Badge>
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


export default function VerificationReportPage() {
    const params = useParams();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [report, setReport] = useState<Report | null>(null);
    const [violationTerms, setViolationTerms] = useState<ViolationTerm[]>([]);
    const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const defaultApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [customApiKey, setCustomApiKey] = useState('');
    const [useCustomApiKey, setUseCustomApiKey] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const apiKey = useCustomApiKey && customApiKey ? customApiKey : defaultApiKey;

    // Validate API key format
    const validateApiKey = (key: string): boolean => {
        if (!key.trim()) return false;
        // Basic Google Maps API key validation (starts with AIza and has reasonable length)
        return key.startsWith('AIza') && key.length >= 35 && key.length <= 45;
    };

    const handleApiKeyChange = (value: string) => {
        setCustomApiKey(value);
        setApiKeyError(null);
        
        if (value.trim() && !validateApiKey(value)) {
            setApiKeyError('Invalid API key format. Google Maps API keys should start with "AIza" and be 35-45 characters long.');
        }
    };
    const printRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Verification state
    const [isVerifying, setIsVerifying] = useState(true);
    const [isPlaceFound, setIsPlaceFound] = useState<boolean | undefined>(undefined);

    // Map control state
    const [mapZoom, setMapZoom] = useState(17);
    const [mapWidth, setMapWidth] = useState(600);
    const [mapHeight, setMapHeight] = useState(400);
    const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
        if (!printRef.current) return null;
        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
            });
            return canvas;
        } catch (err) {
            console.error('Failed to capture image:', err);
            toast({ variant: "destructive", title: "Capture Failed", description: "Could not generate report image."});
            return null;
        }
    };

    const handleDownloadImage = async () => {
        setIsCapturing(true);
        const canvas = await captureCanvas();
        if (canvas) {
            const link = document.createElement('a');
            link.download = `${report!.reportNumber}_${report!.placeId || 'report'}_verification.jpeg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        }
        setIsCapturing(false);
    };

    const handlePushToDrive = async () => {
        if (!report?.folderId) {
            toast({ variant: 'destructive', title: 'Drive Folder Missing', description: 'This report does not have an evidence folder yet.' });
            return;
        }
        setIsUploading(true);
        const canvas = await captureCanvas();
        if (canvas) {
            const imageDataUri = canvas.toDataURL('image/jpeg', 0.95);
            const result = await uploadReportFile({
                reportId: report.id,
                fileName: `${report.reportNumber}_${report.placeId || 'report'}_verification.jpeg`,
                fileDataUri: imageDataUri
            }, user?.uid, user?.displayName);
            
            if (result.success) {
                toast({ title: 'Upload Successful', description: 'Verification image has been pushed to the Drive folder.' });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
        }
        setIsUploading(false);
    }

    const handleReVerification = async () => {
        if (!report?.placeId) {
            toast({ variant: 'destructive', title: 'No Place ID', description: 'This report does not have a Place ID to verify.' });
            return;
        }
        
        if (useCustomApiKey && !customApiKey.trim()) {
            toast({ variant: 'destructive', title: 'API Key Required', description: 'Please enter a valid Google Maps API key.' });
            return;
        }

        if (useCustomApiKey && !validateApiKey(customApiKey)) {
            toast({ variant: 'destructive', title: 'Invalid API Key', description: 'Please enter a valid Google Maps API key format.' });
            return;
        }

        setIsVerifying(true);
        setError(null);
        setApiKeyError(null);
        
        try {
            const verificationApiKey = useCustomApiKey && customApiKey ? customApiKey : undefined;
            const verificationResult = await verifyPlaceId(report.placeId, verificationApiKey);
            
            if (verificationResult.success) {
                setIsPlaceFound(verificationResult.found);
                toast({ 
                    title: 'Verification Complete', 
                    description: verificationResult.found ? 'Location found and verified!' : 'Location not found in Google Maps database.' 
                });
            } else {
                setError(verificationResult.error || "Verification request failed.");
                setIsPlaceFound(false);
                toast({ variant: 'destructive', title: 'Verification Failed', description: verificationResult.error });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(errorMessage);
            setIsPlaceFound(false);
            toast({ variant: 'destructive', title: 'Verification Error', description: errorMessage });
        } finally {
            setIsVerifying(false);
        }
    }
    
    useEffect(() => {
        const fetchAndVerifyReport = async () => {
            if (!id) {
                setError("Report ID is missing.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setIsVerifying(true);
            const reportNumber = parseInt(id, 10);

            if (isNaN(reportNumber)) {
                setError("Invalid Report ID format.");
                setLoading(false);
                return;
            };
            
            const [reportResult, termsResult, subTypesResult] = await Promise.all([
                getReportByNumericId(reportNumber),
                getViolationTerms(),
                getSubViolationTypes(),
            ]);

            if (termsResult.success && termsResult.data) setViolationTerms(termsResult.data);
            if (subTypesResult.success && subTypesResult.data) setSubViolationTypes(subTypesResult.data);

            if (reportResult.success && reportResult.data) {
                setReport(reportResult.data);
                // Now that we have the report, verify the placeId
                if (reportResult.data.placeId) {
                    const verificationApiKey = useCustomApiKey && customApiKey ? customApiKey : undefined;
                    const verificationResult = await verifyPlaceId(reportResult.data.placeId, verificationApiKey);
                    if (verificationResult.success) {
                        setIsPlaceFound(verificationResult.found);
                    } else {
                        // Handle case where verification API call itself fails
                        setError(verificationResult.error || "Verification request failed.");
                        setIsPlaceFound(false); // Assume not found if verification fails
                    }
                } else {
                    // No placeId to verify
                    setIsPlaceFound(false);
                }
            } else {
                setError(reportResult.error || "Failed to load report details.");
            }
            setLoading(false);
            setIsVerifying(false);
        };

        fetchAndVerifyReport();
    }, [id]);

    const getSubViolationTypeLabels = () => {
        if (!report?.subViolationType) return [];
        return report.subViolationType.map(id => {
            if (id === 'other') return report.otherSubViolationType || 'Other';
            const found = subViolationTypes.find(svt => svt.id === id);
            return found?.label || id;
        })
    }
    
    if (loading || !apiKey) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Card className="w-full max-w-lg p-8">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-6" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-6 w-full mb-6" />
                    <Skeleton className="h-48 w-full rounded-md" />
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-10 px-4 text-center">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }
    
    if (!report) {
         return (
            <div className="container mx-auto py-10 px-4 text-center">
                <p>Report not found.</p>
            </div>
        );
    }
    
    const date = toDateSafe(report.createdAt);
    const fullUrl = `https://www.google.com/maps/search/?api=1&query=${report.position.lat}%2C${report.position.lng}&query_place_id=${report.placeId}`;
    const found = isPlaceFound;


    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4 font-sans">
        <APIProvider apiKey={apiKey}>
            <div className="w-full max-w-4xl space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Map Display Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="satellite-switch"
                                        checked={mapType === 'hybrid'}
                                        onCheckedChange={(checked) => setMapType(checked ? 'hybrid' : 'roadmap')}
                                    />
                                    <Label htmlFor="satellite-switch" className="flex items-center gap-2 cursor-pointer">
                                        <Satellite className="h-5 w-5" /> Satellite View
                                    </Label>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="custom-api-switch"
                                        checked={useCustomApiKey}
                                        onCheckedChange={setUseCustomApiKey}
                                    />
                                    <Label htmlFor="custom-api-switch" className="flex items-center gap-2 cursor-pointer">
                                        <Key className="h-5 w-5" /> Use Custom API Key for Verification
                                    </Label>
                                </div>
                                {useCustomApiKey && (
                                     <div className="space-y-2">
                                         <Label htmlFor="custom-api-input">Google Maps API Key</Label>
                                         <Input
                                              id="custom-api-input"
                                              type="password"
                                              placeholder="Enter your Google Maps API key..."
                                              value={customApiKey}
                                              onChange={(e) => handleApiKeyChange(e.target.value)}
                                              className={`font-mono ${apiKeyError ? 'border-red-500 focus:border-red-500' : ''}`}
                                          />
                                          {apiKeyError && (
                                              <p className="text-sm text-red-600 dark:text-red-400">
                                                  {apiKeyError}
                                              </p>
                                          )}
                                         <div className="flex items-center justify-between">
                                             <p className="text-sm text-muted-foreground">
                                                 This API key will be used specifically for location verification. It's separate from the Maps page configuration.
                                             </p>
                                             <Button 
                                                  onClick={handleReVerification} 
                                                  disabled={isVerifying || !customApiKey.trim() || !!apiKeyError}
                                                  size="sm"
                                                  variant="outline"
                                              >
                                                 {isVerifying ? (
                                                     <>
                                                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                         Verifying...
                                                     </>
                                                 ) : (
                                                     'Re-verify'
                                                 )}
                                             </Button>
                                         </div>
                                     </div>
                                 )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="zoom-slider">Zoom Level: {mapZoom}</Label>
                                <Slider id="zoom-slider" min={1} max={22} step={1} value={[mapZoom]} onValueChange={(val) => setMapZoom(val[0])} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="width-slider">Map Width: {mapWidth}px</Label>
                                <Slider id="width-slider" min={300} max={1200} step={10} value={[mapWidth]} onValueChange={(val) => setMapWidth(val[0])} />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="height-slider">Map Height: {mapHeight}px</Label>
                                <Slider id="height-slider" min={200} max={800} step={10} value={[mapHeight]} onValueChange={(val) => setMapHeight(val[0])} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-2xl" ref={printRef}>
                    <CardHeader className={`text-center rounded-t-lg ${found ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-6`}>
                        <div className="flex items-center justify-center gap-4">
                            {found ? 
                                <ShieldCheck className="h-12 w-12 text-green-600" /> :
                                <XCircle className="h-12 w-12 text-red-600" />
                            }
                            <div className="text-left">
                                <CardTitle className="text-2xl">{found ? "Location Found" : "Location Not Found"}</CardTitle>
                                <CardDescription className="text-base">{found ? "This location has been verified." : "This location could not be verified."}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="text-center pb-4 border-b">
                            <p className="text-xl font-bold">Report #{report.reportNumber}</p>
                            <p className="text-sm text-muted-foreground font-mono mt-1">{report.placeId || 'No Place ID'}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg mb-3 border-b pb-2">Location & Details</h3>
                                <div className="space-y-3 text-sm text-foreground">
                                    <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p><strong className="font-medium">Location Name:</strong> {report.englishLanguage || report.description}</p></div>
                                    <div className="flex items-start gap-3"><Link2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p><strong className="font-medium">Full URL:</strong> <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{fullUrl}</a></p></div>
                                    <div className="flex items-start gap-3"><Globe className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p><strong className="font-medium">Lat, Long:</strong> {report.position.lat}, {report.position.lng}</p></div>
                                    <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p><strong className="font-medium">Province:</strong> {report.province}</p></div>
                                    <div className="flex items-start gap-3"><Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p><strong className="font-medium">Found Timestamp:</strong> {date ? format(date, 'PPP p') : 'N/A'}</p></div>
                                    <div className="flex items-start gap-3"><User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p><strong className="font-medium">Reported By:</strong> {report.reportedByName}</p></div>
                                </div>
                            </div>

                            <div style={{ width: `${mapWidth}px`, height: `${mapHeight}px`}} className="mx-auto rounded-md overflow-hidden border">
                                <Map
                                    center={report.position}
                                    zoom={mapZoom}
                                    mapId="verification_map"
                                    gestureHandling={'none'}
                                    disableDefaultUI={true}
                                    mapTypeId={mapType}
                                >
                                    <AdvancedMarker position={report.position}>
                                        <Pin />
                                    </AdvancedMarker>
                                </Map>
                            </div>
                             
                            <div className="text-center pt-4">
                                <h3 className="font-semibold text-lg mb-2">Current Status</h3>
                                <div className="flex justify-center flex-wrap gap-2">
                                    <StatusInfo status={report.status} found={found} isVerifying={isVerifying} />
                                    {report.violationTerm && <Badge variant="secondary" className="text-base px-4 py-2">{report.violationTerm}</Badge>}
                                    {getSubViolationTypeLabels().map((label, index) => (
                                        <Badge key={index} variant="outline" className="text-base px-4 py-2">{label}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-muted-foreground py-3 rounded-b-lg flex justify-between items-center">
                        <span>Generated: {format(currentTime, 'PPP p')}</span>
                        <p className="font-semibold">MapKHCorrect</p>
                        <span>Reported: {date ? formatDistanceToNow(date, { addSuffix: true }) : 'N/A'}</span>
                    </CardFooter>
                </Card>
                <div className="mt-4 flex justify-center gap-4">
                    <Button onClick={handleDownloadImage} disabled={isCapturing}>
                        {isCapturing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download as Image
                    </Button>
                    <Button onClick={handlePushToDrive} disabled={isUploading || !report.folderId}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Push to Drive
                    </Button>
                </div>
            </div>
        </APIProvider>
      </div>
    );
}

