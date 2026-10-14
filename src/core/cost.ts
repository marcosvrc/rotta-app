export type StayLevel = 'ECONOMICA' | 'CONFORTO' | 'LUXO';
export type FoodLevel = 'ECONOMICA' | 'MEDIA' | 'ALTA';
export type CostCategory = 'PASSAGENS' | 'HOSPEDAGEM' | 'ALIMENTACAO' | 'PASSEIOS' | 'TRANSPORTE_LOCAL';

export const STAY_LEVELS: Record<StayLevel, { label: string; nightlyPerRoomBrl: number }> = {
  ECONOMICA: { label: 'Econômica', nightlyPerRoomBrl: 380 },
  CONFORTO: { label: 'Conforto', nightlyPerRoomBrl: 640 },
  LUXO: { label: 'Luxo', nightlyPerRoomBrl: 1300 },
};

export const FOOD_LEVELS: Record<FoodLevel, { label: string; dailyPerPersonBrl: number }> = {
  ECONOMICA: { label: 'Econômica', dailyPerPersonBrl: 160 },
  MEDIA: { label: 'Média', dailyPerPersonBrl: 260 },
  ALTA: { label: 'Alta', dailyPerPersonBrl: 450 },
};

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  PASSAGENS: 'Passagens',
  HOSPEDAGEM: 'Hospedagem',
  ALIMENTACAO: 'Alimentação',
  PASSEIOS: 'Passeios',
  TRANSPORTE_LOCAL: 'Transporte local',
};

/** Valores de referência por destino. Os de Lisboa são exemplos, não cotações. */
export interface CostInput {
  travelers: number;
  nights: number;
  days: number;
  stay: StayLevel;
  food: FoodLevel;
  flightPerPersonBrl?: number;
  toursPerDayPerPersonBrl?: number;
  localTransportPerDayPerPersonBrl?: number;
}

export interface CostLine {
  category: CostCategory;
  valueBrl: number;
}

export interface CostEstimate {
  lines: CostLine[];
  travelers: number;
  totalBrl: number;
  perPersonBrl: number;
}

export interface BudgetStatus {
  budgetBrl: number;
  totalBrl: number;
  overBudget: boolean;
  /** Positivo: sobra. Negativo: falta. */
  differenceBrl: number;
}

export function estimateCost(input: CostInput): CostEstimate {
  if (input.travelers < 1) throw new Error('É preciso pelo menos 1 viajante');
  const { travelers, nights, days } = input;
  const rooms = Math.ceil(travelers / 2);
  const lines: CostLine[] = [
    { category: 'PASSAGENS', valueBrl: (input.flightPerPersonBrl ?? 4200) * travelers },
    { category: 'HOSPEDAGEM', valueBrl: STAY_LEVELS[input.stay].nightlyPerRoomBrl * nights * rooms },
    { category: 'ALIMENTACAO', valueBrl: FOOD_LEVELS[input.food].dailyPerPersonBrl * days * travelers },
    { category: 'PASSEIOS', valueBrl: (input.toursPerDayPerPersonBrl ?? 130) * days * travelers },
    { category: 'TRANSPORTE_LOCAL', valueBrl: (input.localTransportPerDayPerPersonBrl ?? 55) * days * travelers },
  ];
  const totalBrl = lines.reduce((sum, l) => sum + l.valueBrl, 0);
  return { lines, travelers, totalBrl, perPersonBrl: Math.floor(totalBrl / travelers) };
}

export function shareOf(estimate: CostEstimate, category: CostCategory): number {
  if (estimate.totalBrl === 0) return 0;
  const line = estimate.lines.find((l) => l.category === category);
  return (line?.valueBrl ?? 0) / estimate.totalBrl;
}

export function againstBudget(estimate: CostEstimate, budgetBrl: number): BudgetStatus {
  return {
    budgetBrl,
    totalBrl: estimate.totalBrl,
    overBudget: estimate.totalBrl > budgetBrl,
    differenceBrl: budgetBrl - estimate.totalBrl,
  };
}
