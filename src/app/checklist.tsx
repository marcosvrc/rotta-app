import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Divider, ScreenHeader, SectionTitle, Txt, confirmAction } from '@/components/ui';
import { compareDates, shortDateLabel, tripDate } from '@/core/calendar';
import { CHECKLIST_GROUPS, CHECKLIST_GROUP_LABEL, checklistProgress, dueDate } from '@/core/checklist';
import { useRotta } from '@/state/rotta';
import { colors, fonts } from '@/theme';

export default function ChecklistScreen() {
  const { trip, record, toggleChecklistItem, addChecklistItem, removeChecklistItem, palette: p } = useRotta();
  const [draft, setDraft] = useState('');
  const progress = checklistProgress(record.checklist);
  const now = new Date();
  const today = tripDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const start = trip.days[0].date;

  const add = () => {
    if (!draft.trim()) return;
    addChecklistItem(draft);
    setDraft('');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Checklist pré-viagem" subtitle={trip.destination} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Txt weight="semibold" size={15}>
            {`${progress.done} de ${progress.total} feitos`}
          </Txt>
          <View style={styles.track}>
            <View style={{ width: `${progress.share * 100}%`, height: '100%', backgroundColor: p.accent, borderRadius: 4 }} />
          </View>
        </Card>

        {CHECKLIST_GROUPS.map((group) => {
          const items = record.checklist.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <View key={group}>
              <SectionTitle>{CHECKLIST_GROUP_LABEL[group]}</SectionTitle>
              <Card padding={0}>
                {items.map((item, idx) => {
                  const due = dueDate(item, start);
                  const late = !item.done && due !== null && compareDates(due, today) < 0;
                  return (
                    <View key={item.id}>
                      {idx > 0 && <Divider />}
                      <View style={styles.row}>
                        <Pressable
                          onPress={() => toggleChecklistItem(item.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: item.done }}
                          accessibilityLabel={item.title}
                          style={styles.check}
                        >
                          <Ionicons
                            name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={26}
                            color={item.done ? p.accent : colors.muted}
                          />
                          <View style={{ flex: 1 }}>
                            <Txt
                              weight="semibold"
                              size={15}
                              color={item.done ? colors.muted : colors.ink}
                              style={item.done ? { textDecorationLine: 'line-through' } : undefined}
                            >
                              {item.title}
                            </Txt>
                            {item.hint ? (
                              <Txt size={12} color={colors.muted}>
                                {item.hint}
                              </Txt>
                            ) : null}
                            {due && !item.done ? (
                              <Txt size={12} weight="semibold" color={late ? colors.criticalInk : colors.body}>
                                {late ? `Atrasado · era até ${shortDateLabel(due)}` : `Até ${shortDateLabel(due)}`}
                              </Txt>
                            ) : null}
                          </View>
                        </Pressable>
                        {group === 'OUTROS' && (
                          <Pressable
                            onPress={() => confirmAction('Apagar item?', item.title, 'Apagar', () => removeChecklistItem(item.id))}
                            accessibilityRole="button"
                            accessibilityLabel={`Apagar ${item.title}`}
                            style={styles.trash}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.muted} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
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
            placeholder="Ex.: Reservar restaurante"
            placeholderTextColor="#8A93A1"
            accessibilityLabel="Novo item do checklist"
            returnKeyType="done"
            style={styles.input}
          />
          <Pressable
            onPress={add}
            accessibilityRole="button"
            accessibilityLabel="Adicionar item"
            style={[styles.addButton, { backgroundColor: p.accent }]}
          >
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
