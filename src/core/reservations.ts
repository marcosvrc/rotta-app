import { Minutes, TripDate, compareDates } from './calendar';

export type ReservationType = 'VOO' | 'HOSPEDAGEM' | 'INGRESSO' | 'TRANSPORTE' | 'OUTRO';

export const RESERVATION_TYPE_LABEL: Record<ReservationType, string> = {
  VOO: 'Voo',
  HOSPEDAGEM: 'Hospedagem',
  INGRESSO: 'Ingresso',
  TRANSPORTE: 'Transporte',
  OUTRO: 'Outro',
};

export interface Attachment {
  /** Endereço do arquivo guardado no aparelho. */
  uri: string;
  name: string;
  mimeType?: string;
}

export interface Reservation {
  id: string;
  type: ReservationType;
  title: string;
  date: TripDate;
  time?: Minutes;
  code?: string;
  notes?: string;
  attachment?: Attachment;
}

export function sortReservations(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => compareDates(a.date, b.date) || (a.time ?? 0) - (b.time ?? 0));
}

export function groupByDate(list: Reservation[]): { date: TripDate; items: Reservation[] }[] {
  const groups: { date: TripDate; items: Reservation[] }[] = [];
  for (const r of sortReservations(list)) {
    const last = groups[groups.length - 1];
    if (last && compareDates(last.date, r.date) === 0) last.items.push(r);
    else groups.push({ date: r.date, items: [r] });
  }
  return groups;
}

export function validateReservation(r: Partial<Reservation>): string[] {
  const errors: string[] = [];
  if (!r.title?.trim()) errors.push('Dê um nome para a reserva.');
  if (!r.date) errors.push('Informe a data no formato dd/mm/aaaa.');
  return errors;
}

export function isImage(a: Attachment): boolean {
  return (a.mimeType ?? '').startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(a.name);
}
