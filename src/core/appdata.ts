import { ChecklistItem, defaultChecklist } from './checklist';
import { Expense } from './expenses';
import { Trip } from './model';
import { Reservation } from './reservations';
import { lisboaChecklist, lisboaExpenses, lisboaReservations, lisboaTrip } from './sample/lisboa';

/** Tudo que o app guarda de uma viagem. */
export interface TripRecord {
  trip: Trip;
  expenses: Expense[];
  reservations: Reservation[];
  checklist: ChecklistItem[];
  /** Alertas que o usuário escolheu manter como estavam. */
  dismissed: string[];
}

export interface Settings {
  accentId: string;
  interests: string[];
}

/** Dados salvos no aparelho. Mudou o formato? Suba a versão e migre em `parseAppData`. */
export interface AppData {
  version: 1;
  activeTripId: string;
  trips: TripRecord[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { accentId: 'azul', interests: ['História', 'Gastronomia'] };

export function sampleAppData(): AppData {
  const trip = lisboaTrip();
  return {
    version: 1,
    activeTripId: trip.id,
    trips: [
      {
        trip,
        expenses: lisboaExpenses(),
        reservations: lisboaReservations(),
        checklist: lisboaChecklist(),
        dismissed: [],
      },
    ],
    settings: DEFAULT_SETTINGS,
  };
}

/** Lê os dados salvos. Devolve null se estiverem vazios, corrompidos ou num formato desconhecido. */
export function parseAppData(json: string | null): AppData | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as Partial<AppData>;
    if (data.version !== 1 || !Array.isArray(data.trips) || data.trips.length === 0) return null;
    if (!data.trips.some((r) => r?.trip?.id === data.activeTripId)) return null;
    return { ...(data as AppData), settings: { ...DEFAULT_SETTINGS, ...data.settings } };
  } catch {
    return null;
  }
}

export function activeRecord(data: AppData): TripRecord {
  return data.trips.find((r) => r.trip.id === data.activeTripId) ?? data.trips[0];
}

export function updateRecord(data: AppData, tripId: string, fn: (r: TripRecord) => TripRecord): AppData {
  return { ...data, trips: data.trips.map((r) => (r.trip.id === tripId ? fn(r) : r)) };
}

export function addTrip(data: AppData, trip: Trip): AppData {
  const record: TripRecord = { trip, expenses: [], reservations: [], checklist: defaultChecklist(), dismissed: [] };
  return { ...data, trips: [...data.trips, record], activeTripId: trip.id };
}

/** Remove a viagem. A última viagem não pode ser removida. */
export function deleteTrip(data: AppData, tripId: string): AppData {
  if (data.trips.length <= 1) return data;
  const trips = data.trips.filter((r) => r.trip.id !== tripId);
  const activeTripId = data.activeTripId === tripId ? trips[0].trip.id : data.activeTripId;
  return { ...data, trips, activeTripId };
}

/** Dias de um gasto ou de um item que deixaram de existir quando a viagem encurtou. */
export function clampExpenseDays(record: TripRecord): TripRecord {
  const last = record.trip.days.length - 1;
  return { ...record, expenses: record.expenses.map((e) => (e.dayIndex > last ? { ...e, dayIndex: last } : e)) };
}
