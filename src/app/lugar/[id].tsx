import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityIllustration } from '@/components/illustrations';
import { Badge, Card, Segmented, Txt } from '@/components/ui';
import { timeLabel } from '@/core/calendar';
import { formatDuration } from '@/core/format';
import { dayIndexOf, hoursLabel } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

type Section = 'historia' | 'info' | 'dicas';

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, catalog, palette: p } = useRotta();
  const [section, setSection] = useState<Section>('historia');
  const place = catalog.all.find((x) => x.id === id);

  if (!place) {
    return (
      <SafeAreaView style={styles.screen}>
        <Txt style={{ padding: 20 }}>Lugar não encontrado.</Txt>
      </SafeAreaView>
    );
  }

  const dayIndex = dayIndexOf(trip, place.id);
  const stop = dayIndex !== null ? trip.days[dayIndex].stops.find((s) => s.placeId === place.id) : undefined;

  return (
    <View style={styles.screen}>
      <View>
        <CityIllustration height={240} />
        <SafeAreaView edges={['top']} style={styles.overlay}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/roteiro'))}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
        </SafeAreaView>
        <Badge label="Foto do Google Places" bg="rgba(27,34,48,0.72)" fg="#FFFFFF" style={styles.photoBadge} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Txt weight="semibold" size={12} color={p.ink} style={{ letterSpacing: 0.8 }}>
          {`${place.kind} · ${place.neighborhood}`.toUpperCase()}
        </Txt>
        <Txt weight="medium" size={28}>
          {place.name}
        </Txt>
        <Txt size={14} color={colors.muted} style={{ marginTop: 2, marginBottom: 16 }}>
          {hoursLabel(place.hours)}
        </Txt>

        <Segmented<Section>
          value={section}
          onChange={setSection}
          options={[
            { value: 'historia', label: 'História' },
            { value: 'info', label: 'Informações' },
            { value: 'dicas', label: 'Dicas' },
          ]}
        />
        <View style={{ height: 14 }} />

        {section === 'historia' && (
          <View>
            <Badge label="Resumo com IA a partir da Wikipedia" bg={p.tint} fg={p.ink} />
            <Txt size={16} style={{ marginTop: 10, lineHeight: 24 }}>
              {place.story}
            </Txt>
            {place.sourceUrl ? (
              <Pressable onPress={() => Linking.openURL(place.sourceUrl!)} accessibilityRole="link" style={{ paddingVertical: 10 }}>
                <Txt weight="semibold" color={p.accent}>
                  Ler a fonte na Wikipedia
                </Txt>
              </Pressable>
            ) : null}
          </View>
        )}

        {section === 'info' && (
          <Card padding={0}>
            <InfoRow label="Horário" value={hoursLabel(place.hours)} />
            <InfoRow label="Tempo sugerido" value={formatDuration(place.suggestedMinutes)} />
            <InfoRow label="Ambiente" value={place.indoor ? 'Coberto' : 'Ao ar livre'} />
            <InfoRow label="Bairro" value={place.neighborhood} />
          </Card>
        )}

        {section === 'dicas' && (
          <View style={{ gap: 8 }}>
            {place.tips.map((tip) => (
              <View key={tip} style={styles.tip}>
                <Txt>{tip}</Txt>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={[styles.status, { backgroundColor: dayIndex !== null ? p.tint : colors.background }]}>
          <Txt weight="semibold" size={15} color={dayIndex !== null ? p.ink : colors.muted}>
            {dayIndex !== null && stop ? `No roteiro · Dia ${dayIndex + 1}, ${timeLabel(stop.start)}` : 'Fora do roteiro'}
          </Txt>
        </View>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt color={colors.muted}>{label}</Txt>
      <Txt weight="semibold" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0 },
  back: {
    margin: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: { position: 'absolute', right: 12, bottom: 12 },
  content: { padding: 20, paddingBottom: 32 },
  tip: { backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  footer: { backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 12 },
  status: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});
