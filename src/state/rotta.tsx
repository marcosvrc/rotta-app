import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { CostEstimate, FoodLevel, StayLevel, estimateCost } from '@/core/cost';
import { Trip, nightsOf } from '@/core/model';
import { lisboaCatalog, lisboaTrip } from '@/core/sample/lisboa';
import { Issue, ItineraryValidator, ValidationReport } from '@/core/validator';
import { AccentId, AccentPalette, paletteFor } from '@/theme';

interface RottaState {
  trip: Trip;
  setTrip: (trip: Trip) => void;
  catalog: typeof lisboaCatalog;
  validator: ItineraryValidator;
  report: ValidationReport;
  openIssues: Issue[];
  dismissed: Set<string>;
  keepIssue: (issue: Issue) => void;
  applyFix: (issue: Issue) => void;
  lastApplied: string | null;
  clearLastApplied: () => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  accentId: AccentId;
  setAccentId: (id: AccentId) => void;
  palette: AccentPalette;
  stay: StayLevel;
  setStay: (s: StayLevel) => void;
  food: FoodLevel;
  setFood: (f: FoodLevel) => void;
  estimate: CostEstimate;
  interests: Set<string>;
  toggleInterest: (name: string) => void;
}

const RottaContext = createContext<RottaState | null>(null);

/** Estado da sessão. Ainda em memória: o Firestore entra na próxima etapa. */
export function RottaProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip>(lisboaTrip);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [accentId, setAccentId] = useState<AccentId>('azul');
  const [stay, setStay] = useState<StayLevel>('CONFORTO');
  const [food, setFood] = useState<FoodLevel>('MEDIA');
  const [interests, setInterests] = useState<Set<string>>(new Set(['História', 'Gastronomia']));

  const validator = useMemo(() => new ItineraryValidator(lisboaCatalog), []);
  const report = useMemo(() => validator.validate(trip), [validator, trip]);
  const openIssues = useMemo(() => report.issues.filter((i) => !dismissed.has(i.id)), [report, dismissed]);
  const estimate = useMemo(
    () => estimateCost({ travelers: trip.travelers, nights: nightsOf(trip), days: trip.days.length, stay, food }),
    [trip, stay, food],
  );
  const palette = useMemo(() => paletteFor(accentId), [accentId]);
  const clearLastApplied = useCallback(() => setLastApplied(null), []);

  const value: RottaState = {
    trip,
    setTrip,
    catalog: lisboaCatalog,
    validator,
    report,
    openIssues,
    dismissed,
    keepIssue: (issue) => setDismissed((prev) => new Set(prev).add(issue.id)),
    applyFix: (issue) => {
      if (!issue.fix) return;
      setTrip((current) => validator.apply(current, issue.fix!));
      setLastApplied(issue.fixDescription);
    },
    lastApplied,
    clearLastApplied,
    selectedDay: Math.min(selectedDay, trip.days.length - 1),
    setSelectedDay,
    accentId,
    setAccentId,
    palette,
    stay,
    setStay,
    food,
    setFood,
    estimate,
    interests,
    toggleInterest: (name) =>
      setInterests((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      }),
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
