import { SuggestInput, Suggestion } from './ai';
import { WEEKDAY_LABELS, hm, parseTime, shortDateLabel, timeLabel, weekdayOf } from './calendar';
import { addStop, createCustomPlace, makeId, suggestStart } from './editing';
import { Trip } from './model';

/** Monta o pedido de sugestões para um dia, a partir do que o app já sabe da viagem. */
export function suggestInputFor(trip: Trip, dayIndex: number, interests: string[], count: number): SuggestInput {
  const day = trip.days[dayIndex];
  const from = day.stops.length > 0 ? suggestStart(day) : Math.max(day.availableFrom, hm(9));
  const until = Math.min(day.availableUntil, hm(22));
  const existing = trip.days.flatMap((d) => d.stops.map((s) => trip.places.find((p) => p.id === s.placeId)?.name ?? '')).filter(Boolean);
  return {
    destination: trip.destination,
    country: trip.country,
    dayLabel: `${WEEKDAY_LABELS[weekdayOf(day.date)].long}, ${shortDateLabel(day.date).split(', ')[1]}`,
    rain: day.rainExpected,
    pace: trip.pace,
    interests: interests.slice(0, 12),
    travelers: trip.travelers,
    existing: existing.slice(0, 60),
    from: timeLabel(from),
    until: timeLabel(until),
    count,
  };
}

/** Coloca as sugestões escolhidas no roteiro como lugares próprios. O validador confere o resultado. */
export function addSuggestions(trip: Trip, dayIndex: number, suggestions: Suggestion[], idFor: () => string = () => makeId('lugar')): Trip {
  return suggestions.reduce((t, s) => {
    const start = parseTime(s.start);
    if (start === null) return t;
    const place = { ...createCustomPlace({ name: s.name, kind: s.kind, indoor: s.indoor, notes: s.why }, idFor()), suggestedMinutes: s.durationMinutes };
    return addStop(t, dayIndex, place, start, s.durationMinutes);
  }, trip);
}
