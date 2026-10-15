import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiButton, AiErrorText, SourceLinks, useAiCall } from '@/components/ai';
import { Card, Divider, PrimaryButton, ScreenHeader, Stepper, Txt } from '@/components/ui';
import { SuggestOutput } from '@/core/ai';
import { shortDateLabel } from '@/core/calendar';
import { formatDuration } from '@/core/format';
import { PACES } from '@/core/model';
import { addSuggestions, suggestInputFor } from '@/core/suggestions';
import { askAi } from '@/state/cloud/ai';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

/** Sugestões de paradas da IA para um dia. Quem decide se cabem é o validador, depois de adicionar. */
export default function SuggestScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const { trip, interests, updateTrip, setSelectedDay, palette: p } = useRotta();
  const dayIndex = Math.min(Math.max(Number(params.day ?? 0) || 0, 0), trip.days.length - 1);
  const day = trip.days[dayIndex];
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<SuggestOutput | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const ai = useAiCall<SuggestOutput>();
  const input = suggestInputFor(trip, dayIndex, [...interests], count);

  const generate = async () => {
    const r = await ai.run(async () => (await askAi({ task: 'sugerir_paradas', input })).data);
    if (r) {
      setResult(r);
      setPicked(new Set(r.suggestions.map((_, i) => i)));
    }
  };

  const toggle = (i: number) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const add = () => {
    if (!result) return;
    const chosen = result.suggestions.filter((_, i) => picked.has(i));
    updateTrip((t) => addSuggestions(t, dayIndex, chosen));
    setSelectedDay(dayIndex);
    router.replace('/roteiro');
  };

  const context = [
    `${input.from} às ${input.until}`,
    `ritmo ${PACES[trip.pace].label.toLowerCase()}`,
    day.rainExpected ? 'chuva prevista' : null,
    interests.size ? [...interests].join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScreenHeader back title="Sugerir paradas" subtitle={`Dia ${dayIndex + 1} · ${shortDateLabel(day.date)}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Txt size={13} color={colors.muted}>
            {context}
          </Txt>
          <View style={styles.row}>
            <Txt weight="semibold" size={15} style={{ flex: 1 }}>
              Quantas sugestões
            </Txt>
            <Stepper value={count} min={1} max={6} unit="uma sugestão" onChange={setCount} />
          </View>
          <View style={{ marginTop: 12 }}>
            <AiButton label={result ? 'Sugerir outras' : 'Sugerir com IA'} onPress={generate} loading={ai.loading} />
            <AiErrorText error={ai.error} />
          </View>
        </Card>

        {result && result.suggestions.length === 0 && (
          <Txt color={colors.muted} style={{ marginTop: 16 }}>
            Nenhuma sugestão coube no horário livre deste dia. Tente com menos paradas ou libere mais tempo.
          </Txt>
        )}

        {result && result.suggestions.length > 0 && (
          <>
            <Card padding={0} style={{ marginTop: 16 }}>
              {result.suggestions.map((s, i) => (
                <View key={`${s.name}-${i}`}>
                  {i > 0 && <Divider />}
                  <Pressable
                    onPress={() => toggle(i)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: picked.has(i) }}
                    accessibilityLabel={`${s.start}, ${s.name}`}
                    style={styles.suggestion}
                  >
                    <Ionicons name={picked.has(i) ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={picked.has(i) ? p.accent : colors.muted} />
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold" size={15}>
                        {`${s.start} · ${s.name}`}
                      </Txt>
                      <Txt size={12} color={colors.muted}>
                        {`${s.kind} · ${formatDuration(s.durationMinutes)} · ${s.indoor ? 'coberto' : 'ao ar livre'}`}
                      </Txt>
                      <Txt size={13} color={colors.body} style={{ marginTop: 2 }}>
                        {s.why}
                      </Txt>
                    </View>
                  </Pressable>
                </View>
              ))}
            </Card>
            <SourceLinks sources={result.sources} label="Lugares do guia" />
            <Txt size={12} color={colors.muted} style={{ marginTop: 6 }}>
              Sugestão da IA. Horários de funcionamento ainda não são conferidos: confira antes de ir. O validador do app checa
              conflitos de horário, chuva e ritmo depois que você adicionar.
            </Txt>
          </>
        )}
      </ScrollView>
      {result && result.suggestions.length > 0 && (
        <View style={styles.footer}>
          <PrimaryButton
            label={picked.size === 0 ? 'Escolha ao menos uma' : `Adicionar ${picked.size} ao roteiro`}
            onPress={() => picked.size > 0 && add()}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  suggestion: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  footer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
});
