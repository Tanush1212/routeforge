import type { Stop } from "./types";

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Symmetric distance matrix in kilometres, already scaled by the road factor.
 * Indices match the order of `stops`.
 */
export function buildDistanceMatrix(
  stops: Stop[],
  roadFactor: number,
): Float64Array {
  const n = stops.length;
  const matrix = new Float64Array(n * n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d =
        haversineKm(stops[i].lat, stops[i].lng, stops[j].lat, stops[j].lng) *
        roadFactor;
      matrix[i * n + j] = d;
      matrix[j * n + i] = d;
    }
  }

  return matrix;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function boundsOf(stops: Stop[]): Bounds | null {
  if (stops.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const s of stops) {
    if (s.lat > north) north = s.lat;
    if (s.lat < south) south = s.lat;
    if (s.lng > east) east = s.lng;
    if (s.lng < west) west = s.lng;
  }

  return { north, south, east, west };
}

/** Web Mercator y, normalized to 0–1 across the full latitude range. */
export function mercatorY(lat: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin(toRad(clamped));
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

/** Web Mercator x, normalized to 0–1 across the full longitude range. */
export function mercatorX(lng: number): number {
  return (lng + 180) / 360;
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** Minutes past midnight → "9:05 am". */
export function formatClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}
