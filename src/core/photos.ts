/**
 * Fotos dos lugares vindas do Wikimedia Commons (gratuito, sem chave).
 * As licenças (CC BY, CC BY-SA...) exigem mostrar autor, licença e link: por isso cada foto guarda esses dados.
 */

export interface Photo {
  /** Miniatura em largura de tela. */
  url: string;
  width: number;
  height: number;
  author: string;
  license: string;
  /** Página da foto no Commons (autor, licença completa, original). */
  sourceUrl: string;
}

export interface PlacePhotos {
  photos: Photo[];
  /** ISO 8601 da busca; lista vazia com data significa "procurado e não achado". */
  fetchedAt: string;
}

export const MAX_PHOTOS = 6;
const WIDTH = 1000;
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

const api = (host: string, params: Record<string, string>) =>
  `https://${host}/w/api.php?${Object.entries({ ...params, format: 'json', origin: '*' })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;

/** Foto principal do artigo da Wikipedia sobre o lugar. */
export function pageImageUrl(query: string, lang = 'pt'): string {
  return api(`${lang}.wikipedia.org`, {
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '1',
    prop: 'pageimages',
    piprop: 'name',
  });
}

const IMAGE_INFO = { prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: String(WIDTH), iiextmetadatafilter: 'Artist|LicenseShortName' };

export function fileInfoUrl(fileName: string): string {
  return api('commons.wikimedia.org', { action: 'query', titles: `File:${fileName}`, ...IMAGE_INFO });
}

/** Busca de fotos no Commons pelo nome do lugar e da cidade. */
export function commonsSearchUrl(query: string): string {
  return api('commons.wikimedia.org', {
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    ...IMAGE_INFO,
  });
}

export function parsePageImage(json: unknown): string | null {
  const pages = (json as { query?: { pages?: Record<string, { pageimage?: string }> } } | null)?.query?.pages;
  const page = pages ? Object.values(pages)[0] : undefined;
  return page?.pageimage ?? null;
}

/** Tira o HTML do campo de autor do Commons (costuma vir como link). */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ImageInfoPage {
  index?: number;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
  }[];
}

/** Lê fotos do Commons. Ignora ilustrações (SVG, mapas, brasões) e fotos sem licença informada. */
export function parseImageInfo(json: unknown): Photo[] {
  const pages = (json as { query?: { pages?: Record<string, ImageInfoPage> } } | null)?.query?.pages;
  if (!pages) return [];
  return Object.values(pages)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap((p) => {
      const info = p.imageinfo?.[0];
      const license = plainText(info?.extmetadata?.LicenseShortName?.value ?? '');
      if (!info?.thumburl || !info.descriptionurl || !ACCEPTED.has(info.mime ?? '') || !license) return [];
      const width = info.thumbwidth ?? WIDTH;
      const height = info.thumbheight ?? Math.round(WIDTH * 0.66);
      // Fotos muito estreitas ou muito altas costumam ser plantas, mapas ou recortes.
      if (width / height > 2.6 || height / width > 1.6) return [];
      const author = plainText(info.extmetadata?.Artist?.value ?? '').slice(0, 80) || 'Autor desconhecido';
      return [{ url: info.thumburl, width, height, author, license, sourceUrl: info.descriptionurl }];
    });
}

/** Junta a foto do artigo (mais representativa) com as da busca, sem repetir. */
export function mergePhotos(first: Photo[], rest: Photo[]): Photo[] {
  const seen = new Set<string>();
  return [...first, ...rest]
    .filter((p) => {
      if (seen.has(p.sourceUrl)) return false;
      seen.add(p.sourceUrl);
      return true;
    })
    .slice(0, MAX_PHOTOS);
}

export function photoCredit(p: Photo): string {
  return `Foto: ${p.author} · ${p.license} · Wikimedia Commons`;
}
