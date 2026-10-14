import { hm } from '../calendar';
import { updateDay } from '../model';
import { lisboaCatalog, lisboaTrip } from '../sample/lisboa';
import { ItineraryValidator } from '../validator';

const validator = new ItineraryValidator(lisboaCatalog);

describe('validador de roteiro', () => {
  it('encontra os três alertas conhecidos da viagem de exemplo', () => {
    const report = validator.validate(lisboaTrip());
    expect(report.issues.map((i) => i.kind)).toEqual(['FECHADO', 'CLIMA', 'RITMO']);
    expect(report.critical).toBe(1);
    expect(report.warnings).toBe(2);
    expect(report.score).toBe(100 - 12 - 12);
  });

  it('move o museu fechado para o sábado à tarde', () => {
    const issue = validator.validate(lisboaTrip()).issues.find((i) => i.kind === 'FECHADO')!;
    expect(issue.dayIndex).toBe(4);
    expect(issue.placeId).toBe('azulejo');
    expect(issue.fix).toEqual({ type: 'MOVE', fromDay: 4, placeId: 'azulejo', toDay: 2, newStart: hm(14, 45) });
    expect(issue.fixDescription).toBe('Mover para o dia 3 (sábado), às 14:45, onde há uma janela livre.');
  });

  it('sugere o lugar coberto mais próximo quando chove', () => {
    const issue = validator.validate(lisboaTrip()).issues.find((i) => i.kind === 'CLIMA')!;
    expect(issue.fix).toEqual({ type: 'REPLACE', day: 2, placeId: 'stcatarina', newPlaceId: 'mnaa', durationMinutes: 60 });
    expect(issue.fixDescription).toBe('Trocar por Museu Nacional de Arte Antiga, coberto e a 21 min a pé.');
  });

  it('tira a parada de menor prioridade de um dia pesado', () => {
    const trip = lisboaTrip();
    expect(validator.dayLoadMinutes(trip.days[3])).toBe(511);
    const issue = validator.validate(trip).issues.find((i) => i.kind === 'RITMO')!;
    expect(issue.title).toBe('Dia pesado: 8h31 de programação');
    expect(issue.fix).toEqual({ type: 'REMOVE', day: 3, placeId: 'sintra' });
  });

  it('aplicar todos os planos B deixa o roteiro sem pendências', () => {
    let trip = lisboaTrip();
    for (let i = 0; i < 5; i++) {
      const next = validator.validate(trip).issues.find((issue) => issue.fix !== null);
      if (!next?.fix) break;
      trip = validator.apply(trip, next.fix);
    }
    const report = validator.validate(trip);
    expect(report.issues).toEqual([]);
    expect(report.score).toBe(100);
    expect(trip.days[2].stops.map((s) => s.placeId)).toEqual(['gulbenkian', 'timeout', 'azulejo', 'mnaa']);
    expect(trip.days[4].stops.map((s) => s.placeId)).toEqual(['oceanario']);
  });

  it('detecta deslocamento apertado e adia as paradas seguintes', () => {
    const tight = updateDay(lisboaTrip(), 1, (d) => ({
      ...d,
      stops: d.stops.map((s) => (s.placeId === 'jeronimos' ? { ...s, start: hm(11, 5) } : s)),
    }));
    const issue = validator.validate(tight).issues.find((i) => i.kind === 'DESLOCAMENTO')!;
    expect(issue.fix).toEqual({ type: 'SHIFT', day: 1, fromIndex: 1, minutes: 15 });
    const fixed = validator.apply(tight, issue.fix!);
    expect(fixed.days[1].stops[1].start).toBe(hm(11, 20));
    expect(validator.validate(fixed).issues.some((i) => i.kind === 'DESLOCAMENTO')).toBe(false);
  });

  it('detecta visita antes de abrir', () => {
    const early = updateDay(lisboaTrip(), 1, (d) => ({
      ...d,
      stops: [{ placeId: 'torre', start: hm(9), durationMinutes: 60 }, ...d.stops.slice(1)],
    }));
    const issue = validator.validate(early).issues.find((i) => i.kind === 'HORARIO')!;
    expect(issue.fix).toEqual({ type: 'SHIFT', day: 1, fromIndex: 0, minutes: 60 });
  });
});
