import { connectFunctionsEmulator, Functions, getFunctions, httpsCallable } from 'firebase/functions';

import { AI_ERROR_MESSAGE, AiOutputs, AiRequest, AiResponse, AiTask } from '@/core/ai';

import { emulatorHost, firebaseApp } from './config';

let functions: Functions | null = null;

export function cloudFunctions(): Functions {
  if (functions) return functions;
  functions = getFunctions(firebaseApp(), 'southamerica-east1');
  if (emulatorHost) connectFunctionsEmulator(functions, emulatorHost, 5001);
  return functions;
}

export class AiError extends Error {}

/** Chama o orquestrador de IA. A chave do OpenRouter fica só no servidor. */
export async function askAi<T extends AiTask>(request: Extract<AiRequest, { task: T }>): Promise<AiResponse<T> & { data: AiOutputs[T] }> {
  try {
    const call = httpsCallable<AiRequest, AiResponse<T>>(cloudFunctions(), 'ia', { timeout: 280_000 });
    const result = await call(request);
    return result.data;
  } catch (e) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code).replace('functions/', '') : '';
    throw new AiError(AI_ERROR_MESSAGE[code] ?? 'Não foi possível falar com a IA. Confira a conexão.');
  }
}
