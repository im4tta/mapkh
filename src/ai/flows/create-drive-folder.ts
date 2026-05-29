
'use server';
/**
 * @fileOverview An AI flow to create a Google Drive folder for a new report.
 *
 * - createDriveFolder - Creates a folder and returns its public URL and folder ID.
 * - CreateDriveFolderInput - The input type for the createDriveFolder function.
 * - CreateDriveFolderOutput - The return type for the createDriveFolder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: `.env` });

const CreateDriveFolderInputSchema = z.object({
  reportId: z.string().describe('The Firestore document ID of the report.'),
  reportNumber: z.number().describe('The user-facing report number.'),
});
export type CreateDriveFolderInput = z.infer<typeof CreateDriveFolderInputSchema>;

const CreateDriveFolderOutputSchema = z.object({
  folderUrl: z.string().nullable().describe('The public URL of the created folder.'),
  folderId: z.string().nullable().describe('The unique ID of the created folder.'),
  error: z.string().nullable().describe('An error message if the operation failed.'),
});
export type CreateDriveFolderOutput = z.infer<typeof CreateDriveFolderOutputSchema>;

export async function createDriveFolder(
  input: CreateDriveFolderInput
): Promise<CreateDriveFolderOutput> {
  if (!createDriveFolderFlow) {
    console.error('Drive folder creation not available - AI not initialized');
    return { folderUrl: null, folderId: null, error: 'AI service not available' };
  }
  return createDriveFolderFlow(input);
}

const createDriveFolderTool = ai ? ai.defineTool(
  {
    name: 'createDriveFolderTool',
    description: 'Creates a Google Drive folder for a report and makes it public.',
    inputSchema: CreateDriveFolderInputSchema,
    outputSchema: CreateDriveFolderOutputSchema,
  },
  async ({ reportNumber }) => {
    try {
      const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
      const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
      const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!parentFolderId || !serviceAccountEmail || !serviceAccountKey) {
        const errorMsg = 'Google Drive integration is not configured. Missing required environment variables.';
        console.error(errorMsg);
        return { folderUrl: null, folderId: null, error: errorMsg };
      }

      const auth = new google.auth.JWT(
        serviceAccountEmail,
        undefined,
        serviceAccountKey,
        ['https://www.googleapis.com/auth/drive']
      );

      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata = {
        name: `Report #${reportNumber}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });
      
      const folderId = file.data.id;
      if (!folderId) {
        throw new Error('Failed to get folder ID after creation.');
      }

      // Make the folder public so anyone with the link can view evidence.
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });

      console.log(`Successfully created folder for Report #${reportNumber}. URL: ${file.data.webViewLink}`);
      return { folderUrl: file.data.webViewLink || null, folderId: folderId, error: null };
    } catch (error: any) {
        let errorMessage = 'An unknown error occurred while creating the Google Drive folder.';
        if (error.response?.data?.error) {
            errorMessage = `Google API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        console.error('Detailed Error creating Google Drive folder:', JSON.stringify(error, null, 2));
        return { folderUrl: null, folderId: null, error: errorMessage };
    }
  }
) : null;


const createDriveFolderFlow = ai ? ai.defineFlow(
  {
    name: 'createDriveFolderFlow',
    inputSchema: CreateDriveFolderInputSchema,
    outputSchema: CreateDriveFolderOutputSchema,
  },
  async (input) => {
    return await createDriveFolderTool!(input);
  }
) : null;
