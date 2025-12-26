"use client";

import { useState, useEffect, useRef } from 'react';
import { MapPin, Satellite, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface FallbackMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  className?: string;
}

export function FallbackMap({ 
  lat, 
  lng, 
  zoom = 15, 
  width = 600, 
  height = 400, 
  mapType = 'roadmap',
  className = '' 
}: FallbackMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert lat/lng to tile coordinates
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const rad2deg = (rad: number) => rad * (180 / Math.PI);

  const getTileCoordinates = (lat: number, lng: number, zoom: number) => {
    const latRad = deg2rad(lat);
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
    return { x, y, z: zoom };
  };

  const getPixelCoordinates = (lat: number, lng: number, zoom: number, tileX: number, tileY: number) => {
    const latRad = deg2rad(lat);
    const n = Math.pow(2, zoom);
    const worldX = ((lng + 180) / 360) * n * 256;
    const worldY = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n * 256;
    
    const pixelX = worldX - (tileX * 256);
    const pixelY = worldY - (tileY * 256);
    
    return { x: pixelX, y: pixelY };
  };

  const getTileUrl = (x: number, y: number, z: number, mapType: string) => {
    // Use different tile servers based on map type
    switch (mapType) {
      case 'satellite':
      case 'hybrid':
        // Use Esri World Imagery for satellite view
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      case 'terrain':
        // Use OpenTopoMap for terrain
        return `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
      default:
        // Use OpenStreetMap for roadmap
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
  };

  useEffect(() => {
    const drawMap = async () => {
      if (!canvasRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Clear canvas
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);

      try {
        // Calculate how many tiles we need
        const tilesX = Math.ceil(width / 256) + 1;
        const tilesY = Math.ceil(height / 256) + 1;
        
        // Get center tile coordinates
        const centerTile = getTileCoordinates(lat, lng, zoom);
        const centerPixel = getPixelCoordinates(lat, lng, zoom, centerTile.x, centerTile.y);
        
        // Calculate starting tile position
        const startTileX = centerTile.x - Math.floor(tilesX / 2);
        const startTileY = centerTile.y - Math.floor(tilesY / 2);
        
        // Calculate offset to center the map
        const offsetX = (width / 2) - centerPixel.x + (Math.floor(tilesX / 2) - centerTile.x) * 256;
        const offsetY = (height / 2) - centerPixel.y + (Math.floor(tilesY / 2) - centerTile.y) * 256;

        const tilePromises: Promise<void>[] = [];

        // Load and draw tiles
        for (let x = 0; x < tilesX; x++) {
          for (let y = 0; y < tilesY; y++) {
            const tileX = startTileX + x;
            const tileY = startTileY + y;
            
            if (tileX < 0 || tileY < 0 || tileX >= Math.pow(2, zoom) || tileY >= Math.pow(2, zoom)) {
              continue;
            }

            const tilePromise = new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              img.onload = () => {
                ctx.drawImage(img, offsetX + x * 256, offsetY + y * 256, 256, 256);
                resolve();
              };
              
              img.onerror = () => {
                // Draw a placeholder for failed tiles
                ctx.fillStyle = '#e0e0e0';
                ctx.fillRect(offsetX + x * 256, offsetY + y * 256, 256, 256);
                ctx.fillStyle = '#999';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Tile Error', offsetX + x * 256 + 128, offsetY + y * 256 + 128);
                resolve();
              };
              
              img.src = getTileUrl(tileX, tileY, zoom, mapType);
            });

            tilePromises.push(tilePromise);
          }
        }

        // Wait for all tiles to load
        await Promise.all(tilePromises);

        // Draw marker at center
        const markerX = width / 2;
        const markerY = height / 2;
        
        // Draw marker shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(markerX + 2, markerY + 18, 8, 4, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw marker
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(markerX, markerY - 10, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw marker point
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(markerX, markerY - 10, 3, 0, 2 * Math.PI);
        ctx.fill();

        setIsLoading(false);
      } catch (err) {
        console.error('Error drawing map:', err);
        setError('Failed to load map tiles');
        setIsLoading(false);
      }
    };

    drawMap();
  }, [lat, lng, zoom, width, height, mapType]);

  // Fallback coordinate display
  const CoordinateDisplay = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="text-center space-y-4 p-6">
        <div className="relative">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full animate-pulse"></div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
            Location Coordinates
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border shadow-sm">
            <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Latitude:</span> {lat.toFixed(6)}
            </p>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Longitude:</span> {lng.toFixed(6)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Zoom Level: {zoom} • Map Type: {mapType}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Google Maps
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`, '_blank')}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            OpenStreetMap
          </Button>
        </div>
      </div>
    </div>
  );

  if (error) {
    return <CoordinateDisplay />;
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg z-10">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading {mapType} tiles...</p>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover rounded-lg border"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      
      {!isLoading && !error && (
        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-800 rounded-md px-2 py-1 shadow-md border">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {mapType === 'satellite' || mapType === 'hybrid' ? 'Satellite' : 
             mapType === 'terrain' ? 'Terrain' : 'Street'} View
          </p>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 rounded-md px-2 py-1 shadow-md border">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
            className="h-8 w-8 p-0"
            title="Open in Google Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}