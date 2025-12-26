# 403 Error Fixes for Verification Page

## Overview

Fixed multiple sources of 403 errors that were occurring on the verification page, including Google Maps tile access issues and API verification call problems.

## Issues Identified and Fixed

### 1. Google Maps Tiles 403 Errors

**Problem**: Google Maps tile servers were returning 403 Forbidden errors when accessing tiles without proper authentication or due to rate limiting.

**Solutions Implemented**:

#### Enhanced Tile URL Generation
- **Multiple Server Distribution**: Uses `mt0.google.com` through `mt3.google.com` to distribute load
- **Improved URL Format**: Added language and region parameters (`hl=en&gl=us`) for better compatibility
- **Server Selection**: Uses `(x + y) % 4` to distribute requests across different tile servers

#### Automatic Fallback System
- **Primary Source**: Google Maps tiles (`https://mt{0-3}.google.com/vt/lyrs=`)
- **Fallback Sources**:
  - **Satellite**: Esri World Imagery (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/`)
  - **Terrain**: OpenTopoMap (`https://tile.opentopomap.org/`)
  - **Roadmap/Hybrid**: OpenStreetMap (`https://tile.openstreetmap.org/`)

#### Error Handling Improvements
- **Graceful Degradation**: Automatically switches to fallback tiles when Google tiles fail
- **User Feedback**: Shows "Fallback Maps" label when using alternative tile sources
- **Logging**: Comprehensive error logging for debugging tile access issues

### 2. API Verification 403 Errors

**Problem**: Google Maps API calls for place verification were returning 403 errors due to authentication or billing issues.

**Solutions Implemented**:

#### Enhanced Error Handling in `verifyPlaceId`
```typescript
if (statusCode === 403) {
    return { success: false, found: false, error: 'API access denied. Please check your API key permissions and billing status.' };
}
if (statusCode === 429) {
    return { success: false, found: false, error: 'API rate limit exceeded. Please try again later.' };
}
```

#### Enhanced Error Handling in `verifyPlaceByName`
- **403 Errors**: Clear messaging about API key permissions and billing
- **429 Errors**: Rate limit handling with retry suggestions
- **Detailed Logging**: Includes status codes and context for debugging

#### User-Friendly Error Messages
- **403**: "API access denied. Please check your API key permissions and billing status."
- **429**: "API rate limit exceeded. Please try again later."
- **Generic**: Preserves original error messages for other status codes

### 3. User Interface Improvements

#### Status Information Panel
Added informational panel explaining:
- Map tile sources and fallback behavior
- Verification feature requirements
- Common error causes and solutions
- API key configuration guidance

#### Visual Feedback
- **Fallback Indicator**: Shows "Fallback Maps" when using alternative tile sources
- **Loading States**: Clear loading indicators during tile loading
- **Error States**: Graceful error handling with coordinate display fallback

## Technical Implementation Details

### Tile Loading Logic
```typescript
const tryLoadTile = (useGoogleMaps: boolean = true) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onerror = (e) => {
    if (useGoogleMaps) {
      setUsingFallback(true);
      tryLoadTile(false); // Try fallback source
    } else {
      // Draw placeholder if both sources fail
      drawPlaceholder();
    }
  };
  
  img.src = useGoogleMaps ? 
    getGoogleMapsTileUrl(x, y, z, mapType) : 
    getFallbackTileUrl(x, y, z, mapType);
};
```

### API Error Classification
```typescript
const statusCode = e.response?.status;

if (statusCode === 403) {
    // API key or billing issue
} else if (statusCode === 429) {
    // Rate limiting
} else if (statusCode === 404) {
    // Not found (valid response)
}
```

## Benefits

### 1. Improved Reliability
- **Automatic Fallback**: Maps always display even when Google tiles are unavailable
- **Multiple Sources**: Reduces dependency on single tile provider
- **Error Recovery**: Graceful handling of temporary service issues

### 2. Better User Experience
- **Clear Feedback**: Users understand when fallback sources are being used
- **Informative Errors**: Specific guidance for resolving API issues
- **Consistent Display**: Maps work regardless of API key availability

### 3. Enhanced Debugging
- **Detailed Logging**: Comprehensive error information for troubleshooting
- **Status Tracking**: Visual indicators of tile source and loading state
- **Error Classification**: Specific handling for different error types

## Common 403 Error Causes and Solutions

### Google Maps Tiles
1. **Rate Limiting**: Automatic fallback to alternative tile sources
2. **Geographic Restrictions**: Uses multiple server endpoints
3. **User-Agent Issues**: Proper CORS and cross-origin handling

### API Verification
1. **Invalid API Key**: Clear error message with configuration guidance
2. **Billing Issues**: Specific messaging about billing requirements
3. **Permission Problems**: Guidance on API key permissions
4. **Rate Limits**: Retry suggestions and timing guidance

## Monitoring and Maintenance

### Error Tracking
- Console logging for tile load failures
- API error status code tracking
- Fallback usage monitoring

### Performance Optimization
- Load balancing across multiple tile servers
- Efficient error handling without blocking UI
- Minimal impact on page load times

### Future Enhancements
1. **Tile Caching**: Implement client-side tile caching
2. **Retry Logic**: Automatic retry with exponential backoff
3. **Health Monitoring**: Track tile server availability
4. **Custom Styling**: Support for custom map styles

This comprehensive fix ensures the verification page works reliably even when encountering 403 errors from various sources, providing users with a consistent and informative experience.