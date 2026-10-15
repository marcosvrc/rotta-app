import { httpsCallable } from 'firebase/functions';
import {
  EmailAuthProvider,
  User,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { authErrorMessage } from '@/core/account';
import { syncOnce } from '@/core/sync';
import { cloudFunctions } from '@/state/cloud/ai';
import { cloudAuth } from '@/state/cloud/auth';
import { cloudConfigured } from '@/state/cloud/config';
import { firestoreRepo } from '@/state/cloud/repo';
import { useRotta } from '@/state/rotta';

export type SyncStatus = 'desligado' | 'parado' | 'sincronizando' | 'ok' | 'erro';

interface AccountState {
  configured: boolean;
  /** false até o Firebase dizer se há alguém logado. */
  authReady: boolean;
  email: string | null;
  status: SyncStatus;
  lastSyncAt: Date | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  /** Confirma a senha, apaga tudo na nuvem e a conta. Devolve a mensagem de erro, se houver. */
  deleteAccount: (password: string) => Promise<string | null>;
}

const AccountContext = createContext<AccountState | null>(null);
const SYNC_DELAY_MS = 4000;
/** Sem resposta da nuvem nesse tempo, a rodada falha e tenta de novo na próxima mudança. */
const SYNC_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function errorCode(e: unknown): string | undefined {
  return typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : undefined;
}

/** Assinatura das mudanças locais: se não mudou, não há o que enviar. */
function signature(data: ReturnType<ReturnType<typeof useRotta>['getData']>): string {
  return [...data.trips.map((r) => `${r.trip.id}:${r.updatedAt}`), ...data.tombstones.map((t) => `-${t.id}:${t.at}`)].join('|');
}

/** Login com e-mail e senha e sincronização das viagens com o Firestore. Sem configuração, fica desligado. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { data, getData, applySyncPlan, resetToSample } = useRotta();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!cloudConfigured);
  const [status, setStatus] = useState<SyncStatus>(cloudConfigured ? 'parado' : 'desligado');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const syncing = useRef(false);
  const again = useRef(false);
  const syncedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!cloudConfigured) return;
    return onAuthStateChanged(cloudAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
      syncedSignature.current = null;
    });
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) return;
    if (syncing.current) {
      again.current = true;
      return;
    }
    syncing.current = true;
    setStatus('sincronizando');
    try {
      do {
        again.current = false;
        const snapshot = getData();
        const plan = await withTimeout(syncOnce(firestoreRepo(user.uid), snapshot), SYNC_TIMEOUT_MS);
        applySyncPlan(plan);
        syncedSignature.current = signature(snapshot);
      } while (again.current);
      setLastSyncAt(new Date());
      setStatus('ok');
    } catch {
      setStatus('erro');
    } finally {
      syncing.current = false;
    }
  }, [user, getData, applySyncPlan]);

  // Ao entrar, sincroniza na hora; depois, as mudanças locais sobem alguns segundos após a última edição.
  const currentSignature = signature(data);
  useEffect(() => {
    if (!user || currentSignature === syncedSignature.current) return;
    const timer = setTimeout(syncNow, syncedSignature.current === null ? 0 : SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user, currentSignature, syncNow]);

  // Ao voltar para o app, busca o que mudou em outros aparelhos.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => sub.remove();
  }, [syncNow]);

  const value = useMemo<AccountState>(
    () => ({
      configured: cloudConfigured,
      authReady,
      email: user?.email ?? null,
      status: !cloudConfigured ? 'desligado' : user ? status : 'parado',
      lastSyncAt,
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(cloudAuth(), email.trim(), password);
          return null;
        } catch (e) {
          return authErrorMessage(errorCode(e));
        }
      },
      signUp: async (email, password) => {
        try {
          await createUserWithEmailAndPassword(cloudAuth(), email.trim(), password);
          return null;
        } catch (e) {
          return authErrorMessage(errorCode(e));
        }
      },
      resetPassword: async (email) => {
        try {
          await sendPasswordResetEmail(cloudAuth(), email.trim());
          return null;
        } catch (e) {
          return authErrorMessage(errorCode(e));
        }
      },
      signOut: async () => {
        await firebaseSignOut(cloudAuth());
        setLastSyncAt(null);
      },
      syncNow,
      deleteAccount: async (password) => {
        if (!user?.email) return 'Entre na sua conta.';
        try {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        } catch (e) {
          return authErrorMessage(errorCode(e));
        }
        try {
          await httpsCallable(cloudFunctions(), 'excluirConta', { timeout: 60_000 })({});
        } catch {
          return 'Não foi possível excluir agora. Confira a conexão e tente de novo.';
        }
        await firebaseSignOut(cloudAuth()).catch(() => undefined);
        resetToSample();
        setLastSyncAt(null);
        return null;
      },
    }),
    [authReady, user, status, lastSyncAt, syncNow, resetToSample],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount precisa estar dentro de AccountProvider');
  return ctx;
}
