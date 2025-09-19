
"use client";

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, InfoWindow, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Satellite, Waypoints, MessageSquare, Edit, ListChecks, ClipboardPaste, X, Search, Flag, Languages, Camera, MapPin, Calendar, Clock, Eye, EyeOff, Filter } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Report } from '@/lib/types';
import { ReportDialog } from './report-dialog';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useActivityDialog } from '@/context/activity-dialog-provider';
import { geocodeAddress } from '@/ai/flows/geocode-address';
import { Skeleton } from './ui/skeleton';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { reverseGeocode } from '@/ai/flows/get-province-from-latlng';
import { useAuth } from '@/context/auth-provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { translateText } from '@/ai/flows/translate-text';
import html2canvas from 'html2canvas';
import { updateReport } from '@/app/actions';
import { format, formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';


const MapClickHandler = ({ onMapClick }: { onMapClick: (e: google.maps.MapMouseEvent) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        onMapClick(e);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onMapClick]);

  return null;
}

const Markers = memo(({
    reports, 
    onMarkerClick,
    selectedReport,
    onCloseClick,
    onEditClick,
    onPinApprove,
    showNames,
    showOnlyApproved,
    zoomLevel
}: { 
    reports: Report[], 
    onMarkerClick: (report: Report) => void,
    selectedReport: Report | null,
    onCloseClick: () => void,
    onEditClick: (report: Report) => void,
    onPinApprove: (report: Report) => void,
    showNames: boolean,
    showOnlyApproved: boolean,
    zoomLevel: number,
}) => {
    const { showActivityDialog } = useActivityDialog();
    const [clickingReportId, setClickingReportId] = useState<string | null>(null);
    const [showApproveButton, setShowApproveButton] = useState<string | null>(null);
    const map = useMap();
    
    const getPinColor = (status: Report['status']) => {
        switch (status) {
            case 'approved':
                return '#22c55e'; // green-500
            case 'rejected':
                return '#ef4444'; // red-500
            default:
                return '#eab308'; // yellow-500
        }
    }
    
    const handlePinClick = async (e: google.maps.MapMouseEvent, report: Report) => {
        e.stop(); // Prevent event bubbling
        
        // If already approved, show info window
        if (report.status === 'approved') {
            onMarkerClick(report);
            setShowApproveButton(null);
            return;
        }
        
        // For non-approved pins, show approve button
        setShowApproveButton(report.id);
        onCloseClick(); // Hide info window if open
    };
    
    const handleApproveClick = async (report: Report) => {
        setClickingReportId(report.id);
        setShowApproveButton(null);
        
        try {
            await onPinApprove(report);
        } finally {
            setClickingReportId(null);
        }
    };
    
    const handleInfoClick = (report: Report) => {
        onMarkerClick(report);
        setShowApproveButton(null);
    };

    return (
        <>
            {reports
                .filter(report => showOnlyApproved ? report.status === 'approved' : true)
                .map((report) => {
                const isClicking = clickingReportId === report.id;
                const pinColor = isClicking ? '#94a3b8' : getPinColor(report.status); // gray-400 when loading
                
                return (
                    <div key={report.id} className="relative">
                        <AdvancedMarker 
                            position={report.position} 
                            onClick={(e) => handlePinClick(e, report)}
                            className={isClicking ? 'animate-pulse' : ''}
                        >
                            <div className="relative">
                                <Pin 
                                    background={pinColor} 
                                    glyphColor={'#ffffff'} 
                                    borderColor={isClicking ? '#64748b' : '#ffffff'}
                                    scale={isClicking ? 1.2 : 1.0}
                                />
                                {/* Thai Name Label directly on pin */}
                                {report.thaiLanguage && showNames && (
                                    <div 
                                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${
                                            zoomLevel >= 10 ? 'opacity-100' : 'opacity-0'
                                        }`}
                                        style={{
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            color: '#ffffff',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '80px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                    >
                                        {report.thaiLanguage}
                                    </div>
                                )}
                            </div>
                        </AdvancedMarker>
                    </div>
                );
            })}
            {selectedReport && (
                <InfoWindow
                    position={selectedReport.position}
                    onCloseClick={onCloseClick}
                    headerDisabled
                >
                     <div className="bg-card text-card-foreground p-4 rounded-lg shadow-lg w-80 space-y-3">
                         <CardTitle className="text-sm font-semibold line-clamp-2">Report #{selectedReport.reportNumber}</CardTitle>
                         
                         {/* Names Section */}
                         <div className="space-y-2">
                             {selectedReport.englishLanguage && (
                                 <div className="flex items-center gap-2 text-xs">
                                     <Languages className="h-3 w-3 text-blue-500" />
                                     <span className="font-medium">EN:</span>
                                     <span className="text-muted-foreground">{selectedReport.englishLanguage}</span>
                                 </div>
                             )}
                             {selectedReport.thaiLanguage && (
                                 <div className="flex items-center gap-2 text-xs">
                                     <Languages className="h-3 w-3 text-green-500" />
                                     <span className="font-medium">TH:</span>
                                     <span className="text-muted-foreground">{selectedReport.thaiLanguage}</span>
                                 </div>
                             )}
                             {selectedReport.nativeKhmerLanguage && (
                                 <div className="flex items-center gap-2 text-xs">
                                     <Languages className="h-3 w-3 text-red-500" />
                                     <span className="font-medium">KH:</span>
                                     <span className="text-muted-foreground">{selectedReport.nativeKhmerLanguage}</span>
                                 </div>
                             )}
                         </div>

                         <Separator />

                         {/* Metadata Section */}
                         <div className="space-y-2">
                             {selectedReport.placeId && (
                                 <div className="flex items-center gap-2 text-xs">
                                     <MapPin className="h-3 w-3 text-purple-500" />
                                     <span className="font-medium">Place ID:</span>
                                     <span className="text-muted-foreground font-mono text-[10px]">{selectedReport.placeId}</span>
                                 </div>
                             )}
                             {selectedReport.createdAt && (
                                 <div className="flex items-center gap-2 text-xs">
                                     <Calendar className="h-3 w-3 text-indigo-500" />
                                     <span className="font-medium">Reported:</span>
                                     <span className="text-muted-foreground">
                                         {selectedReport.createdAt instanceof Timestamp 
                                             ? format(selectedReport.createdAt.toDate(), 'MMM dd, yyyy')
                                             : format(new Date(selectedReport.createdAt), 'MMM dd, yyyy')
                                         }
                                     </span>
                                 </div>
                             )}
                             {selectedReport.createdAt && (
                                 <div className="flex items-center gap-2 text-xs">
                                     <Clock className="h-3 w-3 text-teal-500" />
                                     <span className="font-medium">Duration:</span>
                                     <span className="text-muted-foreground">
                                         {selectedReport.createdAt instanceof Timestamp 
                                             ? formatDistanceToNow(selectedReport.createdAt.toDate(), { addSuffix: true })
                                             : formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true })
                                         }
                                     </span>
                                 </div>
                             )}
                         </div>

                         <Separator />

                         <p className="text-sm text-muted-foreground line-clamp-3">{selectedReport.description}</p>
                         
                         <div className="flex flex-col gap-2">
                            <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs justify-start">
                                <Link href={`/records/${selectedReport.reportNumber}`}>
                                    <ListChecks className="mr-2 h-4 w-4"/>
                                    View Details
                                </Link>
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full h-8 text-xs justify-start" 
                                onClick={() => {
                                    const url = `https://www.google.com/maps?q=${selectedReport.position.lat},${selectedReport.position.lng}`;
                                    window.open(url, '_blank');
                                }}
                            >
                                <MapPin className="mr-2 h-4 w-4"/>
                                View on Maps
                            </Button>
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs justify-start" onClick={() => onEditClick(selectedReport)}>
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit
                            </Button>
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs justify-start" onClick={() => showActivityDialog(selectedReport, 'comments')}>
                                <MessageSquare className="mr-2 h-4 w-4"/>
                                Comment
                            </Button>
                        </div>
                    </div>
                </InfoWindow>
            )}
            {showApproveButton && (() => {
                const report = reports.find(r => r.id === showApproveButton);
                if (!report) return null;
                
                return (
                    <InfoWindow
                        position={report.position}
                        onCloseClick={() => setShowApproveButton(null)}
                        headerDisabled
                    >
                        <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-green-500">
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 shadow-md"
                                    onClick={() => handleApproveClick(report)}
                                    disabled={clickingReportId === report.id}
                                >
                                    {clickingReportId === report.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <ListChecks className="h-4 w-4 mr-1" />
                                            Approve
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleInfoClick(report)}
                                >
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Details
                                </Button>
                            </div>
                        </div>
                    </InfoWindow>
                );
            })()}
        </>
    )
});
Markers.displayName = 'Markers';


const MapControls = ({ 
  mapType,
  setMapType,
  onUrlOrSearch,
  onScreenshot,
  showNames,
  setShowNames,
  showOnlyApproved,
  setShowOnlyApproved
} : {
  mapType: "roadmap" | "hybrid",
  setMapType: (type: "roadmap" | "hybrid") => void,
  onUrlOrSearch: (coords: google.maps.LatLngLiteral) => void;
  onScreenshot: () => void;
  showNames: boolean;
  setShowNames: (show: boolean) => void;
  showOnlyApproved: boolean;
  setShowOnlyApproved: (show: boolean) => void;
}) => {
  const [mapUrl, setMapUrl] = useState('');
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(10);
  const { toast } = useToast();
  const { t } = useTranslation();
  const map = useMap();
  const places = useMapsLibrary('places');
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  // Track zoom level changes
  useEffect(() => {
    if (!map) return;
    
    const zoomListener = map.addListener('zoom_changed', () => {
      const currentZoom = map.getZoom() || 10;
      setZoomLevel(currentZoom);
    });
    
    // Set initial zoom
    const initialZoom = map.getZoom() || 10;
    setZoomLevel(initialZoom);
    
    return () => google.maps.event.removeListener(zoomListener);
  }, [map]);

  // Initialize Places services
  useEffect(() => {
    if (!places || !map) return;
    
    if (!autocompleteService.current) {
      autocompleteService.current = new places.AutocompleteService();
    }
    
    if (!placesService.current) {
      placesService.current = new places.PlacesService(map);
    }
  }, [places, map]);

  const parseCoordinatesFromUrl = useCallback((url: string): {lat: number, lng: number} | null => {
    // Regex to find coordinates in various Google Maps URL formats, including /@lat,lng,zoom/ and /place/name/@lat,lng,zoom/
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    
    if (match && match[1] && match[2]) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }
    return null;
  }, []);

  const onUrlSubmit = async () => {
    if (!mapUrl || !map) return;
    setIsResolvingUrl(true);
    
    const coords = parseCoordinatesFromUrl(mapUrl);
    if (coords) {
        map.setCenter(coords);
        map.setZoom(17);
        onUrlOrSearch(coords);
        toast({ title: 'Location found!', description: 'Map centered on the coordinates from the URL.' });
    } else {
        toast({
            variant: 'destructive',
            title: 'Invalid URL',
            description: 'Could not extract coordinates from the provided URL. Please check the format.',
        });
    }
    setIsResolvingUrl(false);
  }
  
  const handlePaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          setMapUrl(text);
      } catch (err) {
          console.error('Failed to read clipboard contents: ', err);
          toast({
              variant: 'destructive',
              title: "Paste Failed",
              description: "Could not read from clipboard. Please paste manually or check permissions.",
          });
      }
  };

  const handleClear = () => {
      setMapUrl('');
  }

  // Handle search input changes and get predictions
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    
    if (!value.trim() || !autocompleteService.current) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    const request = {
      input: value,
      componentRestrictions: { country: 'kh' }, // Restrict to Cambodia
    };

    autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        setPredictions(predictions);
        setShowPredictions(true);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    });
  };

  // Handle prediction selection
  const handlePredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current || !map) return;
    
    setIsSearching(true);
    setSearchQuery(prediction.description);
    setShowPredictions(false);

    const request = {
      placeId: prediction.place_id,
      fields: ['geometry', 'name'],
    };

    placesService.current.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        
        map.setCenter(location);
        map.setZoom(17);
        onUrlOrSearch(location);
        
        toast({
          title: 'Location found!',
          description: `Navigated to ${place.name || prediction.description}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Location not found',
          description: 'Could not find the selected location.',
        });
      }
      setIsSearching(false);
    });
  };

  // Handle direct search (when user presses Enter)
  const handleSearch = async () => {
    if (!searchQuery || !map) return;
    
    // If there are predictions, use the first one
    if (predictions.length > 0) {
      handlePredictionSelect(predictions[0]);
      return;
    }
    
    // Fallback to the original geocoding method
    setIsSearching(true);
    const result = await geocodeAddress({ address: searchQuery });
    if (result.location) {
        map.setCenter(result.location);
        map.setZoom(17);
        onUrlOrSearch(result.location);
    } else {
        toast({
            variant: 'destructive',
            title: 'Location not found',
            description: `Could not find a location for "${searchQuery}". Please try a different search term.`,
        });
    }
    setIsSearching(false);
  };

  return (
    <div className="group absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-lg space-y-2 opacity-60 focus-within:opacity-100 hover:opacity-100 transition-opacity duration-300">
      <div className="relative">
        <div className="flex items-center gap-1 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border shadow-md">
          <Input
            type="search"
            placeholder="Search for a place name or address..."
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            onFocus={() => predictions.length > 0 && setShowPredictions(true)}
            onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
            className="h-9 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isSearching}
          />
          <Button onClick={handleSearch} size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Search" disabled={isSearching}>
              {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Autocomplete Predictions Dropdown */}
        {showPredictions && predictions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-b-0 text-sm"
                onClick={() => handlePredictionSelect(prediction)}
              >
                <div className="font-medium">{prediction.structured_formatting.main_text}</div>
                <div className="text-muted-foreground text-xs">{prediction.structured_formatting.secondary_text}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border shadow-md">
        <Input
          type="url"
          placeholder={t('map.paste_link_placeholder')}
          value={mapUrl}
          onChange={(e) => setMapUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onUrlSubmit(); }}
          className="h-9 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isResolvingUrl}
        />
        <Button onClick={handlePaste} size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Paste from clipboard">
            <ClipboardPaste className="h-4 w-4" />
        </Button>
        <Button onClick={handleClear} size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Clear input">
            <X className="h-4 w-4" />
        </Button>
        <Button onClick={onUrlSubmit} size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label={t('map.go_to_location_label')} disabled={isResolvingUrl}>
            {isResolvingUrl ? <Loader2 className="h-5 w-5 animate-spin" /> : <Waypoints className="h-5 w-5" />}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2 pr-2">
             <Button onClick={onScreenshot} size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Take Screenshot">
                <Camera className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Switch
                id="names-switch"
                checked={showNames}
                onCheckedChange={setShowNames}
            />
             <Label htmlFor="names-switch" className="flex items-center gap-2 cursor-pointer text-sm font-medium shrink-0">
                {showNames ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </Label>
            <Separator orientation="vertical" className="h-6" />
            <Switch
                id="approved-switch"
                checked={showOnlyApproved}
                onCheckedChange={setShowOnlyApproved}
            />
             <Label htmlFor="approved-switch" className="flex items-center gap-2 cursor-pointer text-sm font-medium shrink-0">
                <Filter className="h-5 w-5" />
            </Label>
            <Separator orientation="vertical" className="h-6" />
            <Switch
                id="satellite-switch"
                checked={mapType === 'hybrid'}
                onCheckedChange={(checked) => setMapType(checked ? 'hybrid' : 'roadmap')}
            />
             <Label htmlFor="satellite-switch" className="flex items-center gap-2 cursor-pointer text-sm font-medium shrink-0">
                <Satellite className="h-5 w-5" />
            </Label>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="text-xs">Zoom:</span>
                <span className={`text-xs font-mono px-2 py-1 rounded ${
                    zoomLevel >= 10 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                }`}>
                    {zoomLevel.toFixed(1)}
                </span>
                {zoomLevel < 10 && (
                    <span className="text-xs text-muted-foreground">(zoom ≥10 for names)</span>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}

function MapContent({ initialReports }: { initialReports: Report[] }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : 12.5657;
  const initialLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : 104.9910;
  const initialZoom = searchParams.get('zoom') ? Number(searchParams.get('zoom')) : 8;

  const [clickedPosition, setClickedPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [clickedInfo, setClickedInfo] = useState({
    en: '', km: '', th: '', province: '', placeId: null as string | null
  });
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "hybrid">("roadmap");
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // New toggle states
  const [showNames, setShowNames] = useState(true);
  const [showOnlyApproved, setShowOnlyApproved] = useState(false);

  const handlePinApprove = useCallback(async (report: Report) => {
     if (!user) {
       toast({ variant: "destructive", title: "Authentication Required", description: "Please log in to approve reports." });
       return;
     }
     
     try {
       // Update the report status to approved using the proper action
       const result = await updateReport(
         report.id, 
         { status: 'approved' }, 
         user.uid, 
         user.displayName, 
         user.email
       );
       
       if (result.success) {
         // Update local state to reflect the change immediately
         setReports(prevReports => 
           prevReports.map(r => 
             r.id === report.id ? { ...r, status: 'approved' as const } : r
           )
         );
         
         // Show the info window for the approved report
         setSelectedReport({ ...report, status: 'approved' });
         
         toast({
           title: "Report Approved",
           description: `Report #${report.reportNumber} has been approved.`,
         });
       } else {
         toast({
           variant: "destructive",
           title: "Approval Failed",
           description: result.error || "Could not approve the report. Please try again.",
         });
       }
     } catch (error) {
       console.error('Error approving report:', error);
       toast({
         variant: "destructive",
         title: "Approval Failed",
         description: "Could not approve the report. Please try again.",
       });
     }
   }, [user, toast]);
  
  const [temporaryPin, setTemporaryPin] = useState<{
    position: google.maps.LatLngLiteral,
    displayName: string,
    province?: string,
  } | null>(null);

  const [poiPin, setPoiPin] = useState<{
      position: google.maps.LatLngLiteral,
      placeId: string,
      name: string,
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useMap();
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (map && !placesService.current) {
        placesService.current = new google.maps.places.PlacesService(map);
    }
  }, [map]);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const reportsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        setReports(reportsData);
        setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleRefreshMarkers = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('refreshMarkers', handleRefreshMarkers);
    return () => window.removeEventListener('refreshMarkers', handleRefreshMarkers);
  }, []);

  const handleCloseDialogs = () => {
    setIsReportDialogOpen(false);
    setClickedPosition(null);
    setEditingReport(null);
    setPoiPin(null);
    setTemporaryPin(null);
    setClickedInfo({ en: '', km: '', th: '', province: '', placeId: null });
  };
  
  const handleOpenReportDialog = useCallback(async () => {
    const positionToReport = poiPin?.position || temporaryPin?.position;
    if (!positionToReport) return;

    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "Please log in to submit a report." });
      return;
    }
    
    setEditingReport(null);
    setSelectedReport(null);
    setClickedPosition(positionToReport);
    setIsReportDialogOpen(true);
  }, [user, toast, temporaryPin, poiPin]);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pos = e.latLng.toJSON();
    setSelectedReport(null);
    setClickedInfo({ en: '', km: '', th: '', province: '', placeId: null });

    const iconMouseEvent = e as google.maps.IconMouseEvent;

    if (iconMouseEvent.placeId) {
        setTemporaryPin(null);
        placesService.current?.getDetails({ placeId: iconMouseEvent.placeId, fields: ['name'] }, async (place, status) => {
             if (status === google.maps.places.PlacesServiceStatus.OK && place?.name) {
                const [enResult, kmResult, thResult] = await Promise.all([
                    reverseGeocode({ lat: pos.lat, lng: pos.lng, language: 'en' }),
                    translateText({ text: place.name, targetLanguage: 'km'}),
                    translateText({ text: place.name, targetLanguage: 'th'}),
                ]);

                setClickedInfo({
                  en: place.name,
                  km: kmResult.translatedText || '',
                  th: thResult.translatedText || '',
                  province: enResult.province || "Unknown",
                  placeId: iconMouseEvent.placeId!,
                });
                setPoiPin({ position: pos, placeId: iconMouseEvent.placeId!, name: place.name });
             }
        });
    } else {
        setPoiPin(null);
        const [enResult, kmResult, thResult] = await Promise.all([
          reverseGeocode({ lat: pos.lat, lng: pos.lng, language: 'en' }),
          reverseGeocode({ lat: pos.lat, lng: pos.lng, language: 'km' }),
          reverseGeocode({ lat: pos.lat, lng: pos.lng, language: 'th' }),
        ]);

        const info = {
          en: enResult.displayName || '',
          km: kmResult.displayName || '',
          th: thResult.displayName || '',
          province: enResult.province || kmResult.province || thResult.province || "Unknown",
          placeId: enResult.placeId || null,
        };
        setClickedInfo(info);
        setTemporaryPin({
            position: pos,
            displayName: info.en,
            province: info.province,
        });
    }
  }, [i18n.language]);
  

  const handleMarkerClick = useCallback((report: Report) => {
    setTemporaryPin(null); 
    setPoiPin(null);
    setSelectedReport(current => current?.id === report.id ? null : report);
  }, []);
  
  const handleEditClick = useCallback(async (report: Report) => {
    setEditingReport(report);
    setSelectedReport(null);
    setClickedPosition(null);
    setTemporaryPin(null);
    setPoiPin(null);
    setClickedInfo({ 
      en: report.englishLanguage || '', 
      km: report.nativeKhmerLanguage || '', 
      th: report.thaiLanguage || '', 
      province: report.province,
      placeId: report.placeId || null,
    });
    setIsReportDialogOpen(true);
  }, []);

  const handleInfoWindowClose = useCallback(() => {
      setSelectedReport(null);
  }, []);
  
  const handleUrlOrSearch = (coords: google.maps.LatLngLiteral) => {
      handleMapClick({ latLng: new google.maps.LatLng(coords) } as google.maps.MapMouseEvent);
  };
  
  const handleScreenshot = useCallback(() => {
    if (!mapContainerRef.current) return;

    toast({ title: 'Capturing map...', description: 'Please wait a moment.' });
    
    // Temporarily hide controls for a cleaner screenshot
    const controls = mapContainerRef.current.querySelector('.group') as HTMLElement;
    if (controls) controls.style.visibility = 'hidden';


    html2canvas(mapContainerRef.current, {
        useCORS: true, // Important for map tiles
        allowTaint: true,
        scale: 2, // For higher quality
        onclone: (document) => {
            // Remove the screenshot button from the cloned document
            const clonedControls = document.querySelector('.group');
            if (clonedControls) clonedControls.remove();
        }
    }).then(canvas => {
        if (controls) controls.style.visibility = 'visible';

        const link = document.createElement('a');
        link.download = 'map-screenshot.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast({ title: 'Screenshot downloaded!', variant: 'default' });
    }).catch(err => {
        console.error('Screenshot failed:', err);
        toast({ title: 'Screenshot Failed', description: 'Could not capture the map.', variant: 'destructive'});
        if (controls) controls.style.visibility = 'visible';
    });
  }, [toast]);


  return (
    <>
      <div className="w-full h-full flex-1 relative" ref={mapContainerRef}>
        {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )}
        <Map
            defaultCenter={{ lat: initialLat, lng: initialLng }}
            defaultZoom={initialZoom}
            mapId="mapcorrect_map"
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapTypeId={mapType}
            className="w-full h-full"
            clickableIcons={true}
            >
            <Markers 
              reports={reports} 
              onMarkerClick={handleMarkerClick}
              selectedReport={selectedReport}
              onCloseClick={handleInfoWindowClose}
              onEditClick={handleEditClick}
              onPinApprove={handlePinApprove}
              showNames={showNames}
              showOnlyApproved={showOnlyApproved}
              zoomLevel={zoomLevel}
            />
            {temporaryPin && (
              <InfoWindow
                position={temporaryPin.position}
                onCloseClick={() => setTemporaryPin(null)}
                headerDisabled
              >
                 <div className="bg-card text-card-foreground p-4 rounded-lg shadow-lg w-64 space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold pr-2">{temporaryPin.displayName}</p>
                    <button onClick={() => setTemporaryPin(null)} className="absolute top-1 right-1 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4"/>
                    </button>
                  </div>
                   <Button onClick={handleOpenReportDialog} size="sm" className="w-full bg-primary/80 hover:bg-primary">
                        <Flag className="mr-2 h-4 w-4" />
                        Create New Report Here
                    </Button>
                </div>
              </InfoWindow>
            )}
             {poiPin && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <Button onClick={handleOpenReportDialog} size="lg" className="shadow-lg animate-pulse-once">
                        <Flag className="mr-2 h-5 w-5" />
                        Report an issue at '{poiPin.name}'
                    </Button>
                </div>
            )}
            <MapClickHandler onMapClick={handleMapClick} />
        </Map>
        
        <MapControls 
            mapType={mapType}
            setMapType={setMapType}
            onUrlOrSearch={handleUrlOrSearch}
            onScreenshot={handleScreenshot}
            showNames={showNames}
            setShowNames={setShowNames}
            showOnlyApproved={showOnlyApproved}
            setShowOnlyApproved={setShowOnlyApproved}
            zoomLevel={zoomLevel}
        />
      </div>
      {(clickedPosition || editingReport) && (
        <ReportDialog
          isOpen={isReportDialogOpen}
          onClose={handleCloseDialogs}
          position={clickedPosition || editingReport!.position}
          report={editingReport || undefined}
          province={clickedInfo.province}
          placeId={clickedInfo.placeId}
          englishName={clickedInfo.en}
          khmerName={clickedInfo.km}
          thaiName={clickedInfo.th}
        />
      )}
    </>
  );
}


export function MapView({ initialReports }: { initialReports: Report[] }) {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (apiKey) {
      setIsLoading(false);
    }
  }, [apiKey]);

  if (isLoading) {
    return (<Skeleton className="w-full h-full" />);
  }

  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Map Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Google Maps API key is missing. Please add it to your environment variables.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full relative flex flex-col">
      <APIProvider apiKey={apiKey} libraries={['places']} language={i18n.language}>
        <MapContent initialReports={initialReports} />
      </APIProvider>
    </div>
  );
}
