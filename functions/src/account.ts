/** Exclusão de conta, exigida pelas lojas e pela LGPD. Apaga tudo que o servidor guarda do usuário. */

export const RECENT_LOGIN_SECONDS = 5 * 60;

export interface AccountDeps {
  /** Apaga um documento e todas as subcoleções dele. */
  deleteTree: (path: string) => Promise<void>;
  deleteAuthUser: (uid: string) => Promise<void>;
}

/** Só aceita quem acabou de digitar a senha: protege contra um celular destravado nas mãos de outra pessoa. */
export function isRecentLogin(authTimeSeconds: number | undefined, nowMs: number): boolean {
  return typeof authTimeSeconds === 'number' && nowMs / 1000 - authTimeSeconds <= RECENT_LOGIN_SECONDS;
}

export async function deleteAccount(uid: string, deps: AccountDeps): Promise<void> {
  // Primeiro os dados, depois o login: se algo falhar no meio, a pessoa ainda consegue entrar e tentar de novo.
  await deps.deleteTree(`users/${uid}`);
  await deps.deleteTree(`ai_usage/${uid}`);
  await deps.deleteAuthUser(uid);
}
