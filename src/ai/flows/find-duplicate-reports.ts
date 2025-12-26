
'use server';

/**
 * @fileOverview An AI flow to find potential duplicate reports.
 *
 * - findDuplicateReports - A function that finds potential duplicates for a new report.
 * - FindDuplicateReportsInput - The input type for the findDuplicateReports function.
 * - FindDuplicateReportsOutput - The return type for the findDuplicateReports function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAllReports } from '@/app/actions';
import { Report } from '@/lib/types';

const FindDuplicateReportsInputSchema = z.object({
  description: z.string().describe('The description of the new report.'),
  lat: z.number().describe('The latitude of the new report.'),
  lng: z.number().describe('The longitude of the new report.'),
  placeId: z.string().optional().describe('The Google Maps Place ID of the new report.'),
});
export type FindDuplicateReportsInput = z.infer<typeof FindDuplicateReportsInputSchema>;

const DuplicateReportSchema = z.object({
  reportNumber: z.number().describe('The report number of the potential duplicate.'),
  description: z.string().describe('The description of the existing report.'),
  confidence: z.enum(['high', 'medium', 'low']).describe('The confidence level that this is a duplicate.'),
  reasoning: z.string().describe('A brief explanation for why this might be a duplicate.'),
  position: z.object({
    lat: z.number(),
    lng: z.number(),
  }).describe('The geographic coordinates of the potential duplicate.'),
});

const FindDuplicateReportsOutputSchema = z.object({
  duplicates: z.array(DuplicateReportSchema).describe('A list of potential duplicate reports. The list should be empty if no duplicates are found.'),
});
export type FindDuplicateReportsOutput = z.infer<typeof FindDuplicateReportsOutputSchema>;

export async function findDuplicateReports(
  input: FindDuplicateReportsInput
): Promise<FindDuplicateReportsOutput> {
  if (!findDuplicateReportsFlow) {
    console.error('Duplicate detection not available - AI not initialized');
    return { duplicates: [] };
  }
  return findDuplicateReportsFlow(input);
}

const prompt = ai ? ai.definePrompt({
  name: 'findDuplicateReportsPrompt',
  input: {
    schema: z.object({
      newReport: FindDuplicateReportsInputSchema,
      existingReports: z.array(z.any()),
    }),
  },
  output: { schema: FindDuplicateReportsOutputSchema },
  prompt: `You are an AI assistant for a map error reporting tool. Your task is to identify potential duplicate reports.

A new report is being submitted with the following details:
- Description: {{{newReport.description}}}
- Location: {{newReport.lat}}, {{newReport.lng}}
- Place ID: {{newReport.placeId}}

Compare this new report against the following list of existing reports. 
- A report is likely a duplicate if it describes the same issue at a very similar geographic location. Pay close attention to coordinates and descriptions.
- If a Place ID is provided for the new report, check if any existing reports share the same Place ID. This is a strong indicator of a duplicate.

Return a list of potential duplicates with a confidence score and reasoning. For each duplicate, you MUST include its position (latitude and longitude). If you find no likely duplicates, return an empty list.

Existing Reports:
---
{{#each existingReports}}
- Report #{{reportNumber}}: "{{description}}" at {{position.lat}}, {{position.lng}} (Place ID: {{placeId}})
{{/each}}
---
`,
}) : null;


const findDuplicateReportsFlow = ai ? ai.defineFlow(
  {
    name: 'findDuplicateReportsFlow',
    inputSchema: FindDuplicateReportsInputSchema,
    outputSchema: FindDuplicateReportsOutputSchema,
  },
  async (input) => {
    // For now, fetch all reports. In a larger system, we'd fetch reports in a geographic radius.
    const reportsResult = await getAllReports();
    if (!reportsResult.success || !reportsResult.data) {
        console.error("Failed to fetch existing reports for duplicate check.");
        return { duplicates: [] };
    }
    
    // First, perform a quick check for an exact Place ID match
    if (input.placeId) {
        const exactMatch = reportsResult.data.find(report => report.placeId === input.placeId);
        if (exactMatch) {
            return {
                duplicates: [{
                    reportNumber: exactMatch.reportNumber,
                    description: exactMatch.description,
                    confidence: 'high',
                    reasoning: `An existing report was found with the exact same Google Place ID.`,
                    position: exactMatch.position,
                }]
            } as FindDuplicateReportsOutput;
        }
    }

    // If no exact match, proceed with the AI-based check
    if (!prompt) {
      console.warn('AI prompt not available, skipping AI-based duplicate check');
      return { duplicates: [] };
    }
    
    const { output } = await prompt({
        newReport: input,
        existingReports: reportsResult.data,
    });
    
    if (!output) {
        return { duplicates: [] };
    }
    
    // Explicitly cast the confidence to the correct type to satisfy TypeScript.
    const typedDuplicates = output.duplicates.map(d => ({
        ...d,
        confidence: d.confidence as 'high' | 'medium' | 'low',
    }));

    return { duplicates: typedDuplicates };
  }
) : null;
