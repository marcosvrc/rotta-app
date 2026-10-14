import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityIllustration } from '@/components/illustrations';
import { Card, Divider, ListRow, SectionTitle, Txt } from '@/components/ui';
import { againstBudget } from '@/core/cost';
import { formatBrl } from '@/core/format';
import { stopCount, tripRangeLabel } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

const DRAFTS = [
  { name: 'Porto', info: 'Sem datas', color: '#F2D3B3' },
  { name: 'Santiago', info: 'Março · 7 dias', color: '#C9DCEB' },
  { name: 'Bariloche', info: 'Julho', color: '#D8E6CF' },
];

export default function TripsScreen() {
  const { trip, openIssues, estimate, palette: p } = useRotta();
  const status = againstBudget(estimate, trip.budgetBrl);
  const alerts = openIssues.length;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Txt size={14} color={colors.muted}>
              Olá!
            </Txt>
            <Txt weight="medium" size={30}>
              Suas viagens
            </Txt>
          </View>
          <Pressable
            onPress={() => router.navigate('/ajustes')}
            accessibilityRole="button"
            accessibilityLabel="Perfil e ajustes"
            style={[styles.avatar, { backgroundColor: p.accent }]}
          >
            <Txt weight="bold" size={17} color="#FFFFFF">
              R
            </Txt>
          </Pressable>
        </View>

        <SectionTitle>Próxima viagem</SectionTitle>
        <Card padding={0} onPress={() => router.navigate('/roteiro')} accessibilityLabel={`Abrir roteiro de ${trip.destination}`}>
          <CityIllustration />
          <View style={{ padding: 16 }}>
            <View style={[styles.dateChip, { backgroundColor: p.tint }]}>
              <Txt weight="semibold" size={12} color={p.ink}>
                {tripRangeLabel(trip)}
              </Txt>
            </View>
            <Txt weight="medium" size={22} style={{ marginTop: 8 }}>
              {`${trip.destination}, ${trip.country}`}
            </Txt>
            <Txt size={14} color={colors.muted}>
              {`${trip.days.length} dias · ${stopCount(trip)} paradas · ${trip.travelers} viajantes`}
            </Txt>
            <View style={styles.stats}>
              <MiniStat label="Custo estimado" value={formatBrl(estimate.totalBrl)} />
              <MiniStat label="Orçamento" value={formatBrl(trip.budgetBrl)} />
            </View>
          </View>
        </Card>

        <SectionTitle>Continue planejando</SectionTitle>
        <Card padding={0}>
          <ListRow
            icon={alerts > 0 ? 'warning' : 'checkmark-circle'}
            title={alerts === 0 ? 'Roteiro sem pendências' : alerts === 1 ? 'Resolver 1 alerta do roteiro' : `Resolver ${alerts} alertas do roteiro`}
            subtitle={alerts === 0 ? 'Tudo conferido' : 'Horários, clima e ritmo conferidos'}
            onPress={() => router.push('/verificacao')}
          />
          <Divider />
          <ListRow
            icon="wallet"
            title="Ajustar hospedagem e custos"
            subtitle={
              status.overBudget
                ? `Faltam ${formatBrl(-status.differenceBrl)} no orçamento`
                : `Sobram ${formatBrl(status.differenceBrl)} no orçamento`
            }
            onPress={() => router.navigate('/custos')}
          />
        </Card>

        <SectionTitle>Rascunhos</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {DRAFTS.map((d) => (
            <View key={d.name} style={styles.draft}>
              <View style={[styles.draftImage, { backgroundColor: d.color }]} />
              <Txt weight="semibold" size={15}>
                {d.name}
              </Txt>
              <Txt size={13} color={colors.muted}>
                {d.info}
              </Txt>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Txt size={12} color={colors.muted}>
        {label}
      </Txt>
      <Txt weight="semibold" size={16}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dateChip: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  miniStat: { flex: 1, backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  draft: {
    width: 150,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  draftImage: { height: 56, borderRadius: 12, marginBottom: 10 },
});
