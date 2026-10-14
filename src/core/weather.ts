import { TripDate, compareDates, minusDays, plusDays } from './calendar';
import { Trip } from './model';

/** Destino localizado no mapa (geocodificação do Open-Meteo, baseada no GeoNames). */
export interface GeoPlace {
  name: string;
  country: string;
  /** ISO 3166-1 alfa-2, ex.: "PT". */
  countryCode: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export type WeatherKind = 'SOL' | 'NUVENS' | 'NEBLINA' | 'GAROA' | 'CHUVA' | 'NEVE' | 'TEMPESTADE';

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  SOL: 'Sol',
  NUVENS: 'Nublado',
  NEBLINA: 'Neblina',
  GAROA: 'Garoa',
  CHUVA: 'Chuva',
  NEVE: 'Neve',
  TEMPESTADE: 'Tempestade',
};

export interface DayWeather {
  date: TripDate;
  /** Código WMO devolvido pela previsão. */
  code: number;
  maxC: number;
  minC: number;
  /** Chance máxima de chuva no dia, de 0 a 100. */
  rainChance: number | null;
  rainMm: number;
}

export interface WeatherCache {
  /** ISO 8601 do momento da consulta. */
  fetchedAt: string;
  days: DayWeather[];
}

/** O Open-Meteo prevê até 16 dias, contando hoje. */
export const FORECAST_DAYS = 16;
/** Chance de chuva a partir da qual o dia conta como chuvoso para o validador. */
export const RAIN_CHANCE_THRESHOLD = 50;
const STALE_MS = 3 * 60 * 60 * 1000;

export function weatherKind(code: number): WeatherKind {
  if (code <= 1) return 'SOL';
  if (code <= 3) return 'NUVENS';
  if (code === 45 || code === 48) return 'NEBLINA';
  if (code >= 51 && code <= 57) return 'GAROA';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'CHUVA';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'NEVE';
  if (code >= 95) return 'TEMPESTADE';
  return 'NUVENS';
}

export function isRainy(day: DayWeather): boolean {
  if (day.rainChance !== null) return day.rainChance >= RAIN_CHANCE_THRESHOLD || day.rainMm >= 3;
  const kind = weatherKind(day.code);
  return kind === 'CHUVA' || kind === 'TEMPESTADE' || day.rainMm >= 3;
}

export function isoDate(d: TripDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function parseIsoDate(text: string): TripDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null;
}

export function geocodeUrl(destination: string): string {
  const name = encodeURIComponent(destination.trim());
  return `https://geocoding-api.open-meteo.com/v1/search?name=${name}&count=10&language=pt&format=json`;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Lê a resposta da geocodificação e escolhe o melhor resultado.
 * Se o país da viagem foi informado, prefere um resultado desse país; senão, o mais populoso vem primeiro.
 */
export function pickGeoPlace(json: unknown, country?: string): GeoPlace | null {
  const results = (json as { results?: Record<string, unknown>[] } | null)?.results;
  if (!Array.isArray(results)) return null;
  const places: GeoPlace[] = results
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number' && typeof r.name === 'string')
    .map((r) => ({
      name: r.name as string,
      country: (r.country as string) ?? '',
      countryCode: ((r.country_code as string) ?? '').toUpperCase(),
      admin1: (r.admin1 as string) || undefined,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      timezone: (r.timezone as string) || 'auto',
    }));
  if (places.length === 0) return null;
  const wanted = country ? normalize(country) : '';
  if (wanted) {
    const match = places.find((p) => normalize(p.country) === wanted || p.countryCode.toLowerCase() === wanted);
    if (match) return match;
  }
  return places[0];
}

/** Dias da viagem cobertos pela previsão a partir de hoje. Null se nenhum dia estiver na janela. */
export function forecastRange(trip: Trip, today: TripDate): { start: TripDate; end: TripDate } | null {
  const lastForecast = plusDays(today, FORECAST_DAYS - 1);
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const start = compareDates(first, today) > 0 ? first : today;
  const end = compareDates(last, lastForecast) < 0 ? last : lastForecast;
  return compareDates(start, end) <= 0 ? { start, end } : null;
}

/** Primeiro dia em que a previsão do início da viagem fica disponível. */
export function forecastAvailableFrom(trip: Trip): TripDate {
  return minusDays(trip.days[0].date, FORECAST_DAYS - 1);
}

export function forecastUrl(place: GeoPlace, range: { start: TripDate; end: TripDate }): string {
  const params = [
    `latitude=${place.latitude}`,
    `longitude=${place.longitude}`,
    'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    `timezone=${encodeURIComponent(place.timezone || 'auto')}`,
    `start_date=${isoDate(range.start)}`,
    `end_date=${isoDate(range.end)}`,
  ];
  return `https://api.open-meteo.com/v1/forecast?${params.join('&')}`;
}

export function parseForecast(json: unknown): DayWeather[] {
  const daily = (json as { daily?: Record<string, unknown[]> } | null)?.daily;
  if (!daily || !Array.isArray(daily.time)) return [];
  const at = (key: string, i: number): number | null => {
    const v = daily[key]?.[i];
    return typeof v === 'number' ? v : null;
  };
  const days: DayWeather[] = [];
  daily.time.forEach((t, i) => {
    const date = typeof t === 'string' ? parseIsoDate(t) : null;
    const maxC = at('temperature_2m_max', i);
    const minC = at('temperature_2m_min', i);
    if (!date || maxC === null || minC === null) return;
    days.push({
      date,
      code: at('weather_code', i) ?? 3,
      maxC: Math.round(maxC),
      minC: Math.round(minC),
      rainChance: at('precipitation_probability_max', i),
      rainMm: Math.round((at('precipitation_sum', i) ?? 0) * 10) / 10,
    });
  });
  return days;
}

export function weatherOn(cache: WeatherCache | undefined, date: TripDate): DayWeather | undefined {
  return cache?.days.find((d) => compareDates(d.date, date) === 0);
}

/** Marca chuva nos dias cobertos pela previsão. Dias fora dela mantêm a marcação manual. */
export function applyForecast(trip: Trip, days: DayWeather[]): Trip {
  return {
    ...trip,
    days: trip.days.map((d) => {
      const w = days.find((x) => compareDates(x.date, d.date) === 0);
      return w ? { ...d, rainExpected: isRainy(w) } : d;
    }),
  };
}

/** Junta a previsão nova com a antiga, para não perder dias já passados nem consultados. */
export function mergeForecast(old: WeatherCache | undefined, fresh: DayWeather[], fetchedAt: Date): WeatherCache {
  const kept = (old?.days ?? []).filter((d) => !fresh.some((f) => compareDates(f.date, d.date) === 0));
  const days = [...kept, ...fresh].sort((a, b) => compareDates(a.date, b.date));
  return { fetchedAt: fetchedAt.toISOString(), days };
}

export function isStale(cache: WeatherCache | undefined, now: Date): boolean {
  if (!cache) return true;
  const at = Date.parse(cache.fetchedAt);
  return !Number.isFinite(at) || now.getTime() - at > STALE_MS;
}

/** Faixa de temperatura da viagem, para sugerir roupas. */
export function temperatureRange(cache: WeatherCache | undefined, trip: Trip): { minC: number; maxC: number } | null {
  const days = trip.days.map((d) => weatherOn(cache, d.date)).filter((w): w is DayWeather => !!w);
  if (days.length === 0) return null;
  return { minC: Math.min(...days.map((d) => d.minC)), maxC: Math.max(...days.map((d) => d.maxC)) };
}
