import { emptyRecord, sampleAppData } from '../appdata';
import { hm, tripDate } from '../calendar';
import { addStop, createCustomPlace, createTrip, moveStopInDay, swapDays } from '../editing';
import { itineraryHtml, itineraryText } from '../share';

describe('compartilhar roteiro', () => {
  it('gera texto para WhatsApp com dias, horários e reservas opcionais', () => {
    const record = sampleAppData().trips[0];
    const text = itineraryText(record, { reservations: false });
    expect(text.split('\n')[0]).toBe('*Lisboa, Portugal · 12 a 16 de nov · 5 dias*');
    expect(text).toContain('*Dia 1 · Qui, 12 nov* · Alfama e Castelo');
    expect(text).toContain('  16:00–17:30 Castelo de São Jorge');
    expect(text).not.toContain('código');
    expect(itineraryText(record, { reservations: true })).toContain('*Reservas*');
  });

  it('escapa HTML no PDF', () => {
    const trip = createTrip({ destination: 'Porto <script>', country: '', start: tripDate(2027, 1, 1), days: 1, travelers: 1, budgetBrl: 0, pace: 'LEVE' }, 'p');
    const withStop = addStop(trip, 0, createCustomPlace({ name: 'Bar "A&B"', kind: 'Outro', indoor: true }, 'x'), hm(20), 60);
    const html = itineraryHtml(emptyRecord(withStop), { reservations: true });
    expect(html).toContain('Porto &lt;script&gt;');
    expect(html).toContain('Bar &quot;A&amp;B&quot;');
    expect(html).not.toContain('<script>');
  });
});

describe('ordem das paradas', () => {
  const base = () => {
    let t = createTrip({ destination: 'Porto', country: '', start: tripDate(2027, 1, 1), days: 2, travelers: 1, budgetBrl: 0, pace: 'LEVE' }, 'p');
    t = addStop(t, 0, createCustomPlace({ name: 'A', kind: 'Outro', indoor: true }, 'a'), hm(9), 60);
    t = addStop(t, 0, createCustomPlace({ name: 'B', kind: 'Outro', indoor: true }, 'b'), hm(10, 30), 90);
    t = addStop(t, 0, createCustomPlace({ name: 'C', kind: 'Outro', indoor: true }, 'c'), hm(14), 30);
    return t;
  };

  it('troca com a vizinha mantendo o intervalo', () => {
    const t = moveStopInDay(base(), 0, 'a', 1);
    expect(t.days[0].stops.map((s) => [s.placeId, s.start])).toEqual([
      ['b', hm(9)],
      ['a', hm(11)],
      ['c', hm(14)],
    ]);
    expect(moveStopInDay(base(), 0, 'b', -1)).toEqual(t);
    expect(moveStopInDay(base(), 0, 'a', -1)).toEqual(base());
  });

  it('troca o programa de dois dias', () => {
    const t = swapDays({ ...base(), days: base().days.map((d, i) => ({ ...d, title: `T${i}` })) }, 0, 1);
    expect(t.days[0].stops).toHaveLength(0);
    expect(t.days[1].stops.map((s) => s.placeId)).toEqual(['a', 'b', 'c']);
    expect([t.days[0].title, t.days[1].title]).toEqual(['T1', 'T0']);
    expect(t.days[0].date).toEqual(tripDate(2027, 1, 1));
  });
});
