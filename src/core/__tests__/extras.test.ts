import { emptyRecord, exportBackup, parseAppData, parseBackup, sampleAppData } from '../appdata';
import { tripDate } from '../calendar';
import { createTrip } from '../editing';
import { mergePacking, suggestPacking } from '../packing';
import { countryCodeOf, dialable, emergencyNumbersFor } from '../sos';
import {
  applyForecast,
  forecastAvailableFrom,
  forecastRange,
  forecastUrl,
  isRainy,
  isStale,
  mergeForecast,
  parseForecast,
  pickGeoPlace,
  weatherKind,
} from '../weather';

const porto = () =>
  createTrip(
    { destination: 'Porto', country: 'Portugal', start: tripDate(2026, 10, 20), days: 4, travelers: 2, budgetBrl: 9000, pace: 'MEDIO' },
    'porto',
  );

describe('clima', () => {
  const geoJson = {
    results: [
      { name: 'Porto', country: 'Brasil', country_code: 'BR', latitude: -1, longitude: -2, timezone: 'America/Sao_Paulo' },
      { name: 'Porto', country: 'Portugal', country_code: 'PT', admin1: 'Porto', latitude: 41.15, longitude: -8.61, timezone: 'Europe/Lisbon' },
    ],
  };

  it('escolhe o resultado do país da viagem, sem ligar para acentos', () => {
    expect(pickGeoPlace(geoJson, 'portugal')?.countryCode).toBe('PT');
    expect(pickGeoPlace(geoJson, '')?.countryCode).toBe('BR');
    expect(pickGeoPlace({}, 'Portugal')).toBeNull();
  });

  it('calcula a janela de previsão de 16 dias', () => {
    const trip = porto(); // 20 a 23/10
    expect(forecastRange(trip, tripDate(2026, 10, 14))).toEqual({ start: tripDate(2026, 10, 20), end: tripDate(2026, 10, 23) });
    expect(forecastRange(trip, tripDate(2026, 10, 21))?.start).toEqual(tripDate(2026, 10, 21));
    expect(forecastRange(trip, tripDate(2026, 10, 1))).toBeNull();
    expect(forecastRange(trip, tripDate(2026, 10, 30))).toBeNull();
    expect(forecastAvailableFrom(trip)).toEqual(tripDate(2026, 10, 5));
  });

  it('monta a URL e lê a resposta da previsão', () => {
    const geo = pickGeoPlace(geoJson, 'Portugal')!;
    const url = forecastUrl(geo, { start: tripDate(2026, 10, 20), end: tripDate(2026, 10, 23) });
    expect(url).toContain('start_date=2026-10-20');
    expect(url).toContain('timezone=Europe%2FLisbon');
    const days = parseForecast({
      daily: {
        time: ['2026-10-20', '2026-10-21', '2026-10-22'],
        weather_code: [61, 1, 3],
        temperature_2m_max: [17.6, 21.2, 19],
        temperature_2m_min: [11.4, 12, null],
        precipitation_probability_max: [80, 5, 20],
        precipitation_sum: [6.24, 0, 0.3],
      },
    });
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ maxC: 18, minC: 11, rainChance: 80, rainMm: 6.2 });
    expect(isRainy(days[0])).toBe(true);
    expect(isRainy(days[1])).toBe(false);
    expect(weatherKind(days[0].code)).toBe('CHUVA');

    const trip = applyForecast({ ...porto(), days: porto().days.map((d) => ({ ...d, rainExpected: true })) }, days);
    expect(trip.days.map((d) => d.rainExpected)).toEqual([true, false, true, true]);
  });

  it('guarda a previsão e sabe quando atualizar', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    const first = mergeForecast(undefined, [{ date: tripDate(2026, 10, 20), code: 1, maxC: 20, minC: 10, rainChance: 0, rainMm: 0 }], now);
    const second = mergeForecast(first, [{ date: tripDate(2026, 10, 21), code: 1, maxC: 22, minC: 12, rainChance: 0, rainMm: 0 }], now);
    expect(second.days).toHaveLength(2);
    expect(isStale(second, new Date('2026-10-14T13:00:00Z'))).toBe(false);
    expect(isStale(second, new Date('2026-10-14T16:00:00Z'))).toBe(true);
    expect(isStale(undefined, now)).toBe(true);
  });
});

describe('mala', () => {
  it('sugere itens conforme clima, praia e destino', () => {
    const items = suggestPacking({ days: 10, rainyDays: 2, temperature: { minC: 8, maxC: 15 }, international: true, beach: false });
    const titles = items.map((i) => i.title);
    expect(titles).toContain('Passaporte');
    expect(titles).toContain('Casaco quente');
    expect(titles).toContain('Guarda-chuva compacto');
    expect(titles).toContain('Adaptador de tomada');
    expect(titles).not.toContain('Roupa de banho');
    expect(items.find((i) => i.title === 'Meias')?.quantity).toBe(8);

    const beach = suggestPacking({ days: 3, rainyDays: 0, temperature: { minC: 22, maxC: 31 }, international: false, beach: true });
    const beachTitles = beach.map((i) => i.title);
    expect(beachTitles).toContain('Documento com foto');
    expect(beachTitles).toContain('Roupa de banho');
    expect(beachTitles.filter((t) => t === 'Protetor solar')).toHaveLength(1);
    expect(beachTitles).not.toContain('Casaco leve ou moletom');
  });

  it('atualiza as sugestões sem perder o que já foi marcado', () => {
    let n = 0;
    const id = () => `m${n++}`;
    const rainy = mergePacking([], suggestPacking({ days: 3, rainyDays: 1, temperature: null, international: false, beach: false }), id);
    const marked = rainy.map((i) =>
      i.title === 'Guarda-chuva compacto' || i.title === 'Pijama' ? { ...i, done: true } : i,
    );
    const custom = [...marked, { id: 'x', category: 'OUTROS' as const, title: 'Livro', done: false, custom: true }];
    const dry = mergePacking(custom, suggestPacking({ days: 3, rainyDays: 0, temperature: null, international: false, beach: false }), id);
    const titles = dry.map((i) => i.title);
    expect(titles).toContain('Guarda-chuva compacto'); // já estava na mala
    expect(titles).not.toContain('Capa ou jaqueta impermeável'); // não marcado e não vale mais
    expect(titles).toContain('Livro');
    expect(dry.find((i) => i.title === 'Pijama')?.done).toBe(true);
  });
});

describe('SOS', () => {
  it('descobre o país e os números de emergência', () => {
    expect(countryCodeOf('Itália')).toBe('IT');
    expect(countryCodeOf('qualquer', 'JP')).toBe('JP');
    expect(countryCodeOf('Atlântida')).toBeNull();
    expect(emergencyNumbersFor('PT')?.[0].number).toBe('112');
    expect(emergencyNumbersFor('XX')).toBeNull();
    expect(dialable('+351 21 123-4567')).toBe('+351211234567');
    expect(dialable('  ')).toBeNull();
  });
});

describe('backup', () => {
  it('exporta sem anexos e importa de volta', () => {
    const data = sampleAppData();
    data.trips[0].reservations[0] = { ...data.trips[0].reservations[0], attachment: { uri: 'file:///x.png', name: 'x.png' } };
    const text = exportBackup(data, new Date('2026-10-14T12:00:00Z'));
    const back = parseBackup(text)!;
    expect(back.trips[0].trip.destination).toBe('Lisboa');
    expect(back.trips[0].reservations[0].attachment).toBeUndefined();
    expect(parseBackup('{"app":"outro"}')).toBeNull();
    expect(parseBackup('não é json')).toBeNull();
  });

  it('completa dados salvos por versões antigas', () => {
    const old = sampleAppData();
    const legacy = {
      ...old,
      trips: old.trips.map(({ packing: _p, sos: _s, geo: _g, ...rest }) => rest),
    };
    const parsed = parseAppData(JSON.stringify(legacy))!;
    expect(parsed.trips[0].packing).toEqual([]);
    expect(parsed.trips[0].sos).toEqual({});
    expect(emptyRecord(porto()).packing).toEqual([]);
  });
});
