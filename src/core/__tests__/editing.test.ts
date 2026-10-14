import { addTrip, deleteTrip, parseAppData, sampleAppData, activeRecord } from '../appdata';
import { hm, parseDateBr, parseTime, tripDate, minusDays, formatDateBr } from '../calendar';
import { checklistProgress, defaultChecklist, dueDate } from '../checklist';
import { estimateCost } from '../cost';
import {
  addStop,
  createCustomPlace,
  createTrip,
  removeStop,
  suggestStart,
  unscheduledPlaces,
  updateStop,
  updateTripInfo,
  validateNewTrip,
} from '../editing';
import { summarizeExpenses } from '../expenses';
import { formatBrlCents, parseMoney } from '../format';
import { catalogOf } from '../model';
import { groupByDate } from '../reservations';
import { lisboaExpenses, lisboaReservations, lisboaTrip } from '../sample/lisboa';
import { ItineraryValidator } from '../validator';

describe('entrada de dados', () => {
  it('lê datas, horários e valores', () => {
    expect(parseDateBr('13/11/2026')).toEqual(tripDate(2026, 11, 13));
    expect(parseDateBr('1/2/27')).toEqual(tripDate(2027, 2, 1));
    expect(parseDateBr('31/02/2026')).toBeNull();
    expect(parseDateBr('2026-11-13')).toBeNull();
    expect(formatDateBr(tripDate(2026, 2, 3))).toBe('03/02/2026');
    expect(parseTime('9:30')).toBe(hm(9, 30));
    expect(parseTime('0930')).toBe(hm(9, 30));
    expect(parseTime('24:00')).toBeNull();
    expect(parseMoney('35,50')).toBe(35.5);
    expect(parseMoney('R$ 1.234,56')).toBe(1234.56);
    expect(parseMoney('0')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(formatBrlCents(1234.5)).toBe('R$ 1.234,50');
  });

  it('subtrai dias atravessando mês e ano', () => {
    expect(minusDays(tripDate(2026, 1, 3), 5)).toEqual(tripDate(2025, 12, 29));
    expect(minusDays(tripDate(2028, 3, 1), 1)).toEqual(tripDate(2028, 2, 29));
  });
});

describe('edição de viagens', () => {
  const input = {
    destination: ' Porto ',
    country: 'Portugal',
    start: tripDate(2027, 3, 30),
    days: 4,
    travelers: 2,
    budgetBrl: 12_000,
    pace: 'LEVE' as const,
  };

  it('valida e cria uma viagem com os dias em sequência', () => {
    expect(validateNewTrip({ ...input, destination: ' ' })).toContain('Informe o destino.');
    expect(validateNewTrip({ ...input, days: 0 })).toHaveLength(1);
    expect(validateNewTrip(input)).toEqual([]);
    const trip = createTrip(input, 'porto');
    expect(trip.destination).toBe('Porto');
    expect(trip.days.map((d) => d.date)).toEqual([
      tripDate(2027, 3, 30),
      tripDate(2027, 3, 31),
      tripDate(2027, 4, 1),
      tripDate(2027, 4, 2),
    ]);
  });

  it('mudar a data de ida desloca todos os dias', () => {
    const trip = updateTripInfo(createTrip(input, 'porto'), { ...input, start: tripDate(2027, 5, 1) });
    expect(trip.days[3].date).toEqual(tripDate(2027, 5, 4));
  });

  it('adiciona, move e remove paradas criadas pelo usuário', () => {
    let trip = createTrip(input, 'porto');
    const ribeira = createCustomPlace({ name: 'Cais da Ribeira', kind: 'Bairro', indoor: false }, 'ribeira');
    const livraria = createCustomPlace({ name: 'Livraria Lello', kind: 'Compras', indoor: true }, 'lello');
    trip = addStop(trip, 0, livraria, hm(14), 60);
    trip = addStop(trip, 0, ribeira, hm(10), 90);
    expect(trip.days[0].stops.map((s) => s.placeId)).toEqual(['ribeira', 'lello']);
    expect(suggestStart(trip.days[0])).toBe(hm(15, 30));
    expect(suggestStart(trip.days[1])).toBe(hm(9));

    trip = updateStop(trip, 0, 'lello', { start: hm(11), durationMinutes: 45, toDay: 1 });
    expect(trip.days[0].stops.map((s) => s.placeId)).toEqual(['ribeira']);
    expect(trip.days[1].stops).toEqual([{ placeId: 'lello', start: hm(11), durationMinutes: 45 }]);

    trip = removeStop(trip, 1, 'lello');
    expect(trip.days[1].stops).toEqual([]);
    expect(trip.places.map((p) => p.id)).toEqual(['ribeira']);
  });

  it('lugar sem localização não quebra o validador', () => {
    let trip = createTrip(input, 'porto');
    trip = addStop(trip, 0, createCustomPlace({ name: 'A', kind: 'Outro', indoor: true }, 'a'), hm(10), 60);
    trip = addStop(trip, 0, createCustomPlace({ name: 'B', kind: 'Outro', indoor: true }, 'b'), hm(11), 60);
    const report = new ItineraryValidator(catalogOf(trip)).validate(trip);
    expect(report.issues).toEqual([]);
  });

  it('remover parada sugerida devolve o lugar para a lista de sugestões', () => {
    const trip = removeStop(lisboaTrip(), 2, 'stcatarina');
    expect(unscheduledPlaces(trip).map((p) => p.id)).toEqual(expect.arrayContaining(['stcatarina', 'mnaa']));
  });
});

describe('gastos', () => {
  it('soma por dia, categoria e forma de pagamento', () => {
    const estimate = estimateCost({ travelers: 2, nights: 4, days: 5, stay: 'CONFORTO', food: 'MEDIA' });
    const s = summarizeExpenses(lisboaExpenses(), 5, estimate);
    expect(s.totalBrl).toBe(1163);
    expect(s.byDay).toEqual([570, 333, 260, 0, 0]);
    expect(s.byCategory[0]).toMatchObject({ key: 'ALIMENTACAO', totalBrl: 725 });
    expect(s.byPayment.map((p) => p.key)).toEqual(['CREDITO', 'DEBITO', 'PIX', 'DINHEIRO']);
    expect(s.plannedTripBrl).toBe(15_410 - 8_400);
    expect(s.plannedPerDayBrl).toBe(1402);
  });
});

describe('checklist e reservas', () => {
  it('calcula prazos e progresso', () => {
    const items = defaultChecklist((i) => `c${i}`);
    expect(dueDate(items[0], tripDate(2026, 11, 12))).toEqual(tripDate(2026, 10, 13));
    expect(checklistProgress([{ ...items[0], done: true }, items[1]])).toEqual({ done: 1, total: 2, share: 0.5 });
  });

  it('agrupa reservas por data, em ordem', () => {
    const groups = groupByDate(lisboaReservations().reverse());
    expect(groups.map((g) => g.items.map((r) => r.id))).toEqual([['r1', 'r2'], ['r3'], ['r4'], ['r5']]);
  });
});

describe('dados salvos', () => {
  it('ida e volta em JSON e viagem ativa', () => {
    let data = sampleAppData();
    data = addTrip(data, createTrip({
      destination: 'Porto', country: 'Portugal', start: tripDate(2027, 3, 30), days: 2, travelers: 1, budgetBrl: 5000, pace: 'MEDIO',
    }, 'porto'));
    expect(activeRecord(data).trip.id).toBe('porto');
    expect(activeRecord(data).checklist.length).toBeGreaterThan(0);
    const back = parseAppData(JSON.stringify(data));
    expect(back).toEqual(data);
    const removed = deleteTrip(data, 'porto');
    expect(removed.activeTripId).toBe('lisboa-2026');
    expect(deleteTrip(removed, 'lisboa-2026')).toBe(removed);
  });

  it('ignora dados corrompidos', () => {
    expect(parseAppData('{oops')).toBeNull();
    expect(parseAppData(JSON.stringify({ version: 9 }))).toBeNull();
    expect(parseAppData(null)).toBeNull();
  });
});
