import { Firestore, collection, connectFirestoreEmulator, doc, getDocs, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

import { CloudRepo, CloudTrip } from '@/core/sync';

import { emulatorHost, firebaseApp } from './config';

let db: Firestore | null = null;

function firestore(): Firestore {
  if (db) return db;
  db = getFirestore(firebaseApp());
  if (emulatorHost) connectFirestoreEmulator(db, emulatorHost, 8080);
  return db;
}

/** Viagens do usuário em users/{uid}/trips/{tripId}. As regras do Firestore só deixam cada um ver as suas. */
export function firestoreRepo(uid: string): CloudRepo {
  const trips = () => collection(firestore(), 'users', uid, 'trips');
  return {
    async list() {
      const snap = await getDocs(trips());
      return snap.docs.map((d) => {
        const v = d.data();
        return {
          id: d.id,
          updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : 0,
          deleted: v.deleted === true,
          json: typeof v.json === 'string' ? v.json : '',
        } satisfies CloudTrip;
      });
    },
    async put(trip) {
      await setDoc(doc(trips(), trip.id), {
        updatedAt: trip.updatedAt,
        deleted: trip.deleted,
        json: trip.json,
        savedAt: serverTimestamp(),
      });
    },
  };
}
