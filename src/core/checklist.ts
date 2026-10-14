import { TripDate, minusDays } from './calendar';
import { makeId } from './editing';

export type ChecklistGroup = 'DOCUMENTOS' | 'RESERVAS' | 'DINHEIRO' | 'VESPERA' | 'OUTROS';

export const CHECKLIST_GROUP_LABEL: Record<ChecklistGroup, string> = {
  DOCUMENTOS: 'Documentos',
  RESERVAS: 'Reservas',
  DINHEIRO: 'Dinheiro e conexão',
  VESPERA: 'Na véspera',
  OUTROS: 'Outros',
};

export const CHECKLIST_GROUPS: ChecklistGroup[] = ['DOCUMENTOS', 'RESERVAS', 'DINHEIRO', 'VESPERA', 'OUTROS'];

export interface ChecklistItem {
  id: string;
  group: ChecklistGroup;
  title: string;
  hint?: string;
  /** Prazo em dias antes da ida. */
  dueDaysBefore?: number;
  done: boolean;
}

const TEMPLATE: Omit<ChecklistItem, 'id' | 'done'>[] = [
  { group: 'DOCUMENTOS', title: 'Documento de viagem válido', hint: 'Confira a validade exigida pelo destino', dueDaysBefore: 30 },
  { group: 'DOCUMENTOS', title: 'Regras de entrada do destino', hint: 'Visto, vacinas e comprovantes na fonte oficial', dueDaysBefore: 30 },
  { group: 'DOCUMENTOS', title: 'Seguro viagem', hint: 'Guarde a apólice no celular e impressa', dueDaysBefore: 14 },
  { group: 'RESERVAS', title: 'Passagens de ida e volta', dueDaysBefore: 30 },
  { group: 'RESERVAS', title: 'Hospedagem para todas as noites', dueDaysBefore: 21 },
  { group: 'DINHEIRO', title: 'Avisar o banco e liberar o cartão', hint: 'Evita bloqueio por compra no exterior', dueDaysBefore: 7 },
  { group: 'DINHEIRO', title: 'Chip ou eSIM para o destino', hint: 'Ative antes do embarque', dueDaysBefore: 7 },
  { group: 'DINHEIRO', title: 'Adaptador de tomada', hint: 'Confira o padrão de tomada do destino', dueDaysBefore: 7 },
  { group: 'VESPERA', title: 'Check-in online do voo', dueDaysBefore: 1 },
  { group: 'VESPERA', title: 'Conferir reservas e ingressos no app', hint: 'Ficam disponíveis mesmo sem internet', dueDaysBefore: 1 },
];

export function defaultChecklist(idFor: (i: number) => string = () => makeId('item')): ChecklistItem[] {
  return TEMPLATE.map((t, i) => ({ ...t, id: idFor(i), done: false }));
}

export function dueDate(item: ChecklistItem, tripStart: TripDate): TripDate | null {
  return item.dueDaysBefore === undefined ? null : minusDays(tripStart, item.dueDaysBefore);
}

export function checklistProgress(items: ChecklistItem[]): { done: number; total: number; share: number } {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, share: items.length ? done / items.length : 0 };
}
