import { z } from 'zod';

import { AI_PLACE_KINDS } from '../../src/core/ai';

const text = (max: number) => z.string().trim().min(1).max(max);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Entradas aceitas pela função. Tudo que vem do app é validado antes de chegar ao modelo. */
export const requestSchema = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('explicar_alerta'),
    input: z.object({
      destination: text(80),
      dayLabel: text(60),
      placeName: text(120),
      issueKind: text(60),
      issueText: text(400),
      fixDescription: z.string().max(300).optional(),
    }),
  }),
  z.object({
    task: z.literal('guia_destino'),
    input: z.object({ destination: text(80), country: z.string().max(60) }),
  }),
  z.object({
    task: z.literal('historia_lugar'),
    input: z.object({ placeName: text(120), city: text(80), country: z.string().max(60) }),
  }),
  z.object({
    task: z.literal('sugerir_paradas'),
    input: z.object({
      destination: text(80),
      country: z.string().max(60),
      dayLabel: text(60),
      rain: z.boolean(),
      pace: z.enum(['LEVE', 'MEDIO', 'INTENSO']),
      interests: z.array(text(40)).max(12),
      travelers: z.number().int().min(1).max(20),
      existing: z.array(text(120)).max(60),
      from: hhmm,
      until: hhmm,
      count: z.number().int().min(1).max(6),
    }),
  }),
]);

/**
 * Saídas do modelo. São tolerantes com excessos (texto longo demais, itens a mais, seção desconhecida):
 * cortam em vez de recusar. Só recusam o que não dá para aproveitar, e aí o orquestrador pede correção uma vez.
 */
const clip = (max: number) => z.string().trim().min(1).transform((v) => (v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v));
const upTo = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(z.unknown())
    .transform((list) =>
      list.flatMap((x) => {
        const r = item.safeParse(x);
        return r.success ? [r.data as z.output<T>] : [];
      }),
    )
    .refine((list) => list.length > 0, 'nenhum item válido')
    .transform((list) => list.slice(0, max));

export const explainSchema = z.object({
  explanation: clip(600),
  tip: clip(300),
});

const minutes = z.coerce.number().transform((v) => Math.min(300, Math.max(15, Math.round(v))));

export const guideModelSchema = z.object({
  summary: clip(500),
  sections: upTo(
    z.object({
      key: z.enum(['comer', 'beber', 'transporte', 'cultura', 'dicas']),
      items: upTo(z.object({ name: clip(80), description: clip(300) }), 8),
    }),
    5,
  ),
});

export const storyModelSchema = z.object({
  story: clip(1500),
});

export const suggestModelSchema = z.object({
  suggestions: upTo(
    z.object({
      name: clip(120),
      kind: z.enum(AI_PLACE_KINDS).catch('Outro'),
      indoor: z.boolean(),
      start: z
        .string()
        .trim()
        .transform((v) => (/^\d:\d\d$/.test(v) ? `0${v}` : v))
        .pipe(hhmm),
      durationMinutes: minutes,
      why: clip(240),
    }),
    6,
  ),
});
