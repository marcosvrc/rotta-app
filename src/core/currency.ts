/** Moedas e câmbio. A conversão para reais acontece ao registrar o gasto, com a cotação do dia. */

export const BRL = 'BRL';

/** Moeda local por país (ISO alfa-2). Países fora da lista usam reais até o usuário escolher. */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  PT: 'EUR', ES: 'EUR', FR: 'EUR', IT: 'EUR', DE: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR',
  FI: 'EUR', LU: 'EUR', HR: 'EUR',
  GB: 'GBP', CH: 'CHF', DK: 'DKK', SE: 'SEK', NO: 'NOK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', TR: 'TRY',
  US: 'USD', CA: 'CAD', MX: 'MXN', AR: 'ARS', CL: 'CLP', UY: 'UYU', CO: 'COP', PE: 'PEN', BR: 'BRL',
  JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR', TH: 'THB', AE: 'AED', ZA: 'ZAR', AU: 'AUD', NZ: 'NZD',
};

const SYMBOL: Record<string, string> = {
  BRL: 'R$', EUR: '€', USD: 'US$', GBP: '£', JPY: '¥', CHF: 'CHF', ARS: 'AR$', CLP: 'CLP$', MXN: 'MX$', CAD: 'C$', AUD: 'A$',
};

/** Moedas sem centavos no uso do dia a dia. */
const NO_DECIMALS = new Set(['JPY', 'KRW', 'CLP', 'COP', 'HUF']);

export function currencyForCountry(countryCode: string | null): string {
  return (countryCode && CURRENCY_BY_COUNTRY[countryCode]) || BRL;
}

export function currencySymbol(code: string): string {
  return SYMBOL[code] ?? code;
}

/** Ex.: (12.5, "EUR") -> "€ 12,50"; (1500, "JPY") -> "¥ 1.500". */
export function formatMoney(value: number, code: string): string {
  const decimals = NO_DECIMALS.has(code) ? 0 : 2;
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${currencySymbol(code)} ${grouped}${frac ? `,${frac}` : ''}`;
}

/** Cotação: quantos reais vale 1 unidade da moeda. Aceita "5,62" ou "0,0033". */
export function parseRate(text: string): number | null {
  const clean = text.trim().replace(/\s/g, '');
  if (!/^\d+([.,]\d{1,6})?$/.test(clean)) return null;
  const value = Number(clean.replace(',', '.'));
  return value > 0 ? value : null;
}

export function toBrl(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

export interface CachedRate {
  /** Reais por 1 unidade da moeda. */
  rate: number;
  /** Data da cotação (aaaa-mm-dd), informada pela fonte. */
  date: string;
  /** Quando o app buscou. */
  fetchedAt: string;
}

export function rateUrl(code: string): string {
  return `https://api.frankfurter.dev/v2/rate/${code.toLowerCase()}/brl`;
}

export function parseRateResponse(json: unknown): { rate: number; date: string } | null {
  const v = json as { rate?: unknown; date?: unknown; quote?: unknown } | null;
  if (!v || typeof v.rate !== 'number' || v.rate <= 0 || typeof v.date !== 'string' || v.quote !== 'BRL') return null;
  return { rate: v.rate, date: v.date };
}

/** Cotação guardada há menos de 12 horas é reaproveitada. */
export function isRateFresh(cached: CachedRate | undefined, now: Date): boolean {
  if (!cached) return false;
  const at = Date.parse(cached.fetchedAt);
  return Number.isFinite(at) && now.getTime() - at < 12 * 60 * 60 * 1000;
}

export function dateBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
