import { Expense } from './expenses';

export interface Participant {
  id: string;
  name: string;
}

export interface Balance {
  participantId: string;
  /** Quanto pagou do próprio bolso. */
  paidBrl: number;
  /** Sua parte nos gastos divididos. */
  shareBrl: number;
  /** Positivo: tem a receber. Negativo: deve. */
  netBrl: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountBrl: number;
}

export interface Settlement {
  balances: Balance[];
  transfers: Transfer[];
  /** Gastos sem pagador definido, que ficam fora da divisão. */
  unassigned: number;
  sharedTotalBrl: number;
}

const cents = (v: number) => Math.round(v * 100);

/** Quem participa de um gasto: os escolhidos ou, sem escolha, todos. */
export function splitOf(expense: Expense, participants: Participant[]): string[] {
  const ids = new Set(participants.map((p) => p.id));
  const chosen = (expense.splitWith ?? []).filter((id) => ids.has(id));
  return chosen.length > 0 ? chosen : participants.map((p) => p.id);
}

/**
 * Calcula saldos e o menor conjunto prático de transferências para zerar as contas.
 * Tudo em centavos, para a soma fechar exatamente.
 */
export function settle(expenses: Expense[], participants: Participant[]): Settlement {
  const ids = new Set(participants.map((p) => p.id));
  const paid = new Map(participants.map((p) => [p.id, 0]));
  const share = new Map(participants.map((p) => [p.id, 0]));
  let unassigned = 0;
  let sharedTotal = 0;

  for (const e of expenses) {
    if (!e.paidBy || !ids.has(e.paidBy)) {
      unassigned++;
      continue;
    }
    const total = cents(e.amountBrl);
    sharedTotal += total;
    paid.set(e.paidBy, paid.get(e.paidBy)! + total);
    const members = splitOf(e, participants);
    const base = Math.floor(total / members.length);
    let rest = total - base * members.length;
    // Os centavos que sobram vão para os primeiros da lista, um para cada.
    for (const id of members) {
      share.set(id, share.get(id)! + base + (rest > 0 ? 1 : 0));
      if (rest > 0) rest--;
    }
  }

  const balances = participants.map((p) => {
    const net = paid.get(p.id)! - share.get(p.id)!;
    return { participantId: p.id, paidBrl: paid.get(p.id)! / 100, shareBrl: share.get(p.id)! / 100, netBrl: net / 100 };
  });

  const creditors = balances.filter((b) => b.netBrl > 0).map((b) => ({ id: b.participantId, left: cents(b.netBrl) }));
  const debtors = balances.filter((b) => b.netBrl < 0).map((b) => ({ id: b.participantId, left: -cents(b.netBrl) }));
  creditors.sort((a, b) => b.left - a.left);
  debtors.sort((a, b) => b.left - a.left);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left);
    if (amount > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amountBrl: amount / 100 });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left === 0) i++;
    if (creditors[j].left === 0) j++;
  }

  return { balances, transfers, unassigned, sharedTotalBrl: sharedTotal / 100 };
}

/** Ao tirar alguém da viagem, os gastos pagos por essa pessoa ficam sem pagador e ela sai das divisões. */
export function removeParticipant(expenses: Expense[], participantId: string): Expense[] {
  return expenses.map((e) => {
    const splitWith = e.splitWith?.filter((id) => id !== participantId);
    return {
      ...e,
      paidBy: e.paidBy === participantId ? undefined : e.paidBy,
      splitWith: splitWith && splitWith.length > 0 ? splitWith : undefined,
    };
  });
}

export function validateParticipantName(name: string, participants: Participant[]): string | null {
  const clean = name.trim();
  if (!clean) return 'Digite um nome.';
  if (clean.length > 30) return 'Use um nome com até 30 letras.';
  if (participants.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return 'Já tem alguém com esse nome.';
  return null;
}
