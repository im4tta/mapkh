'use server';
/**
 * @fileOverview A flow to translate text.
 *
 * - translateText - A function that translates text to a target language.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The target language code (e.g., "en", "km", "th").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().nullable().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const prompt = ai.definePrompt({
    name: 'translateTextPrompt',
    input: { schema: TranslateTextInputSchema },
    output: { schema: TranslateTextOutputSchema },
    prompt: `You are a professional translator specializing in Southeast Asian languages. Your task is to translate the given text to the specified target language.

Source text: {{{text}}}
Target language code: {{targetLanguage}}

CRITICAL TRANSLATION RULES:
- If targetLanguage is "en": Translate to ENGLISH only. Do not provide Thai, Khmer, or any other language.
- If targetLanguage is "km": Translate to KHMER (Cambodian) only. Do not provide Thai, English, or any other language.
- If targetLanguage is "th": Translate to THAI only. Do not provide Khmer, English, or any other language.

IMPORTANT:
- Return ONLY the translated text in the target language
- Do NOT include the original text
- Do NOT include explanations or notes
- Do NOT mix languages in your response
- For place names, use the most commonly recognized name in the target language
- Ensure the translation is accurate and contextually appropriate

Provide the translation in {{targetLanguage}} language only:`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    if (!input.text) {
        return { translatedText: null };
    }
    const { output } = await prompt(input);
    return output || { translatedText: null };
  }
);
