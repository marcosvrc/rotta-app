/** Contatos de emergência que o usuário anota para a viagem. Ficam no aparelho e abrem sem internet. */
export interface SosInfo {
  stayAddress?: string;
  stayPhone?: string;
  insuranceName?: string;
  insurancePhone?: string;
  insurancePolicy?: string;
  consulatePhone?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export interface EmergencyNumber {
  label: string;
  number: string;
}

/**
 * Números de emergência por país (ISO alfa-2). Lista curta e conferida; países fora dela mostram aviso
 * para conferir na fonte oficial. Mantenha um número por linha e prefira o número geral quando existir.
 */
const EU_112 = [{ label: 'Emergência geral', number: '112' }];

export const EMERGENCY_NUMBERS: Record<string, EmergencyNumber[]> = {
  PT: EU_112,
  ES: EU_112,
  FR: [
    { label: 'Emergência geral', number: '112' },
    { label: 'Ambulância (SAMU)', number: '15' },
    { label: 'Polícia', number: '17' },
    { label: 'Bombeiros', number: '18' },
  ],
  IT: [
    { label: 'Emergência geral', number: '112' },
    { label: 'Ambulância', number: '118' },
  ],
  DE: [
    { label: 'Ambulância e bombeiros', number: '112' },
    { label: 'Polícia', number: '110' },
  ],
  NL: EU_112,
  BE: EU_112,
  AT: EU_112,
  IE: EU_112,
  GR: EU_112,
  DK: EU_112,
  SE: EU_112,
  FI: EU_112,
  PL: EU_112,
  CZ: EU_112,
  HU: EU_112,
  HR: EU_112,
  LU: EU_112,
  CH: [
    { label: 'Emergência geral', number: '112' },
    { label: 'Polícia', number: '117' },
    { label: 'Bombeiros', number: '118' },
    { label: 'Ambulância', number: '144' },
  ],
  GB: [
    { label: 'Emergência geral', number: '999' },
    { label: 'Também funciona', number: '112' },
  ],
  NO: [
    { label: 'Emergência geral', number: '112' },
    { label: 'Ambulância', number: '113' },
  ],
  TR: EU_112,
  US: [{ label: 'Emergência geral', number: '911' }],
  CA: [{ label: 'Emergência geral', number: '911' }],
  MX: [{ label: 'Emergência geral', number: '911' }],
  UY: [{ label: 'Emergência geral', number: '911' }],
  CO: [{ label: 'Emergência geral', number: '123' }],
  AR: [
    { label: 'Polícia', number: '911' },
    { label: 'Ambulância', number: '107' },
    { label: 'Bombeiros', number: '100' },
  ],
  CL: [
    { label: 'Ambulância', number: '131' },
    { label: 'Bombeiros', number: '132' },
    { label: 'Polícia (Carabineros)', number: '133' },
  ],
  BR: [
    { label: 'Polícia', number: '190' },
    { label: 'Ambulância (SAMU)', number: '192' },
    { label: 'Bombeiros', number: '193' },
  ],
  JP: [
    { label: 'Polícia', number: '110' },
    { label: 'Ambulância e bombeiros', number: '119' },
  ],
  KR: [
    { label: 'Polícia', number: '112' },
    { label: 'Ambulância e bombeiros', number: '119' },
  ],
  CN: [
    { label: 'Polícia', number: '110' },
    { label: 'Ambulância', number: '120' },
    { label: 'Bombeiros', number: '119' },
  ],
  AU: [{ label: 'Emergência geral', number: '000' }],
  NZ: [{ label: 'Emergência geral', number: '111' }],
  IN: [{ label: 'Emergência geral', number: '112' }],
};

/** Nome do país em português (como o usuário digita) para o código ISO. */
const COUNTRY_CODES: Record<string, string> = {
  portugal: 'PT',
  espanha: 'ES',
  franca: 'FR',
  italia: 'IT',
  alemanha: 'DE',
  holanda: 'NL',
  'paises baixos': 'NL',
  belgica: 'BE',
  austria: 'AT',
  irlanda: 'IE',
  grecia: 'GR',
  dinamarca: 'DK',
  suecia: 'SE',
  finlandia: 'FI',
  polonia: 'PL',
  'republica tcheca': 'CZ',
  tchequia: 'CZ',
  hungria: 'HU',
  croacia: 'HR',
  luxemburgo: 'LU',
  suica: 'CH',
  'reino unido': 'GB',
  inglaterra: 'GB',
  escocia: 'GB',
  noruega: 'NO',
  turquia: 'TR',
  'estados unidos': 'US',
  eua: 'US',
  canada: 'CA',
  mexico: 'MX',
  uruguai: 'UY',
  colombia: 'CO',
  argentina: 'AR',
  chile: 'CL',
  brasil: 'BR',
  japao: 'JP',
  'coreia do sul': 'KR',
  china: 'CN',
  australia: 'AU',
  'nova zelandia': 'NZ',
  india: 'IN',
};

export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Código do país a partir da geocodificação ou, sem ela, do nome digitado na viagem. */
export function countryCodeOf(country: string, geoCode?: string): string | null {
  if (geoCode && /^[A-Z]{2}$/.test(geoCode)) return geoCode;
  const name = normalizeName(country);
  if (/^[a-z]{2}$/.test(name)) return name.toUpperCase();
  return COUNTRY_CODES[name] ?? null;
}

export function emergencyNumbersFor(countryCode: string | null): EmergencyNumber[] | null {
  return countryCode ? (EMERGENCY_NUMBERS[countryCode] ?? null) : null;
}

export function isInternational(countryCode: string | null): boolean {
  return countryCode !== 'BR';
}

/** Deixa só dígitos e um "+" inicial, para abrir no discador. */
export function dialable(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 2) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function sosFilled(info: SosInfo): number {
  return Object.values(info).filter((v) => typeof v === 'string' && v.trim() !== '').length;
}
