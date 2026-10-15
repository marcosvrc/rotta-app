import { AppData, TripRecord, parseAppData } from './appdata';

/** Como cada viagem fica guardada na nuvem: o registro inteiro em JSON, mais a hora da última mudança. */
export interface CloudTrip {
  id: string;
  updatedAt: number;
  deleted: boolean;
  /** Registro em JSON. Vazio quando a viagem foi apagada. */
  json: string;
}

/** Acesso à nuvem. A implementação com Firestore fica fora do core. */
export interface CloudRepo {
  list(): Promise<CloudTrip[]>;
  put(trip: CloudTrip): Promise<void>;
}

/** Firestore aceita documentos de até 1 MiB; deixamos folga. */
export const MAX_CLOUD_BYTES = 900_000;

/** Anexos são arquivos deste aparelho: não sobem para a nuvem. */
export function toCloud(record: TripRecord): CloudTrip {
  const clean: TripRecord = {
    ...record,
    reservations: record.reservations.map(({ attachment: _attachment, ...rest }) => rest),
  };
  return { id: record.trip.id, updatedAt: record.updatedAt, deleted: false, json: JSON.stringify(clean) };
}

export function fromCloud(cloud: CloudTrip): TripRecord | null {
  if (cloud.deleted || !cloud.json) return null;
  try {
    const parsed = parseAppData(
      JSON.stringify({ version: 1, activeTripId: cloud.id, trips: [JSON.parse(cloud.json)], settings: {} }),
    );
    const record = parsed?.trips[0];
    return record && record.trip.id === cloud.id ? { ...record, updatedAt: cloud.updatedAt } : null;
  } catch {
    return null;
  }
}

export interface SyncPlan {
  upload: CloudTrip[];
  /** Viagens da nuvem mais novas que as deste aparelho (ou que só existem lá). */
  download: TripRecord[];
  /** Viagens apagadas em outro aparelho. */
  remove: string[];
  /** Hora de cada viagem deste aparelho no momento do plano, para não sobrescrever edições feitas durante a sincronização. */
  snapshot: Record<string, number>;
  /** Exclusões deste aparelho já tratadas neste plano. */
  settledTombstones: Record<string, number>;
}

/** Compara este aparelho com a nuvem. Vale a mudança mais recente de cada viagem. */
export function planSync(local: AppData, remote: CloudTrip[]): SyncPlan {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const tombstones = new Map(local.tombstones.map((t) => [t.id, t.at]));
  const plan: SyncPlan = {
    upload: [],
    download: [],
    remove: [],
    snapshot: {},
    settledTombstones: Object.fromEntries(local.tombstones.map((t) => [t.id, t.at])),
  };

  for (const record of local.trips) {
    const id = record.trip.id;
    plan.snapshot[id] = record.updatedAt;
    const cloud = remoteById.get(id);
    if (!cloud || record.updatedAt > cloud.updatedAt) {
      plan.upload.push(toCloud(record));
    } else if (cloud.updatedAt > record.updatedAt) {
      if (cloud.deleted) plan.remove.push(id);
      else {
        const fresh = fromCloud(cloud);
        if (fresh) plan.download.push(fresh);
      }
    }
  }

  for (const cloud of remote) {
    if (local.trips.some((r) => r.trip.id === cloud.id)) continue;
    const deletedAt = tombstones.get(cloud.id);
    if (deletedAt !== undefined) {
      if (!cloud.deleted && deletedAt >= cloud.updatedAt) {
        plan.upload.push({ id: cloud.id, updatedAt: deletedAt, deleted: true, json: '' });
      } else if (!cloud.deleted) {
        const fresh = fromCloud(cloud);
        if (fresh) plan.download.push(fresh);
      }
      continue;
    }
    if (!cloud.deleted) {
      const fresh = fromCloud(cloud);
      if (fresh) plan.download.push(fresh);
    }
  }

  for (const [id, at] of tombstones) {
    if (!remoteById.has(id)) plan.upload.push({ id, updatedAt: at, deleted: true, json: '' });
  }
  return plan;
}

/**
 * Aplica o que veio da nuvem nos dados atuais. Viagens editadas neste aparelho durante a sincronização ficam
 * como estão (sobem na próxima rodada). Anexos locais são mantidos.
 */
export function applySync(current: AppData, plan: SyncPlan): AppData {
  const unchanged = (r: TripRecord) => plan.snapshot[r.trip.id] === undefined || plan.snapshot[r.trip.id] === r.updatedAt;
  const removable = new Set(plan.remove);
  let trips = current.trips.filter((r) => !(removable.has(r.trip.id) && unchanged(r)));
  if (trips.length === 0) trips = current.trips; // nunca fica sem nenhuma viagem

  for (const fresh of plan.download) {
    const idx = trips.findIndex((r) => r.trip.id === fresh.trip.id);
    if (idx === -1) {
      trips = [...trips, fresh];
      continue;
    }
    const local = trips[idx];
    if (!unchanged(local)) continue;
    const reservations = fresh.reservations.map((res) => {
      const attachment = local.reservations.find((x) => x.id === res.id)?.attachment;
      return attachment ? { ...res, attachment } : res;
    });
    trips = trips.map((r, i) => (i === idx ? { ...fresh, reservations } : r));
  }

  const activeTripId = trips.some((r) => r.trip.id === current.activeTripId) ? current.activeTripId : trips[0].trip.id;
  const tombstones = current.tombstones.filter((t) => plan.settledTombstones[t.id] !== t.at);
  return { ...current, trips, activeTripId, tombstones };
}

/** Uma rodada completa: lê a nuvem, envia o que é mais novo aqui e devolve o plano para aplicar localmente. */
export async function syncOnce(repo: CloudRepo, local: AppData): Promise<SyncPlan> {
  const remote = await repo.list();
  const plan = planSync(local, remote);
  for (const trip of plan.upload) {
    if (trip.json.length > MAX_CLOUD_BYTES) continue;
    await repo.put(trip);
  }
  return plan;
}
