import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { AiRequest, AiResponse } from '../../src/core/ai';
import { deleteAccount, isRecentLogin } from './account';
import { firestoreCache, recordUsage, usedToday } from './firestore';
import { LlmError, Reasoning, openRouter } from './openrouter';
import { runTask } from './orchestrator';
import { requestSchema } from './schemas';
import { wikipediaSummary, wikivoyageText } from './wiki';

initializeApp();

/** Chave do OpenRouter: fica no Secret Manager (firebase functions:secrets:set OPENROUTER_API_KEY). */
const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY');
/** Modelos por tarefa. Trocar não exige nova versão do app. */
const MODEL_FAST = defineString('AI_MODEL_FAST', { default: 'anthropic/claude-haiku-5.5' });
const MODEL_STRONG = defineString('AI_MODEL_STRONG', { default: 'anthropic/claude-sonnet-5.5' });
/** Pedidos à IA por usuário por dia (respostas do cache não contam). */
const DAILY_LIMIT = defineInt('AI_DAILY_LIMIT', { default: 30 });
/** Para testes com um servidor falso no emulador. Vazio usa o OpenRouter. */
const OPENROUTER_BASE_URL = defineString('OPENROUTER_BASE_URL', { default: '' });
/** Raciocínio interno de cada modelo: off, low, medium ou high. O Sonnet 5.5 não aceita off. */
const AI_REASONING_FAST = defineString('AI_REASONING_FAST', { default: 'off' });
const AI_REASONING_STRONG = defineString('AI_REASONING_STRONG', { default: 'low' });

function reasoningOf(value: string, fallback: Reasoning): Reasoning {
  return (['off', 'low', 'medium', 'high'] as const).find((v) => v === value) ?? fallback;
}

async function safeSource<T>(name: string, load: () => Promise<T | null>): Promise<T | null> {
  try {
    return await load();
  } catch (e) {
    logger.warn('fonte indisponível', { name, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export const ia = onCall(
  {
    region: 'southamerica-east1',
    secrets: [OPENROUTER_API_KEY],
    // Até duas chamadas ao modelo por pedido, cada uma com até ~110 s.
    timeoutSeconds: 300,
    memory: '256MiB',
    // Teto de instâncias: limita o estrago se alguém tentar abusar.
    maxInstances: 5,
    // Ligar quando o App Check estiver configurado no app (etapa 5).
    enforceAppCheck: false,
  },
  async (request): Promise<AiResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para usar a IA.');

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Pedido inválido.');
    const req = parsed.data as AiRequest;

    const apiKey = OPENROUTER_API_KEY.value();
    if (!apiKey) throw new HttpsError('failed-precondition', 'IA não configurada.');

    const db = getFirestore();
    const limit = DAILY_LIMIT.value();
    const used = await usedToday(db, uid);
    if (used >= limit) throw new HttpsError('resource-exhausted', 'Limite diário atingido.');

    const usage = { calls: 0, tokens: 0, cost: 0 };
    const started = Date.now();
    try {
      const result = await runTask(req, {
        llm: openRouter(apiKey, fetch, OPENROUTER_BASE_URL.value() || undefined),
        models: {
          fast: MODEL_FAST.value(),
          strong: MODEL_STRONG.value(),
          fastReasoning: reasoningOf(AI_REASONING_FAST.value(), 'off'),
          strongReasoning: reasoningOf(AI_REASONING_STRONG.value(), 'low'),
        },
        // Fonte fora do ar não derruba o pedido: a tarefa segue sem ela (e sem inventar, no caso da história).
        wikipedia: (q) => safeSource('wikipedia', () => wikipediaSummary(fetch, q)),
        wikivoyage: (d) => safeSource('wikivoyage', () => wikivoyageText(fetch, d)),
        cache: firestoreCache(db),
        onUsage: (_task, u) => {
          usage.tokens += u.promptTokens + u.completionTokens;
          usage.cost += u.cost;
        },
      });
      if (!result.cached) usage.calls = 1;
      if (usage.calls || usage.tokens) await recordUsage(db, uid, usage);
      logger.info('ia', { task: req.task, uid, cached: result.cached, tokens: usage.tokens, cost: usage.cost, ms: Date.now() - started });
      return { data: result.data, cached: result.cached, remaining: Math.max(0, limit - used - usage.calls) };
    } catch (e) {
      if (usage.tokens) await recordUsage(db, uid, { ...usage, calls: 1 });
      logger.error('ia falhou', { task: req.task, uid, error: e instanceof Error ? e.message : String(e) });
      if (e instanceof LlmError && e.retryable) throw new HttpsError('unavailable', 'IA indisponível.');
      throw new HttpsError('internal', 'Falha na IA.');
    }
  },
);

/** Apaga a conta e todos os dados do usuário na nuvem. Exige login feito nos últimos 5 minutos. */
export const excluirConta = onCall({ region: 'southamerica-east1', maxInstances: 2, enforceAppCheck: false }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta.');
  if (!isRecentLogin(request.auth?.token.auth_time, Date.now())) {
    throw new HttpsError('failed-precondition', 'Confirme a senha de novo para excluir a conta.');
  }
  const db = getFirestore();
  await deleteAccount(uid, {
    deleteTree: (path) => db.recursiveDelete(db.doc(path)),
    deleteAuthUser: (id) => getAuth().deleteUser(id),
  });
  logger.info('conta excluída', { uid });
  return { ok: true };
});
