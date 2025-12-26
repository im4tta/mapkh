import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Debug: Check if API key is available
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
console.log('Genkit initialization - Gemini API Key available:', !!apiKey);
console.log('Environment check - GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('Environment check - GOOGLE_GENAI_API_KEY exists:', !!process.env.GOOGLE_GENAI_API_KEY);

if (!apiKey) {
  console.error('CRITICAL: No Gemini API key found in environment variables!');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('GEMINI') || key.includes('GOOGLE')));
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    })
  ],
  model: 'googleai/gemini-2.0-flash',
});
