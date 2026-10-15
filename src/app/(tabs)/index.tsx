import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityIllustration } from '@/components/illustrations';
import { Card, Divider, IconName, ListRow, PrimaryButton, SectionTitle, Txt } from '@/components/ui';
import { checklistProgress } from '@/core/checklist';
import { againstBudget } from '@/core/cost';
import { formatBrl } from '@/core/format';
import { stopCount, tripRangeLabel } from '@/core/model';
import { packingProgress } from '@/core/packing';
import { weatherOn } from '@/core/weather';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

export default function TripsScreen() {
  const { data, record, trip, openIssues, estimate, palette: p, selectTrip } = useRotta();
  const status = againstBudget(estimate, trip.budgetBrl);
  const alerts = openIssues.length;
  const checklist = checklistProgress(record.checklist);
  const spent = record.expenses.reduce((s, e) => s + e.amountBrl, 0);
  const packing = packingProgress(record.packing);
  const forecasts = trip.days.map((d) => weatherOn(record.weather, d.date)).filter((w) => !!w);
  const weatherValue =
    forecasts.length > 0
      ? `${Math.min(...forecasts.map((w) => w!.minC))}° a ${Math.max(...forecasts.map((w) => w!.maxC))}°`
      : 'Ver';
  const others = data.trips.filter((r) => r.trip.id !== trip.id);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Txt weight="bold" size={34} accessibilityRole="header">
              Viagens
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/viagem')}
            accessibilityRole="button"
            accessibilityLabel="Nova viagem"
            style={[styles.newButton, { backgroundColor: p.tint }]}
          >
            <Ionicons name="add" size={26} color={p.accent} />
          </Pressable>
        </View>

        <SectionTitle>Viagem atual</SectionTitle>
        <Card padding={0} onPress={() => router.navigate('/roteiro')} accessibilityLabel={`Abrir roteiro de ${trip.destination}`}>
          <CityIllustration />
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dateChip, { backgroundColor: p.tint }]}>
                <Txt weight="semibold" size={12} color={p.ink}>
                  {tripRangeLabel(trip)}
                </Txt>
              </View>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => router.push({ pathname: '/viagem', params: { id: trip.id } })}
                accessibilityRole="button"
                accessibilityLabel="Editar viagem"
                hitSlop={8}
                style={styles.edit}
              >
                <Ionicons name="create-outline" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Txt weight="medium" size={22} style={{ marginTop: 6 }}>
              {trip.country ? `${trip.destination}, ${trip.country}` : trip.destination}
            </Txt>
            <Txt size={14} color={colors.muted}>
              {`${trip.days.length} dias · ${stopCount(trip)} paradas · ${trip.travelers} ${trip.travelers === 1 ? 'viajante' : 'viajantes'}`}
            </Txt>
            <View style={styles.stats}>
              <MiniStat label="Custo estimado" value={formatBrl(estimate.totalBrl)} />
              <MiniStat label="Orçamento" value={formatBrl(trip.budgetBrl)} />
            </View>
          </View>
        </Card>

        <View style={styles.shortcuts}>
          <Shortcut icon="ticket-outline" label="Reservas" value={String(record.reservations.length)} onPress={() => router.push('/reservas')} />
          <Shortcut
            icon="checkbox-outline"
            label="Checklist"
            value={`${checklist.done}/${checklist.total}`}
            onPress={() => router.push('/checklist')}
          />
          <Shortcut
            icon="receipt-outline"
            label="Gastos"
            value={formatBrl(spent)}
            onPress={() => router.navigate({ pathname: '/custos', params: { aba: 'gastos' } })}
          />
        </View>
        <View style={styles.shortcuts}>
          <Shortcut
            icon="briefcase-outline"
            label="Mala"
            value={record.packing.length ? `${packing.done}/${packing.total}` : 'Montar'}
            onPress={() => router.push('/mala')}
          />
          <Shortcut icon="medkit-outline" label="Emergência" value="SOS" onPress={() => router.push('/sos')} />
          <Shortcut
            icon="partly-sunny-outline"
            label="Clima"
            value={weatherValue}
            onPress={() => router.navigate('/roteiro')}
          />
        </View>
        <Card padding={0} style={{ marginTop: 12 }}>
          <ListRow
            icon="sparkles-outline"
            title={`Guia de ${trip.destination}`}
            subtitle={record.guide ? 'Comer, beber, transporte e cultura · salvo no aparelho' : 'O que comer, beber e como circular, com IA'}
            onPress={() => router.push('/guia')}
          />
        </Card>

        <SectionTitle>Continue planejando</SectionTitle>
        <Card padding={0}>
          <ListRow
            icon={alerts > 0 ? 'warning' : 'checkmark-circle'}
            title={
              alerts === 0 ? 'Roteiro sem pendências' : alerts === 1 ? 'Resolver 1 alerta do roteiro' : `Resolver ${alerts} alertas do roteiro`
            }
            subtitle={stopCount(trip) === 0 ? 'Adicione paradas ao roteiro' : 'Horários, clima e ritmo conferidos'}
            onPress={() => (stopCount(trip) === 0 ? router.navigate('/roteiro') : router.push('/verificacao'))}
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

        {others.length > 0 && (
          <>
            <SectionTitle>Outras viagens</SectionTitle>
            <Card padding={0}>
              {others.map((r, i) => (
                <View key={r.trip.id}>
                  {i > 0 && <Divider />}
                  <ListRow
                    icon="airplane-outline"
                    title={r.trip.destination}
                    subtitle={`${tripRangeLabel(r.trip)} · ${r.trip.days.length} dias`}
                    onPress={() => selectTrip(r.trip.id)}
                  />
                </View>
              ))}
            </Card>
          </>
        )}

        <PrimaryButton label="Planejar nova viagem" filled={false} onPress={() => router.push('/viagem')} style={{ marginTop: 20 }} />
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

function Shortcut({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  const { palette: p } = useRotta();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={styles.shortcut}>
      <View style={[styles.shortcutIcon, { backgroundColor: p.tint }]}>
        <Ionicons name={icon} size={20} color={p.ink} />
      </View>
      <Txt weight="semibold" size={15} numberOfLines={1}>
        {value}
      </Txt>
      <Txt size={12} color={colors.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  newButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dateChip: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  edit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  miniStat: { flex: 1, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  shortcuts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  shortcut: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    gap: 2,
    minHeight: 96,
  },
  shortcutIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
