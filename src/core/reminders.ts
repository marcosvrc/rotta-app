import { ReminderSettings, TripRecord } from './appdata';
import { TripDate, hm, minusDays, timeLabel } from './calendar';
import { dueDate } from './checklist';
import { RESERVATION_TYPE_LABEL, sortReservations } from './reservations';

export interface Reminder {
  id: string;
  title: string;
  body: string;
  /** Instante do aviso (ms desde 1970). */
  at: number;
}

/** O Android e o iOS aceitam um número limitado de avisos agendados; ficamos bem abaixo. */
export const MAX_REMINDERS = 50;

/** Diferença (ms) entre o relógio de um fuso e o UTC naquele instante. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * Instante em que o relógio de um fuso marca a data e hora pedidas.
 * Sem fuso, usa o do aparelho. Ex.: 9h em Lisboa vira o instante certo mesmo com o celular no horário de Brasília.
 */
export function zonedInstant(date: TripDate, minutes: number, timeZone: string | null): number {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!timeZone) return new Date(date.year, date.month - 1, date.day, h, m).getTime();
  try {
    const guess = Date.UTC(date.year, date.month - 1, date.day, h, m);
    const first = guess - zoneOffset(guess, timeZone);
    return guess - zoneOffset(first, timeZone);
  } catch {
    return new Date(date.year, date.month - 1, date.day, h, m).getTime();
  }
}

/** Monta os avisos de todas as viagens, só os futuros, do mais próximo ao mais distante. */
export function buildReminders(records: TripRecord[], settings: ReminderSettings, now: number, limit = MAX_REMINDERS): Reminder[] {
  if (!settings.enabled) return [];
  const list: Reminder[] = [];

  for (const r of records) {
    const trip = r.trip;
    const tz = r.geo?.timezone && r.geo.timezone !== 'auto' ? r.geo.timezone : null;

    if (settings.checklist) {
      for (const item of r.checklist) {
        const due = dueDate(item, trip.days[0].date);
        if (item.done || !due) continue;
        list.push({
          id: `checklist-${trip.id}-${item.id}`,
          title: `Checklist: ${item.title}`,
          body: `Prazo de hoje para a viagem a ${trip.destination}.`,
          // Antes da viagem, a pessoa ainda está no fuso de casa.
          at: zonedInstant(due, hm(9), null),
        });
      }
    }

    if (settings.reservations) {
      for (const res of sortReservations(r.reservations)) {
        const when = [RESERVATION_TYPE_LABEL[res.type], res.time !== undefined ? `às ${timeLabel(res.time)}` : null, res.code ? `código ${res.code}` : null]
          .filter(Boolean)
          .join(' · ');
        list.push({
          id: `reserva-vespera-${trip.id}-${res.id}`,
          title: `Amanhã: ${res.title}`,
          body: `${when}. O comprovante está no Rotta, mesmo sem internet.`,
          at: zonedInstant(minusDays(res.date, 1), hm(19), tz),
        });
        if (res.time !== undefined && res.time >= hm(2)) {
          list.push({
            id: `reserva-2h-${trip.id}-${res.id}`,
            title: `Em 2 horas: ${res.title}`,
            body: when,
            at: zonedInstant(res.date, res.time - hm(2), tz),
          });
        }
      }
    }

    if (settings.dayStart) {
      trip.days.forEach((day, i) => {
        const first = [...day.stops].sort((a, b) => a.start - b.start)[0];
        if (!first) return;
        const place = trip.places.find((p) => p.id === first.placeId);
        const count = day.stops.length;
        list.push({
          id: `dia-${trip.id}-${i}`,
          title: `Dia ${i + 1} em ${trip.destination}: ${count} ${count === 1 ? 'parada' : 'paradas'}`,
          body: `Começa às ${timeLabel(first.start)}${place ? ` em ${place.name}` : ''}.${day.rainExpected ? ' Chuva prevista: leve guarda-chuva.' : ''}`,
          at: zonedInstant(day.date, Math.max(first.start - 60, hm(7)), tz),
        });
      });
    }
  }

  return list
    .filter((x) => x.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}
