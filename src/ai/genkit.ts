import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Debug: Check if API key is available
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
console.log('Genkit initialization - Gemini API Key available:', !!apiKey);
console.log('Environment check - GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('Environment check - GOOGLE_GENAI_API_KEY exists:', !!process.env.GOOGLE_GENAI_API_KEY);

if (!apiKey) {
  console.warn('WARNING: No Gemini API key found. AI features will use fallback methods.');
  console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('GEMINI') || key.includes('GOOGLE')));
}

// Only initialize Genkit if API key is available
export const ai = apiKey ? genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    })
  ],
  model: 'googleai/gemini-2.0-flash',
}) : null;

console.log('Genkit AI instance:', ai ? 'initialized' : 'not initialized (no API key)');
