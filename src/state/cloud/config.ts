import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

/**
 * Configuração do Firebase vinda de variáveis EXPO_PUBLIC_* (arquivo .env ou segredos do CI).
 * Sem ela, o app funciona só no aparelho e a tela de conta explica como ativar a nuvem.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

/** Endereço dos emuladores do Firebase para testes, ex.: "127.0.0.1" ou o IP do computador na rede. */
export const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || null;

export const cloudConfigured = !!(config.apiKey && config.projectId && config.appId);

export function firebaseApp(): FirebaseApp {
  if (!cloudConfigured) throw new Error('Firebase não configurado');
  return getApps().length > 0 ? getApp() : initializeApp(config);
}
