import { Platform } from 'react-native';

import { Photo, commonsSearchUrl, fileInfoUrl, mergePhotos, pageImageUrl, parseImageInfo, parsePageImage } from '@/core/photos';

const AGENT = 'Rotta/0.8 (https://github.com/marcosvrc/rotta-app)';
/**
 * A Wikimedia recusa (403) pedidos com User-Agent genérico, como o "okhttp" padrão do Android.
 * No celular mandamos um User-Agent do app; no navegador ele é proibido, então vai o Api-User-Agent.
 */
const HEADERS: Record<string, string> =
  Platform.OS === 'web' ? { 'Api-User-Agent': AGENT } : { 'User-Agent': AGENT, 'Api-User-Agent': AGENT };

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Busca até 6 fotos do lugar: primeiro a do artigo da Wikipedia, depois as do Commons. */
export async function fetchPlacePhotos(placeName: string, city: string): Promise<Photo[]> {
  const query = city && !placeName.toLowerCase().includes(city.toLowerCase()) ? `${placeName} ${city}` : placeName;
  const [main, search] = await Promise.all([
    getJson(pageImageUrl(query))
      .then((j) => parsePageImage(j))
      .then((file) => (file ? getJson(fileInfoUrl(file)).then(parseImageInfo) : []))
      .catch(() => [] as Photo[]),
    getJson(commonsSearchUrl(query)).then(parseImageInfo),
  ]);
  return mergePhotos(main, search);
}
