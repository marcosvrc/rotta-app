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

/** Saídas do modelo. Se não baterem com o formato, o orquestrador pede para o modelo corrigir uma vez. */
export const explainSchema = z.object({
  explanation: text(600),
  tip: text(300),
});

export const guideModelSchema = z.object({
  summary: text(500),
  sections: z
    .array(
      z.object({
        key: z.enum(['comer', 'beber', 'transporte', 'cultura', 'dicas']),
        items: z.array(z.object({ name: text(80), description: text(300) })).min(1).max(8),
      }),
    )
    .min(1)
    .max(5),
});

export const storyModelSchema = z.object({
  story: text(1500),
});

export const suggestModelSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: text(120),
        kind: z.enum(AI_PLACE_KINDS),
        indoor: z.boolean(),
        start: hhmm,
        durationMinutes: z.number().int().min(15).max(300),
        why: text(240),
      }),
    )
    .min(1)
    .max(6),
});
