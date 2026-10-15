/**
 * Testes das regras do Firestore. Rodam contra o emulador:
 *   npm run test:rules
 * (precisa de Java 11+; o firebase-tools baixa o emulador na primeira vez).
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, Timestamp } = require('firebase/firestore');

let env;

const validTrip = (overrides = {}) => ({
  updatedAt: 1760000000000,
  deleted: false,
  json: '{"trip":{"id":"porto"}}',
  savedAt: serverTimestamp(),
  ...overrides,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rotta-rules',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('dono da viagem', () => {
  test('cria, lê, atualiza e lista as próprias viagens', async () => {
    const db = as('ana');
    await assertSucceeds(setDoc(doc(db, 'users/ana/trips/porto'), validTrip()));
    await assertSucceeds(getDoc(doc(db, 'users/ana/trips/porto')));
    await assertSucceeds(getDocs(collection(db, 'users/ana/trips')));
    await assertSucceeds(setDoc(doc(db, 'users/ana/trips/porto'), validTrip({ updatedAt: 1760000000001, deleted: true, json: '' })));
  });

  test('não apaga documentos (exclusão é só marcação)', async () => {
    const db = as('ana');
    await assertSucceeds(setDoc(doc(db, 'users/ana/trips/porto'), validTrip()));
    await assertFails(deleteDoc(doc(db, 'users/ana/trips/porto')));
  });
});

describe('outras pessoas', () => {
  beforeEach(async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'users/ana/trips/porto'), validTrip()));
  });

  test('sem login não lê nem grava nada', async () => {
    await assertFails(getDoc(doc(anon(), 'users/ana/trips/porto')));
    await assertFails(getDocs(collection(anon(), 'users/ana/trips')));
    await assertFails(setDoc(doc(anon(), 'users/ana/trips/roma'), validTrip()));
  });

  test('outro usuário não lê, não lista e não grava na pasta de quem não é dele', async () => {
    const bia = as('bia');
    await assertFails(getDoc(doc(bia, 'users/ana/trips/porto')));
    await assertFails(getDocs(collection(bia, 'users/ana/trips')));
    await assertFails(setDoc(doc(bia, 'users/ana/trips/porto'), validTrip()));
    await assertFails(setDoc(doc(bia, 'users/ana/trips/nova'), validTrip()));
  });

  test('nenhum caminho fora de users/{uid}/trips é acessível', async () => {
    const ana = as('ana');
    await assertFails(setDoc(doc(ana, 'users/ana'), { nome: 'Ana' }));
    await assertFails(getDoc(doc(ana, 'users/ana')));
    await assertFails(setDoc(doc(ana, 'config/geral'), { x: 1 }));
    await assertFails(getDocs(collection(ana, 'users')));
  });

  test('cache e uso da IA são só do servidor', async () => {
    const ana = as('ana');
    await assertFails(getDoc(doc(ana, 'ai_cache/guia:lisboa:portugal')));
    await assertFails(setDoc(doc(ana, 'ai_cache/guia:lisboa:portugal'), { json: '{}' }));
    await assertFails(getDoc(doc(ana, 'ai_usage/ana/days/2026-10-14')));
    await assertFails(setDoc(doc(ana, 'ai_usage/ana/days/2026-10-14'), { count: 0 }));
  });
});

describe('formato do documento', () => {
  const db = () => as('ana');
  const trip = () => doc(db(), 'users/ana/trips/porto');

  test('recusa campos extras', async () => {
    await assertFails(setDoc(trip(), validTrip({ admin: true })));
  });

  test('recusa tipos errados', async () => {
    await assertFails(setDoc(trip(), validTrip({ updatedAt: 'ontem' })));
    await assertFails(setDoc(trip(), validTrip({ deleted: 'não' })));
    await assertFails(setDoc(trip(), validTrip({ json: { trip: {} } })));
  });

  test('recusa campos faltando', async () => {
    const { json: _json, ...semJson } = validTrip();
    await assertFails(setDoc(trip(), semJson));
  });

  test('recusa documento grande demais', async () => {
    await assertFails(setDoc(trip(), validTrip({ json: 'x'.repeat(900_001) })));
  });

  test('exige a hora do servidor em savedAt', async () => {
    await assertFails(setDoc(trip(), validTrip({ savedAt: Timestamp.fromMillis(0) })));
  });
});
