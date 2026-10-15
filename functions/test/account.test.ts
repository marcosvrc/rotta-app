import { describe, expect, it } from 'vitest';

import { deleteAccount, isRecentLogin } from '../src/account';

describe('excluir conta', () => {
  it('exige login recente', () => {
    const now = Date.parse('2026-10-14T12:00:00Z');
    expect(isRecentLogin(now / 1000 - 60, now)).toBe(true);
    expect(isRecentLogin(now / 1000 - 600, now)).toBe(false);
    expect(isRecentLogin(undefined, now)).toBe(false);
  });

  it('apaga viagens e uso da IA antes do login', async () => {
    const calls: string[] = [];
    await deleteAccount('ana', {
      deleteTree: async (p) => {
        calls.push(`tree:${p}`);
      },
      deleteAuthUser: async (uid) => {
        calls.push(`auth:${uid}`);
      },
    });
    expect(calls).toEqual(['tree:users/ana', 'tree:ai_usage/ana', 'auth:ana']);
  });

  it('não apaga o login se os dados falharem', async () => {
    const calls: string[] = [];
    await expect(
      deleteAccount('ana', {
        deleteTree: async () => {
          throw new Error('falhou');
        },
        deleteAuthUser: async (uid) => {
          calls.push(uid);
        },
      }),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
