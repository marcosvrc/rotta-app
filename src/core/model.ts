import { MINUTES_IN_DAY, Minutes, TripDate, WEEKDAYS, WEEKDAY_LABELS, Weekday, rangeLabel, timeLabel } from './calendar';
import { FoodLevel, StayLevel } from './cost';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type PlaceKind =
  | 'Monumento'
  | 'Museu'
  | 'Mercado'
  | 'Doceria'
  | 'Restaurante'
  | 'Mirante'
  | 'Bairro'
  | 'Palácio'
  | 'Aquário'
  | 'Centro criativo'
  | 'Parque'
  | 'Praia'
  | 'Compras'
  | 'Outro';

export const PLACE_KINDS: PlaceKind[] = [
  'Monumento',
  'Museu',
  'Restaurante',
  'Mercado',
  'Mirante',
  'Bairro',
  'Parque',
  'Praia',
  'Compras',
  'Outro',
];

/** Horário de funcionamento. `closes` pode ser 1440 (meia-noite). */
export interface OpeningHours {
  opens: Minutes;
  closes: Minutes;
  closedOn: Weekday[];
}

export const ALWAYS_OPEN: OpeningHours = { opens: 0, closes: MINUTES_IN_DAY, closedOn: [] };

export function isOpenOn(hours: OpeningHours, day: Weekday): boolean {
  return !hours.closedOn.includes(day);
}

/** Ex.: "10:00 às 17:30 · fechado às segundas". */
export function hoursLabel(hours: OpeningHours): string {
  if (hours.opens === 0 && hours.closes === MINUTES_IN_DAY && hours.closedOn.length === 0) return 'Aberto o tempo todo';
  const base =
    hours.closes === MINUTES_IN_DAY
      ? `${timeLabel(hours.opens)} à meia-noite`
      : `${timeLabel(hours.opens)} às ${timeLabel(hours.closes)}`;
  if (hours.closedOn.length === 0) return `${base} · todos os dias`;
  const closed = WEEKDAYS.filter((d) => hours.closedOn.includes(d))
    .map((d) => WEEKDAY_LABELS[d].every)
    .join(' e ');
  return `${base} · fechado ${closed}`;
}

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  neighborhood: string;
  /** Sem coordenadas, o app não estima o deslocamento até a parada. */
  location?: GeoPoint;
  /** Coberto: serve de plano B quando chove. */
  indoor: boolean;
  hours: OpeningHours;
  suggestedMinutes: number;
  /** 1 (pode sair do roteiro) a 5 (imperdível). */
  priority: number;
  story: string;
  tips: string[];
  sourceUrl?: string;
  /** Criado pelo usuário, sem dados do Google Places. */
  custom?: boolean;
}

export class PlaceCatalog {
  private readonly byId: Map<string, Place>;

  constructor(readonly all: Place[]) {
    this.byId = new Map(all.map((p) => [p.id, p]));
  }

  get(id: string): Place {
    const place = this.byId.get(id);
    if (!place) throw new Error(`Lugar desconhecido: ${id}`);
    return place;
  }
}

export interface Stop {
  placeId: string;
  start: Minutes;
  durationMinutes: number;
}

export function stopEnd(stop: Stop): Minutes {
  return Math.min(stop.start + stop.durationMinutes, MINUTES_IN_DAY);
}

export interface DayPlan {
  date: TripDate;
  title: string;
  stops: Stop[];
  /** Primeiro horário livre no dia (ex.: depois do check-in). */
  availableFrom: Minutes;
  /** Último horário livre no dia (ex.: antes do voo de volta). */
  availableUntil: Minutes;
  rainExpected: boolean;
}

export type Pace = 'LEVE' | 'MEDIO' | 'INTENSO';

export const PACES: Record<Pace, { label: string; maxMinutesPerDay: number }> = {
  LEVE: { label: 'Leve', maxMinutesPerDay: 6 * 60 },
  MEDIO: { label: 'Médio', maxMinutesPerDay: 8 * 60 },
  INTENSO: { label: 'Intenso', maxMinutesPerDay: 10 * 60 },
};

export interface Trip {
  id: string;
  destination: string;
  country: string;
  days: DayPlan[];
  travelers: number;
  budgetBrl: number;
  pace: Pace;
  stay: StayLevel;
  food: FoodLevel;
  /** Lugares da viagem: os do roteiro e os sugeridos que ainda não entraram nele. */
  places: Place[];
}

export function catalogOf(trip: Trip): PlaceCatalog {
  return new PlaceCatalog(trip.places);
}

export function nightsOf(trip: Trip): number {
  return trip.days.length - 1;
}

export function stopCount(trip: Trip): number {
  return trip.days.reduce((sum, d) => sum + d.stops.length, 0);
}

export function tripRangeLabel(trip: Trip): string {
  return rangeLabel(trip.days[0].date, trip.days[trip.days.length - 1].date);
}

export function dayIndexOf(trip: Trip, placeId: string): number | null {
  const i = trip.days.findIndex((d) => d.stops.some((s) => s.placeId === placeId));
  return i >= 0 ? i : null;
}

export function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => a.start - b.start);
}

/** Atualiza um dia e mantém as paradas em ordem de horário. */
export function updateDay(trip: Trip, index: number, transform: (day: DayPlan) => DayPlan): Trip {
  return {
    ...trip,
    days: trip.days.map((day, i) => {
      if (i !== index) return day;
      const next = transform(day);
      return { ...next, stops: sortStops(next.stops) };
    }),
  };
}
