import { Source } from '../../src/core/ai';

/** A Wikimedia pede um User-Agent que identifique o app. */
const USER_AGENT = 'Rotta/0.5 (https://github.com/marcosvrc/rotta-app)';
const TIMEOUT_MS = 8000;
/** Limite do texto de referência enviado ao modelo (custo e foco). */
export const MAX_SOURCE_CHARS = 12_000;

export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

async function getJson(fetcher: FetchLike, url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export interface WikiText {
  text: string;
  source: Source;
}

/** Resumo do artigo da Wikipedia mais relevante para a busca. Tenta português e depois inglês. */
export async function wikipediaSummary(fetcher: FetchLike, query: string): Promise<WikiText | null> {
  for (const lang of ['pt', 'en']) {
    const search = (await getJson(
      fetcher,
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`,
    )) as { query?: { search?: { title: string }[] } };
    const title = search.query?.search?.[0]?.title;
    if (!title) continue;
    const summary = (await getJson(
      fetcher,
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    )) as { extract?: string; title?: string; type?: string; content_urls?: { desktop?: { page?: string } } };
    if (!summary.extract || summary.type === 'disambiguation') continue;
    return {
      text: summary.extract.slice(0, MAX_SOURCE_CHARS),
      source: {
        title: `Wikipedia: ${summary.title ?? title}`,
        url: summary.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      },
    };
  }
  return null;
}

/** Texto do guia do Wikivoyage sobre o destino. Tenta português e depois inglês. */
export async function wikivoyageText(fetcher: FetchLike, destination: string): Promise<WikiText | null> {
  for (const lang of ['pt', 'en']) {
    const data = (await getJson(
      fetcher,
      `https://${lang}.wikivoyage.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(destination)}`,
    )) as { query?: { pages?: Record<string, { title?: string; extract?: string; missing?: string }> } };
    const page = Object.values(data.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined || !page.extract || page.extract.length < 500) continue;
    const title = page.title ?? destination;
    return {
      text: page.extract.slice(0, MAX_SOURCE_CHARS),
      source: { title: `Wikivoyage: ${title}`, url: `https://${lang}.wikivoyage.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` },
    };
  }
  return null;
}
