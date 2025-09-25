
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getReportByNumericId, uploadReportFile, verifyPlaceId, getViolationTerms, getSubViolationTypes } from '@/app/actions';
import { Report, ViolationTerm, SubViolationType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, MapPin, CheckCircle, Clock, XCircle, AlertCircle, ShieldCheck, Link2, Download, UploadCloud, Globe, User, Satellite, Key, Info, FileText } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

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
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    
    // Load saved API key from localStorage on component mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem('verification_api_key');
        const savedUseCustom = localStorage.getItem('use_custom_api_key') === 'true';
        
        if (savedApiKey && savedUseCustom) {
            setCustomApiKey(savedApiKey);
            setUseCustomApiKey(true);
        }
    }, []);
    
    const apiKey = useCustomApiKey && customApiKey ? customApiKey : defaultApiKey;

    // Debug logging for API key
    useEffect(() => {
        console.log('API Key Debug:', {
            useCustomApiKey,
            customApiKey: customApiKey ? `${customApiKey.substring(0, 10)}...` : 'none',
            defaultApiKey: defaultApiKey ? `${defaultApiKey.substring(0, 10)}...` : 'none',
            finalApiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'none'
        });
    }, [useCustomApiKey, customApiKey, defaultApiKey, apiKey]);

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

    const saveApiKey = () => {
        if (useCustomApiKey && customApiKey && validateApiKey(customApiKey)) {
            localStorage.setItem('verification_api_key', customApiKey);
            localStorage.setItem('use_custom_api_key', 'true');
            toast({ title: 'API Key Saved', description: 'Your API key has been saved for future verification sessions.' });
        } else if (!useCustomApiKey) {
            localStorage.removeItem('verification_api_key');
            localStorage.removeItem('use_custom_api_key');
            toast({ title: 'API Key Cleared', description: 'Using default API key for verification.' });
        }
        setShowApiKeyDialog(false);
    };
    const printRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Verification state
    const [isVerifying, setIsVerifying] = useState(false);
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

    const handleVerification = async () => {
        if (!report?.placeId) {
            toast({ variant: 'destructive', title: 'No Place ID', description: 'This report does not have a Place ID to verify.' });
            return;
        }
        
        // Check if we need an API key for verification
        if (useCustomApiKey && !customApiKey.trim()) {
            setShowApiKeyDialog(true);
            return;
        }

        if (useCustomApiKey && !validateApiKey(customApiKey)) {
            setShowApiKeyDialog(true);
            return;
        }

        // If no default API key and no custom API key, show dialog
        if (!defaultApiKey && !customApiKey.trim()) {
            setShowApiKeyDialog(true);
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

    const handleReVerification = async () => {
        await handleVerification();
    }
    
    useEffect(() => {
        const fetchReport = async () => {
            try {
                if (!id) {
                    setError("Report ID is missing.");
                    setLoading(false);
                    return;
                }
                setLoading(true);
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
                    // Don't auto-verify on page load - user must click verification button
                } else {
                    setError(reportResult.error || "Failed to load report details.");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load report data.';
                setError(errorMessage);
                console.error('Error fetching report:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    const getSubViolationTypeLabels = () => {
        if (!report?.subViolationType) return [];
        return report.subViolationType.map(id => {
            if (id === 'other') return report.otherSubViolationType || 'Other';
            const found = subViolationTypes.find(svt => svt.id === id);
            return found?.label || id;
        })
    }
    
    if (loading) {
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

    // Show API key dialog only when explicitly requested via showApiKeyDialog state
    if (showApiKeyDialog) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            API Key Required
                        </CardTitle>
                        <CardDescription>
                            A Google Maps API key is required to verify location data. Please provide your API key to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-key-input">Google Maps API Key</Label>
                            <Input
                                id="api-key-input"
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
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <p>• Your API key will be saved locally for future sessions</p>
                            <p>• API key should start with "AIza" and be 35-45 characters long</p>
                            <p>• Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button 
                            onClick={() => setShowApiKeyDialog(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => {
                                if (customApiKey && validateApiKey(customApiKey)) {
                                    setUseCustomApiKey(true);
                                    saveApiKey();
                                    setShowApiKeyDialog(false);
                                }
                            }}
                            disabled={!customApiKey || !!apiKeyError}
                            className="flex-1"
                        >
                            Save & Continue
                        </Button>
                    </CardFooter>
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
        <APIProvider apiKey={apiKey || ''}>
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
                                             <div className="flex gap-2">
                                                 <Button 
                                                      onClick={saveApiKey}
                                                      disabled={useCustomApiKey && (!customApiKey.trim() || !!apiKeyError)}
                                                      size="sm"
                                                      variant="outline"
                                                  >
                                                     Save Settings
                                                 </Button>
                                                 <Button 
                                                      onClick={handleReVerification} 
                                                      disabled={isVerifying || (useCustomApiKey && (!customApiKey.trim() || !!apiKeyError))}
                                                      size="sm"
                                                      variant="outline"
                                                  >
                                                     {isVerifying ? (
                                                         <>
                                                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                             Verifying...
                                                         </>
                                                     ) : (
                                                         'Re-verify Location'
                                                     )}
                                                 </Button>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                            </div>
                        </div>
                        
                        {/* Initial Verification Button - Show when no verification has been done */}
                        {isPlaceFound === undefined && !isVerifying && (
                            <div className="mt-6 text-center">
                                <Button 
                                    onClick={handleVerification} 
                                    size="lg"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                    Start Verification
                                </Button>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Click to verify this location using Google Maps API
                                </p>
                            </div>
                        )}
                        
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
                <Card className="shadow-2xl border-2" ref={printRef}>
                    <CardHeader className={`text-center rounded-t-lg ${found ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-200 dark:border-green-700' : 'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-200 dark:border-red-700'} p-6 border-b-2`}>
                        <div className="flex items-center justify-center gap-4">
                            {found ? 
                                <div className="p-3 rounded-full bg-green-500/20 border-2 border-green-500">
                                    <ShieldCheck className="h-12 w-12 text-green-600 dark:text-green-400" />
                                </div> :
                                <div className="p-3 rounded-full bg-red-500/20 border-2 border-red-500">
                                    <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                                </div>
                            }
                            <div className="text-left">
                                <CardTitle className={`text-2xl font-bold ${found ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                    {found ? "✓ Location Verified" : "✗ Location Not Found"}
                                </CardTitle>
                                <CardDescription className={`text-base ${found ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                    {found ? "This location has been successfully verified." : "This location could not be verified."}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800">
                        <div className="text-center pb-4 border-b-2 border-dashed border-slate-200 dark:border-slate-700">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-700">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <p className="text-xl font-bold text-blue-800 dark:text-blue-200">
                                    Report #{report?.reportNumber || 'N/A'}
                                </p>
                            </div>
                            <div className="mt-3 space-y-2">
                                <p className="text-sm text-muted-foreground font-semibold">Place ID</p>
                                <p className="text-sm font-mono px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md inline-block border">
                                    {report?.placeId || 'No Place ID Available'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                                    <MapPin className="h-5 w-5" />
                                    Location & Details
                                </h3>
                                <div className="space-y-3 text-sm text-foreground">
                                    <div className="flex items-start gap-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded-md">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p><strong className="font-medium">Location Name:</strong> {report.englishLanguage || report.description}</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded-md">
                                        <Link2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p><strong className="font-medium">Full URL:</strong> <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{fullUrl}</a></p>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded-md">
                                        <Globe className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p><strong className="font-medium">Lat, Long:</strong> {report.position.lat}, {report.position.lng}</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded-md">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p><strong className="font-medium">Province:</strong> {report.province}</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded-md">
                                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p><strong className="font-medium">Found Timestamp:</strong> {date ? format(date, 'PPP p') : 'N/A'}</p>
                                    </div>
                                    <div className="flex items-start gap-3 p-2 bg-white/60 dark:bg-slate-800/60 rounded-md">
                                        <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <p><strong className="font-medium">Reported By:</strong> {report.reportedByName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-purple-800 dark:text-purple-200">
                                    <Globe className="h-5 w-5" />
                                    Translation Fields
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="english-translation" className="text-sm font-medium flex items-center gap-2">
                                                <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">EN</span>
                                                English Translation
                                            </Label>
                                            <Textarea
                                                id="english-translation"
                                                placeholder="Enter English translation..."
                                                defaultValue={report.englishLanguage || ''}
                                                className="min-h-[80px] resize-y bg-white/80 dark:bg-slate-800/80 border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="khmer-translation" className="text-sm font-medium flex items-center gap-2">
                                                <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">KH</span>
                                                Khmer Translation
                                            </Label>
                                            <Textarea
                                                id="khmer-translation"
                                                placeholder="បញ្ចូលការបកប្រែជាភាសាខ្មែរ..."
                                                defaultValue={report.nativeKhmerLanguage || ''}
                                                className="font-khmer min-h-[80px] resize-y bg-white/80 dark:bg-slate-800/80 border-red-200 dark:border-red-700 focus:border-red-400 dark:focus:border-red-500"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                                        <div className="flex items-start gap-2">
                                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                                <p>• Translation fields are auto-filled from the original report</p>
                                                <p>• You can edit these fields as needed for verification</p>
                                                <p>• Text areas are compact but will expand to show full content</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ width: `${mapWidth}px`, height: `${mapHeight}px`}} className="mx-auto rounded-md overflow-hidden border">
                                {apiKey ? (
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
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
                                        <div className="text-center p-4">
                                            <Key className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                            <p className="text-gray-600 dark:text-gray-400">No API key available</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                                Please configure a Google Maps API key to display the map
                                            </p>
                                        </div>
                                    </div>
                                )}
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

