"use client";

import { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

interface GoogleMapsTilesProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  className?: string;
  apiKey?: string;
}

export function GoogleMapsTiles({ 
  lat, 
  lng, 
  zoom = 15, 
  width = 600, 
  height = 400, 
  mapType = 'roadmap',
  className = '',
  apiKey
}: GoogleMapsTilesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Convert lat/lng to tile coordinates using Web Mercator projection
  const deg2rad = (deg: number) => deg * (Math.PI / 180);

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

  const getGoogleMapsTileUrl = (x: number, y: number, z: number, mapType: string) => {
    // Use the most reliable Google Maps tile URL format
    const serverNum = (x + y) % 4; // Distribute across servers 0-3
    
    let lyrs = 'm'; // Default to roadmap
    switch (mapType) {
      case 'satellite':
        lyrs = 's';
        break;
      case 'hybrid':
        lyrs = 'y';
        break;
      case 'terrain':
        lyrs = 't';
        break;
      default:
        lyrs = 'm';
    }
    
    // Use the standard Google Maps tile URL that works reliably
    return `https://mt${serverNum}.google.com/vt/lyrs=${lyrs}&x=${x}&y=${y}&z=${z}&s=Ga`;
  };

  // Fallback tile sources
  const getFallbackTileUrl = (x: number, y: number, z: number, mapType: string) => {
    switch (mapType) {
      case 'satellite':
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      case 'terrain':
        return `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
      default:
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
  };

  useEffect(() => {
    const drawMap = async () => {
      if (!canvasRef.current) return;
      
      setIsLoading(true);
      setError(null);
      setUsingFallback(false);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Clear canvas
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, width, height);

      try {
        // Calculate tiles needed
        const tilesX = Math.ceil(width / 256) + 1;
        const tilesY = Math.ceil(height / 256) + 1;
        
        // Get center tile
        const centerTile = getTileCoordinates(lat, lng, zoom);
        const centerPixel = getPixelCoordinates(lat, lng, zoom, centerTile.x, centerTile.y);
        
        // Calculate starting position
        const startTileX = centerTile.x - Math.floor(tilesX / 2);
        const startTileY = centerTile.y - Math.floor(tilesY / 2);
        
        // Calculate offset
        const offsetX = (width / 2) - centerPixel.x + (Math.floor(tilesX / 2) - centerTile.x) * 256;
        const offsetY = (height / 2) - centerPixel.y + (Math.floor(tilesY / 2) - centerTile.y) * 256;

        const tilePromises: Promise<void>[] = [];
        let failedTiles = 0;

        // Load tiles
        for (let x = 0; x < tilesX; x++) {
          for (let y = 0; y < tilesY; y++) {
            const tileX = startTileX + x;
            const tileY = startTileY + y;
            
            if (tileX < 0 || tileY < 0 || tileX >= Math.pow(2, zoom) || tileY >= Math.pow(2, zoom)) {
              continue;
            }

            const tilePromise = new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              img.onload = () => {
                try {
                  ctx.drawImage(img, offsetX + x * 256, offsetY + y * 256, 256, 256);
                } catch (e) {
                  console.warn('Error drawing tile:', e);
                }
                resolve();
              };
              
              img.onerror = () => {
                failedTiles++;
                // Try fallback
                const fallbackImg = new Image();
                fallbackImg.crossOrigin = 'anonymous';
                
                fallbackImg.onload = () => {
                  try {
                    ctx.drawImage(fallbackImg, offsetX + x * 256, offsetY + y * 256, 256, 256);
                    setUsingFallback(true);
                  } catch (e) {
                    console.warn('Error drawing fallback tile:', e);
                  }
                  resolve();
                };
                
                fallbackImg.onerror = () => {
                  // Draw placeholder
                  ctx.fillStyle = '#e9ecef';
                  ctx.fillRect(offsetX + x * 256, offsetY + y * 256, 256, 256);
                  ctx.strokeStyle = '#dee2e6';
                  ctx.strokeRect(offsetX + x * 256, offsetY + y * 256, 256, 256);
                  resolve();
                };
                
                fallbackImg.src = getFallbackTileUrl(tileX, tileY, zoom, mapType);
              };
              
              img.src = getGoogleMapsTileUrl(tileX, tileY, zoom, mapType);
            });

            tilePromises.push(tilePromise);
          }
        }

        // Wait for all tiles
        await Promise.all(tilePromises);

        // Draw marker
        const markerX = width / 2;
        const markerY = height / 2;
        
        // Marker shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(markerX + 2, markerY + 18, 8, 4, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Marker
        ctx.fillStyle = '#EA4335';
        ctx.beginPath();
        ctx.arc(markerX, markerY - 10, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Marker inner
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(markerX, markerY - 10, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Marker center
        ctx.fillStyle = '#EA4335';
        ctx.beginPath();
        ctx.arc(markerX, markerY - 10, 2, 0, 2 * Math.PI);
        ctx.fill();

        setIsLoading(false);
      } catch (err) {
        console.error('Error drawing map:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    drawMap();
  }, [lat, lng, zoom, width, height, mapType, apiKey]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center space-y-4 p-6">
          <MapPin className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">Map Unavailable</h3>
            <p className="text-sm text-muted-foreground">Location: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Google Maps
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover rounded-lg border"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      
      {!isLoading && !error && (
        <div className="absolute bottom-2 left-2 bg-white rounded-md px-2 py-1 shadow-md border">
          <p className="text-xs text-gray-600">
            {usingFallback ? 'Fallback' : 'Google'} Maps • {mapType}
          </p>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="absolute bottom-2 right-2 bg-white rounded-md px-2 py-1 shadow-md border">
          <p className="text-xs text-gray-600 font-mono">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
            className="h-8 w-8 p-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}