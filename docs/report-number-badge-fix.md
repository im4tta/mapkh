# Report Number Badge Fix for Verification Page Export

## Issue
The report number was not displaying correctly in the badge when exporting images from the verification page. The badge would show "Loading..." instead of the actual report number.

## Root Cause
The issue was caused by:
1. Using nullish coalescing operator (`??`) with 'Loading...' as fallback, which could persist during image capture
2. Potential timing issues where `report.reportNumber` might be undefined during the image capture process
3. No fallback mechanism using the URL parameter which contains the report number

## Solution Implemented

### 1. Computed Report Number
Created a robust computed value that uses multiple fallbacks:
```typescript
const displayReportNumber = report?.reportNumber || (id ? parseInt(id, 10) : null) || 'N/A';
```

### 2. Updated Display Logic
Changed from:
```typescript
Report #{report?.reportNumber ?? 'Loading...'}
```
To:
```typescript
Report #{displayReportNumber}
```

### 3. Enhanced Image Capture Validation
Added validation to ensure report data is loaded before capturing:
```typescript
if (!report || (!report.reportNumber && !id)) {
    toast({ variant: "destructive", title: "Capture Failed", description: "Report data not fully loaded. Please wait and try again."});
    return null;
}
```

### 4. Button State Management
Updated download and upload buttons to be disabled while loading:
```typescript
disabled={isCapturing || loading || !report}
disabled={isUploading || loading || !report?.folderId}
```

### 5. Consistent Filename Generation
Updated both download and upload functions to use the computed report number:
```typescript
fileName: `${displayReportNumber}_${report?.placeId || 'report'}_verification.jpeg`
```

### 6. Debug Logging
Added comprehensive debug logging to help troubleshoot future issues:
```typescript
console.log('Report data:', { 
    id: reportResult.data.id, 
    reportNumber: reportResult.data.reportNumber,
    hasReportNumber: !!reportResult.data.reportNumber 
});
```

## Benefits

1. **Reliable Display**: Report number always shows correctly, even during loading states
2. **Fallback Mechanism**: Uses URL parameter as backup when report data isn't fully loaded
3. **Better UX**: Prevents image capture when data isn't ready
4. **Consistent Filenames**: Generated filenames always include the correct report number
5. **Debug Support**: Enhanced logging for troubleshooting

## Files Modified

- `src/app/records/[id]/verification/page.tsx`: Main verification page with all fixes applied

## Testing

The fix ensures that:
- Report number displays correctly in the badge during normal viewing
- Report number is captured correctly in exported images
- Filenames for downloads and uploads include the correct report number
- Users get clear feedback if they try to capture before data is loaded
- Fallback mechanisms work when primary data sources are unavailable