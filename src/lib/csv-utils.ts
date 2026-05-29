/**
 * CSV utility functions for consistent UTF-8 encoding across the application
 */

/**
 * Creates a properly encoded CSV blob with UTF-8 BOM
 * @param csvContent - The CSV content as a string
 * @param filename - Optional filename for the download
 * @returns Blob with proper UTF-8 encoding
 */
export function createCSVBlob(csvContent: string): Blob {
  const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for proper encoding
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Downloads CSV content as a file with proper UTF-8 encoding
 * @param csvContent - The CSV content as a string
 * @param filename - The filename for the download
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = createCSVBlob(csvContent);
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  }
}

/**
 * Downloads data as CSV using Papa Parse with proper UTF-8 encoding
 * @param data - Array of objects to convert to CSV
 * @param filename - The filename for the download
 * @param config - Optional Papa Parse configuration
 */
export function downloadDataAsCSV(
  data: any[], 
  filename: string, 
  config?: any
): void {
  // Import Papa Parse dynamically to avoid SSR issues
  import('papaparse').then((Papa) => {
    const csv = Papa.unparse(data, config);
    downloadCSV(csv, filename);
  }).catch((error) => {
    console.error('Failed to load Papa Parse:', error);
    // Fallback to basic CSV generation
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    downloadCSV(csvContent, filename);
  });
}

/**
 * Validates if a file is a CSV file
 * @param file - File object to validate
 * @returns boolean indicating if the file is a CSV
 */
export function isCSVFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
}

/**
 * Reads a CSV file with proper encoding handling
 * @param file - File object to read
 * @returns Promise with file content as string
 */
export async function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // Read as text with UTF-8 encoding
    reader.readAsText(file, 'UTF-8');
  });
}