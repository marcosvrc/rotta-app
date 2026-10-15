/**
 * Cores no estilo iOS (system grouped background, labels e separadores da Apple), usadas no iPhone e no Android.
 * A cor de destaque é escolhida pelo usuário.
 */
export const colors = {
  ink: '#000000',
  muted: '#6C6C70',
  body: '#3C3C43',
  background: '#F2F2F7',
  card: '#FFFFFF',
  /** Separador fino entre linhas (hairline). */
  line: '#C6C6C8',
  divider: '#C6C6C8',
  /** Preenchimento cinza de controles (chips, segmented, stepper). */
  fill: '#E9E9EB',
  chevron: '#C4C4C7',
  switchOn: '#34C759',
  night: '#1C1C1E',
  nightMuted: '#AEAEB2',
  criticalBg: '#FFE5E3',
  criticalInk: '#B3261E',
  criticalBorder: '#FF9F97',
  warningBg: '#FFF1D6',
  warningInk: '#7A4B00',
  warningBorder: '#FFCC66',
  goodBg: '#DFF6E5',
  goodInk: '#1E6B34',
  alertBg: '#FFECE5',
  alertInk: '#9A3412',
} as const;

/** As quatro opções de cor de destaque, todas com contraste para texto branco. */
export const ACCENT_OPTIONS = [
  { id: 'azul', label: 'Azul', color: '#0071E3' },
  { id: 'petroleo', label: 'Petróleo', color: '#0F766E' },
  { id: 'violeta', label: 'Índigo', color: '#5856D6' },
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

/** Inter: a fonte livre mais próxima da SF Pro do iOS, igual nos dois sistemas. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeightName = keyof typeof fonts;
