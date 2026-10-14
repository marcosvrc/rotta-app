/** Dia da semana, com os textos usados nas telas. */
export type Weekday = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO';

export const WEEKDAYS: readonly Weekday[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO'];

export const WEEKDAY_LABELS: Record<Weekday, { short: string; long: string; every: string }> = {
  SEGUNDA: { short: 'Seg', long: 'segunda', every: 'às segundas' },
  TERCA: { short: 'Ter', long: 'terça', every: 'às terças' },
  QUARTA: { short: 'Qua', long: 'quarta', every: 'às quartas' },
  QUINTA: { short: 'Qui', long: 'quinta', every: 'às quintas' },
  SEXTA: { short: 'Sex', long: 'sexta', every: 'às sextas' },
  SABADO: { short: 'Sáb', long: 'sábado', every: 'aos sábados' },
  DOMINGO: { short: 'Dom', long: 'domingo', every: 'aos domingos' },
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const MINUTES_IN_DAY = 24 * 60;

/** Horário do dia em minutos desde a meia-noite (0 a 1440). */
export type Minutes = number;

export function hm(hour: number, minute = 0): Minutes {
  return hour * 60 + minute;
}

/** Ex.: 545 -> "09:05". */
export function timeLabel(minutes: Minutes): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Data simples do calendário, sem fuso horário. */
export interface TripDate {
  year: number;
  month: number;
  day: number;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function tripDate(year: number, month: number, day: number): TripDate {
  if (month < 1 || month > 12) throw new Error(`Mês inválido: ${month}`);
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`Dia inválido: ${day}/${month}/${year}`);
  return { year, month, day };
}

export function weekdayOf(date: TripDate): Weekday {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = date.month < 3 ? date.year - 1 : date.year;
  const w =
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[date.month - 1] + date.day) % 7; // 0 = domingo
  return (['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'] as const)[w];
}

export function plusDays(date: TripDate, days: number): TripDate {
  let { year, month, day } = date;
  day += days;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { year, month, day };
}

export function minusDays(date: TripDate, days: number): TripDate {
  let { year, month, day } = date;
  day -= days;
  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += daysInMonth(year, month);
  }
  return { year, month, day };
}

export function compareDates(a: TripDate, b: TripDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Ex.: "13/11/2026". */
export function formatDateBr(date: TripDate): string {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
}

/** Aceita "13/11/2026" ou "13/11/26". Devolve null se a data não existir. */
export function parseDateBr(text: string): TripDate | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Aceita "9:30", "09:30" ou "930". Devolve null se o horário não existir. */
export function parseTime(text: string): Minutes | null {
  const m = text.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Ex.: "Sex, 13 nov". */
export function shortDateLabel(date: TripDate): string {
  return `${WEEKDAY_LABELS[weekdayOf(date)].short}, ${date.day} ${MONTHS[date.month - 1]}`;
}

/** Ex.: "12 a 16 de nov". */
export function rangeLabel(start: TripDate, end: TripDate): string {
  if (start.month === end.month) return `${start.day} a ${end.day} de ${MONTHS[end.month - 1]}`;
  return `${start.day} ${MONTHS[start.month - 1]} a ${end.day} ${MONTHS[end.month - 1]}`;
}
