import { makeId } from './editing';

export type PackingCategory = 'ROUPAS' | 'CALCADOS' | 'HIGIENE' | 'ELETRONICOS' | 'DOCUMENTOS' | 'ACESSORIOS' | 'OUTROS';

export const PACKING_CATEGORY_LABEL: Record<PackingCategory, string> = {
  DOCUMENTOS: 'Documentos e dinheiro',
  ROUPAS: 'Roupas',
  CALCADOS: 'Calçados',
  HIGIENE: 'Higiene',
  ELETRONICOS: 'Eletrônicos',
  ACESSORIOS: 'Acessórios',
  OUTROS: 'Outros',
};

export const PACKING_CATEGORIES: PackingCategory[] = [
  'DOCUMENTOS',
  'ROUPAS',
  'CALCADOS',
  'HIGIENE',
  'ELETRONICOS',
  'ACESSORIOS',
  'OUTROS',
];

export interface PackingItem {
  id: string;
  category: PackingCategory;
  title: string;
  /** Quantidade por pessoa. */
  quantity?: number;
  /** Por que o item foi sugerido, ex.: "Chuva prevista em 2 dias". */
  reason?: string;
  done: boolean;
  /** Adicionado pelo usuário: nunca é removido ao atualizar as sugestões. */
  custom?: boolean;
}

export interface PackingContext {
  days: number;
  /** Dias com chuva prevista ou marcada no roteiro. */
  rainyDays: number;
  /** Faixa de temperatura prevista, quando houver previsão. */
  temperature: { minC: number; maxC: number } | null;
  /** Viagem para fora do Brasil. */
  international: boolean;
  /** Algum lugar do roteiro é praia. */
  beach: boolean;
}

/** Até uma semana de roupa: depois disso, a sugestão assume que dá para lavar. */
const LAUNDRY_DAYS = 7;

type Suggestion = Omit<PackingItem, 'id' | 'done'>;

export function suggestPacking(ctx: PackingContext): Suggestion[] {
  const days = Math.max(1, ctx.days);
  const clothes = Math.min(days, LAUNDRY_DAYS) + 1;
  const laundry = days > LAUNDRY_DAYS ? 'Conta com lavar roupa no meio da viagem' : undefined;
  const t = ctx.temperature;
  const items: Suggestion[] = [];
  const add = (category: PackingCategory, title: string, extra: Partial<Suggestion> = {}) =>
    items.push({ category, title, ...extra });

  add('DOCUMENTOS', ctx.international ? 'Passaporte' : 'Documento com foto');
  add('DOCUMENTOS', 'Cartões e um pouco de dinheiro vivo');
  if (ctx.international) add('DOCUMENTOS', 'Apólice do seguro viagem');

  add('ROUPAS', 'Camisetas ou blusas', { quantity: clothes, reason: laundry });
  add('ROUPAS', 'Roupas íntimas', { quantity: clothes, reason: laundry });
  add('ROUPAS', 'Meias', { quantity: clothes, reason: laundry });
  add('ROUPAS', 'Calças ou bermudas', { quantity: Math.max(1, Math.ceil(Math.min(days, LAUNDRY_DAYS) / 3)) });
  add('ROUPAS', 'Pijama');

  if (t && t.minC < 12) {
    add('ROUPAS', 'Casaco quente', { reason: `Mínima prevista de ${t.minC} °C` });
    add('ACESSORIOS', 'Gorro, luvas e cachecol', { reason: `Mínima prevista de ${t.minC} °C` });
  } else if (!t || t.minC < 18) {
    add('ROUPAS', 'Casaco leve ou moletom', { reason: t ? `Mínima prevista de ${t.minC} °C` : 'Para as noites mais frescas' });
  }
  if (t && t.maxC >= 26) {
    add('HIGIENE', 'Protetor solar', { reason: `Máxima prevista de ${t.maxC} °C` });
    add('ACESSORIOS', 'Óculos de sol e boné', { reason: `Máxima prevista de ${t.maxC} °C` });
  }
  if (ctx.rainyDays > 0) {
    const reason = ctx.rainyDays === 1 ? 'Chuva prevista em 1 dia' : `Chuva prevista em ${ctx.rainyDays} dias`;
    add('ACESSORIOS', 'Guarda-chuva compacto', { reason });
    add('ROUPAS', 'Capa ou jaqueta impermeável', { reason });
  }
  if (ctx.beach) {
    add('ROUPAS', 'Roupa de banho', { reason: 'Tem praia no roteiro' });
    add('CALCADOS', 'Chinelo', { reason: 'Tem praia no roteiro' });
    add('ACESSORIOS', 'Toalha de praia', { reason: 'Tem praia no roteiro' });
    if (!t || t.maxC < 26) add('HIGIENE', 'Protetor solar', { reason: 'Tem praia no roteiro' });
  }

  add('CALCADOS', 'Tênis confortável para caminhar');
  if (days >= 4) add('CALCADOS', 'Um segundo par de calçados', { reason: 'Para revezar e deixar secar' });

  add('HIGIENE', 'Escova e pasta de dente');
  add('HIGIENE', 'Desodorante');
  add('HIGIENE', 'Remédios de uso pessoal', { reason: 'Leve na bagagem de mão, com receita se precisar' });

  add('ELETRONICOS', 'Carregador do celular');
  add('ELETRONICOS', 'Bateria externa');
  if (ctx.international) add('ELETRONICOS', 'Adaptador de tomada', { reason: 'Confira o padrão de tomada do destino' });

  add('ACESSORIOS', 'Garrafa de água reutilizável');
  return items;
}

function key(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Atualiza a lista com novas sugestões sem perder o que o usuário já marcou ou adicionou.
 * Sugestões que deixaram de valer saem, a menos que já estejam marcadas como na mala.
 */
export function mergePacking(
  current: PackingItem[],
  suggestions: Suggestion[],
  idFor: () => string = () => makeId('mala'),
): PackingItem[] {
  const byTitle = new Map(current.map((i) => [key(i.title), i]));
  const merged: PackingItem[] = suggestions.map((s) => {
    const old = byTitle.get(key(s.title));
    return old && !old.custom ? { ...s, id: old.id, done: old.done } : { ...s, id: idFor(), done: false };
  });
  const suggested = new Set(suggestions.map((s) => key(s.title)));
  const keep = current.filter((i) => !suggested.has(key(i.title)) && (i.custom || i.done));
  return [...merged, ...keep];
}

export function packingProgress(items: PackingItem[]): { done: number; total: number; share: number } {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, share: items.length ? done / items.length : 0 };
}
