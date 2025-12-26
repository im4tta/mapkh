
'use server';
/**
 * @fileOverview An AI flow to upload a file to a specific Google Drive folder.
 *
 * - uploadFileToDrive - Uploads a file and returns its public URL.
 * - UploadFileToDriveInput - The input type for the uploadFileToDrive function.
 * - UploadFileToDriveOutput - The return type for the uploadFileToDrive function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { config } from 'dotenv';
import { Readable } from 'stream';

config({ path: `.env` });

const UploadFileToDriveInputSchema = z.object({
  folderId: z.string().describe('The ID of the Google Drive folder to upload into.'),
  fileName: z.string().describe('The name of the file to be uploaded.'),
  fileDataUri: z
    .string()
    .describe(
      "The file content as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type UploadFileToDriveInput = z.infer<typeof UploadFileToDriveInputSchema>;

const UploadFileToDriveOutputSchema = z.object({
  fileUrl: z.string().nullable().describe('The public URL of the uploaded file.'),
  error: z.string().nullable().describe('An error message if the operation failed.'),
});
export type UploadFileToDriveOutput = z.infer<typeof UploadFileToDriveOutputSchema>;

export async function uploadFileToDrive(
  input: UploadFileToDriveInput
): Promise<UploadFileToDriveOutput> {
  if (!uploadFileToDriveFlow) {
    console.error('Upload to drive not available - AI not initialized');
    return { fileUrl: null, error: 'AI service not available' };
  }
  return uploadFileToDriveFlow(input);
}

const uploadFileToDriveTool = ai ? ai.defineTool(
  {
    name: 'uploadFileToDriveTool',
    description: 'Uploads a file to a specific Google Drive folder.',
    inputSchema: UploadFileToDriveInputSchema,
    outputSchema: UploadFileToDriveOutputSchema,
  },
  async ({ folderId, fileName, fileDataUri }) => {
    try {
      const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
      const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!serviceAccountEmail || !serviceAccountKey) {
        const errorMsg = 'Google Drive integration is not configured. Missing required environment variables.';
        console.error(errorMsg);
        return { fileUrl: null, error: errorMsg };
      }

      // Extract MIME type and Base64 data from Data URI
      const match = fileDataUri.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid Data URI format.');
      }
      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const auth = new google.auth.JWT(
        serviceAccountEmail,
        undefined,
        serviceAccountKey,
        ['https://www.googleapis.com/auth/drive']
      );

      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: Readable.from(buffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });
      
      const fileId = file.data.id;
      if (!fileId) {
          throw new Error("File created but no ID was returned.");
      }
      
      // The file was uploaded successfully, even if the webViewLink isn't immediately available.
      // The file inherits permissions from the parent folder, so we don't need to set them again.
      return { fileUrl: file.data.webViewLink || null, error: null };
      
    } catch (error: any) {
      console.error('Error uploading file to Google Drive:', error);
      let errorMessage = 'An unknown error occurred while uploading file.';
        if (error.response?.data?.error) {
            errorMessage = `Google API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
        } else if (error.message) {
            errorMessage = error.message;
        }
      return { fileUrl: null, error: errorMessage };
    }
  }
) : null;

const uploadFileToDriveFlow = ai ? ai.defineFlow(
  {
    name: 'uploadFileToDriveFlow',
    inputSchema: UploadFileToDriveInputSchema,
    outputSchema: UploadFileToDriveOutputSchema,
  },
  async (input) => {
    return await uploadFileToDriveTool!(input);
  }
) : null;


