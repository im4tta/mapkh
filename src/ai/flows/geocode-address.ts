
'use server';
/**
 * @fileOverview An AI flow to geocode an address string into coordinates and a Place ID.
 * 
 * - geocodeAddress - A function that returns latitude, longitude, and Place ID for a given address.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Client as MapsClient, GeocodeRequest } from '@googlemaps/google-maps-services-js';

const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The address or place name to geocode.'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().describe('The geographic coordinates. Returns null if not found.'),
  placeId: z.string().nullable().describe('The Google Maps Place ID. Returns null if not found.'),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

const geocodeTool = ai ? ai.defineTool(
  {
    name: 'geocodeTool',
    description: 'Get geographic coordinates and a Place ID for a given address or place name within Cambodia.',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async ({ address }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing.');
      return { location: null, placeId: null };
    }
    
    const mapsClient = new MapsClient({});

    const request: GeocodeRequest = {
        params: {
            address: address,
            key: apiKey,
            components: { country: 'KH' },
        },
    };

    try {
      const response = await mapsClient.geocode(request);
      
      if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
        const { geometry, place_id } = response.data.results[0];
        const { lat, lng } = geometry.location;
        return {
          location: {
            lat: lat,
            lng: lng,
          },
          placeId: place_id,
        };
      }

      console.log('Geocoding failed with status:', response.data.status, 'Error Message:', response.data.error_message);
      return { location: null, placeId: null };
    } catch (error) {
      console.error('Geocoding request failed:', error);
      return { location: null, placeId: null };
    }
  }
) : null;

const geocodeAddressFlow = ai ? ai.defineFlow(
  {
    name: 'geocodeAddressFlow',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async (input) => {
    return geocodeTool!(input);
  }
) : null;

export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
  if (!geocodeAddressFlow) {
    console.error('Geocoding not available - AI not initialized');
    return { location: null, placeId: null };
  }
  return geocodeAddressFlow(input);
}
