import { Minutes, WEEKDAY_LABELS, timeLabel, weekdayOf } from './calendar';
import { formatDuration } from './format';
import { DayPlan, PACES, PlaceCatalog, Stop, Trip, dayIndexOf, isOpenOn, sortStops, stopCount, stopEnd, updateDay } from './model';
import { TRAVEL_MODE_LABEL, distanceKm, legBetween } from './travel';

export type Severity = 'CRITICA' | 'ATENCAO';
export type IssueKind = 'FECHADO' | 'HORARIO' | 'DESLOCAMENTO' | 'CLIMA' | 'RITMO';

export const ISSUE_KIND_LABEL: Record<IssueKind, string> = {
  FECHADO: 'Fechado',
  HORARIO: 'Horário',
  DESLOCAMENTO: 'Deslocamento',
  CLIMA: 'Clima',
  RITMO: 'Ritmo',
};

/** Correção que o plano B propõe. Aplicar é sempre uma escolha do usuário. */
export type Fix =
  | { type: 'MOVE'; fromDay: number; placeId: string; toDay: number; newStart: Minutes }
  | { type: 'REPLACE'; day: number; placeId: string; newPlaceId: string; durationMinutes: number }
  | { type: 'REMOVE'; day: number; placeId: string }
  | { type: 'SHIFT'; day: number; fromIndex: number; minutes: number };

export interface Issue {
  id: string;
  kind: IssueKind;
  severity: Severity;
  dayIndex: number;
  placeId: string | null;
  title: string;
  detail: string;
  fixDescription: string | null;
  fix: Fix | null;
}

export interface ValidationReport {
  issues: Issue[];
  checkedStops: number;
  passedChecks: string[];
  critical: number;
  warnings: number;
  /** 100 é um roteiro sem pendências. */
  score: number;
}

const BUFFER_MINUTES = 30;
const MIN_VISIT_MINUTES = 45;

export function scoreFor(issues: Pick<Issue, 'severity'>[]): number {
  const critical = issues.filter((i) => i.severity === 'CRITICA').length;
  const warnings = issues.length - critical;
  return Math.max(0, 100 - 12 * critical - 6 * warnings);
}

/**
 * Confere o roteiro com regras determinísticas: lugar fechado, horário,
 * deslocamento, clima e ritmo. A IA só entra para explicar ou sugerir;
 * a checagem em si é sempre feita aqui, em código.
 */
export class ItineraryValidator {
  constructor(private readonly catalog: PlaceCatalog) {}

  validate(trip: Trip): ValidationReport {
    const issues: Issue[] = [];
    trip.days.forEach((day, dayIndex) => {
      const weekday = weekdayOf(day.date);
      day.stops.forEach((stop, stopIndex) => {
        const place = this.catalog.get(stop.placeId);
        if (!isOpenOn(place.hours, weekday)) {
          issues.push(this.closedIssue(trip, dayIndex, stop));
          return;
        }
        if (stop.start < place.hours.opens) {
          const wait = place.hours.opens - stop.start;
          issues.push({
            id: `HORARIO-${dayIndex}-${stop.placeId}`,
            kind: 'HORARIO',
            severity: 'ATENCAO',
            dayIndex,
            placeId: stop.placeId,
            title: `${place.name} ainda estará fechado`,
            detail: `A visita começa às ${timeLabel(stop.start)}, mas o lugar só abre às ${timeLabel(place.hours.opens)}.`,
            fixDescription: `Adiar esta parada e as seguintes em ${formatDuration(wait)}.`,
            fix: { type: 'SHIFT', day: dayIndex, fromIndex: stopIndex, minutes: wait },
          });
        } else if (stopEnd(stop) > place.hours.closes) {
          issues.push({
            id: `HORARIO-${dayIndex}-${stop.placeId}`,
            kind: 'HORARIO',
            severity: 'ATENCAO',
            dayIndex,
            placeId: stop.placeId,
            title: `${place.name} fecha antes do fim da visita`,
            detail: `O lugar fecha às ${timeLabel(place.hours.closes)} e a visita vai até ${timeLabel(stopEnd(stop))}.`,
            fixDescription: null,
            fix: null,
          });
        }
        if (day.rainExpected && !place.indoor) {
          issues.push(this.rainIssue(trip, dayIndex, stop));
        }
      });
      issues.push(...this.transferIssues(dayIndex, day));
      const load = this.loadIssue(trip, dayIndex, day);
      if (load) issues.push(load);
    });

    const order: Record<Severity, number> = { CRITICA: 0, ATENCAO: 1 };
    issues.sort((a, b) => order[a.severity] - order[b.severity] || a.dayIndex - b.dayIndex);
    const critical = issues.filter((i) => i.severity === 'CRITICA').length;
    return {
      issues,
      checkedStops: stopCount(trip),
      passedChecks: this.passedChecks(trip, issues),
      critical,
      warnings: issues.length - critical,
      score: scoreFor(issues),
    };
  }

  /** Minutos de visitas mais deslocamentos no dia. */
  dayLoadMinutes(day: DayPlan): number {
    let total = day.stops.reduce((sum, s) => sum + s.durationMinutes, 0);
    for (let i = 0; i < day.stops.length - 1; i++) {
      total += this.legMinutes(day.stops[i].placeId, day.stops[i + 1].placeId);
    }
    return total;
  }

  apply(trip: Trip, fix: Fix): Trip {
    switch (fix.type) {
      case 'MOVE': {
        const stop = trip.days[fix.fromDay].stops.find((s) => s.placeId === fix.placeId);
        if (!stop) return trip;
        const removed = updateDay(trip, fix.fromDay, (d) => ({
          ...d,
          stops: d.stops.filter((s) => s.placeId !== fix.placeId),
        }));
        return updateDay(removed, fix.toDay, (d) => ({ ...d, stops: sortStops([...d.stops, { ...stop, start: fix.newStart }]) }));
      }
      case 'REPLACE':
        return updateDay(trip, fix.day, (d) => ({
          ...d,
          stops: d.stops.map((s) =>
            s.placeId === fix.placeId ? { ...s, placeId: fix.newPlaceId, durationMinutes: fix.durationMinutes } : s,
          ),
        }));
      case 'REMOVE':
        return updateDay(trip, fix.day, (d) => ({ ...d, stops: d.stops.filter((s) => s.placeId !== fix.placeId) }));
      case 'SHIFT':
        return updateDay(trip, fix.day, (d) => ({
          ...d,
          stops: d.stops.map((s, i) => (i >= fix.fromIndex ? { ...s, start: s.start + fix.minutes } : s)),
        }));
    }
  }

  private closedIssue(trip: Trip, dayIndex: number, stop: Stop): Issue {
    const place = this.catalog.get(stop.placeId);
    const day = trip.days[dayIndex];
    // Dia mais leve em que o lugar abre e há uma janela livre.
    let best: { load: number; day: number; start: Minutes } | null = null;
    trip.days.forEach((other, otherIndex) => {
      if (otherIndex === dayIndex || !isOpenOn(place.hours, weekdayOf(other.date))) return;
      const slot = this.findSlot(other, stop.durationMinutes, place.hours.opens, place.hours.closes);
      if (slot === null) return;
      const load = this.dayLoadMinutes(other);
      if (best === null || load < best.load) best = { load, day: otherIndex, start: slot };
    });
    const target = best as { load: number; day: number; start: Minutes } | null;
    return {
      id: `FECHADO-${dayIndex}-${stop.placeId}`,
      kind: 'FECHADO',
      severity: 'CRITICA',
      dayIndex,
      placeId: stop.placeId,
      title: place.name,
      detail: `O lugar não abre ${WEEKDAY_LABELS[weekdayOf(day.date)].every}.`,
      fixDescription: target
        ? `Mover para o dia ${target.day + 1} (${WEEKDAY_LABELS[weekdayOf(trip.days[target.day].date)].long}), às ${timeLabel(target.start)}, onde há uma janela livre.`
        : null,
      fix: target ? { type: 'MOVE', fromDay: dayIndex, placeId: stop.placeId, toDay: target.day, newStart: target.start } : null,
    };
  }

  private rainIssue(trip: Trip, dayIndex: number, stop: Stop): Issue {
    const place = this.catalog.get(stop.placeId);
    const day = trip.days[dayIndex];
    const weekday = weekdayOf(day.date);
    const candidates = this.catalog.all
      .filter((p) => p.indoor && dayIndexOf(trip, p.id) === null && isOpenOn(p.hours, weekday) && stop.start >= p.hours.opens)
      .map((p) => ({
        place: p,
        duration: Math.min(p.suggestedMinutes, p.hours.closes - stop.start, day.availableUntil - stop.start),
      }))
      .filter((c) => c.duration >= MIN_VISIT_MINUTES)
      .sort((a, b) => this.distance(place.location, a.place.location) - this.distance(place.location, b.place.location));
    const alt = candidates[0];
    const leg = alt ? legBetween(place.location, alt.place.location) : null;
    return {
      id: `CLIMA-${dayIndex}-${stop.placeId}`,
      kind: 'CLIMA',
      severity: 'ATENCAO',
      dayIndex,
      placeId: stop.placeId,
      title: `Chuva prevista em ${place.name}`,
      detail: `Parada ao ar livre às ${timeLabel(stop.start)}, num dia com chuva prevista.`,
      fixDescription: alt
        ? leg
          ? `Trocar por ${alt.place.name}, coberto e a ${leg.minutes} min ${TRAVEL_MODE_LABEL[leg.mode]}.`
          : `Trocar por ${alt.place.name}, que é coberto.`
        : null,
      fix: alt
        ? { type: 'REPLACE', day: dayIndex, placeId: stop.placeId, newPlaceId: alt.place.id, durationMinutes: alt.duration }
        : null,
    };
  }

  private transferIssues(dayIndex: number, day: DayPlan): Issue[] {
    const issues: Issue[] = [];
    for (let i = 0; i < day.stops.length - 1; i++) {
      const a = day.stops[i];
      const b = day.stops[i + 1];
      const from = this.catalog.get(a.placeId);
      const to = this.catalog.get(b.placeId);
      const leg = legBetween(from.location, to.location);
      const gap = b.start - stopEnd(a);
      // Sem coordenadas não dá para estimar o trajeto, mas paradas sobrepostas são sempre um problema.
      const needed = leg ? leg.minutes : 0;
      if (gap >= needed) continue;
      const missing = Math.ceil((needed - gap) / 5) * 5;
      issues.push({
        id: `DESLOCAMENTO-${dayIndex}-${b.placeId}`,
        kind: 'DESLOCAMENTO',
        severity: 'ATENCAO',
        dayIndex,
        placeId: b.placeId,
        title: leg ? `Não dá tempo de chegar a ${to.name}` : `${to.name} começa antes de ${from.name} terminar`,
        detail: leg
          ? `São cerca de ${leg.minutes} min ${TRAVEL_MODE_LABEL[leg.mode]} desde ${from.name}, e o intervalo é de ${Math.max(gap, 0)} min.`
          : `As duas paradas se sobrepõem em ${-gap} min.`,
        fixDescription: `Adiar ${to.name} e as paradas seguintes em ${formatDuration(missing)}.`,
        fix: { type: 'SHIFT', day: dayIndex, fromIndex: i + 1, minutes: missing },
      });
    }
    return issues;
  }

  private loadIssue(trip: Trip, dayIndex: number, day: DayPlan): Issue | null {
    const load = this.dayLoadMinutes(day);
    const pace = PACES[trip.pace];
    if (load <= pace.maxMinutesPerDay || day.stops.length < 2) return null;
    const lightest = [...day.stops].sort(
      (a, b) =>
        this.catalog.get(a.placeId).priority - this.catalog.get(b.placeId).priority ||
        b.durationMinutes - a.durationMinutes,
    )[0];
    const place = this.catalog.get(lightest.placeId);
    return {
      id: `RITMO-${dayIndex}`,
      kind: 'RITMO',
      severity: 'ATENCAO',
      dayIndex,
      placeId: null,
      title: `Dia pesado: ${formatDuration(load)} de programação`,
      detail: `O ritmo ${pace.label.toLowerCase()} prevê até ${formatDuration(pace.maxMinutesPerDay)} por dia, contando os deslocamentos.`,
      fixDescription: `Tirar ${place.name} e deixar o dia mais leve.`,
      fix: { type: 'REMOVE', day: dayIndex, placeId: lightest.placeId },
    };
  }

  /** Primeiro horário (de 15 em 15 min) com folga de 30 min para as outras paradas. */
  private findSlot(day: DayPlan, duration: number, opens: Minutes, closes: Minutes): Minutes | null {
    const limit = Math.min(closes, day.availableUntil);
    for (let t = Math.max(opens, day.availableFrom); t + duration <= limit; t += 15) {
      const free = day.stops.every(
        (s) => t + duration + BUFFER_MINUTES <= s.start || t >= stopEnd(s) + BUFFER_MINUTES,
      );
      if (free) return t;
    }
    return null;
  }

  private passedChecks(trip: Trip, issues: Issue[]): string[] {
    const kinds = new Set(issues.map((i) => i.kind));
    const result: string[] = [];
    if (!kinds.has('FECHADO') && !kinds.has('HORARIO')) {
      result.push(`Horários de abertura conferidos nas ${stopCount(trip)} paradas`);
    }
    if (!kinds.has('DESLOCAMENTO')) result.push('Os deslocamentos cabem entre as paradas');
    const max = PACES[trip.pace].maxMinutesPerDay;
    const lightDays = trip.days.filter((d) => this.dayLoadMinutes(d) <= max).length;
    result.push(`Ritmo dentro do combinado em ${lightDays} de ${trip.days.length} dias`);
    if (!kinds.has('CLIMA')) result.push('Nenhuma parada ao ar livre em dia de chuva');
    return result;
  }

  private legMinutes(fromId: string, toId: string): number {
    return legBetween(this.catalog.get(fromId).location, this.catalog.get(toId).location)?.minutes ?? 0;
  }

  private distance(a?: { lat: number; lng: number }, b?: { lat: number; lng: number }): number {
    return a && b ? distanceKm(a, b) : Number.POSITIVE_INFINITY;
  }
}
