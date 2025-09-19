
'use server';
/**
 * @fileOverview A flow to move all files from one Google Drive folder to another and delete the source folder.
 * 
 * - moveDriveFiles - Moves files and deletes the source folder.
 * - MoveDriveFilesInput - The input type for the moveDriveFiles function.
 * - MoveDriveFilesOutput - The return type for the moveDriveFiles function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: `.env` });

const MoveDriveFilesInputSchema = z.object({
  sourceParentFolderId: z.string().describe('The ID of the folder to move files FROM.'),
  destinationParentFolderId: z.string().describe('The ID of the folder to move files TO.'),
});
export type MoveDriveFilesInput = z.infer<typeof MoveDriveFilesInputSchema>;

const MoveDriveFilesOutputSchema = z.object({
  success: z.boolean(),
  movedFiles: z.number().describe('Number of files successfully moved.'),
  error: z.string().nullable(),
});
export type MoveDriveFilesOutput = z.infer<typeof MoveDriveFilesOutputSchema>;


const getDriveService = () => {
    const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !serviceAccountKey) {
        throw new Error('Google Drive integration is not configured.');
    }

    const auth = new google.auth.JWT(
        serviceAccountEmail,
        undefined,
        serviceAccountKey,
        ['https://www.googleapis.com/auth/drive']
    );

    return google.drive({ version: 'v3', auth });
}


const moveDriveFilesTool = ai.defineTool(
    {
        name: 'moveDriveFilesTool',
        description: 'Moves all files from a source Google Drive folder to a destination folder, then deletes the source folder.',
        inputSchema: MoveDriveFilesInputSchema,
        outputSchema: MoveDriveFilesOutputSchema,
    },
    async ({ sourceParentFolderId, destinationParentFolderId }) => {
        const drive = getDriveService();
        let movedFilesCount = 0;
        try {
            // 1. List files in the source folder
            const res = await drive.files.list({
                q: `'${sourceParentFolderId}' in parents and trashed = false`,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });

            const files = res.data.files;
            if (files && files.length > 0) {
                // 2. Move each file
                for (const file of files) {
                    if (file.id) {
                        await drive.files.update({
                            fileId: file.id,
                            addParents: destinationParentFolderId,
                            removeParents: sourceParentFolderId,
                            fields: 'id, parents',
                            supportsAllDrives: true,
                        });
                        movedFilesCount++;
                    }
                }
            }
            
        } catch (error: any) {
            let errorMessage = 'An unknown error occurred while moving files.';
            if (error.response?.data?.error) {
                errorMessage = `Google API Error during file move: ${error.response.data.error.message}`;
            } else if (error.message) {
                errorMessage = error.message;
            }
            console.error('Error moving Drive files:', JSON.stringify(error, null, 2));
            // Return failure but with the count of files that might have been moved before error.
            return { success: false, movedFiles: movedFilesCount, error: errorMessage };
        }

        // 3. Delete the (now empty) source folder, in a separate try-catch
        try {
             await drive.files.delete({
                fileId: sourceParentFolderId,
                supportsAllDrives: true,
            });
        } catch (error: any) {
            // This is not a critical error if files were moved, so we log it but still return success.
            let errorMessage = 'Files moved, but failed to delete the old source folder.';
             if (error.response?.data?.error) {
                errorMessage += ` Google API Error: ${error.response.data.error.message}`;
            } else if (error.message) {
                errorMessage += ` Error: ${error.message}`;
            }
            console.warn(errorMessage);
            // We can consider this a partial success; the main goal (moving files) was achieved.
            // The user can manually delete the folder. We will return the error to the client.
            return { success: true, movedFiles: movedFilesCount, error: errorMessage };
        }

        return { success: true, movedFiles: movedFilesCount, error: null };
    }
);


const moveDriveFilesFlow = ai.defineFlow(
    {
        name: 'moveDriveFilesFlow',
        inputSchema: MoveDriveFilesInputSchema,
        outputSchema: MoveDriveFilesOutputSchema,
    },
    async (input) => {
        return await moveDriveFilesTool(input);
    }
);

export async function moveDriveFiles(input: MoveDriveFilesInput): Promise<MoveDriveFilesOutput> {
    return moveDriveFilesFlow(input);
}
