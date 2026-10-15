import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card, Divider, ListRow, PrimaryButton, ScreenHeader, SectionTitle, Segmented, Stepper, Txt, confirmAction } from '@/components/ui';
import { shortDateLabel } from '@/core/calendar';
import { formatMoney } from '@/core/currency';
import { settle } from '@/core/split';
import {
  EXPENSE_CATEGORY_LABEL,
  ExpenseCategory,
  ExpenseGroup,
  PAYMENT_LABEL,
  PaymentMethod,
  summarizeExpenses,
} from '@/core/expenses';
import {
  COST_CATEGORY_LABEL,
  CostCategory,
  FOOD_LEVELS,
  FoodLevel,
  STAY_LEVELS,
  StayLevel,
  againstBudget,
  shareOf,
} from '@/core/cost';
import { formatBrl, formatBrlCents } from '@/core/format';
import { nightsOf } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

type Tab = 'previsto' | 'gastos';

export default function CostsScreen() {
  const { trip } = useRotta();
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  const [tab, setTab] = useState<Tab>(aba === 'gastos' ? 'gastos' : 'previsto');
  // Quem chega com ?aba= (atalho de Gastos na tela inicial) vê a aba certa.
  const [lastAba, setLastAba] = useState(aba);
  if (aba !== lastAba) {
    setLastAba(aba);
    if (aba === 'gastos' || aba === 'previsto') setTab(aba);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader
        title={tab === 'previsto' ? 'Simulador de custos' : 'Gastos da viagem'}
        subtitle={`${trip.destination} · ${trip.days.length} dias, ${nightsOf(trip)} noites`}
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'previsto', label: 'Previsto' },
            { value: 'gastos', label: 'Gastos' },
          ]}
        />
      </View>
      {tab === 'previsto' ? <Planned /> : <Spent />}
    </SafeAreaView>
  );
}

function Planned() {
  const { trip, updateTrip, estimate, palette: p } = useRotta();
  const { stay, food } = trip;
  const setStay = (v: StayLevel) => updateTrip((t) => ({ ...t, stay: v }));
  const setFood = (v: FoodLevel) => updateTrip((t) => ({ ...t, food: v }));
  const status = againstBudget(estimate, trip.budgetBrl);
  const categoryColor: Record<CostCategory, string> = {
    PASSAGENS: p.accent,
    HOSPEDAGEM: p.soft,
    ALIMENTACAO: '#C2522A',
    PASSEIOS: '#E8B07A',
    TRANSPORTE_LOCAL: colors.muted,
  };

  return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.total}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Txt size={13} color={colors.nightMuted}>
                Total estimado
              </Txt>
              <Txt weight="medium" size={34} color="#FFFFFF">
                {formatBrl(estimate.totalBrl)}
              </Txt>
              <Txt size={13} color={colors.nightMuted}>
                {`${formatBrl(estimate.perPersonBrl)} por pessoa`}
              </Txt>
            </View>
            <Badge
              label={status.overBudget ? 'Acima do orçamento' : 'Dentro do orçamento'}
              bg={status.overBudget ? colors.criticalBg : colors.goodBg}
              fg={status.overBudget ? colors.criticalInk : colors.goodInk}
            />
          </View>
          <View style={styles.bar} accessible accessibilityLabel="Divisão do custo por categoria">
            {estimate.lines
              .filter((l) => l.valueBrl > 0)
              .map((l) => (
                <View key={l.category} style={{ flex: l.valueBrl, backgroundColor: categoryColor[l.category] }} />
              ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Txt size={12} color={colors.nightMuted} style={{ flex: 1 }}>
              {`Orçamento ${formatBrl(trip.budgetBrl)}`}
            </Txt>
            <Txt size={12} color={colors.nightMuted}>
              {status.overBudget ? `Faltam ${formatBrl(-status.differenceBrl)}` : `Sobram ${formatBrl(status.differenceBrl)}`}
            </Txt>
          </View>
        </View>

        <SectionTitle>Ajustes</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt weight="semibold" size={15} style={{ flex: 1 }}>
              Viajantes
            </Txt>
            <Stepper
              value={trip.travelers}
              min={1}
              max={8}
              unit="um viajante"
              onChange={(travelers) => updateTrip((t) => ({ ...t, travelers }))}
            />
          </View>
          <Txt weight="semibold" size={15} style={styles.label}>
            Hospedagem
          </Txt>
          <Segmented<StayLevel>
            value={stay}
            onChange={setStay}
            options={(Object.keys(STAY_LEVELS) as StayLevel[]).map((k) => ({ value: k, label: STAY_LEVELS[k].label }))}
          />
          <Txt weight="semibold" size={15} style={styles.label}>
            Alimentação
          </Txt>
          <Segmented<FoodLevel>
            value={food}
            onChange={setFood}
            options={(Object.keys(FOOD_LEVELS) as FoodLevel[]).map((k) => ({ value: k, label: FOOD_LEVELS[k].label }))}
          />
        </Card>

        <SectionTitle>Por categoria</SectionTitle>
        <Card padding={0}>
          {estimate.lines.map((l) => (
            <View key={l.category} style={styles.line}>
              <View style={[styles.swatch, { backgroundColor: categoryColor[l.category] }]} />
              <Txt style={{ flex: 1 }}>{COST_CATEGORY_LABEL[l.category]}</Txt>
              <Txt size={13} color={colors.muted} style={{ width: 44, textAlign: 'right' }}>
                {`${Math.round(shareOf(estimate, l.category) * 100)}%`}
              </Txt>
              <Txt weight="semibold" style={{ width: 96, textAlign: 'right' }}>
                {formatBrl(l.valueBrl)}
              </Txt>
            </View>
          ))}
        </Card>
        <Txt size={12} color={colors.muted} style={{ marginTop: 12 }}>
          Valores de referência de exemplo. Câmbio e preços reais entram numa próxima etapa.
        </Txt>
      </ScrollView>
  );
}

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  ALIMENTACAO: '#C2522A',
  TRANSPORTE: '#5F6775',
  PASSEIOS: '#E8B07A',
  HOSPEDAGEM: '#7C8DB0',
  COMPRAS: '#B04A86',
  OUTROS: '#9AA3B0',
};

function Spent() {
  const { trip, record, estimate, removeExpense, palette: p } = useRotta();
  const summary = summarizeExpenses(record.expenses, trip.days.length, estimate);
  const split = settle(record.expenses, record.participants);
  const vsPlanned = summary.plannedTripBrl - summary.totalBrl;
  const maxDay = Math.max(summary.plannedPerDayBrl, ...summary.byDay, 1);
  const paymentColor: Record<PaymentMethod, string> = {
    CREDITO: p.accent,
    DEBITO: p.soft,
    PIX: '#17603F',
    DINHEIRO: '#E8B07A',
  };
  const newExpense = (day?: number) =>
    router.push({ pathname: '/gasto', params: day === undefined ? {} : { day: String(day) } });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.total}>
        <Txt size={13} color={colors.nightMuted}>
          Gasto até agora
        </Txt>
        <Txt weight="medium" size={34} color="#FFFFFF">
          {formatBrlCents(summary.totalBrl)}
        </Txt>
        <Txt size={13} color={colors.nightMuted}>
          {summary.count === 0
            ? 'Nenhum gasto registrado'
            : `${summary.count} ${summary.count === 1 ? 'gasto' : 'gastos'} · previsto no destino ${formatBrl(summary.plannedTripBrl)}`}
        </Txt>
        {summary.count > 0 && (
          <Txt size={13} weight="semibold" color={vsPlanned >= 0 ? '#9BE3BC' : '#F6C9B6'} style={{ marginTop: 6 }}>
            {vsPlanned >= 0 ? `Ainda cabem ${formatBrl(vsPlanned)} no previsto` : `${formatBrl(-vsPlanned)} acima do previsto`}
          </Txt>
        )}
      </View>

      <PrimaryButton label="Registrar gasto" onPress={() => newExpense()} style={{ marginTop: 12 }} />
      <Card padding={0} style={{ marginTop: 12 }}>
        <ListRow
          icon="people-outline"
          title="Dividir despesas"
          subtitle={
            record.participants.length < 2
              ? 'Adicione quem vai junto e veja quem deve para quem'
              : `${record.participants.length} pessoas · ${split.transfers.length === 0 ? 'contas em dia' : `${split.transfers.length} ${split.transfers.length === 1 ? 'acerto' : 'acertos'} pendentes`}`
          }
          onPress={() => router.push('/divisao')}
        />
      </Card>

      <SectionTitle>Por dia</SectionTitle>
      <Card>
        <View style={styles.chart} accessible accessibilityLabel="Gastos por dia comparados ao previsto">
          <View
            style={[styles.plannedLine, { bottom: (summary.plannedPerDayBrl / maxDay) * 120 }]}
            pointerEvents="none"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, alignItems: 'flex-end' }}>
            {summary.byDay.map((v, i) => {
              const over = v > summary.plannedPerDayBrl;
              return (
                <Pressable
                  key={i}
                  onPress={() => newExpense(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Dia ${i + 1}: ${formatBrl(v)}. Registrar gasto neste dia`}
                  style={styles.dayCol}
                >
                  <Txt size={10} color={colors.muted} numberOfLines={1}>
                    {v > 0 ? formatBrl(v).replace('R$', '').trim() : ''}
                  </Txt>
                  <View
                    style={[
                      styles.dayBar,
                      { height: Math.max(4, (v / maxDay) * 120), backgroundColor: v === 0 ? colors.line : over ? '#C2522A' : p.accent },
                    ]}
                  />
                  <Txt size={11} weight="semibold" color={colors.body}>
                    {`D${i + 1}`}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendDash} />
          <Txt size={12} color={colors.muted}>
            {`Previsto por dia: ${formatBrl(summary.plannedPerDayBrl)}`}
          </Txt>
        </View>
      </Card>

      {summary.count > 0 && (
        <>
          <SectionTitle>Por categoria</SectionTitle>
          <Card>
            <Breakdown groups={summary.byCategory} label={(k) => EXPENSE_CATEGORY_LABEL[k]} color={(k) => CATEGORY_COLOR[k]} />
          </Card>

          <SectionTitle>Por forma de pagamento</SectionTitle>
          <Card>
            <Breakdown groups={summary.byPayment} label={(k) => PAYMENT_LABEL[k]} color={(k) => paymentColor[k]} />
          </Card>
        </>
      )}

      <SectionTitle>Lançamentos</SectionTitle>
      {summary.count === 0 ? (
        <Txt color={colors.muted}>Os gastos que você registrar aparecem aqui, separados por dia.</Txt>
      ) : (
        trip.days.map((d, i) => {
          const items = record.expenses.filter((e) => e.dayIndex === i);
          if (items.length === 0) return null;
          return (
            <View key={i} style={{ marginBottom: 12 }}>
              <Txt size={13} weight="semibold" color={colors.muted} style={{ marginBottom: 6, marginLeft: 4 }}>
                {`Dia ${i + 1} · ${shortDateLabel(d.date)}`}
              </Txt>
              <Card padding={0}>
                {items.map((e, j) => (
                  <View key={e.id}>
                    {j > 0 && <Divider />}
                    <View style={styles.expenseRow}>
                      <View style={[styles.swatch, { backgroundColor: CATEGORY_COLOR[e.category] }]} />
                      <View style={{ flex: 1 }}>
                        <Txt weight="semibold" size={15}>
                          {e.description}
                        </Txt>
                        <Txt size={12} color={colors.muted}>
                          {[
                            e.currency && e.originalAmount !== undefined ? formatMoney(e.originalAmount, e.currency) : null,
                            EXPENSE_CATEGORY_LABEL[e.category],
                            PAYMENT_LABEL[e.payment],
                            e.paidBy ? `pago por ${record.participants.find((x) => x.id === e.paidBy)?.name ?? '?'}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Txt>
                      </View>
                      <Txt weight="semibold">{formatBrlCents(e.amountBrl)}</Txt>
                      <Pressable
                        onPress={() =>
                          confirmAction('Apagar gasto?', `${e.description} · ${formatBrlCents(e.amountBrl)}`, 'Apagar', () =>
                            removeExpense(e.id),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Apagar ${e.description}`}
                        hitSlop={6}
                        style={styles.trash}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Breakdown<K extends string>({
  groups,
  label,
  color,
}: {
  groups: ExpenseGroup<K>[];
  label: (k: K) => string;
  color: (k: K) => string;
}) {
  const max = Math.max(...groups.map((g) => g.totalBrl), 1);
  return (
    <View style={{ gap: 12 }}>
      {groups.map((g) => (
        <View key={g.key} accessible accessibilityLabel={`${label(g.key)}: ${formatBrlCents(g.totalBrl)}, ${Math.round(g.share * 100)}%`}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Txt size={14} style={{ flex: 1 }}>
              {label(g.key)}
            </Txt>
            <Txt size={13} color={colors.muted} style={{ marginRight: 10 }}>
              {`${Math.round(g.share * 100)}%`}
            </Txt>
            <Txt weight="semibold" size={14}>
              {formatBrlCents(g.totalBrl)}
            </Txt>
          </View>
          <View style={styles.track}>
            <View style={{ width: `${(g.totalBrl / max) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: color(g.key) }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  total: { backgroundColor: colors.night, borderRadius: 22, padding: 16 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginTop: 14 },
  label: { marginTop: 14, marginBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  chart: { height: 160, justifyContent: 'flex-end', paddingBottom: 18 },
  plannedLine: { position: 'absolute', left: 0, right: 0, marginBottom: 18, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted },
  dayCol: { width: 34, alignItems: 'center', gap: 4, marginBottom: -18 },
  dayBar: { width: 22, borderRadius: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  legendDash: { width: 18, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6, paddingVertical: 10, minHeight: 60 },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
