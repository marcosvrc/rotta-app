import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { Source } from '@/core/ai';
import { useAccount } from '@/state/account';
import { AiError } from '@/state/cloud/ai';
import { usePalette } from '@/state/rotta';
import { colors } from '@/theme';

/** A IA precisa da nuvem configurada e de login. */
export function useAiAvailable(): { available: boolean; reason: string | null } {
  const { configured, email } = useAccount();
  if (!configured) return { available: false, reason: 'A IA chega quando a nuvem estiver ligada nesta versão.' };
  if (!email) return { available: false, reason: 'Entre na sua conta para usar a IA.' };
  return { available: true, reason: null };
}

/** Estado de um pedido à IA: carregando, erro e resultado. */
export function useAiCall<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Não foi possível falar com a IA.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { loading, error, run };
}

/** Botão discreto de IA, com estado de carregamento. Sem login, leva para a conta. */
export function AiButton({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  const p = usePalette();
  const { available, reason } = useAiAvailable();
  const { configured } = useAccount();
  if (!available) {
    return (
      <Pressable
        onPress={() => configured && router.push('/conta')}
        disabled={!configured}
        accessibilityRole="button"
        style={[styles.button, { borderColor: 'transparent', backgroundColor: colors.fill }]}
      >
        <Ionicons name="sparkles-outline" size={16} color={colors.muted} />
        <Txt size={13} color={colors.muted} style={{ flexShrink: 1 }}>
          {reason ?? ''}
        </Txt>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading }}
      style={[styles.button, { borderColor: p.soft, backgroundColor: p.tint }]}
    >
      {loading ? <ActivityIndicator size="small" color={p.ink} /> : <Ionicons name="sparkles" size={16} color={p.ink} />}
      <Txt size={13} weight="semibold" color={p.ink}>
        {loading ? 'Pensando…' : label}
      </Txt>
    </Pressable>
  );
}

export function AiErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Txt size={13} color={colors.criticalInk} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
      {error}
    </Txt>
  );
}

export function SourceLinks({ sources, label = 'Fonte' }: { sources: Source[]; label?: string }) {
  const p = usePalette();
  if (sources.length === 0) return null;
  return (
    <View style={{ gap: 2, marginTop: 8 }}>
      {sources.map((s) => (
        <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} accessibilityRole="link" style={{ paddingVertical: 6 }}>
          <Txt size={13} weight="semibold" color={p.accent}>
            {`${label}: ${s.title}`}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
});
