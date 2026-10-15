/**
 * Contrato entre o app e o orquestrador de IA (Cloud Function "ia").
 * Este arquivo também é compilado pelas functions: não importe nada de fora dele.
 */

export const AI_PLACE_KINDS = [
  'Monumento',
  'Museu',
  'Bairro',
  'Mirante',
  'Restaurante',
  'Mercado',
  'Parque',
  'Praia',
  'Compras',
  'Outro',
] as const;

export type AiPlaceKind = (typeof AI_PLACE_KINDS)[number];

export interface ExplainIssueInput {
  destination: string;
  dayLabel: string;
  placeName: string;
  issueKind: string;
  issueText: string;
  fixDescription?: string;
}

export interface ExplainIssueOutput {
  explanation: string;
  tip: string;
}

export interface GuideInput {
  destination: string;
  country: string;
}

export type GuideSectionKey = 'comer' | 'beber' | 'transporte' | 'cultura' | 'dicas';

export const GUIDE_SECTION_TITLE: Record<GuideSectionKey, string> = {
  comer: 'O que comer',
  beber: 'O que beber',
  transporte: 'Como se locomover',
  cultura: 'Cultura e costumes',
  dicas: 'Dicas práticas',
};

export interface GuideItem {
  name: string;
  description: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface GuideOutput {
  summary: string;
  sections: { key: GuideSectionKey; items: GuideItem[] }[];
  sources: Source[];
}

export interface StoryInput {
  placeName: string;
  city: string;
  country: string;
}

export interface StoryOutput {
  /** false quando a Wikipedia não tem artigo sobre o lugar. */
  found: boolean;
  story: string;
  source?: Source;
}

export interface SuggestInput {
  destination: string;
  country: string;
  dayLabel: string;
  rain: boolean;
  pace: 'LEVE' | 'MEDIO' | 'INTENSO';
  interests: string[];
  travelers: number;
  /** Lugares que já estão no roteiro, para não repetir. */
  existing: string[];
  /** Janela livre do dia, "HH:MM". */
  from: string;
  until: string;
  count: number;
}

export interface Suggestion {
  name: string;
  kind: AiPlaceKind;
  indoor: boolean;
  start: string;
  durationMinutes: number;
  why: string;
}

export interface SuggestOutput {
  suggestions: Suggestion[];
  sources: Source[];
}

export type AiRequest =
  | { task: 'explicar_alerta'; input: ExplainIssueInput }
  | { task: 'guia_destino'; input: GuideInput }
  | { task: 'historia_lugar'; input: StoryInput }
  | { task: 'sugerir_paradas'; input: SuggestInput };

export type AiTask = AiRequest['task'];

export interface AiOutputs {
  explicar_alerta: ExplainIssueOutput;
  guia_destino: GuideOutput;
  historia_lugar: StoryOutput;
  sugerir_paradas: SuggestOutput;
}

export interface AiResponse<T extends AiTask = AiTask> {
  data: AiOutputs[T];
  /** Veio do cache: não contou no limite diário. */
  cached: boolean;
  /** Chamadas que ainda restam hoje. */
  remaining: number;
}

/** Códigos de erro que o app traduz para o usuário. */
export const AI_ERROR_MESSAGE: Record<string, string> = {
  unauthenticated: 'Entre na sua conta para usar a IA.',
  'resource-exhausted': 'Você chegou ao limite de pedidos à IA de hoje. Amanhã libera de novo.',
  'invalid-argument': 'Pedido inválido para a IA.',
  'failed-precondition': 'A IA ainda não está configurada no servidor.',
  unavailable: 'A IA está indisponível agora. Tente de novo em alguns minutos.',
  'deadline-exceeded': 'A IA demorou demais para responder. Tente de novo.',
  internal: 'A IA respondeu algo inesperado. Tente de novo.',
};
