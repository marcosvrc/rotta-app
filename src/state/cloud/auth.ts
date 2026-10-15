import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';

import { emulatorHost, firebaseApp } from './config';

let instance: Auth | null = null;

/** Web: a sessão fica no navegador (padrão do Firebase). */
export function cloudAuth(): Auth {
  if (instance) return instance;
  instance = getAuth(firebaseApp());
  if (emulatorHost) connectAuthEmulator(instance, `http://${emulatorHost}:9099`, { disableWarnings: true });
  return instance;
}
