/**
 * Reverse geocoding via OpenStreetMap's Nominatim — free, no API key.
 * Shared between MapLocationPicker.web.tsx and .native.tsx since this is
 * plain fetch logic with nothing platform-specific in it.
 *
 * Nominatim's usage policy asks for max ~1 request/second and a
 * descriptive User-Agent/Referer for production use — fine for this
 * "reverse-geocode on map-drag-end" pattern, since drag-end naturally
 * rate-limits itself. If you expect heavy production traffic, consider
 * swapping this for a self-hosted Nominatim instance or a paid geocoder
 * later; nothing else in this file would need to change.
 */
export interface ReverseGeocodeResult {
  title: string; // short label, e.g. "14 Isekhure Street"
  subtitle: string; // fuller context, e.g. "Benin City, Edo State"
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    const data = await response.json();

    if (!data || data.error) {
      return fallback(latitude, longitude);
    }

    const addr = data.address ?? {};
    const streetPart = [addr.house_number, addr.road].filter(Boolean).join(" ");
    const title = streetPart || addr.suburb || addr.neighbourhood || data.name || "Pinned Location";
    const subtitle = [addr.city ?? addr.town ?? addr.village, addr.state]
      .filter(Boolean)
      .join(", ") || data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    return { title, subtitle };
  } catch (e) {
    return fallback(latitude, longitude);
  }
}

function fallback(latitude: number, longitude: number): ReverseGeocodeResult {
  return {
    title: "Pinned Location",
    subtitle: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
  };
}