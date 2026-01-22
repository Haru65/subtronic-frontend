// utils/reverseGeocode.ts
// Converts coordinates to a human-readable location using backend proxy
// Returns null if service is unavailable to allow graceful fallback
export async function reverseGeocode(lat: number, lon: number): Promise<any> {
  try {
    // Call backend proxy endpoint instead of direct Nominatim call to avoid CORS issues
    // Note: This is a public endpoint (no authentication required)
    const response = await fetch(
      `${import.meta.env.VITE_APP_API_URL}/api/telemetry/geolocation/reverse?lat=${lat}&lon=${lon}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    
    // Return the location data from backend, or null if unavailable
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.warn('Reverse geocoding unavailable, using device location fallback');
    return null;
  }
}

