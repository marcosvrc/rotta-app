import { GuideOutput } from './ai';
import { ChecklistItem, defaultChecklist } from './checklist';
import { CachedRate, currencyForCountry } from './currency';
import { Expense } from './expenses';
import { Participant } from './split';
import { PackingItem } from './packing';
import { SosInfo, countryCodeOf } from './sos';
import { GeoPlace, WeatherCache } from './weather';
import { Trip } from './model';
import { Reservation } from './reservations';
import { lisboaChecklist, lisboaExpenses, lisboaGeo, lisboaReservations, lisboaSos, lisboaTrip } from './sample/lisboa';

/** Tudo que o app guarda de uma viagem. */
export interface TripRecord {
  trip: Trip;
  expenses: Expense[];
  reservations: Reservation[];
  checklist: ChecklistItem[];
  /** Alertas que o usuário escolheu manter como estavam. */
  dismissed: string[];
  packing: PackingItem[];
  sos: SosInfo;
  /** Destino localizado, para clima e números de emergência. */
  geo?: GeoPlace;
  /** Última previsão do tempo consultada, guardada para uso offline. */
  weather?: WeatherCache;
  /** Pessoas que dividem os gastos. */
  participants: Participant[];
  /** Moeda local da viagem, para registrar gastos (ex.: "EUR"). */
  currency?: string;
  /** Guia do destino gerado pela IA, guardado para ler sem internet. */
  guide?: { data: GuideOutput; fetchedAt: string };
  /** Momento da última mudança (ms desde 1970), usado na sincronização com a nuvem. */
  updatedAt: number;
}

/** Viagem apagada neste aparelho e que ainda precisa ser apagada na nuvem. */
export interface Tombstone {
  id: string;
  at: number;
}

export interface ReminderSettings {
  /** Ligado depois que o usuário autoriza as notificações. */
  enabled: boolean;
  checklist: boolean;
  reservations: boolean;
  dayStart: boolean;
}

export interface Settings {
  accentId: string;
  interests: string[];
  reminders: ReminderSettings;
}

/** Dados salvos no aparelho. Mudou o formato? Suba a versão e migre em `parseAppData`. */
export interface AppData {
  version: 1;
  activeTripId: string;
  trips: TripRecord[];
  settings: Settings;
  tombstones: Tombstone[];
  /** Últimas cotações, por moeda, para converter gastos sem internet. */
  rates: Record<string, CachedRate>;
}

export const DEFAULT_REMINDERS: ReminderSettings = { enabled: false, checklist: true, reservations: true, dayStart: true };

export const DEFAULT_SETTINGS: Settings = { accentId: 'azul', interests: ['História', 'Gastronomia'], reminders: DEFAULT_REMINDERS };

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
        packing: [],
        sos: lisboaSos(),
        geo: lisboaGeo(),
        participants: [],
        currency: 'EUR',
        updatedAt: 0,
      },
    ],
    settings: DEFAULT_SETTINGS,
    tombstones: [],
    rates: {},
  };
}

/** Lê os dados salvos. Devolve null se estiverem vazios, corrompidos ou num formato desconhecido. */
export function parseAppData(json: string | null): AppData | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as Partial<AppData>;
    if (data.version !== 1 || !Array.isArray(data.trips) || data.trips.length === 0) return null;
    if (!data.trips.some((r) => r?.trip?.id === data.activeTripId)) return null;
    const trips = (data.trips as Partial<TripRecord>[]).map(migrateRecord);
    return {
      ...(data as AppData),
      trips,
      settings: {
        ...DEFAULT_SETTINGS,
        ...data.settings,
        reminders: { ...DEFAULT_REMINDERS, ...data.settings?.reminders },
      },
      tombstones: Array.isArray(data.tombstones) ? data.tombstones : [],
      rates: data.rates && typeof data.rates === 'object' ? data.rates : {},
    };
  } catch {
    return null;
  }
}

/** Completa registros salvos por versões anteriores do app com os campos novos. */
function migrateRecord(r: Partial<TripRecord>): TripRecord {
  return {
    trip: r.trip!,
    expenses: r.expenses ?? [],
    reservations: r.reservations ?? [],
    checklist: r.checklist ?? [],
    dismissed: r.dismissed ?? [],
    packing: r.packing ?? [],
    sos: r.sos ?? {},
    geo: r.geo,
    weather: r.weather,
    guide: r.guide,
    participants: Array.isArray(r.participants) ? r.participants : [],
    currency: r.currency,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
  };
}

export function emptyRecord(trip: Trip, now = 0): TripRecord {
  return {
    trip,
    expenses: [],
    reservations: [],
    checklist: defaultChecklist(),
    dismissed: [],
    packing: [],
    sos: {},
    participants: [],
    updatedAt: now,
  };
}

const BACKUP_APP = 'rotta';

/**
 * Gera o arquivo de backup. Anexos ficam de fora: são arquivos do aparelho e não cabem no backup.
 */
export function exportBackup(data: AppData, now: Date): string {
  const trips = data.trips.map((r) => ({
    ...r,
    reservations: r.reservations.map(({ attachment: _attachment, ...rest }) => rest),
  }));
  return JSON.stringify({ app: BACKUP_APP, exportedAt: now.toISOString(), data: { ...data, trips, tombstones: [] } }, null, 2);
}

/** Lê um backup. Devolve null se o arquivo não for um backup válido do Rotta. */
export function parseBackup(text: string): AppData | null {
  try {
    const parsed = JSON.parse(text) as { app?: string; data?: unknown };
    if (parsed?.app !== BACKUP_APP || !parsed.data) return null;
    return parseAppData(JSON.stringify(parsed.data));
  } catch {
    return null;
  }
}

export function backupFileName(now: Date): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `rotta-backup-${d}.json`;
}

export function activeRecord(data: AppData): TripRecord {
  return data.trips.find((r) => r.trip.id === data.activeTripId) ?? data.trips[0];
}

/**
 * Aplica uma mudança na viagem. Com `now`, marca a hora para a sincronização saber o que é mais novo;
 * sem ele (dados derivados, como a previsão do tempo), a hora não muda.
 */
export function updateRecord(data: AppData, tripId: string, fn: (r: TripRecord) => TripRecord, now?: number): AppData {
  return {
    ...data,
    trips: data.trips.map((r) => {
      if (r.trip.id !== tripId) return r;
      const next = fn(r);
      return now === undefined ? next : { ...next, updatedAt: now };
    }),
  };
}

export function addTrip(data: AppData, trip: Trip, now = 0): AppData {
  return { ...data, trips: [...data.trips, emptyRecord(trip, now)], activeTripId: trip.id };
}

/** Remove a viagem. A última viagem não pode ser removida. */
export function deleteTrip(data: AppData, tripId: string, now = 0): AppData {
  if (data.trips.length <= 1) return data;
  const trips = data.trips.filter((r) => r.trip.id !== tripId);
  const activeTripId = data.activeTripId === tripId ? trips[0].trip.id : data.activeTripId;
  const tombstones = [...data.tombstones.filter((t) => t.id !== tripId), { id: tripId, at: now }];
  return { ...data, trips, activeTripId, tombstones };
}

/** Dias de um gasto ou de um item que deixaram de existir quando a viagem encurtou. */
export function clampExpenseDays(record: TripRecord): TripRecord {
  const last = record.trip.days.length - 1;
  return { ...record, expenses: record.expenses.map((e) => (e.dayIndex > last ? { ...e, dayIndex: last } : e)) };
}

/** Moeda local da viagem: a escolhida pelo usuário ou a do país do destino. */
export function tripCurrencyOf(record: TripRecord): string {
  return record.currency ?? currencyForCountry(countryCodeOf(record.trip.country, record.geo?.countryCode));
}
