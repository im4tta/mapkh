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
import { translateTextCombined } from './google-translate-free';

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
  console.log('translateText called with:', input);
  
  // Check if Gemini API is available
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  
  if (apiKey && translateTextFlow) {
    console.log('Gemini API key found, trying Gemini translation first');
    try {
      const result = await translateTextFlow(input);
      console.log('Gemini translateText result:', result);
      
      if (result.translatedText) {
        return result;
      }
    } catch (error) {
      console.error('Gemini translateText error:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    }
  } else {
    console.log('No Gemini API key found or flow not initialized, skipping Gemini translation');
  }
  
  // Fallback to free Google Translate
  console.log('Falling back to free Google Translate');
  try {
    const freeResult = await translateTextCombined(input);
    console.log('Free translation result:', freeResult);
    return freeResult;
  } catch (error) {
    console.error('Free translation error:', error);
    return { translatedText: null };
  }
}

const prompt = ai ? ai.definePrompt({
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
}) : null;

const translateTextFlow = ai ? ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    if (!input.text) {
        return { translatedText: null };
    }
    const { output } = await prompt!(input);
    return output || { translatedText: null };
  }
) : null;
