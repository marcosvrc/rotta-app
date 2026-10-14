import { CostEstimate } from './cost';

export type ExpenseCategory = 'ALIMENTACAO' | 'TRANSPORTE' | 'PASSEIOS' | 'HOSPEDAGEM' | 'COMPRAS' | 'OUTROS';
export type PaymentMethod = 'CREDITO' | 'DEBITO' | 'PIX' | 'DINHEIRO';

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  ALIMENTACAO: 'Alimentação',
  TRANSPORTE: 'Transporte',
  PASSEIOS: 'Passeios',
  HOSPEDAGEM: 'Hospedagem',
  COMPRAS: 'Compras',
  OUTROS: 'Outros',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
};

export interface Expense {
  id: string;
  /** Dia da viagem (0 = primeiro dia). */
  dayIndex: number;
  description: string;
  category: ExpenseCategory;
  payment: PaymentMethod;
  amountBrl: number;
}

export interface ExpenseGroup<K extends string> {
  key: K;
  totalBrl: number;
  share: number;
}

export interface ExpenseSummary {
  totalBrl: number;
  count: number;
  byDay: number[];
  byCategory: ExpenseGroup<ExpenseCategory>[];
  byPayment: ExpenseGroup<PaymentMethod>[];
  /** Previsto por dia no simulador, sem as passagens (pagas antes da viagem). */
  plannedPerDayBrl: number;
  plannedTripBrl: number;
}

function groupBy<K extends string>(expenses: Expense[], key: (e: Expense) => K, total: number): ExpenseGroup<K>[] {
  const sums = new Map<K, number>();
  for (const e of expenses) sums.set(key(e), (sums.get(key(e)) ?? 0) + e.amountBrl);
  return [...sums.entries()]
    .map(([k, v]) => ({ key: k, totalBrl: round2(v), share: total > 0 ? v / total : 0 }))
    .sort((a, b) => b.totalBrl - a.totalBrl);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function summarizeExpenses(expenses: Expense[], days: number, estimate: CostEstimate): ExpenseSummary {
  const totalBrl = round2(expenses.reduce((s, e) => s + e.amountBrl, 0));
  const byDay = Array.from({ length: days }, (_, i) =>
    round2(expenses.filter((e) => e.dayIndex === i).reduce((s, e) => s + e.amountBrl, 0)),
  );
  const flights = estimate.lines.find((l) => l.category === 'PASSAGENS')?.valueBrl ?? 0;
  const plannedTripBrl = estimate.totalBrl - flights;
  return {
    totalBrl,
    count: expenses.length,
    byDay,
    byCategory: groupBy(expenses, (e) => e.category, totalBrl),
    byPayment: groupBy(expenses, (e) => e.payment, totalBrl),
    plannedPerDayBrl: days > 0 ? Math.round(plannedTripBrl / days) : 0,
    plannedTripBrl,
  };
}

export function validateExpense(e: Partial<Expense>): string[] {
  const errors: string[] = [];
  if (!e.amountBrl || e.amountBrl <= 0) errors.push('Informe um valor, por exemplo 35,50.');
  if (!e.description?.trim()) errors.push('Descreva o gasto.');
  return errors;
}
