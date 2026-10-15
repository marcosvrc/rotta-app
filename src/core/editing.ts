import { Minutes, TripDate, hm, plusDays } from './calendar';
import { ALWAYS_OPEN, DayPlan, Pace, Place, PlaceKind, Stop, Trip, sortStops, updateDay } from './model';

/** Identificador curto e único o bastante para dados guardados no aparelho. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface NewTripInput {
  destination: string;
  country: string;
  start: TripDate;
  days: number;
  travelers: number;
  budgetBrl: number;
  pace: Pace;
}

export const MAX_TRIP_DAYS = 30;

export function validateNewTrip(input: Partial<NewTripInput>): string[] {
  const errors: string[] = [];
  if (!input.destination?.trim()) errors.push('Informe o destino.');
  if (!input.start) errors.push('Informe a data de ida no formato dd/mm/aaaa.');
  if (!input.days || input.days < 1 || input.days > MAX_TRIP_DAYS) {
    errors.push(`A viagem precisa ter de 1 a ${MAX_TRIP_DAYS} dias.`);
  }
  if (!input.travelers || input.travelers < 1) errors.push('A viagem precisa ter pelo menos 1 viajante.');
  if (input.budgetBrl === undefined || input.budgetBrl < 0) errors.push('Informe um orçamento válido.');
  return errors;
}

export function createTrip(input: NewTripInput, id = makeId('viagem')): Trip {
  const days: DayPlan[] = Array.from({ length: input.days }, (_, i) => ({
    date: plusDays(input.start, i),
    title: `Dia ${i + 1}`,
    stops: [],
    availableFrom: hm(8),
    availableUntil: hm(23),
    rainExpected: false,
  }));
  return {
    id,
    destination: input.destination.trim(),
    country: input.country.trim(),
    days,
    travelers: input.travelers,
    budgetBrl: input.budgetBrl,
    pace: input.pace,
    stay: 'CONFORTO',
    food: 'MEDIA',
    places: [],
  };
}

/** Atualiza dados gerais da viagem. Mudar a data de ida desloca todos os dias. */
export function updateTripInfo(
  trip: Trip,
  info: Pick<NewTripInput, 'destination' | 'country' | 'start' | 'travelers' | 'budgetBrl' | 'pace'>,
): Trip {
  return {
    ...trip,
    destination: info.destination.trim(),
    country: info.country.trim(),
    travelers: info.travelers,
    budgetBrl: info.budgetBrl,
    pace: info.pace,
    days: trip.days.map((d, i) => ({ ...d, date: plusDays(info.start, i) })),
  };
}

export interface CustomPlaceInput {
  name: string;
  kind: PlaceKind;
  indoor: boolean;
  notes?: string;
}

export function createCustomPlace(input: CustomPlaceInput, id = makeId('lugar')): Place {
  return {
    id,
    name: input.name.trim(),
    kind: input.kind,
    neighborhood: '',
    indoor: input.indoor,
    hours: ALWAYS_OPEN,
    suggestedMinutes: 60,
    priority: 3,
    story: '',
    tips: input.notes?.trim() ? [input.notes.trim()] : [],
    custom: true,
  };
}

export function validateStop(start: Minutes | null, durationMinutes: number | null): string[] {
  const errors: string[] = [];
  if (start === null) errors.push('Informe o horário no formato hh:mm.');
  if (!durationMinutes || durationMinutes < 5) errors.push('A duração precisa ter pelo menos 5 minutos.');
  if (start !== null && durationMinutes && start + durationMinutes > 24 * 60) {
    errors.push('A parada precisa terminar até a meia-noite.');
  }
  return errors;
}

/** Coloca um lugar no roteiro do dia. Um lugar aparece no máximo uma vez na viagem. */
export function addStop(trip: Trip, dayIndex: number, place: Place, start: Minutes, durationMinutes: number): Trip {
  const withPlace = trip.places.some((p) => p.id === place.id) ? trip : { ...trip, places: [...trip.places, place] };
  const cleaned = removeStopEverywhere(withPlace, place.id);
  const stop: Stop = { placeId: place.id, start, durationMinutes };
  return updateDay(cleaned, dayIndex, (d) => ({ ...d, stops: sortStops([...d.stops, stop]) }));
}

export function updateStop(
  trip: Trip,
  dayIndex: number,
  placeId: string,
  change: { start: Minutes; durationMinutes: number; toDay?: number },
): Trip {
  const target = change.toDay ?? dayIndex;
  const removed = updateDay(trip, dayIndex, (d) => ({ ...d, stops: d.stops.filter((s) => s.placeId !== placeId) }));
  return updateDay(removed, target, (d) => ({
    ...d,
    stops: sortStops([...d.stops, { placeId, start: change.start, durationMinutes: change.durationMinutes }]),
  }));
}

export function removeStop(trip: Trip, dayIndex: number, placeId: string): Trip {
  const next = updateDay(trip, dayIndex, (d) => ({ ...d, stops: d.stops.filter((s) => s.placeId !== placeId) }));
  // Lugares criados pelo usuário somem junto; os sugeridos ficam para uso futuro.
  const place = trip.places.find((p) => p.id === placeId);
  return place?.custom ? { ...next, places: next.places.filter((p) => p.id !== placeId) } : next;
}

export function renameDay(trip: Trip, dayIndex: number, title: string): Trip {
  return updateDay(trip, dayIndex, (d) => ({ ...d, title: title.trim() || `Dia ${dayIndex + 1}` }));
}

/** Lugares da viagem que ainda não estão em nenhum dia do roteiro. */
export function unscheduledPlaces(trip: Trip): Place[] {
  const scheduled = new Set(trip.days.flatMap((d) => d.stops.map((s) => s.placeId)));
  return trip.places.filter((p) => !scheduled.has(p.id));
}

/** Sugere um horário: 30 min depois da última parada do dia, ou 9h num dia vazio. */
export function suggestStart(day: DayPlan): Minutes {
  const last = day.stops[day.stops.length - 1];
  if (!last) return Math.max(day.availableFrom, hm(9));
  const next = last.start + last.durationMinutes + 30;
  return Math.min(Math.ceil(next / 15) * 15, hm(22));
}

function removeStopEverywhere(trip: Trip, placeId: string): Trip {
  return { ...trip, days: trip.days.map((d) => ({ ...d, stops: d.stops.filter((s) => s.placeId !== placeId) })) };
}
