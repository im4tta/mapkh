import { z } from 'zod';

// CSV row schema for PlaceID management
// Status aliases for flexible CSV import
const statusAliases: Record<string, string> = {
  // Standard statuses
  'not-submitted': 'not-submitted',
  'notsubmitted': 'not-submitted',
  'not_submitted': 'not-submitted',
  'not submitted': 'not-submitted',
  'new': 'not-submitted',
  'draft': 'not-submitted',
  
  'submitted': 'submitted',
  'submit': 'submitted',
  'sent': 'submitted',
  
  'in-review': 'in-review',
  'inreview': 'in-review',
  'in_review': 'in-review',
  'in review': 'in-review',
  'reviewing': 'in-review',
  'review': 'in-review',
  
  'pending': 'pending',
  'waiting': 'pending',
  'hold': 'pending',
  'on hold': 'pending',
  
  'approved': 'approved',
  'approve': 'approved',
  'accepted': 'approved',
  'accept': 'approved',
  'ok': 'approved',
  'good': 'approved',
  'yes': 'approved',
  'valid': 'approved',
  'complete': 'approved',
  'completed': 'approved',
  'done': 'approved',
  'active': 'approved',
  'active/inactive': 'approved',
  
  'rejected': 'rejected',
  'reject': 'rejected',
  'declined': 'rejected',
  'decline': 'rejected',
  'denied': 'rejected',
  'deny': 'rejected',
  'no': 'rejected',
  'invalid': 'rejected',
  'bad': 'rejected',
  'failed': 'rejected',
  'fail': 'rejected',
  
  'archived': 'archived',
  'archive': 'archived',
  'old': 'archived',
  'inactive': 'archived',
  'disabled': 'archived',
  'deleted': 'archived',
  'inactive/active': 'archived',
  
  // PlaceID existence-based statuses
  'not found': 'approved',
  'notfound': 'approved',
  'not_found': 'approved',
  'missing': 'approved',
  'absent': 'approved',
  
  'found': 'not-submitted',
  'exists': 'not-submitted',
  'present': 'not-submitted',
  'available': 'not-submitted'
};

const csvRowSchema = z.object({
  placeID: z.string().min(1, 'PlaceID is required'),
  status: z.string().optional().transform(val => {
    // If status is empty/blank, default to 'approved'
    if (!val || val.trim() === '') {
      return 'approved';
    }
    
    // Normalize the input: lowercase, trim, remove special characters except forward slash
    const normalizedInput = val.toLowerCase().trim().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
    
    // Try direct lookup first
    const directMatch = statusAliases[normalizedInput];
    if (directMatch) {
      return directMatch;
    }
    
    // Try without spaces/underscores/hyphens but keep forward slashes
    const compactInput = normalizedInput.replace(/[\s_-]/g, '');
    const compactMatch = statusAliases[compactInput];
    if (compactMatch) {
      return compactMatch;
    }
    
    // If no match found, provide helpful error with suggestions
    const validStatuses = ['not-submitted', 'submitted', 'in-review', 'pending', 'approved', 'rejected', 'archived'];
    const suggestions = Object.keys(statusAliases).filter(alias => 
      alias.includes(normalizedInput) || normalizedInput.includes(alias)
    ).slice(0, 3);
    
    let errorMessage = `Invalid status: "${val}". Must be one of: ${validStatuses.join(', ')}`;
    if (suggestions.length > 0) {
      errorMessage += `. Did you mean: ${suggestions.join(', ')}?`;
    }
    
    throw new Error(errorMessage);
  })
});

export type CSVRow = z.infer<typeof csvRowSchema>;

export interface CSVProcessingResult {
  success: boolean;
  data?: CSVRow[];
  errors?: string[];
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  headers?: string[];
  needsMapping?: boolean;
}

export interface ColumnMapping {
  placeIdColumn: string;
  statusColumn?: string;
}

/**
 * Parse CSV content and validate PlaceID and status columns
 * @param csvContent - Raw CSV file content as string
 * @param columnMapping - Optional column mapping for flexible CSV formats
 * @returns Processing result with validated data or errors
 */
export function processCSVContent(csvContent: string, columnMapping?: ColumnMapping): CSVProcessingResult {
  try {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length === 0) {
      return {
        success: false,
        errors: ['CSV file is empty']
      };
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    // If no column mapping provided, try to auto-detect or request mapping
    if (!columnMapping) {
      const placeIdIndex = headers.findIndex(h => h.toLowerCase() === 'placeid');
      const statusIndex = headers.findIndex(h => h.toLowerCase() === 'status');
      
      if (placeIdIndex === -1) {
        // Return headers for user to map columns
        return {
          success: false,
          headers,
          needsMapping: true,
          errors: ['Column mapping required. Please select which column contains PlaceID data.']
        };
      }
      
      // Auto-detected columns
      columnMapping = {
        placeIdColumn: headers[placeIdIndex],
        statusColumn: statusIndex !== -1 ? headers[statusIndex] : undefined
      };
    }
    
    // Find column indices based on mapping
    const placeIdIndex = headers.findIndex(h => h === columnMapping?.placeIdColumn);
    const statusIndex = columnMapping?.statusColumn ? 
      headers.findIndex(h => h === columnMapping?.statusColumn) : -1;
    
    if (placeIdIndex === -1) {
      return {
        success: false,
        headers,
        needsMapping: true,
        errors: [`Selected PlaceID column "${columnMapping?.placeIdColumn || 'unknown'}" not found in CSV header`]
      };
    }

    const dataLines = lines.slice(1);
    const validRows: CSVRow[] = [];
    const errors: string[] = [];
    
    dataLines.forEach((line, index) => {
      const rowNumber = index + 2; // +2 because we start from line 2 (after header)
      
      if (line.trim() === '') {
        return; // Skip empty lines
      }
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      const placeID = values[placeIdIndex] || '';
      const status = statusIndex !== -1 ? values[statusIndex] || '' : '';
      
      try {
        const validatedRow = csvRowSchema.parse({ placeID, status });
        validRows.push(validatedRow);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          errors.push(`Row ${rowNumber}: ${fieldErrors}`);
        } else {
          errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    return {
      success: errors.length === 0,
      data: validRows,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: dataLines.filter(line => line.trim() !== '').length,
      validRows: validRows.length,
      invalidRows: errors.length
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Process a CSV file and return validated data
 * @param file - File object from file input
 * @param columnMapping - Optional column mapping for flexible CSV formats
 * @returns Promise with processing result
 */
export async function processCSVFile(file: File, columnMapping?: ColumnMapping): Promise<CSVProcessingResult> {
  try {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return {
        success: false,
        errors: ['File must be a CSV file (.csv extension)']
      };
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        errors: ['File size must be less than 5MB']
      };
    }
    
    // Read file content
    const content = await file.text();
    
    // Process CSV content
    return processCSVContent(content, columnMapping);
    
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Generate a sample CSV content for download
 * @returns Sample CSV string
 */
export function generateSampleCSV(): string {
  const headers = ['placeID', 'status'];
  const sampleRows = [
    ['ChIJN1t_tDeuEmsRUsoyG83frY4', 'approved'],
    ['ChIJrTLr-GyuEmsRBfy61i59si0', ''], // Empty status will default to approved
    ['ChIJd8BlQ2BuEmsRAkg_1ebN0Y0', 'pending'],
    ['ChIJLU7jZCLvEmsR4PcOcE3A6Ks', 'rejected'],
    ['ChIJA0b_V5BuEmsRcHgHtAnOgoM', 'yes'], // Will be converted to 'approved'
    ['ChIJrRMgU7BuEmsRQj9crKNoAVs', 'no'], // Will be converted to 'rejected'
    ['ChIJN1t_tDeuEmsRUsoyG83frY5', 'complete'], // Will be converted to 'approved'
    ['ChIJrTLr-GyuEmsRBfy61i59si1', 'in review'], // Will be converted to 'in-review'
    ['ChIJd8BlQ2BuEmsRAkg_1ebN0Y1', 'waiting'] // Will be converted to 'pending'
  ];
  
  const csvContent = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
  return csvContent;
}

/**
 * Download sample CSV file
 */
export function downloadSampleCSV(): void {
  const csvContent = generateSampleCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_placeid_upload.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}