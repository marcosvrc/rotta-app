import { hm, tripDate } from '../calendar';
import { addStop, createCustomPlace, createTrip } from '../editing';
import { addSuggestions, suggestInputFor } from '../suggestions';
import { ItineraryValidator } from '../validator';
import { catalogOf } from '../model';

const trip = () =>
  createTrip(
    { destination: 'Porto', country: 'Portugal', start: tripDate(2026, 11, 14), days: 2, travelers: 2, budgetBrl: 5000, pace: 'LEVE' },
    'porto',
  );

describe('sugestões da IA', () => {
  it('monta o pedido com janela livre, chuva e lugares existentes', () => {
    let t = trip();
    t = { ...t, days: t.days.map((d, i) => (i === 0 ? { ...d, rainExpected: true } : d)) };
    t = addStop(t, 1, createCustomPlace({ name: 'Livraria Lello', kind: 'Compras', indoor: true }, 'lello'), hm(10), 60);
    const empty = suggestInputFor(t, 0, ['História'], 3);
    expect(empty).toMatchObject({ from: '09:00', until: '22:00', rain: true, pace: 'LEVE', existing: ['Livraria Lello'] });
    expect(empty.dayLabel).toBe('sábado, 14 nov');
    expect(suggestInputFor(t, 1, [], 2).from).toBe('11:30');
  });

  it('mantém as paradas do dia em ordem de horário', () => {
    let t = addStop(trip(), 0, createCustomPlace({ name: 'Tarde', kind: 'Outro', indoor: true }, 'b'), hm(15), 60);
    t = addStop(t, 0, createCustomPlace({ name: 'Manhã', kind: 'Outro', indoor: true }, 'a'), hm(9), 60);
    expect(t.days[0].stops.map((s) => s.placeId)).toEqual(['a', 'b']);
  });

  it('adiciona as escolhidas como lugares próprios e o validador confere', () => {
    let n = 0;
    const t = addSuggestions(
      trip(),
      0,
      [
        { name: 'Ribeira', kind: 'Bairro', indoor: false, start: '10:00', durationMinutes: 120, why: 'Cartão-postal.' },
        { name: 'Palácio da Bolsa', kind: 'Monumento', indoor: true, start: '11:30', durationMinutes: 60, why: 'Visita guiada.' },
        { name: 'Inválida', kind: 'Outro', indoor: true, start: '25:00', durationMinutes: 60, why: '.' },
      ],
      () => `s${n++}`,
    );
    expect(t.days[0].stops).toHaveLength(2);
    expect(t.places.find((p) => p.name === 'Ribeira')).toMatchObject({ custom: true, tips: ['Cartão-postal.'], suggestedMinutes: 120 });
    const report = new ItineraryValidator(catalogOf(t)).validate(t);
    expect(report.issues.some((i) => i.dayIndex === 0)).toBe(true); // a segunda começa antes da primeira terminar
  });
});
