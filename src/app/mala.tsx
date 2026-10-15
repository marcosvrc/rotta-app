import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Divider, PrimaryButton, ScreenHeader, SectionTitle, Txt } from '@/components/ui';
import { PACKING_CATEGORIES, PACKING_CATEGORY_LABEL, packingProgress } from '@/core/packing';
import { temperatureRange } from '@/core/weather';
import { useRotta } from '@/state/rotta';
import { colors, fonts } from '@/theme';

export default function PackingScreen() {
  const { trip, record, refreshPacking, togglePackingItem, addPackingItem, removePackingItem, palette: p } = useRotta();
  const [draft, setDraft] = useState('');
  const items = record.packing;
  const progress = packingProgress(items);
  const temp = temperatureRange(record.weather, trip);
  const rainy = trip.days.filter((d) => d.rainExpected).length;

  // Primeira visita: monta a lista sugerida.
  useEffect(() => {
    if (record.packing.length === 0) refreshPacking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const add = () => {
    if (!draft.trim()) return;
    addPackingItem(draft);
    setDraft('');
  };

  const basis = [
    `${trip.days.length} dias`,
    temp ? `${temp.minC}° a ${temp.maxC}°` : 'sem previsão de temperatura',
    rainy > 0 ? `chuva em ${rainy} ${rainy === 1 ? 'dia' : 'dias'}` : 'sem chuva marcada',
  ].join(' · ');

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Mala" subtitle={trip.destination} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Txt weight="semibold" size={15}>
            {`${progress.done} de ${progress.total} na mala`}
          </Txt>
          <View style={styles.track}>
            <View style={{ width: `${progress.share * 100}%`, height: '100%', backgroundColor: p.accent, borderRadius: 4 }} />
          </View>
          <Txt size={12} color={colors.muted} style={{ marginTop: 8 }}>
            {`Sugestão para ${basis}. Quantidades por pessoa.`}
          </Txt>
          <PrimaryButton label="Atualizar sugestões" filled={false} onPress={refreshPacking} style={{ marginTop: 12 }} />
        </Card>

        {PACKING_CATEGORIES.map((category) => {
          const group = items.filter((i) => i.category === category);
          if (group.length === 0) return null;
          return (
            <View key={category}>
              <SectionTitle>{PACKING_CATEGORY_LABEL[category]}</SectionTitle>
              <Card padding={0}>
                {group.map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 && <Divider />}
                    <View style={styles.row}>
                      <Pressable
                        onPress={() => togglePackingItem(item.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.done }}
                        accessibilityLabel={item.quantity ? `${item.title}, ${item.quantity}` : item.title}
                        style={styles.check}
                      >
                        <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={item.done ? p.accent : colors.muted} />
                        <View style={{ flex: 1 }}>
                          <Txt
                            weight="semibold"
                            size={15}
                            color={item.done ? colors.muted : colors.ink}
                            style={item.done ? { textDecorationLine: 'line-through' } : undefined}
                          >
                            {item.quantity ? `${item.title} (${item.quantity})` : item.title}
                          </Txt>
                          {item.reason ? (
                            <Txt size={12} color={colors.muted}>
                              {item.reason}
                            </Txt>
                          ) : null}
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => removePackingItem(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Tirar ${item.title} da lista`}
                        style={styles.trash}
                      >
                        <Ionicons name="close" size={18} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          );
        })}

        <SectionTitle>Adicionar item</SectionTitle>
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder="Ex.: Livro para o voo"
            placeholderTextColor="#8A93A1"
            accessibilityLabel="Novo item da mala"
            returnKeyType="done"
            style={styles.input}
          />
          <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Adicionar à mala" style={[styles.addButton, { backgroundColor: p.accent }]}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.background, marginTop: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 6 },
  check: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingVertical: 12, minHeight: 56 },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
  },
  addButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
