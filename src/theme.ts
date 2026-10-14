/** Cores neutras do app; a cor de destaque é escolhida pelo usuário. */
export const colors = {
  ink: '#1B2230',
  muted: '#5F6775',
  body: '#434B58',
  background: '#EEF2F7',
  card: '#FFFFFF',
  line: '#E4E9F0',
  divider: '#EEF2F6',
  night: '#1B2230',
  nightMuted: '#B6BFCC',
  criticalBg: '#F6C9B6',
  criticalInk: '#6B2410',
  criticalBorder: '#E2A58C',
  warningBg: '#F7E2B8',
  warningInk: '#5E4208',
  warningBorder: '#E8C98A',
  goodBg: '#DCEFE4',
  goodInk: '#17603F',
  alertBg: '#FBE9E1',
  alertInk: '#8A3412',
} as const;

/** As quatro opções de cor de destaque, todas com contraste para texto branco. */
export const ACCENT_OPTIONS = [
  { id: 'azul', label: 'Azul', color: '#1F6FEB' },
  { id: 'petroleo', label: 'Petróleo', color: '#0F766E' },
  { id: 'violeta', label: 'Violeta', color: '#6D28D9' },
  { id: 'terracota', label: 'Terracota', color: '#C2410C' },
] as const;

export type AccentId = (typeof ACCENT_OPTIONS)[number]['id'];

export interface AccentPalette {
  accent: string;
  /** Versão escura, para texto sobre o tom claro. */
  ink: string;
  /** Versão bem clara, para fundos de destaque. */
  tint: string;
  soft: string;
  deep: string;
}

function mix(hex: string, target: string, weight: number): string {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = parse(hex);
  const b = parse(target);
  return `#${a.map((n, i) => Math.round(n + (b[i] - n) * weight).toString(16).padStart(2, '0')).join('')}`;
}

export function paletteFor(accentId: AccentId): AccentPalette {
  const color = ACCENT_OPTIONS.find((o) => o.id === accentId)?.color ?? ACCENT_OPTIONS[0].color;
  return {
    accent: color,
    ink: mix(color, '#000000', 0.35),
    tint: mix(color, '#FFFFFF', 0.88),
    soft: mix(color, '#FFFFFF', 0.5),
    deep: mix(color, '#000000', 0.55),
  };
}

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export type FontWeightName = keyof typeof fonts;
