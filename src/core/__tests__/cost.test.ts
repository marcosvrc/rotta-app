import { COST_CATEGORY_LABEL, CostCategory, StayLevel, againstBudget, estimateCost, shareOf } from '../cost';

const lisboa = (travelers: number, stay: StayLevel = 'CONFORTO') =>
  estimateCost({ travelers, nights: 4, days: 5, stay, food: 'MEDIA' });

describe('simulador de custos', () => {
  it('casal em hospedagem conforto', () => {
    const estimate = lisboa(2);
    expect(estimate.lines.map((l) => l.valueBrl)).toEqual([8400, 2560, 2600, 1300, 550]);
    expect(estimate.totalBrl).toBe(15_410);
    expect(estimate.perPersonBrl).toBe(7_705);
    const status = againstBudget(estimate, 18_000);
    expect(status.overBudget).toBe(false);
    expect(status.differenceBrl).toBe(2_590);
  });

  it('hospedagem de luxo estoura o orçamento', () => {
    const status = againstBudget(lisboa(2, 'LUXO'), 18_000);
    expect(status.overBudget).toBe(true);
    expect(status.differenceBrl).toBe(-50);
  });

  it('três viajantes precisam de dois quartos', () => {
    const stay = lisboa(3).lines.find((l) => l.category === 'HOSPEDAGEM')!;
    expect(stay.valueBrl).toBe(640 * 4 * 2);
  });

  it('as fatias somam 100%', () => {
    const estimate = lisboa(2);
    const sum = (Object.keys(COST_CATEGORY_LABEL) as CostCategory[]).reduce((s, c) => s + shareOf(estimate, c), 0);
    expect(sum).toBeCloseTo(1, 9);
  });
});
