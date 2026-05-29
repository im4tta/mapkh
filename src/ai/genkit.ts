import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

// Only initialize Genkit if API key is available
export const ai = apiKey ? genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    })
  ],
  model: 'googleai/gemini-2.0-flash',
}) : null;


