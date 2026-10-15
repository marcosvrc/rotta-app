export type AuthMode = 'entrar' | 'criar';

export const MIN_PASSWORD = 8;

export function validateCredentials(email: string, password: string, mode: AuthMode): string[] {
  const errors: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Informe um e-mail válido.');
  if (mode === 'criar' && password.length < MIN_PASSWORD) errors.push(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  if (mode === 'entrar' && password.length === 0) errors.push('Informe a senha.');
  return errors;
}

/** Traduz os códigos de erro do Firebase Auth para mensagens em português. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com esse e-mail. Tente entrar.';
    case 'auth/invalid-email':
      return 'Informe um e-mail válido.';
    case 'auth/weak-password':
      return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    case 'auth/operation-not-allowed':
      return 'Login por e-mail não está ativado no projeto do Firebase.';
    default:
      return 'Não foi possível concluir. Tente de novo.';
  }
}
