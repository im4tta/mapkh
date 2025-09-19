
'use server';
/**
 * @fileOverview An AI flow to determine the province and display name from latitude and longitude using Google's Geocoding API.
 * 
 * - reverseGeocode - A function that returns the province and display name for a given set of coordinates.
 * - ReverseGeocodeInput - The input type for the reverseGeocode function.
 * - ReverseGeocodeOutput - The return type for the reverseGeocode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Client as MapsClient, ReverseGeocodeRequest, Language, AddressType, GeocodeResult } from '@googlemaps/google-maps-services-js';

const ReverseGeocodeInputSchema = z.object({
  lat: z.number().describe('The latitude of the location.'),
  lng: z.number().describe('The longitude of the location.'),
  language: z.string().optional().describe('The language code to use for the result (e.g., "en", "km", "th").'),
});
export type ReverseGeocodeInput = z.infer<typeof ReverseGeocodeInputSchema>;

const ReverseGeocodeOutputSchema = z.object({
  province: z.string().nullable().describe('The name of the province or state. Returns null if not found.'),
  displayName: z.string().nullable().describe('The full display name of the location. Returns null if not found.'),
  placeId: z.string().nullable().describe('The Google Maps Place ID of the location, if available.'),
});
export type ReverseGeocodeOutput = z.infer<typeof ReverseGeocodeOutputSchema>;

// A mapping to handle known inconsistencies from the geocoding API.
const provinceNameMap: { [key: string]: string } = {
    "Banteay Meanchey Province": "Banteay Meanchey",
    "Bantey Meanchey": "Banteay Meanchey",
    "Kratié": "Kratie",
    "Kratié Province": "Kratie",
    "Preah Sihanouk Province": "Preah Sihanouk",
    "Takéo": "Takeo",
    "Takéo Province": "Takeo",
    "Kep Province": "Kep",
    "Pailin Province": "Pailin",
    "ខេត្តបន្ទាយមានជ័យ": "Banteay Meanchey",
    "ខេត្តបាត់ដំបង": "Battambang",
    "ខេត្តកំពង់ចាម": "Kampong Cham",
    "ខេត្តកំពង់ឆ្នាំង": "Kampong Chhnang",
    "ខេត្តកំពង់ស្ពឺ": "Kampong Speu",
    "ខេត្តកំពង់ធំ": "Kampong Thom",
    "ខេត្តកំពត": "Kampot",
    "ខេត្តកណ្តាល": "Kandal",
    "ខេត្តកែប": "Kep",
    "ខេត្តកោះកុង": "Koh Kong",
    "ខេត្តក្រចេះ": "Kratie",
    "ខេត្តមណ្ឌលគិរី": "Mondulkiri",
    "ខេត្តឧត្តរមានជ័យ": "Oddar Meanchey",
    "ខេត្តប៉ៃលិន": "Pailin",
    "រាជធានីភ្នំពេញ": "Phnom Penh",
    "ភ្នំពេញ": "Phnom Penh",
    "ខេត្តព្រះសីហនុ": "Preah Sihanouk",
    "ខេត្តព្រះវិហារ": "Preah Vihear",
    "ខេត្តព្រៃវែង": "Prey Veng",
    "ខេត្តពោធិ៍សាត់": "Pursat",
    "ខេត្តរតនគិរី": "Ratanakiri",
    "ខេត្តសៀមរាប": "Siem Reap",
    "ខេត្តស្ទឹងត្រែង": "Stung Treng",
    "ខេត្តស្វាយរៀង": "Svay Rieng",
    "ខេត្តតាកែវ": "Takeo",
    "ខេត្តត្បូងឃ្មុំ": "Tboung Khmum"
};

const reverseGeocodeTool = ai.defineTool(
  {
    name: 'reverseGeocode',
    description: 'Get the administrative area (province/state) and display name for a given latitude and longitude.',
    inputSchema: ReverseGeocodeInputSchema,
    outputSchema: ReverseGeocodeOutputSchema,
  },
  async ({ lat, lng, language }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing.');
      return { province: null, displayName: null, placeId: null };
    }
    
    const mapsClient = new MapsClient({});
    
    const request: ReverseGeocodeRequest = {
        params: {
            latlng: { lat, lng },
            key: apiKey,
            language: language as Language,
            result_type: [AddressType.street_address, AddressType.locality, AddressType.political, AddressType.point_of_interest],
            // @ts-ignore - The library type might not have this, but API supports it
            componentRestrictions: { country: 'KH' },
        }
    }
    
    try {
      const response = await mapsClient.reverseGeocode(request);
      
      if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        let province = null;
        let displayName = result.formatted_address;
        let placeId = result.place_id || null;

        // Try to find a more specific name for POIs if available
        const pointOfInterestResult = response.data.results.find((r:any) => r.types.includes('point_of_interest') || r.types.includes('establishment'));

        if (pointOfInterestResult) {
            displayName = (pointOfInterestResult as any).name || pointOfInterestResult.formatted_address || displayName;
            placeId = pointOfInterestResult.place_id || placeId;
        }

        // Find the province (administrative_area_level_1)
        for (const component of result.address_components) {
          if (component.types.includes(AddressType.administrative_area_level_1)) {
            province = component.long_name;
            break;
          }
        }
        
        let cleanedProvince = province;
        if (cleanedProvince) {
            if (provinceNameMap[cleanedProvince]) {
                cleanedProvince = provinceNameMap[cleanedProvince];
            } else {
                cleanedProvince = cleanedProvince.replace(/ Province| Municipality| Khet|ខេត្ត/gi, '').trim();
            }
        }
        
        return { province: cleanedProvince, displayName, placeId };
      }

      console.log('Reverse geocoding failed with status:', response.data.status, 'Error Message:', response.data.error_message);
      return { province: null, displayName: null, placeId: null };
    } catch (error) {
      console.error('Reverse geocoding request failed:', error);
      return { province: null, displayName: null, placeId: null };
    }
  }
);

const getProvinceFlow = ai.defineFlow(
  {
    name: 'getProvinceFlow',
    inputSchema: ReverseGeocodeInputSchema,
    outputSchema: ReverseGeocodeOutputSchema,
  },
  async (input) => {
    const geocodeResult = await reverseGeocodeTool(input);
    return geocodeResult;
  }
);

export async function reverseGeocode(input: ReverseGeocodeInput): Promise<ReverseGeocodeOutput> {
  return getProvinceFlow(input);
}
