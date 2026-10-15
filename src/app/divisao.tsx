import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ChoiceChips, Divider, ScreenHeader, SectionTitle, Txt, confirmAction } from '@/components/ui';
import { formatBrlCents } from '@/core/format';
import { settle, validateParticipantName } from '@/core/split';
import { useRotta } from '@/state/rotta';
import { colors, fonts } from '@/theme';

/** Quem vai junto, quanto cada um pagou e quem deve para quem. */
export default function SplitScreen() {
  const { trip, record, addParticipant, removeParticipant, updateExpense, palette: p } = useRotta();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const people = record.participants;
  const nameOf = (id: string) => people.find((x) => x.id === id)?.name ?? '?';
  const result = settle(record.expenses, people);
  const unassigned = record.expenses.filter((e) => !e.paidBy || !people.some((x) => x.id === e.paidBy));

  const add = () => {
    const problem = validateParticipantName(name, people);
    setError(problem);
    if (problem) return;
    addParticipant(name);
    setName('');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Dividir despesas" subtitle={trip.destination} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>Quem vai junto</SectionTitle>
        <Card padding={0}>
          {people.length === 0 && (
            <Txt size={13} color={colors.muted} style={{ padding: 14 }}>
              Adicione as pessoas da viagem, inclusive você. Depois, em cada gasto, escolha quem pagou e com quem dividir.
            </Txt>
          )}
          {people.map((x, i) => (
            <View key={x.id}>
              {i > 0 && <Divider />}
              <View style={styles.person}>
                <View style={[styles.avatar, { backgroundColor: p.tint }]}>
                  <Txt weight="semibold" color={p.ink}>
                    {x.name.slice(0, 1).toUpperCase()}
                  </Txt>
                </View>
                <Txt weight="semibold" size={15} style={{ flex: 1 }}>
                  {x.name}
                </Txt>
                <Pressable
                  onPress={() =>
                    confirmAction(`Tirar ${x.name}?`, 'Os gastos pagos por essa pessoa ficam sem pagador e ela sai das divisões.', 'Tirar', () =>
                      removeParticipant(x.id),
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Tirar ${x.name}`}
                  style={styles.iconButton}
                >
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
            placeholder="Nome"
            placeholderTextColor="#8A93A1"
            accessibilityLabel="Nome de quem vai junto"
            returnKeyType="done"
            style={styles.input}
          />
          <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Adicionar pessoa" style={[styles.addButton, { backgroundColor: p.accent }]}>
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {error ? (
          <Txt size={13} color={colors.criticalInk} style={{ marginTop: 6 }}>
            {error}
          </Txt>
        ) : null}

        {people.length >= 2 && (
          <>
            <SectionTitle>Acerto de contas</SectionTitle>
            <Card>
              {result.transfers.length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.goodInk} />
                  <Txt weight="semibold">Ninguém deve nada a ninguém.</Txt>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {result.transfers.map((t) => (
                    <View key={`${t.from}-${t.to}`} style={styles.transfer} accessible accessibilityLabel={`${nameOf(t.from)} paga ${formatBrlCents(t.amountBrl)} para ${nameOf(t.to)}`}>
                      <Txt weight="semibold" size={15} style={{ flexShrink: 1 }}>
                        {nameOf(t.from)}
                      </Txt>
                      <Ionicons name="arrow-forward" size={16} color={colors.muted} />
                      <Txt weight="semibold" size={15} style={{ flex: 1 }}>
                        {nameOf(t.to)}
                      </Txt>
                      <Txt weight="semibold" size={16} color={p.ink}>
                        {formatBrlCents(t.amountBrl)}
                      </Txt>
                    </View>
                  ))}
                </View>
              )}
              <Txt size={12} color={colors.muted} style={{ marginTop: 12 }}>
                {`Total dividido: ${formatBrlCents(result.sharedTotalBrl)}. O app sugere o menor número de transferências.`}
              </Txt>
            </Card>

            <SectionTitle>Por pessoa</SectionTitle>
            <Card padding={0}>
              {result.balances.map((b, i) => (
                <View key={b.participantId}>
                  {i > 0 && <Divider />}
                  <View style={styles.balance}>
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold" size={15}>
                        {nameOf(b.participantId)}
                      </Txt>
                      <Txt size={12} color={colors.muted}>
                        {`Pagou ${formatBrlCents(b.paidBrl)} · parte dele(a) ${formatBrlCents(b.shareBrl)}`}
                      </Txt>
                    </View>
                    <Txt weight="semibold" color={b.netBrl > 0 ? colors.goodInk : b.netBrl < 0 ? colors.criticalInk : colors.muted}>
                      {b.netBrl > 0 ? `recebe ${formatBrlCents(b.netBrl)}` : b.netBrl < 0 ? `deve ${formatBrlCents(-b.netBrl)}` : 'em dia'}
                    </Txt>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {people.length >= 2 && unassigned.length > 0 && (
          <>
            <SectionTitle>{`Sem quem pagou (${unassigned.length})`}</SectionTitle>
            <Txt size={13} color={colors.muted} style={{ marginBottom: 8, marginLeft: 4 }}>
              Estes gastos ficam fora da divisão até você dizer quem pagou. Eles são divididos entre todos.
            </Txt>
            <View style={{ gap: 8 }}>
              {unassigned.map((e) => (
                <Card key={e.id}>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Txt weight="semibold" style={{ flex: 1 }}>
                      {e.description}
                    </Txt>
                    <Txt weight="semibold">{formatBrlCents(e.amountBrl)}</Txt>
                  </View>
                  <ChoiceChips<string>
                    value=""
                    onChange={(id) => updateExpense({ ...e, paidBy: id })}
                    options={people.map((x) => ({ value: x.id, label: x.name }))}
                  />
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 60 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 6, minHeight: 56 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
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
  transfer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
});
