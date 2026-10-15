import { FetchLike } from './wiki';

/**
 * Raciocínio interno do modelo. "off" desliga (mais rápido e barato; serve para modelos em que é opcional).
 * Modelos com raciocínio obrigatório (ex.: Claude Sonnet 5.5) exigem um esforço, como "low".
 * Os tokens de raciocínio contam no limite de tokens da resposta.
 */
export type Reasoning = 'off' | 'low' | 'medium' | 'high';

export interface ChatRequest {
  model: string;
  reasoning: Reasoning;
  system: string;
  user: string;
  maxTokens: number;
}

export interface ChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  /** Custo em créditos do OpenRouter, quando informado. */
  cost: number;
  /** "length" quando a resposta foi cortada por falta de tokens. */
  finishReason?: string;
}

export type Llm = (req: ChatRequest) => Promise<ChatResult>;

export class LlmError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** Modelos com raciocínio podem levar mais de um minuto em respostas longas. */
const TIMEOUT_MS = 110_000;

type PostFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => ReturnType<FetchLike>;

/** Cliente mínimo do OpenRouter (chat completions, resposta em JSON). A chave nunca sai do servidor. */
export function openRouter(apiKey: string, fetcher: PostFetch, baseUrl = 'https://openrouter.ai/api/v1'): Llm {
  return async ({ model, reasoning, system, user, maxTokens }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetcher(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/marcosvrc/rotta-app',
          'X-Title': 'Rotta',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          reasoning: reasoning === 'off' ? { enabled: false } : { effort: reasoning, exclude: true },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new LlmError(`OpenRouter respondeu ${res.status}`, res.status === 429 || res.status >= 500);
      const body = (await res.json()) as {
        choices?: { message?: { content?: string }; error?: { message?: string }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
      };
      const choice = body.choices?.[0];
      if (choice?.error) throw new LlmError(`Erro do modelo: ${choice.error.message ?? ''}`, true);
      const text = choice?.message?.content;
      // Conteúdo vazio acontece quando o raciocínio interno do modelo gasta todo o limite de tokens.
      // O orquestrador trata como resposta cortada e tenta de novo com mais espaço.
      return {
        text: text ?? '',
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
        cost: body.usage?.cost ?? 0,
        finishReason: choice?.finish_reason,
      };
    } catch (e) {
      if (e instanceof LlmError) throw e;
      throw new LlmError(controller.signal.aborted ? 'Tempo esgotado' : 'Falha de rede', true);
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Lê o JSON da resposta, mesmo que o modelo tenha embrulhado em ```json. */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) throw new SyntaxError('Sem JSON na resposta');
  return JSON.parse(trimmed.slice(start, end + 1));
}
