import { Photo, commonsSearchUrl, fileInfoUrl, mergePhotos, pageImageUrl, parseImageInfo, parsePageImage } from '@/core/photos';

/** A Wikimedia pede que apps se identifiquem. */
const HEADERS = { 'Api-User-Agent': 'Rotta/0.7 (https://github.com/marcosvrc/rotta-app)' };

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
