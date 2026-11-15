/**
 * A delivery address's map pin: WGS 84 latitude/longitude in degrees, kept
 * to 6 decimals (about 11 cm, what the customer API stores). Yandex Delivery
 * routes the courier to this point; BTS still works from the region and city
 * codes. Framework-free and shared by the address form, the Server Action
 * and the API mapper.
 */

export interface GeoPin {
  latitude: number;
  longitude: number;
}

export const PIN_DECIMALS = 6;

/** Where the map opens when the address has no pin yet (Tashkent centre). */
export const DEFAULT_MAP_CENTER: GeoPin = { latitude: 41.3111, longitude: 69.2797 };
export const DEFAULT_MAP_ZOOM = 12;
/** Zoom used after "Joylashuvimni aniqlash": close enough to see the building. */
export const LOCATED_MAP_ZOOM = 17;

const FACTOR = 10 ** PIN_DECIMALS;

/** Rounds to 6 decimals; `-0` becomes `0`. */
export function roundCoordinate(value: number): number {
  const rounded = Math.round(value * FACTOR) / FACTOR;
  return rounded === 0 ? 0 : rounded;
}

/**
 * A coordinate from the API or a form: a finite number or a numeric string
 * (Django may serialise decimals as strings). Anything else is `null`.
 */
export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function isLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/**
 * Both coordinates parsed, in range and rounded, or `null` when either is
 * missing or invalid (a pin is a pair: half a pin is no pin).
 */
export function toPin(latitude: unknown, longitude: unknown): GeoPin | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat === null || lng === null || !isLatitude(lat) || !isLongitude(lng)) return null;
  return { latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) };
}

/** Leaflet's longitude after panning across the antimeridian, back into −180…180. */
export function wrapLongitude(value: number): number {
  if (value >= -180 && value <= 180) return value;
  const wrapped = ((((value + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/** `41.311100, 69.279700`: always 6 decimals, as the customer sees them. */
export function formatPin(pin: GeoPin): string {
  return `${pin.latitude.toFixed(PIN_DECIMALS)}, ${pin.longitude.toFixed(PIN_DECIMALS)}`;
}
