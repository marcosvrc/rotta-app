import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  AppData,
  TripRecord,
  activeRecord,
  addTrip as addTripTo,
  clampExpenseDays,
  deleteTrip as deleteTripFrom,
  parseAppData,
  sampleAppData,
  updateRecord,
} from '@/core/appdata';
import { ChecklistItem } from '@/core/checklist';
import { CostEstimate, estimateCost } from '@/core/cost';
import { makeId } from '@/core/editing';
import { Expense } from '@/core/expenses';
import { PlaceCatalog, Trip, catalogOf, nightsOf } from '@/core/model';
import { mergePacking, suggestPacking } from '@/core/packing';
import { Reservation } from '@/core/reservations';
import { SosInfo, countryCodeOf, isInternational } from '@/core/sos';
import { applyForecast, isStale, mergeForecast, temperatureRange } from '@/core/weather';
import { Issue, ItineraryValidator, ValidationReport } from '@/core/validator';
import { deleteAllAttachments, deleteAttachment } from '@/state/files';
import { fetchForecast, locateDestination } from '@/state/weather';
import { ACCENT_OPTIONS, AccentId, AccentPalette, paletteFor } from '@/theme';

const STORAGE_KEY = 'rotta:dados:v1';

interface RottaState {
  ready: boolean;
  lastSavedAt: Date | null;
  data: AppData;
  record: TripRecord;
  trip: Trip;
  catalog: PlaceCatalog;
  validator: ItineraryValidator;
  report: ValidationReport;
  openIssues: Issue[];
  dismissed: Set<string>;
  estimate: CostEstimate;
  palette: AccentPalette;
  accentId: AccentId;
  interests: Set<string>;
  selectedDay: number;
  lastApplied: string | null;
  weatherStatus: WeatherStatus;

  setSelectedDay: (day: number) => void;
  clearLastApplied: () => void;
  updateTrip: (fn: (trip: Trip) => Trip) => void;
  applyFix: (issue: Issue) => void;
  keepIssue: (issue: Issue) => void;
  selectTrip: (id: string) => void;
  addTrip: (trip: Trip) => void;
  deleteTrip: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  saveReservation: (reservation: Reservation) => void;
  removeReservation: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (title: string) => void;
  removeChecklistItem: (id: string) => void;
  setAccentId: (id: AccentId) => void;
  toggleInterest: (name: string) => void;
  resetToSample: () => void;
  refreshWeather: (opts?: { force?: boolean }) => Promise<void>;
  toggleRain: (dayIndex: number) => void;
  refreshPacking: () => void;
  togglePackingItem: (id: string) => void;
  addPackingItem: (title: string) => void;
  removePackingItem: (id: string) => void;
  updateSos: (info: SosInfo) => void;
  replaceData: (data: AppData) => void;
}

export type WeatherStatus = 'idle' | 'loading' | 'ok' | 'sem-conexao' | 'nao-encontrado' | 'fora-da-janela';

const RottaContext = createContext<RottaState | null>(null);

function isAccentId(id: string): id is AccentId {
  return ACCENT_OPTIONS.some((o) => o.id === id);
}

/** Estado do app, salvo no aparelho a cada mudança. Funciona sem internet. */
export function RottaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(sampleAppData);
  const [ready, setReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega o que estiver salvo; se não houver nada, começa com a viagem de exemplo.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        const saved = parseAppData(json);
        if (saved) setData(saved);
        else setSelectedDay(1);
      })
      .catch(() => setSelectedDay(1))
      .finally(() => setReady(true));
  }, []);

  // Salva com um pequeno atraso para juntar várias mudanças seguidas.
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        .then(() => setLastSavedAt(new Date()))
        .catch(() => undefined);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, ready]);

  const record = activeRecord(data);
  const trip = record.trip;
  const catalog = useMemo(() => catalogOf(trip), [trip]);
  const validator = useMemo(() => new ItineraryValidator(catalog), [catalog]);
  const report = useMemo(() => validator.validate(trip), [validator, trip]);
  const dismissed = useMemo(() => new Set(record.dismissed), [record.dismissed]);
  const openIssues = useMemo(() => report.issues.filter((i) => !dismissed.has(i.id)), [report, dismissed]);
  const estimate = useMemo(
    () =>
      estimateCost({
        travelers: trip.travelers,
        nights: nightsOf(trip),
        days: trip.days.length,
        stay: trip.stay,
        food: trip.food,
      }),
    [trip],
  );
  const accentId: AccentId = isAccentId(data.settings.accentId) ? data.settings.accentId : 'azul';
  const palette = useMemo(() => paletteFor(accentId), [accentId]);
  const interests = useMemo(() => new Set(data.settings.interests), [data.settings.interests]);

  const updateActive = useCallback((fn: (r: TripRecord) => TripRecord) => {
    setData((d) => updateRecord(d, d.activeTripId, fn));
  }, []);

  const clearLastApplied = useCallback(() => setLastApplied(null), []);

  // Sempre lê o registro atual, para a busca de clima não usar dados antigos.
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);
  const loadingWeather = useRef(false);

  const refreshWeather = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const current = recordRef.current;
      if (loadingWeather.current) return;
      if (!force && !isStale(current.weather, new Date()) && current.geo) return;
      loadingWeather.current = true;
      setWeatherStatus('loading');
      try {
        const geo = current.geo ?? (await locateDestination(current.trip));
        if (!geo) {
          setWeatherStatus('nao-encontrado');
          return;
        }
        const result = await fetchForecast(current.trip, geo);
        const tripId = current.trip.id;
        setData((d) =>
          updateRecord(d, tripId, (r) => {
            if (result.kind !== 'ok') return { ...r, geo };
            return {
              ...r,
              geo,
              weather: mergeForecast(r.weather, result.days, new Date()),
              trip: applyForecast(r.trip, result.days),
            };
          }),
        );
        setWeatherStatus(result.kind === 'ok' ? 'ok' : 'fora-da-janela');
      } catch {
        setWeatherStatus('sem-conexao');
      } finally {
        loadingWeather.current = false;
      }
    },
    [],
  );

  // Ao trocar de viagem, o estado da busca de clima recomeça.
  const [weatherTripId, setWeatherTripId] = useState(record.trip.id);
  if (weatherTripId !== record.trip.id) {
    setWeatherTripId(record.trip.id);
    setWeatherStatus('idle');
  }

  const value: RottaState = {
    ready,
    lastSavedAt,
    data,
    record,
    trip,
    catalog,
    validator,
    report,
    openIssues,
    dismissed,
    estimate,
    palette,
    accentId,
    interests,
    selectedDay: Math.min(selectedDay, trip.days.length - 1),
    lastApplied,
    weatherStatus,

    setSelectedDay,
    clearLastApplied,
    updateTrip: (fn) =>
      updateActive((r) => {
        const trip = fn(r.trip);
        const moved = trip.destination !== r.trip.destination || trip.country !== r.trip.country;
        // Destino novo: a localização e a previsão antigas deixam de valer.
        const next = moved ? { ...r, trip, geo: undefined, weather: undefined } : { ...r, trip };
        return clampExpenseDays(next);
      }),
    applyFix: (issue) => {
      if (!issue.fix) return;
      const fix = issue.fix;
      updateActive((r) => ({ ...r, trip: new ItineraryValidator(catalogOf(r.trip)).apply(r.trip, fix) }));
      setLastApplied(issue.fixDescription);
    },
    keepIssue: (issue) => updateActive((r) => ({ ...r, dismissed: [...new Set([...r.dismissed, issue.id])] })),
    selectTrip: (id) => {
      setData((d) => ({ ...d, activeTripId: id }));
      setSelectedDay(0);
    },
    addTrip: (newTrip) => {
      setData((d) => addTripTo(d, newTrip));
      setSelectedDay(0);
    },
    deleteTrip: (id) => {
      const target = data.trips.find((r) => r.trip.id === id);
      target?.reservations.forEach((r) => deleteAttachment(r.attachment));
      setData((d) => deleteTripFrom(d, id));
      setSelectedDay(0);
    },
    addExpense: (expense) => updateActive((r) => ({ ...r, expenses: [...r.expenses, { ...expense, id: makeId('gasto') }] })),
    removeExpense: (id) => updateActive((r) => ({ ...r, expenses: r.expenses.filter((e) => e.id !== id) })),
    saveReservation: (reservation) =>
      updateActive((r) => {
        const old = r.reservations.find((x) => x.id === reservation.id);
        if (old?.attachment && old.attachment.uri !== reservation.attachment?.uri) deleteAttachment(old.attachment);
        const others = r.reservations.filter((x) => x.id !== reservation.id);
        return { ...r, reservations: [...others, reservation] };
      }),
    removeReservation: (id) =>
      updateActive((r) => {
        deleteAttachment(r.reservations.find((x) => x.id === id)?.attachment);
        return { ...r, reservations: r.reservations.filter((x) => x.id !== id) };
      }),
    toggleChecklistItem: (id) =>
      updateActive((r) => ({ ...r, checklist: r.checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
    addChecklistItem: (title) =>
      updateActive((r) => {
        const item: ChecklistItem = { id: makeId('item'), group: 'OUTROS', title: title.trim(), done: false };
        return { ...r, checklist: [...r.checklist, item] };
      }),
    removeChecklistItem: (id) => updateActive((r) => ({ ...r, checklist: r.checklist.filter((i) => i.id !== id) })),
    setAccentId: (id) => setData((d) => ({ ...d, settings: { ...d.settings, accentId: id } })),
    toggleInterest: (name) =>
      setData((d) => {
        const list = d.settings.interests;
        const next = list.includes(name) ? list.filter((n) => n !== name) : [...list, name];
        return { ...d, settings: { ...d.settings, interests: next } };
      }),
    resetToSample: () => {
      deleteAllAttachments();
      setData(sampleAppData());
      setSelectedDay(1);
      setLastApplied(null);
    },
    refreshWeather,
    toggleRain: (dayIndex) =>
      updateActive((r) => ({
        ...r,
        trip: { ...r.trip, days: r.trip.days.map((d, i) => (i === dayIndex ? { ...d, rainExpected: !d.rainExpected } : d)) },
      })),
    refreshPacking: () =>
      updateActive((r) => {
        const code = countryCodeOf(r.trip.country, r.geo?.countryCode);
        const suggestions = suggestPacking({
          days: r.trip.days.length,
          rainyDays: r.trip.days.filter((d) => d.rainExpected).length,
          temperature: temperatureRange(r.weather, r.trip),
          international: isInternational(code),
          beach: r.trip.days.some((d) => d.stops.some((s) => r.trip.places.find((p) => p.id === s.placeId)?.kind === 'Praia')),
        });
        return { ...r, packing: mergePacking(r.packing, suggestions) };
      }),
    togglePackingItem: (id) =>
      updateActive((r) => ({ ...r, packing: r.packing.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })),
    addPackingItem: (title) =>
      updateActive((r) => ({
        ...r,
        packing: [...r.packing, { id: makeId('mala'), category: 'OUTROS', title: title.trim(), done: false, custom: true }],
      })),
    removePackingItem: (id) => updateActive((r) => ({ ...r, packing: r.packing.filter((i) => i.id !== id) })),
    updateSos: (info) => updateActive((r) => ({ ...r, sos: info })),
    replaceData: (next) => {
      deleteAllAttachments();
      setData(next);
      setSelectedDay(0);
      setLastApplied(null);
    },
  };

  return <RottaContext.Provider value={value}>{children}</RottaContext.Provider>;
}

export function useRotta(): RottaState {
  const ctx = useContext(RottaContext);
  if (!ctx) throw new Error('useRotta precisa estar dentro de RottaProvider');
  return ctx;
}

export function usePalette(): AccentPalette {
  return useRotta().palette;
}
