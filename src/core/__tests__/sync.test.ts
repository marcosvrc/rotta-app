import { authErrorMessage, validateCredentials } from '../account';
import { AppData, deleteTrip, addTrip, sampleAppData, updateRecord } from '../appdata';
import { tripDate } from '../calendar';
import { createTrip } from '../editing';
import { CloudRepo, CloudTrip, applySync, planSync, syncOnce, toCloud } from '../sync';

const trip = (id: string, destination = id) =>
  createTrip({ destination, country: 'Portugal', start: tripDate(2026, 12, 1), days: 3, travelers: 1, budgetBrl: 1000, pace: 'LEVE' }, id);

class FakeRepo implements CloudRepo {
  docs = new Map<string, CloudTrip>();
  async list() {
    return [...this.docs.values()];
  }
  async put(t: CloudTrip) {
    this.docs.set(t.id, t);
  }
}

async function round(repo: FakeRepo, data: AppData): Promise<AppData> {
  return applySync(data, await syncOnce(repo, data));
}

describe('sincronização', () => {
  it('sobe tudo na primeira vez e baixa em outro aparelho', async () => {
    const repo = new FakeRepo();
    const phone = addTrip(sampleAppData(), trip('porto'), 100);
    await round(repo, phone);
    expect([...repo.docs.keys()].sort()).toEqual(['lisboa-2026', 'porto']);

    const tablet = addTrip(sampleAppData(), trip('roma'), 50);
    const synced = await round(repo, tablet);
    expect(synced.trips.map((r) => r.trip.id).sort()).toEqual(['lisboa-2026', 'porto', 'roma']);
    expect(repo.docs.has('roma')).toBe(true);
  });

  it('vale a edição mais recente', async () => {
    const repo = new FakeRepo();
    let a = addTrip(sampleAppData(), trip('porto'), 100);
    a = await round(repo, a);
    let b = await round(repo, sampleAppData());

    b = updateRecord(b, 'porto', (r) => ({ ...r, trip: { ...r.trip, travelers: 4 } }), 200);
    await round(repo, b);
    a = updateRecord(a, 'porto', (r) => ({ ...r, trip: { ...r.trip, budgetBrl: 5 } }), 150); // mais antiga
    a = await round(repo, a);
    const porto = a.trips.find((r) => r.trip.id === 'porto')!;
    expect(porto.trip.travelers).toBe(4);
    expect(porto.trip.budgetBrl).toBe(1000);
  });

  it('propaga exclusões e não perde a última viagem', async () => {
    const repo = new FakeRepo();
    let a = addTrip(sampleAppData(), trip('porto'), 100);
    a = await round(repo, a);
    let b = await round(repo, sampleAppData());

    a = deleteTrip(a, 'porto', 300);
    expect(a.tombstones).toHaveLength(1);
    a = await round(repo, a);
    expect(a.tombstones).toHaveLength(0);
    expect(repo.docs.get('porto')?.deleted).toBe(true);

    b = await round(repo, b);
    expect(b.trips.map((r) => r.trip.id)).toEqual(['lisboa-2026']);
  });

  it('não sobrescreve o que mudou durante a sincronização e mantém anexos locais', () => {
    const local = sampleAppData();
    const withAttachment = updateRecord(
      local,
      'lisboa-2026',
      (r) => ({ ...r, reservations: r.reservations.map((x, i) => (i === 0 ? { ...x, attachment: { uri: 'file:///a.png', name: 'a.png' } } : x)) }),
      10,
    );
    const remoteRecord = { ...withAttachment.trips[0], updatedAt: 20, trip: { ...withAttachment.trips[0].trip, travelers: 9 } };
    const plan = planSync(withAttachment, [toCloud(remoteRecord)]);
    expect(plan.download).toHaveLength(1);
    expect(toCloud(remoteRecord).json).not.toContain('file:///a.png');

    const applied = applySync(withAttachment, plan);
    expect(applied.trips[0].trip.travelers).toBe(9);
    expect(applied.trips[0].reservations[0].attachment?.uri).toBe('file:///a.png');

    const editedMeanwhile = updateRecord(withAttachment, 'lisboa-2026', (r) => ({ ...r, trip: { ...r.trip, travelers: 3 } }), 30);
    expect(applySync(editedMeanwhile, plan).trips[0].trip.travelers).toBe(3);
  });
});

describe('conta', () => {
  it('valida e traduz erros', () => {
    expect(validateCredentials('a@b.co', '12345678', 'criar')).toEqual([]);
    expect(validateCredentials('ab.co', '123', 'criar')).toHaveLength(2);
    expect(validateCredentials('a@b.co', '', 'entrar')).toEqual(['Informe a senha.']);
    expect(authErrorMessage('auth/invalid-credential')).toBe('E-mail ou senha incorretos.');
    expect(authErrorMessage('outro')).toContain('Tente de novo');
  });
});
