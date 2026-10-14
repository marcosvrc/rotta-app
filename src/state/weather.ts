import { tripDate } from '@/core/calendar';
import { Trip } from '@/core/model';
import {
  DayWeather,
  GeoPlace,
  forecastRange,
  forecastUrl,
  geocodeUrl,
  parseForecast,
  pickGeoPlace,
} from '@/core/weather';

const TIMEOUT_MS = 12_000;

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function today(): ReturnType<typeof tripDate> {
  const now = new Date();
  return tripDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Localiza o destino pelo nome. Null se o Open-Meteo não encontrar o lugar. */
export async function locateDestination(trip: Trip): Promise<GeoPlace | null> {
  return pickGeoPlace(await getJson(geocodeUrl(trip.destination)), trip.country);
}

export type ForecastResult = { kind: 'ok'; days: DayWeather[] } | { kind: 'fora-da-janela' };

/** Busca a previsão dos dias da viagem que já estão na janela de 16 dias. */
export async function fetchForecast(trip: Trip, geo: GeoPlace): Promise<ForecastResult> {
  const range = forecastRange(trip, today());
  if (!range) return { kind: 'fora-da-janela' };
  return { kind: 'ok', days: parseForecast(await getJson(forecastUrl(geo, range))) };
}
