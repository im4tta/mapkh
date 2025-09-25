"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { LatLngExpression, Icon, DivIcon } from 'leaflet';
import * as L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Expand, Minimize, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import type { Report } from '@/lib/types';
import { getAllGeoJSONBoundaries, saveGeoJSON, getActiveGeoJSON } from '@/app/actions';
import { useAuth } from '@/context/auth-provider';
import { useTheme } from 'next-themes';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OSMAnalyticsMapProps {
  reportsByProvince: Record<string, Report[]>;
  onProvinceClick: (title: string, data: Report[]) => void;
  provinceCoordinates: Record<string, { lat: number, lng: number }>;
  getHeatmapColor: (count: number, maxCount: number) => string;
}

interface ProvinceGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      name: string;
      [key: string]: any;
    };
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: any;
    };
  }>;
}

// Province coordinates will be passed as props

// Heatmap color function will be passed as props

const HeatmapLegend: React.FC<{ maxReports: number; getHeatmapColor: (count: number, maxCount: number) => string }> = ({ maxReports, getHeatmapColor }) => {
  // Define specific number ranges
  const ranges = [
    { min: 160, max: 200, label: '160-200' },
    { min: 120, max: 160, label: '120-160' },
    { min: 80, max: 120, label: '80-120' },
    { min: 40, max: 80, label: '40-80' },
    { min: 20, max: 40, label: '20-40' },
    { min: 0, max: 20, label: '0-20' }
  ];
  
  const legendItems = ranges.map(range => {
    // Use the middle value of the range to get representative color
    const midValue = Math.floor((range.min + range.max) / 2);
    const color = getHeatmapColor(midValue, 200); // Use 200 as max for consistent coloring
    return { label: range.label, color };
  });

  return (
    <Card className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur-sm w-36">
      <CardHeader className="pb-1 px-2 pt-2">
        <CardTitle className="text-xs font-medium">Report Density</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2 pb-2">
        <div className="space-y-0.5">
          {legendItems.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div 
                className="w-3 h-2 border border-gray-300 rounded-sm" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="min-w-[2rem] text-right text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions for heatmap functionality
const getAreaNameFromFeature = (feature: any, adminLevel: string) => {
  if (adminLevel === 'province') {
    return feature.properties?.NAME_1 || feature.properties?.name || 'Unknown';
  }
  return 'Unknown';
};

const findAreaData = (areaName: string, data: Record<string, Report[]>, adminLevel: string) => {
  if (adminLevel === 'province') {
    return data[areaName]?.length || 0;
  }
  return 0;
};

const getProvinceDisplayName = (provinceName: string) => {
  // Add any province name mapping if needed
  return provinceName;
};

const getColor = (count: number) => {
  if (count > 150) return '#8b0000';
  if (count > 100) return '#dc143c';
  if (count > 75) return '#ff4500';
  if (count > 50) return '#ff6347';
  if (count > 30) return '#ffa500';
  if (count > 15) return '#ffd700';
  if (count > 5) return '#9acd32';
  if (count > 0) return '#32cd32';
  return '#f8f9fa';
};

export const OSMAnalyticsMap: React.FC<OSMAnalyticsMapProps> = ({ 
  reportsByProvince, 
  onProvinceClick,
  provinceCoordinates: externalProvinceCoordinates,
  getHeatmapColor: externalGetHeatmapColor
}) => {
  const [geoJsonData, setGeoJsonData] = useState<ProvinceGeoJSON | null>(null);
  const [showBorders, setShowBorders] = useState(true);
  const [isLoadingGeoJSON, setIsLoadingGeoJSON] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const geoJsonLayer = useRef<L.GeoJSON | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme } = useTheme();

  const maxReports = Math.max(1, ...Object.values(reportsByProvince).map(r => r.length));

  // Style function for heatmap functionality
  const style = (feature: any) => {
    const areaName = getAreaNameFromFeature(feature, 'province');
    const count = findAreaData(areaName, reportsByProvince, 'province') || 0;
    
    const baseStyle = {
      fillColor: externalGetHeatmapColor(count, maxReports),
      opacity: 1,
    };
    
    return {
      ...baseStyle,
      weight: 2,
      color: theme === 'dark' ? '#8B5CF6' : '#7C3AED',
      dashArray: '',
      fillOpacity: 0.75,
      className: 'province-boundary'
    };
  };
  
  // Convert external coordinates format to internal format
  const coordinates: Record<string, LatLngExpression> = {};
  Object.entries(externalProvinceCoordinates).forEach(([province, coord]) => {
    coordinates[province] = [coord.lat, coord.lng];
  });

  const handleFullscreen = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(err => {
        toast({
          title: 'Fullscreen Error',
          description: `Error attempting to enable full-screen mode: ${err.message}`,
          variant: 'destructive'
        });
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [toast]);

  const handleScreenshot = useCallback(() => {
    if (!mapContainerRef.current) return;

    toast({ title: 'Capturing map...', description: 'Please wait a moment.' });
    
    html2canvas(mapContainerRef.current, {
      useCORS: true, 
      allowTaint: true,
      scale: 2,
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'osm-analytics-map-screenshot.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Screenshot downloaded!', variant: 'default' });
    }).catch(err => {
      console.error('Screenshot failed:', err);
      toast({ 
        title: 'Screenshot Failed', 
        description: 'Could not capture the map.', 
        variant: 'destructive'
      });
    });
  }, [toast]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check authentication first
    if (!user?.uid) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to upload GeoJSON files.',
        variant: 'destructive'
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.geojson') && !file.name.toLowerCase().endsWith('.json')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a GeoJSON (.geojson or .json) file.',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const geoJson = JSON.parse(content) as ProvinceGeoJSON;
        
        // Basic validation
        if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
          throw new Error('Invalid GeoJSON format');
        }

        // Save to database
        toast({
          title: 'Saving GeoJSON...',
          description: 'Uploading province boundaries to database.',
        });

        const result = await saveGeoJSON({
          name: file.name.replace(/\.(geojson|json)$/i, ''),
          description: `Uploaded province boundaries from ${file.name}`,
          geoJsonData: geoJson
        }, user.uid, user.displayName);

        if (result.success) {
          // Use the original geoJson data for display
          setGeoJsonData(geoJson);
          setShowBorders(true);
          
          // Show success message
          const featureCount = geoJson.features.length;
          
          let description = `Successfully saved ${featureCount} province borders to database.`;
          
          toast({
            title: 'GeoJSON Saved',
            description,
            variant: 'default'
          });
          
          // Show warnings if any
          if (result.warnings && result.warnings.length > 0) {
            setTimeout(() => {
              toast({
                title: 'Data Processing Warnings',
                description: `${result.warnings!.length} issue(s) were found and resolved during processing.`,
                variant: 'default'
              });
            }, 2000);
          }
        } else {
          throw new Error(result.error || 'Failed to save to database');
        }
      } catch (error) {
        console.error('Error processing GeoJSON:', error);
        toast({
          title: 'Upload Error',
          description: error instanceof Error ? error.message : 'Failed to process GeoJSON file.',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  // Custom marker function removed - using colored provinces instead

  const geoJsonStyle = (feature: any) => {
    const provinceName = feature.properties?.ADM1_EN || feature.properties?.name;
    const reportCount = provinceName ? (reportsByProvince[provinceName]?.length || 0) : 0;
    
    // Use the external color function for consistent coloring
    const fillColor = externalGetHeatmapColor(reportCount, maxReports);
    
    // Debug logging (can be removed in production)
    // Debug: Province: ${provinceName}, Reports: ${reportCount}, MaxReports: ${maxReports}, Color: ${fillColor}
    
    // Dynamic styling based on report density
    const weight = reportCount > 50 ? 3 : reportCount > 10 ? 2 : 1;
    const fillOpacity = 0.7; // Fixed opacity for all provinces for better visibility
    
    return {
      fillColor,
      weight: 2,
      opacity: 1,
      color: '#1e40af', // Darker blue border for all provinces
      dashArray: '',
      fillOpacity
    };
  };

  // Map initialization
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [12.5657, 104.9910],
        zoom: 7,
        scrollWheelZoom: true,
      });
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance.current);
    }
  }, []);

  // GeoJSON layer rendering - separate effect to handle data updates
  useEffect(() => {
    if (mapInstance.current && geoJsonData) {
      // Remove existing GeoJSON layer if it exists
      if (geoJsonLayer.current) {
        mapInstance.current.removeLayer(geoJsonLayer.current);
      }
      
      // Add new GeoJSON layer with province boundaries
      geoJsonLayer.current = L.geoJSON(geoJsonData, {
        style: geoJsonStyle,
        onEachFeature: (feature, layer) => {
          const areaName = getAreaNameFromFeature(feature, 'province');
          const count = findAreaData(areaName, reportsByProvince, 'province') || 0;
          
          if (areaName !== 'Unknown') {
            let displayName = areaName;
            displayName = getProvinceDisplayName(areaName);
            
            layer.bindTooltip(
              `<b>${displayName}</b><br/>Issues: ${count}`,
              {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip'
              }
            );
          }
          
          layer.on({
            click: (e) => {
              const feature = e.target?.feature;
              if (feature && feature.properties) {
                const provinceName = feature.properties.ADM1_EN || feature.properties.name;
                if (provinceName && reportsByProvince[provinceName]) {
                  onProvinceClick(provinceName, reportsByProvince[provinceName]);
                }
              }
            }
          });
        }
      }).addTo(mapInstance.current);
    }
  }, [geoJsonData, reportsByProvince, theme]);

  // Load GeoJSON from public directory first, fallback to database
  const loadGeoJSON = useCallback(async () => {
    try {
      setIsLoadingGeoJSON(true);
      
      // First try to load from public directory
      try {
        const response = await fetch('/uploads/geojson-province/CambodiaProvinceBoundaries.geojson');
        if (response.ok) {
          const geoJsonData = await response.json() as ProvinceGeoJSON;
          setGeoJsonData(geoJsonData);
          setShowBorders(true);
          toast({
            title: 'Province Boundaries Loaded',
            description: `Loaded ${geoJsonData.features.length} province borders from local file.`,
          });
          return;
        }
      } catch (publicError) {
        console.log('Public GeoJSON not found, trying database...', publicError);
      }
      
      // Fallback to database if public file fails
      const result = await getActiveGeoJSON();
      
      if (result.success && result.data) {
        setGeoJsonData(result.data);
        setShowBorders(true);
        toast({
          title: 'Province Boundaries Loaded',
          description: `Loaded ${result.data.features.length} province borders from database.`,
        });
      } else {
        toast({
          title: 'No Boundaries Available',
          description: 'No province boundaries found. Please upload a GeoJSON file.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
      toast({
        title: 'Load Error',
        description: 'Failed to load province boundaries.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingGeoJSON(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGeoJSON();
  }, [loadGeoJSON]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div 
        ref={mapContainerRef}
        className={cn(
          "relative w-full h-96 rounded-md overflow-hidden border",
          isFullscreen && "h-full w-full fixed inset-0 z-50 bg-background"
        )}
        style={{ zIndex: isFullscreen ? 50 : 0 }}
    >
      {/* Heatmap implementation */}
      <div 
        ref={mapRef}
        className="w-full h-full"
        style={{ zIndex: 1 }}
      />
      
      {/* Debug info - can be removed in production */}
      {/* {geoJsonData && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded z-10">
          <div>GeoJSON loaded: {geoJsonData.features.length} provinces</div>
          <div>Show borders: {showBorders ? 'Yes' : 'No'}</div>
        </div>
      )} */}

      {/* Controls */}
      <div className="absolute top-2 right-2 flex gap-2" style={{ zIndex: isFullscreen ? 60 : 20 }}>
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          variant="outline" 
          size="icon" 
          className="bg-background/80 hover:bg-background"
          title="Upload GeoJSON"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button 
          onClick={loadGeoJSON} 
          variant="outline" 
          size="icon" 
          className="bg-background/80 hover:bg-background"
          title="Reload Province Boundaries"
          disabled={isLoadingGeoJSON}
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingGeoJSON ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          onClick={handleScreenshot} 
          variant="outline" 
          size="icon" 
          className="bg-background/80 hover:bg-background"
          title="Take Screenshot"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button 
          onClick={handleFullscreen} 
          variant="outline" 
          size="icon" 
          className="bg-background/80 hover:bg-background"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Heatmap Legend */}
      <HeatmapLegend maxReports={maxReports} getHeatmapColor={externalGetHeatmapColor} />

      {/* GeoJSON Status */}
      <Card className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm">
        <CardContent className="p-2">
          {isLoadingGeoJSON ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
              <span>Loading province boundaries...</span>
            </div>
          ) : geoJsonData ? (
            <div className="flex items-center gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBorders(!showBorders)}
                className="h-auto p-1 text-xs"
              >
                <div className={`w-3 h-3 border-2 border-blue-500 ${showBorders ? 'border-dashed' : 'border-solid bg-blue-500/20'} rounded mr-1`}></div>
                {showBorders ? 'Hide' : 'Show'} borders ({geoJsonData.features.length} features)
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border-2 border-gray-400 rounded"></div>
              <span>No province boundaries loaded</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};