import type { SosInfo } from '../sos';
import type { GeoPlace } from '../weather';
import { MINUTES_IN_DAY, hm, plusDays, tripDate } from '../calendar';
import { ChecklistItem, defaultChecklist } from '../checklist';
import { Expense } from '../expenses';
import { ALWAYS_OPEN, DayPlan, Place, PlaceCatalog, Stop, Trip } from '../model';
import { Reservation } from '../reservations';

/*
 * Viagem de exemplo usada enquanto o app não fala com o backend.
 * Horários e textos são ilustrativos; no app final vêm do Google Places
 * e de resumos da Wikipedia.
 */

const MONDAY: Place['hours']['closedOn'] = ['SEGUNDA'];

const places: Place[] = [
  {
    id: 'torre',
    name: 'Torre de Belém',
    kind: 'Monumento',
    neighborhood: 'Belém',
    location: { lat: 38.6916, lng: -9.216 },
    indoor: true,
    hours: { opens: hm(10), closes: hm(17, 30), closedOn: MONDAY },
    suggestedMinutes: 60,
    priority: 5,
    story:
      'Construída entre 1514 e 1519 para defender a entrada do porto de Lisboa no rio Tejo. ' +
      'É um símbolo do estilo manuelino e da era dos Descobrimentos, Patrimônio Mundial da UNESCO desde 1983.',
    tips: ['Chegue cedo: a fila cresce ao longo da manhã.', 'Combine com o Mosteiro dos Jerónimos, a poucos minutos a pé.'],
    sourceUrl: 'https://pt.wikipedia.org/wiki/Torre_de_Bel%C3%A9m',
  },
  {
    id: 'jeronimos',
    name: 'Mosteiro dos Jerónimos',
    kind: 'Monumento',
    neighborhood: 'Belém',
    location: { lat: 38.6979, lng: -9.2068 },
    indoor: true,
    hours: { opens: hm(9, 30), closes: hm(17, 30), closedOn: MONDAY },
    suggestedMinutes: 90,
    priority: 5,
    story:
      'Encomendado por D. Manuel I no início do século XVI, é uma obra-prima do estilo manuelino. ' +
      'A igreja guarda o túmulo de Vasco da Gama.',
    tips: ['A entrada da igreja e a do claustro são separadas.', 'Compre o ingresso antes para pular a fila.'],
    sourceUrl: 'https://pt.wikipedia.org/wiki/Mosteiro_dos_Jer%C3%B3nimos',
  },
  {
    id: 'pasteis',
    name: 'Pastéis de Belém',
    kind: 'Doceria',
    neighborhood: 'Belém',
    location: { lat: 38.6975, lng: -9.2032 },
    indoor: true,
    hours: { opens: hm(8), closes: hm(20), closedOn: [] },
    suggestedMinutes: 40,
    priority: 4,
    story: 'Produz desde 1837 os pastéis de nata de uma receita ligada aos monges do Mosteiro dos Jerónimos.',
    tips: ['A fila do balcão anda rápido; para sentar, entre e procure mesa lá dentro.', 'Peça com canela e açúcar.'],
  },
  {
    id: 'lxfactory',
    name: 'LX Factory',
    kind: 'Centro criativo',
    neighborhood: 'Alcântara',
    location: { lat: 38.7033, lng: -9.1789 },
    indoor: true,
    hours: { opens: hm(10), closes: hm(20), closedOn: [] },
    suggestedMinutes: 120,
    priority: 2,
    story: 'Antigo complexo industrial do século XIX, hoje ocupado por lojas, restaurantes, livrarias e ateliês.',
    tips: ['Reserve tempo para a livraria Ler Devagar.', 'Bom lugar para almoçar sem pressa.'],
  },
  {
    id: 'castelo',
    name: 'Castelo de São Jorge',
    kind: 'Monumento',
    neighborhood: 'Alfama',
    location: { lat: 38.7139, lng: -9.1335 },
    indoor: false,
    hours: { opens: hm(9), closes: hm(18), closedOn: [] },
    suggestedMinutes: 90,
    priority: 5,
    story:
      'Fortificação de origem moura no alto de uma das colinas mais antigas da cidade, com vista para a Baixa e o Tejo.',
    tips: ['O fim de tarde tem a melhor luz para fotos.', 'As ladeiras são íngremes: vá de elétrico ou táxi.'],
    sourceUrl: 'https://pt.wikipedia.org/wiki/Castelo_de_S%C3%A3o_Jorge',
  },
  {
    id: 'alfama',
    name: 'Passeio por Alfama',
    kind: 'Bairro',
    neighborhood: 'Alfama',
    location: { lat: 38.711, lng: -9.13 },
    indoor: false,
    hours: ALWAYS_OPEN,
    suggestedMinutes: 60,
    priority: 3,
    story: 'O bairro mais antigo de Lisboa, de ruelas estreitas, escadarias e casas de fado.',
    tips: ['Use sapato confortável: a calçada portuguesa escorrega.'],
  },
  {
    id: 'fado',
    name: 'Jantar com fado',
    kind: 'Restaurante',
    neighborhood: 'Alfama',
    location: { lat: 38.7115, lng: -9.129 },
    indoor: true,
    hours: { opens: hm(19, 30), closes: MINUTES_IN_DAY, closedOn: [] },
    suggestedMinutes: 120,
    priority: 4,
    story: 'O fado, canção urbana de Lisboa, é Patrimônio Cultural Imaterial da Humanidade pela UNESCO desde 2011.',
    tips: ['Faça reserva.', 'Durante a apresentação, silêncio total.'],
  },
  {
    id: 'gulbenkian',
    name: 'Museu Calouste Gulbenkian',
    kind: 'Museu',
    neighborhood: 'Avenidas Novas',
    location: { lat: 38.7372, lng: -9.1546 },
    indoor: true,
    hours: { opens: hm(10), closes: hm(18), closedOn: ['TERCA'] },
    suggestedMinutes: 120,
    priority: 4,
    story:
      'Reúne a coleção do colecionador Calouste Gulbenkian, da arte egípcia às joias de René Lalique, cercada por um jardim.',
    tips: ['O jardim é ótimo para uma pausa entre as salas.'],
  },
  {
    id: 'timeout',
    name: 'Time Out Market',
    kind: 'Mercado',
    neighborhood: 'Cais do Sodré',
    location: { lat: 38.7069, lng: -9.1459 },
    indoor: true,
    hours: { opens: hm(10), closes: MINUTES_IN_DAY, closedOn: [] },
    suggestedMinutes: 75,
    priority: 3,
    story: 'No antigo Mercado da Ribeira, reúne dezenas de restaurantes e chefs da cidade sob o mesmo teto.',
    tips: ['No almoço de fim de semana enche: chegue antes das 12h30.'],
  },
  {
    id: 'stcatarina',
    name: 'Miradouro de Santa Catarina',
    kind: 'Mirante',
    neighborhood: 'Santa Catarina',
    location: { lat: 38.7094, lng: -9.1474 },
    indoor: false,
    hours: ALWAYS_OPEN,
    suggestedMinutes: 45,
    priority: 2,
    story: 'Mirante com vista para o Tejo e a Ponte 25 de Abril, ponto de encontro no fim de tarde.',
    tips: ['Vá no pôr do sol.'],
  },
  {
    id: 'azulejo',
    name: 'Museu Nacional do Azulejo',
    kind: 'Museu',
    neighborhood: 'Xabregas',
    location: { lat: 38.7247, lng: -9.1135 },
    indoor: true,
    hours: { opens: hm(10), closes: hm(18), closedOn: MONDAY },
    suggestedMinutes: 90,
    priority: 4,
    story: 'No antigo Convento da Madre de Deus, conta cinco séculos de história do azulejo em Portugal.',
    tips: ['Não perca o grande painel de Lisboa antes do terremoto de 1755.'],
  },
  {
    id: 'mnaa',
    name: 'Museu Nacional de Arte Antiga',
    kind: 'Museu',
    neighborhood: 'Lapa',
    location: { lat: 38.705, lng: -9.161 },
    indoor: true,
    hours: { opens: hm(10), closes: hm(18), closedOn: MONDAY },
    suggestedMinutes: 90,
    priority: 3,
    story: 'Principal museu de arte de Portugal, com obras como os Painéis de São Vicente.',
    tips: ['O jardim do museu tem vista para o rio.'],
  },
  {
    id: 'oceanario',
    name: 'Oceanário de Lisboa',
    kind: 'Aquário',
    neighborhood: 'Parque das Nações',
    location: { lat: 38.7636, lng: -9.0938 },
    indoor: true,
    hours: { opens: hm(10), closes: hm(19), closedOn: [] },
    suggestedMinutes: 120,
    priority: 4,
    story: 'Um dos maiores aquários da Europa, construído para a Expo 98 no Parque das Nações.',
    tips: ['Compre o ingresso online.'],
  },
  {
    id: 'pena',
    name: 'Palácio da Pena',
    kind: 'Palácio',
    neighborhood: 'Sintra',
    location: { lat: 38.7876, lng: -9.3906 },
    indoor: false,
    hours: { opens: hm(9, 30), closes: hm(18, 30), closedOn: [] },
    suggestedMinutes: 180,
    priority: 5,
    story: 'Palácio romântico do século XIX no alto da serra de Sintra, de cores vivas e vista para o Atlântico.',
    tips: ['Reserve horário de entrada.', 'Há neblina com frequência: leve casaco.'],
  },
  {
    id: 'regaleira',
    name: 'Quinta da Regaleira',
    kind: 'Palácio',
    neighborhood: 'Sintra',
    location: { lat: 38.7963, lng: -9.396 },
    indoor: false,
    hours: { opens: hm(10), closes: hm(18, 30), closedOn: [] },
    suggestedMinutes: 150,
    priority: 4,
    story:
      'Palácio e jardins do início do século XX, famosos pelo Poço Iniciático, uma escada em espiral que desce pela terra.',
    tips: ['Leve lanterna do celular para os túneis.'],
  },
  {
    id: 'palacio',
    name: 'Palácio Nacional de Sintra',
    kind: 'Palácio',
    neighborhood: 'Sintra',
    location: { lat: 38.7975, lng: -9.3906 },
    indoor: true,
    hours: { opens: hm(9, 30), closes: hm(18, 30), closedOn: [] },
    suggestedMinutes: 90,
    priority: 3,
    story: 'Palácio real de origem medieval no centro de Sintra, reconhecível pelas duas grandes chaminés cônicas.',
    tips: ['Fica no centro, fácil de encaixar no fim do dia.'],
  },
  {
    id: 'sintra',
    name: 'Centro histórico de Sintra',
    kind: 'Bairro',
    neighborhood: 'Sintra',
    location: { lat: 38.7985, lng: -9.388 },
    indoor: false,
    hours: ALWAYS_OPEN,
    suggestedMinutes: 60,
    priority: 1,
    story: 'Ruelas com cafés e os doces típicos da vila, como as queijadas e os travesseiros.',
    tips: ['O último trem para Lisboa sai à noite: confira o horário.'],
  },
];

export const lisboaCatalog = new PlaceCatalog(places);

const stop = (placeId: string, start: number, durationMinutes: number): Stop => ({ placeId, start, durationMinutes });

function day(partial: Pick<DayPlan, 'date' | 'title' | 'stops'> & Partial<DayPlan>): DayPlan {
  return { availableFrom: hm(8), availableUntil: hm(23), rainExpected: false, ...partial };
}

export function lisboaTrip(): Trip {
  const start = tripDate(2026, 11, 12);
  return {
    id: 'lisboa-2026',
    destination: 'Lisboa',
    country: 'Portugal',
    travelers: 2,
    budgetBrl: 18_000,
    pace: 'MEDIO',
    stay: 'CONFORTO',
    food: 'MEDIA',
    places,
    days: [
      day({
        date: start,
        title: 'Alfama e Castelo',
        availableFrom: hm(15),
        stops: [stop('castelo', hm(16), 90), stop('alfama', hm(17, 45), 60), stop('fado', hm(20), 120)],
      }),
      day({
        date: plusDays(start, 1),
        title: 'Belém e Alcântara',
        stops: [
          stop('torre', hm(10), 60),
          stop('jeronimos', hm(11, 20), 90),
          stop('pasteis', hm(13), 40),
          stop('lxfactory', hm(14, 30), 120),
        ],
      }),
      day({
        date: plusDays(start, 2),
        title: 'Museus e mirantes',
        rainExpected: true,
        stops: [stop('gulbenkian', hm(10), 120), stop('timeout', hm(13), 75), stop('stcatarina', hm(17), 45)],
      }),
      day({
        date: plusDays(start, 3),
        title: 'Sintra',
        stops: [
          stop('pena', hm(9, 30), 180),
          stop('regaleira', hm(13), 150),
          stop('palacio', hm(16), 90),
          stop('sintra', hm(17, 45), 60),
        ],
      }),
      day({
        date: plusDays(start, 4),
        title: 'Último dia',
        availableUntil: hm(14),
        stops: [stop('azulejo', hm(10), 90), stop('oceanario', hm(12), 90)],
      }),
    ],
  };
}

export function lisboaExpenses(): Expense[] {
  return [
    { id: 'g1', dayIndex: 0, description: 'Táxi do aeroporto', category: 'TRANSPORTE', payment: 'CREDITO', amountBrl: 180 },
    { id: 'g2', dayIndex: 0, description: 'Jantar com fado', category: 'ALIMENTACAO', payment: 'CREDITO', amountBrl: 390 },
    { id: 'g3', dayIndex: 1, description: 'Ingressos Torre de Belém', category: 'PASSEIOS', payment: 'CREDITO', amountBrl: 120 },
    { id: 'g4', dayIndex: 1, description: 'Pastéis de Belém', category: 'ALIMENTACAO', payment: 'DINHEIRO', amountBrl: 45 },
    { id: 'g5', dayIndex: 1, description: 'Almoço na LX Factory', category: 'ALIMENTACAO', payment: 'DEBITO', amountBrl: 140 },
    { id: 'g6', dayIndex: 1, description: 'Elétrico 28', category: 'TRANSPORTE', payment: 'DEBITO', amountBrl: 28 },
    { id: 'g7', dayIndex: 2, description: 'Time Out Market', category: 'ALIMENTACAO', payment: 'CREDITO', amountBrl: 150 },
    { id: 'g8', dayIndex: 2, description: 'Lembranças', category: 'COMPRAS', payment: 'PIX', amountBrl: 110 },
  ];
}

export function lisboaReservations(): Reservation[] {
  const start = tripDate(2026, 11, 12);
  return [
    { id: 'r1', type: 'VOO', title: 'GRU → LIS', date: start, time: hm(9, 40), code: '[LOCALIZADOR]', notes: 'Chegada em Lisboa; embarque em São Paulo na véspera' },
    { id: 'r2', type: 'HOSPEDAGEM', title: 'Hotel em Alfama', date: start, time: hm(15), notes: '4 noites' },
    { id: 'r3', type: 'INGRESSO', title: 'Torre de Belém', date: plusDays(start, 1), time: hm(10) },
    { id: 'r4', type: 'INGRESSO', title: 'Palácio da Pena', date: plusDays(start, 3), time: hm(9, 30) },
    { id: 'r5', type: 'VOO', title: 'LIS → GRU', date: plusDays(start, 4), time: hm(17, 30), code: '[LOCALIZADOR]' },
  ];
}

export function lisboaChecklist(): ChecklistItem[] {
  const done = new Set([0, 3, 4]);
  return defaultChecklist((i) => `c${i + 1}`).map((item, i) => ({ ...item, done: done.has(i) }));
}

export function lisboaGeo(): GeoPlace {
  return {
    name: 'Lisboa',
    country: 'Portugal',
    countryCode: 'PT',
    admin1: 'Lisboa',
    latitude: 38.72509,
    longitude: -9.1498,
    timezone: 'Europe/Lisbon',
  };
}

export function lisboaSos(): SosInfo {
  return {
    stayAddress: 'Rua de São Tomé 12, Alfama, Lisboa',
    insuranceName: 'Seguro viagem (exemplo)',
    insurancePolicy: 'APL-000000',
  };
}
