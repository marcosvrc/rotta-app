import { DEFAULT_REMINDERS, emptyRecord, parseAppData, sampleAppData } from '../appdata';
import { hm, tripDate } from '../calendar';
import { currencyForCountry, formatMoney, isRateFresh, parseRate, parseRateResponse, toBrl } from '../currency';
import { addStop, createCustomPlace, createTrip } from '../editing';
import { Expense } from '../expenses';
import { buildReminders, zonedInstant } from '../reminders';
import { Participant, removeParticipant, settle, validateParticipantName } from '../split';

const expense = (id: string, amountBrl: number, paidBy?: string, splitWith?: string[]): Expense => ({
  id,
  dayIndex: 0,
  description: id,
  category: 'ALIMENTACAO',
  payment: 'CREDITO',
  amountBrl,
  paidBy,
  splitWith,
});

describe('câmbio', () => {
  it('escolhe a moeda do país e formata', () => {
    expect(currencyForCountry('PT')).toBe('EUR');
    expect(currencyForCountry('XX')).toBe('BRL');
    expect(formatMoney(1234.5, 'EUR')).toBe('€ 1.234,50');
    expect(formatMoney(1500, 'JPY')).toBe('¥ 1.500');
    expect(toBrl(12.5, 5.6196)).toBe(70.25);
  });

  it('lê cotação digitada e a resposta do Frankfurter', () => {
    expect(parseRate('5,62')).toBe(5.62);
    expect(parseRate('0.0033')).toBe(0.0033);
    expect(parseRate('abc')).toBeNull();
    expect(parseRateResponse({ date: '2026-10-14', base: 'EUR', quote: 'BRL', rate: 5.6196 })).toEqual({ rate: 5.6196, date: '2026-10-14' });
    expect(parseRateResponse({ status: 422, message: 'invalid currency' })).toBeNull();
    const now = new Date('2026-10-14T12:00:00Z');
    expect(isRateFresh({ rate: 5, date: '2026-10-14', fetchedAt: '2026-10-14T08:00:00Z' }, now)).toBe(true);
    expect(isRateFresh({ rate: 5, date: '2026-10-13', fetchedAt: '2026-10-13T20:00:00Z' }, now)).toBe(false);
  });
});

describe('divisão de despesas', () => {
  const people: Participant[] = [
    { id: 'm', name: 'Marcos' },
    { id: 'a', name: 'Ana' },
    { id: 'j', name: 'João' },
  ];

  it('calcula saldos e transferências que zeram as contas', () => {
    const s = settle([expense('jantar', 300, 'm'), expense('taxi', 90, 'a'), expense('museu', 60, 'm', ['m', 'j']), expense('sem', 50)], people);
    const net = Object.fromEntries(s.balances.map((b) => [b.participantId, b.netBrl]));
    expect(net).toEqual({ m: 300 + 60 - 100 - 30 - 30, a: 90 - 100 - 30, j: -100 - 30 - 30 });
    expect(s.unassigned).toBe(1);
    expect(s.sharedTotalBrl).toBe(450);
    expect(s.transfers).toEqual([
      { from: 'j', to: 'm', amountBrl: 160 },
      { from: 'a', to: 'm', amountBrl: 40 },
    ]);
  });

  it('não perde centavos em divisões que não fecham', () => {
    const s = settle([expense('x', 100, 'm')], people);
    const shares = s.balances.map((b) => b.shareBrl);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(s.transfers.reduce((a, t) => a + t.amountBrl, 0)).toBeCloseTo(66.66, 2);
  });

  it('tira participante sem quebrar os gastos', () => {
    const out = removeParticipant([expense('x', 10, 'a', ['a', 'j']), expense('y', 10, 'm', ['a'])], 'a');
    expect(out[0]).toMatchObject({ paidBy: undefined, splitWith: ['j'] });
    expect(out[1].splitWith).toBeUndefined();
    expect(validateParticipantName('ana', people)).toBe('Já tem alguém com esse nome.');
    expect(validateParticipantName('Bia', people)).toBeNull();
  });
});

describe('lembretes', () => {
  it('converte o horário do destino para o instante certo', () => {
    // 9h em Lisboa em 13/11/2026 (inverno, UTC+0) = 9h UTC
    expect(new Date(zonedInstant(tripDate(2026, 11, 13), hm(9), 'Europe/Lisbon')).toISOString()).toBe('2026-11-13T09:00:00.000Z');
    // 9h em São Paulo (UTC-3) = 12h UTC
    expect(new Date(zonedInstant(tripDate(2026, 11, 13), hm(9), 'America/Sao_Paulo')).toISOString()).toBe('2026-11-13T12:00:00.000Z');
    // Horário de verão europeu (UTC+1)
    expect(new Date(zonedInstant(tripDate(2026, 7, 1), hm(9), 'Europe/Lisbon')).toISOString()).toBe('2026-07-01T08:00:00.000Z');
  });

  it('agenda checklist, reservas e começo do dia, só no futuro', () => {
    const data = sampleAppData();
    const now = Date.parse('2026-10-14T12:00:00Z');
    const off = buildReminders(data.trips, DEFAULT_REMINDERS, now);
    expect(off).toEqual([]);

    const all = buildReminders(data.trips, { ...DEFAULT_REMINDERS, enabled: true }, now);
    expect(all.length).toBeGreaterThan(5);
    expect(all.every((r) => r.at > now)).toBe(true);
    expect(all.map((r) => r.at)).toEqual([...all.map((r) => r.at)].sort((a, b) => a - b));
    const voo = all.find((r) => r.id.startsWith('reserva-2h') && r.title.includes('GRU'));
    expect(voo).toBeDefined();
    const day1 = all.find((r) => r.id === 'dia-lisboa-2026-0')!;
    // primeira parada às 16h em Lisboa: aviso às 15h de Lisboa = 15h UTC em novembro
    expect(new Date(day1.at).toISOString()).toBe('2026-11-12T15:00:00.000Z');

    const onlyDays = buildReminders(data.trips, { enabled: true, checklist: false, reservations: false, dayStart: true }, now);
    expect(onlyDays.every((r) => r.id.startsWith('dia-'))).toBe(true);
  });

  it('dia sem paradas não gera aviso', () => {
    const trip = createTrip({ destination: 'Porto', country: '', start: tripDate(2027, 1, 10), days: 2, travelers: 1, budgetBrl: 0, pace: 'LEVE' }, 'p');
    const withStop = addStop(trip, 1, createCustomPlace({ name: 'Ribeira', kind: 'Bairro', indoor: false }, 'r'), hm(10), 60);
    const list = buildReminders([emptyRecord(withStop)], { enabled: true, checklist: false, reservations: false, dayStart: true }, 0);
    expect(list.map((r) => r.id)).toEqual(['dia-p-1']);
  });

  it('migra dados salvos sem as configurações novas', () => {
    const old = JSON.parse(JSON.stringify(sampleAppData()));
    delete old.settings.reminders;
    delete old.rates;
    delete old.trips[0].participants;
    const parsed = parseAppData(JSON.stringify(old))!;
    expect(parsed.settings.reminders).toEqual(DEFAULT_REMINDERS);
    expect(parsed.rates).toEqual({});
    expect(parsed.trips[0].participants).toEqual([]);
  });
});
