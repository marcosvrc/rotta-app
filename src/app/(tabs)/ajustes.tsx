import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle, Segmented, ToggleChip, Txt } from '@/components/ui';
import { PACES, Pace } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { ACCENT_OPTIONS, colors } from '@/theme';

const INTERESTS = ['História', 'Gastronomia', 'Natureza', 'Praia', 'Vida noturna', 'Compras', 'Arte'];

export default function SettingsScreen() {
  const { accentId, setAccentId, trip, setTrip, interests, toggleInterest } = useRotta();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader title="Ajustes" subtitle="Do jeito que você viaja" />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Cor do app</SectionTitle>
        <Card>
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {ACCENT_OPTIONS.map((o) => {
              const selected = o.id === accentId;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setAccentId(o.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={o.label}
                  style={styles.swatchItem}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: o.color, borderColor: selected ? colors.ink : 'transparent' },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={22} color="#FFFFFF" />}
                  </View>
                  <Txt size={12} color={colors.body} numberOfLines={1}>
                    {o.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle>Ritmo das viagens</SectionTitle>
        <Card>
          <Segmented<Pace>
            value={trip.pace}
            onChange={(pace) => setTrip({ ...trip, pace })}
            options={(Object.keys(PACES) as Pace[]).map((k) => ({ value: k, label: PACES[k].label }))}
          />
          <Txt size={13} color={colors.muted} style={{ marginTop: 8 }}>
            {`O validador avisa quando um dia passa de ${PACES[trip.pace].maxMinutesPerDay / 60} horas de programação.`}
          </Txt>
        </Card>

        <SectionTitle>Interesses</SectionTitle>
        <Card>
          <Txt size={13} color={colors.muted}>
            Usados pelo simulador e, no futuro, pelo agente para sugerir roteiros.
          </Txt>
          <View style={styles.chips}>
            {INTERESTS.map((name) => (
              <ToggleChip key={name} label={name} checked={interests.has(name)} onToggle={() => toggleInterest(name)} />
            ))}
          </View>
        </Card>

        <SectionTitle>Sobre</SectionTitle>
        <Card>
          <Txt weight="semibold" size={15}>
            Rotta 0.1.0
          </Txt>
          <Txt size={13} color={colors.muted}>
            Versão de testes com uma viagem de exemplo a Lisboa. Os dados ainda ficam só neste aparelho.
          </Txt>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchItem: { width: 72, alignItems: 'center', gap: 6, paddingVertical: 4 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
