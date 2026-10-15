import type { Persistence } from 'firebase/auth';

/**
 * O pacote do Firebase só expõe os tipos desta função para o bundle de React Native, que o Metro usa
 * no Android e no iOS. Esta declaração deixa o TypeScript enxergá-la em auth.native.ts.
 */
declare module 'firebase/auth' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
