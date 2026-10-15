import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';

import { Cache } from './orchestrator';

/**
 * Cache de guias e histórias em ai_cache/{chave}, e uso diário em ai_usage/{uid}/days/{data}.
 * As regras do Firestore negam essas coleções ao app: só as functions (Admin SDK) leem e gravam.
 */
export function firestoreCache(db: Firestore): Cache {
  return {
    async get<T>(key: string) {
      const snap = await db.collection('ai_cache').doc(key).get();
      const data = snap.data();
      if (!data || (data.expiresAt as Timestamp).toMillis() < Date.now()) return null;
      return JSON.parse(data.json as string) as T;
    },
    async set<T>(key: string, value: T, ttlDays: number) {
      await db
        .collection('ai_cache')
        .doc(key)
        .set({ json: JSON.stringify(value), expiresAt: Timestamp.fromMillis(Date.now() + ttlDays * 86_400_000) });
    },
  };
}

export function today(): string {
  // Dia no fuso de Brasília, para o limite virar à meia-noite do usuário brasileiro.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function usageDoc(db: Firestore, uid: string) {
  return db.collection('ai_usage').doc(uid).collection('days').doc(today());
}

export async function usedToday(db: Firestore, uid: string): Promise<number> {
  const snap = await usageDoc(db, uid).get();
  return (snap.data()?.count as number | undefined) ?? 0;
}

export async function recordUsage(db: Firestore, uid: string, usage: { calls: number; tokens: number; cost: number }) {
  await usageDoc(db, uid).set(
    {
      count: FieldValue.increment(usage.calls),
      tokens: FieldValue.increment(usage.tokens),
      cost: FieldValue.increment(usage.cost),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
