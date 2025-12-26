
'use server';
/**
 * @fileOverview An AI flow to save a URL as a file in a specific Google Drive folder.
 *
 * - saveUrlToDrive - Saves a URL as a text file.
 * - SaveUrlToDriveInput - The input type for the saveUrlToDrive function.
 * - SaveUrlToDriveOutput - The return type for the saveUrlToDrive function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { config } from 'dotenv';
import { Readable } from 'stream';

config({ path: `.env` });

const SaveUrlToDriveInputSchema = z.object({
  folderId: z.string().describe('The ID of the Google Drive folder to upload into.'),
  fileName: z.string().describe('The name of the file to be created (e.g., "original_location.txt").'),
  urlContent: z.string().describe("The text content to save in the file."),
});
export type SaveUrlToDriveInput = z.infer<typeof SaveUrlToDriveInputSchema>;

const SaveUrlToDriveOutputSchema = z.object({
  fileUrl: z.string().nullable().describe('The public URL of the created file.'),
  error: z.string().nullable().describe('An error message if the operation failed.'),
});
export type SaveUrlToDriveOutput = z.infer<typeof SaveUrlToDriveOutputSchema>;

export async function saveUrlToDrive(
  input: SaveUrlToDriveInput
): Promise<SaveUrlToDriveOutput> {
  if (!saveUrlToDriveFlow) {
    console.error('Save URL to drive not available - AI not initialized');
    return { fileUrl: null, error: 'AI service not available' };
  }
  return saveUrlToDriveFlow(input);
}

const saveUrlToDriveTool = ai ? ai.defineTool(
  {
    name: 'saveUrlToDriveTool',
    description: 'Saves a given URL as a text file to a specific Google Drive folder.',
    inputSchema: SaveUrlToDriveInputSchema,
    outputSchema: SaveUrlToDriveOutputSchema,
  },
  async ({ folderId, fileName, urlContent }) => {
    try {
      const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
      const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!serviceAccountEmail || !serviceAccountKey) {
        const errorMsg = 'Google Drive integration is not configured. Missing required environment variables.';
        return { fileUrl: null, error: errorMsg };
      }

      const auth = new google.auth.JWT(
        serviceAccountEmail,
        undefined,
        serviceAccountKey,
        ['https://www.googleapis.com/auth/drive']
      );

      const drive = google.drive({ version: 'v3', auth });
      const buffer = Buffer.from(urlContent, 'utf-8');

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
        mimeType: 'text/plain',
      };

      const media = {
        mimeType: 'text/plain',
        body: Readable.from(buffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });

      if (!file.data.id) {
        throw new Error("File created but no ID was returned.");
      }

      return { fileUrl: file.data.webViewLink || null, error: null };
      
    } catch (error: any) {
      console.error('Error saving URL to Google Drive:', error);
      let errorMessage = 'An unknown error occurred while saving the URL.';
      if (error.response?.data?.error) {
        errorMessage = `Google API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { fileUrl: null, error: errorMessage };
    }
  }
) : null;

const saveUrlToDriveFlow = ai ? ai.defineFlow(
  {
    name: 'saveUrlToDriveFlow',
    inputSchema: SaveUrlToDriveInputSchema,
    outputSchema: SaveUrlToDriveOutputSchema,
  },
  async (input) => {
    return await saveUrlToDriveTool!(input);
  }
) : null;
