'use server';
/**
 * @fileOverview Free Google Translate implementation using web scraping
 * This is a fallback solution that doesn't require API keys
 */

import { z } from 'zod';

const TranslateInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The target language code (e.g., "en", "km", "th").'),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  translatedText: z.string().nullable().describe('The translated text.'),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

// Language code mapping for Google Translate
const languageMap: { [key: string]: string } = {
  'en': 'en',
  'km': 'km',
  'th': 'th',
  'auto': 'auto'
};

export async function translateTextFree(input: TranslateInput): Promise<TranslateOutput> {
  console.log('translateTextFree called with:', input);
  
  try {
    const { text, targetLanguage } = input;
    
    if (!text || !text.trim()) {
      return { translatedText: null };
    }

    const sourceLang = 'auto';
    const targetLang = languageMap[targetLanguage] || targetLanguage;
    
    // Use Google Translate's public API endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    console.log('Making request to Google Translate:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Google Translate request failed:', response.status, response.statusText);
      return { translatedText: null };
    }

    const data = await response.json();
    console.log('Google Translate response:', data);
    
    // Parse the response - Google Translate returns an array structure
    if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      const translatedText = data[0].map((item: any) => item[0]).join('');
      console.log('Extracted translation:', translatedText);
      return { translatedText: translatedText || null };
    }
    
    console.error('Unexpected Google Translate response format:', data);
    return { translatedText: null };
    
  } catch (error) {
    console.error('translateTextFree error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return { translatedText: null };
  }
}

// Fallback translation using a simple dictionary for common place names
const commonTranslations: { [key: string]: { [lang: string]: string } } = {
  'restaurant': {
    'km': 'ភោជនីយដ្ឋាន',
    'th': 'ร้านอาหาร',
    'en': 'restaurant'
  },
  'hotel': {
    'km': 'សណ្ឋាគារ',
    'th': 'โรงแรม',
    'en': 'hotel'
  },
  'school': {
    'km': 'សាលារៀន',
    'th': 'โรงเรียน',
    'en': 'school'
  },
  'hospital': {
    'km': 'មន្ទីរពេទ្យ',
    'th': 'โรงพยาบาล',
    'en': 'hospital'
  },
  'market': {
    'km': 'ផ្សារ',
    'th': 'ตลาด',
    'en': 'market'
  },
  'bank': {
    'km': 'ធនាគារ',
    'th': 'ธนาคาร',
    'en': 'bank'
  },
  'temple': {
    'km': 'វត្ត',
    'th': 'วัด',
    'en': 'temple'
  },
  'coffee': {
    'km': 'កាហ្វេ',
    'th': 'กาแฟ',
    'en': 'coffee'
  },
  'shop': {
    'km': 'ហាង',
    'th': 'ร้าน',
    'en': 'shop'
  },
  'gas station': {
    'km': 'ស្ថានីយ៍ប្រេង',
    'th': 'ปั๊มน้ำมัน',
    'en': 'gas station'
  }
};

export async function translateWithDictionary(text: string, targetLanguage: string): Promise<string | null> {
  const lowerText = text.toLowerCase();
  
  // Check for exact matches first
  if (commonTranslations[lowerText] && commonTranslations[lowerText][targetLanguage]) {
    return commonTranslations[lowerText][targetLanguage];
  }
  
  // Check for partial matches
  for (const [key, translations] of Object.entries(commonTranslations)) {
    if (lowerText.includes(key) && translations[targetLanguage]) {
      return translations[targetLanguage];
    }
  }
  
  return null;
}

// Combined translation function that tries free Google Translate first, then falls back to dictionary
export async function translateTextCombined(input: TranslateInput): Promise<TranslateOutput> {
  console.log('translateTextCombined called with:', input);
  
  // Try free Google Translate first
  const googleResult = await translateTextFree(input);
  if (googleResult.translatedText) {
    console.log('Google Translate succeeded:', googleResult.translatedText);
    return googleResult;
  }
  
  // Fallback to dictionary translation
  console.log('Google Translate failed, trying dictionary fallback');
  const dictionaryResult = await translateWithDictionary(input.text, input.targetLanguage);
  if (dictionaryResult) {
    console.log('Dictionary translation succeeded:', dictionaryResult);
    return { translatedText: dictionaryResult };
  }
  
  console.log('All translation methods failed, returning original text');
  return { translatedText: input.text }; // Return original text as last resort
}