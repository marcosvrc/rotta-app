import { parseRateResponse, rateUrl } from '@/core/currency';

/** Busca a cotação do dia no Frankfurter (gratuito, sem chave). */
export async function fetchRate(code: string): Promise<{ rate: number; date: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(rateUrl(code), { signal: controller.signal });
    if (!res.ok) return null;
    return parseRateResponse(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
