# Place Name Verification Feature

## Overview

The Place Name Verification feature provides an alternative to Place ID verification that reduces Google Maps API usage costs while still allowing location verification.

## How It Works

### Place ID Verification (Original Method)
- Uses Google Maps Place Details API
- Requires a specific Place ID
- Higher API cost per request
- More precise but limited to places with known Place IDs

### Place Name Verification (New Method)
- Uses Google Maps Places Text Search API
- Searches by place name near given coordinates
- Lower API cost per request
- More flexible - works with any place name

## Usage

### In the Verification Page

1. **Choose Verification Method**: Users can select between "Place ID" or "Place Name" verification
2. **Place ID Method**: Uses the existing Place ID from the report (if available)
3. **Place Name Method**: Allows users to enter any place name to search for

### API Functions

#### `verifyPlaceByName(placeName, lat, lng, customApiKey?)`

**Parameters:**
- `placeName`: The name of the place to search for
- `lat`: Latitude coordinate
- `lng`: Longitude coordinate  
- `customApiKey`: Optional custom Google Maps API key

**Returns:**
```typescript
{
  success: boolean;
  found: boolean;
  error?: string;
  details?: {
    name?: string;
    address?: string;
    placeId?: string;
    location?: { lat: number; lng: number };
    types?: string[];
    message?: string;
    suggestions?: string[];
  }
}
```

## Benefits

1. **Cost Reduction**: Text Search API is typically less expensive than Place Details API
2. **Flexibility**: Can verify places without needing a specific Place ID
3. **Better Coverage**: Can find places that might not have been indexed with Place IDs
4. **User-Friendly**: Users can enter familiar place names instead of technical Place IDs

## Implementation Details

### Search Logic
- Searches within 1km radius of the provided coordinates
- Performs fuzzy matching on place names
- Returns detailed information about found places
- Provides suggestions when exact matches aren't found

### UI Features
- Radio button selection between verification methods
- Real-time input validation
- Detailed results display showing:
  - Found place name and address
  - Google Place ID (if available)
  - Place types/categories
  - Nearby suggestions if no exact match

### Error Handling
- Graceful handling of API errors
- Clear user feedback for different scenarios
- Fallback suggestions when places aren't found

## API Key Requirements

Both verification methods require a Google Maps API key with the following APIs enabled:
- **Place ID Verification**: Places API (Place Details)
- **Place Name Verification**: Places API (Text Search)

The same API key can be used for both methods.