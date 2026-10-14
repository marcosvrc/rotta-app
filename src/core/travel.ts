import { GeoPoint } from './model';

export type TravelMode = 'A_PE' | 'TRANSPORTE' | 'CARRO';

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  A_PE: 'a pé',
  TRANSPORTE: 'de transporte',
  CARRO: 'de carro',
};

export interface Leg {
  distanceKm: number;
  minutes: number;
  mode: TravelMode;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Estimativa offline de deslocamento entre dois pontos.
 * No app final, a Routes API substitui esta conta quando houver rede.
 */
export function estimateLeg(from: GeoPoint, to: GeoPoint): Leg {
  const d = distanceKm(from, to);
  if (d <= 1.5) return { distanceKm: d, minutes: Math.max(1, Math.ceil(((d * 1.3) / 4.8) * 60)), mode: 'A_PE' };
  if (d <= 15) return { distanceKm: d, minutes: 8 + Math.ceil(((d * 1.3) / 20) * 60), mode: 'TRANSPORTE' };
  return { distanceKm: d, minutes: 10 + Math.ceil(((d * 1.2) / 45) * 60), mode: 'CARRO' };
}
