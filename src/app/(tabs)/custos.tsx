import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card, ScreenHeader, SectionTitle, Segmented, Stepper, Txt } from '@/components/ui';
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
import { formatBrl } from '@/core/format';
import { nightsOf } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

export default function CostsScreen() {
  const { trip, setTrip, estimate, stay, setStay, food, setFood, palette: p } = useRotta();
  const status = againstBudget(estimate, trip.budgetBrl);
  const categoryColor: Record<CostCategory, string> = {
    PASSAGENS: p.accent,
    HOSPEDAGEM: p.soft,
    ALIMENTACAO: '#C2522A',
    PASSEIOS: '#E8B07A',
    TRANSPORTE_LOCAL: colors.muted,
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader
        title="Simulador de custos"
        subtitle={`${trip.destination} · ${trip.days.length} dias, ${nightsOf(trip)} noites`}
      />
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
              onChange={(travelers) => setTrip({ ...trip, travelers })}
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
          Valores de referência de exemplo para Lisboa. No app final, câmbio e preços vêm de APIs.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  total: { backgroundColor: colors.night, borderRadius: 22, padding: 16 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginTop: 14 },
  label: { marginTop: 14, marginBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
