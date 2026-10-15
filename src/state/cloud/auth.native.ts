import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, connectAuthEmulator, getReactNativePersistence, initializeAuth } from 'firebase/auth';

import { emulatorHost, firebaseApp } from './config';

let instance: Auth | null = null;

/** Android e iOS: a sessão fica no AsyncStorage, para continuar logado depois de fechar o app. */
export function cloudAuth(): Auth {
  if (instance) return instance;
  instance = initializeAuth(firebaseApp(), { persistence: getReactNativePersistence(AsyncStorage) });
  if (emulatorHost) connectAuthEmulator(instance, `http://${emulatorHost}:9099`, { disableWarnings: true });
  return instance;
}
