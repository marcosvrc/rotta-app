import { hm, plusDays, rangeLabel, shortDateLabel, timeLabel, tripDate, weekdayOf } from '../calendar';
import { formatBrl, formatDistance, formatDuration } from '../format';
import { hoursLabel, isOpenOn } from '../model';
import { lisboaCatalog } from '../sample/lisboa';
import { estimateLeg } from '../travel';

describe('calendário', () => {
  it('calcula o dia da semana', () => {
    expect(weekdayOf(tripDate(2026, 11, 13))).toBe('SEXTA');
    expect(weekdayOf(tripDate(2026, 1, 1))).toBe('QUINTA');
    expect(weekdayOf(tripDate(2026, 11, 16))).toBe('SEGUNDA');
    expect(weekdayOf(tripDate(2000, 1, 1))).toBe('SABADO');
  });

  it('soma dias atravessando mês e ano bissexto', () => {
    expect(plusDays(tripDate(2026, 11, 30), 1)).toEqual(tripDate(2026, 12, 1));
    expect(plusDays(tripDate(2028, 2, 28), 1)).toEqual(tripDate(2028, 2, 29));
    expect(plusDays(tripDate(2026, 12, 31), 2)).toEqual(tripDate(2027, 1, 2));
  });

  it('rejeita datas inválidas', () => {
    expect(() => tripDate(2026, 2, 29)).toThrow();
  });

  it('formata rótulos', () => {
    expect(shortDateLabel(tripDate(2026, 11, 13))).toBe('Sex, 13 nov');
    expect(rangeLabel(tripDate(2026, 11, 12), tripDate(2026, 11, 16))).toBe('12 a 16 de nov');
    expect(timeLabel(hm(9, 5))).toBe('09:05');
  });
});

describe('formatação', () => {
  it('dinheiro, distância e duração', () => {
    expect(formatBrl(15_410)).toBe('R$ 15.410');
    expect(formatBrl(950)).toBe('R$ 950');
    expect(formatBrl(1_234_567)).toBe('R$ 1.234.567');
    expect(formatBrl(-50)).toBe('-R$ 50');
    expect(formatDistance(0.92)).toBe('900 m');
    expect(formatDistance(6.46)).toBe('6,5 km');
    expect(formatDistance(3.01)).toBe('3 km');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(511)).toBe('8h31');
  });
});

describe('lugares e deslocamentos', () => {
  it('horário de funcionamento', () => {
    const hours = { opens: hm(10), closes: hm(17, 30), closedOn: ['SEGUNDA' as const] };
    expect(isOpenOn(hours, 'SEGUNDA')).toBe(false);
    expect(isOpenOn(hours, 'TERCA')).toBe(true);
    expect(hoursLabel(hours)).toBe('10:00 às 17:30 · fechado às segundas');
  });

  it('estima o deslocamento entre paradas', () => {
    const c = lisboaCatalog;
    const walk = estimateLeg(c.get('torre').location, c.get('jeronimos').location);
    expect(walk.mode).toBe('A_PE');
    expect(walk.minutes).toBe(18);
    const transit = estimateLeg(c.get('pasteis').location, c.get('lxfactory').location);
    expect(transit.mode).toBe('TRANSPORTE');
    expect(transit.minutes).toBe(17);
  });
});
