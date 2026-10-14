import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceAvatar } from '@/components/illustrations';
import { Badge, Card, ScreenHeader, Txt } from '@/components/ui';
import { shortDateLabel, timeLabel } from '@/core/calendar';
import { formatDistance, formatDuration } from '@/core/format';
import { tripRangeLabel } from '@/core/model';
import { TRAVEL_MODE_LABEL, estimateLeg } from '@/core/travel';
import { ISSUE_KIND_LABEL, Issue } from '@/core/validator';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

export default function ItineraryScreen() {
  const { trip, catalog, openIssues, selectedDay, setSelectedDay, validator, palette: p } = useRotta();
  const day = trip.days[selectedDay];
  const dayIssues = openIssues.filter((i) => i.dayIndex === selectedDay);
  const legs = day.stops.slice(1).map((s, i) => estimateLeg(catalog.get(day.stops[i].placeId).location, catalog.get(s.placeId).location));
  const totalKm = legs.reduce((sum, l) => sum + l.distanceKm, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader
        title={trip.destination}
        subtitle={tripRangeLabel(trip)}
        right={<AlertsChip issues={openIssues} />}
      />

      <View style={styles.days} accessibilityRole="tablist">
        {trip.days.map((d, index) => {
          const selected = index === selectedDay;
          const hasIssue = openIssues.some((i) => i.dayIndex === index);
          return (
            <Pressable
              key={index}
              onPress={() => setSelectedDay(index)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`Dia ${index + 1}, ${shortDateLabel(d.date)}${hasIssue ? ', com alerta' : ''}`}
              style={[
                styles.dayTab,
                { backgroundColor: selected ? p.accent : colors.card, borderColor: selected ? p.accent : colors.line },
              ]}
            >
              <Txt weight="semibold" size={11} color={selected ? '#FFFFFF' : colors.muted}>
                {`Dia ${index + 1}`}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Txt weight="semibold" size={17} color={selected ? '#FFFFFF' : colors.ink}>
                  {String(d.date.day)}
                </Txt>
                {hasIssue && <View style={[styles.dot, { backgroundColor: selected ? '#FFFFFF' : '#C2410C' }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Txt size={13} color={colors.muted}>
                {shortDateLabel(day.date)}
              </Txt>
              <Txt weight="semibold" size={19}>
                {day.title}
              </Txt>
            </View>
            {day.rainExpected && <Badge label="Chuva prevista" bg="#DCE7F5" fg="#1F3B63" />}
          </View>
          <View style={styles.statsRow}>
            <Stat value={String(day.stops.length)} label="paradas" />
            <Stat value={formatDistance(totalKm)} label="entre paradas" />
            <Stat value={formatDuration(validator.dayLoadMinutes(day))} label="de programação" />
          </View>
        </Card>

        <View style={{ height: 14 }} />
        {day.stops.length === 0 && (
          <Txt color={colors.muted}>Nenhuma parada neste dia.</Txt>
        )}
        {day.stops.map((stop, index) => {
          const place = catalog.get(stop.placeId);
          const issue = dayIssues.find((i) => i.placeId === stop.placeId);
          const leg = legs[index];
          return (
            <Fragment key={stop.placeId}>
              <View style={{ flexDirection: 'row' }}>
                <Txt weight="semibold" size={13} style={{ width: 52, paddingTop: 14 }}>
                  {timeLabel(stop.start)}
                </Txt>
                <Card
                  padding={12}
                  style={{ flex: 1 }}
                  onPress={() => router.push({ pathname: '/lugar/[id]', params: { id: place.id } })}
                  accessibilityLabel={`${place.name}, ${timeLabel(stop.start)}`}
                  borderColor={
                    issue?.severity === 'CRITICA'
                      ? colors.criticalBorder
                      : issue?.severity === 'ATENCAO'
                        ? colors.warningBorder
                        : colors.line
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <PlaceAvatar name={place.name} seed={place.kind.length + place.name.length} />
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold" size={15}>
                        {place.name}
                      </Txt>
                      <Txt size={13} color={colors.muted}>
                        {`${place.kind} · ${formatDuration(stop.durationMinutes)}`}
                      </Txt>
                      {issue && (
                        <Badge
                          style={{ marginTop: 4 }}
                          label={ISSUE_KIND_LABEL[issue.kind]}
                          bg={issue.severity === 'CRITICA' ? colors.criticalBg : colors.warningBg}
                          fg={issue.severity === 'CRITICA' ? colors.criticalInk : colors.warningInk}
                        />
                      )}
                    </View>
                  </View>
                </Card>
              </View>
              {leg && (
                <Txt size={12} color={colors.muted} style={styles.leg}>
                  {`${leg.minutes} min ${TRAVEL_MODE_LABEL[leg.mode]} · ${formatDistance(leg.distanceKm)}`}
                </Txt>
              )}
            </Fragment>
          );
        })}
        <Txt size={12} color={colors.muted} style={{ marginTop: 16 }}>
          Horários e distâncias de exemplo. No app final eles vêm do Google Places e da Routes API.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Txt weight="semibold" size={15}>
        {value}
      </Txt>
      <Txt size={12} color={colors.muted}>
        {label}
      </Txt>
    </View>
  );
}

function AlertsChip({ issues }: { issues: Issue[] }) {
  const count = issues.length;
  const bg = count > 0 ? colors.alertBg : colors.goodBg;
  const fg = count > 0 ? colors.alertInk : colors.goodInk;
  return (
    <Pressable
      onPress={() => router.push('/verificacao')}
      accessibilityRole="button"
      style={[styles.alerts, { backgroundColor: bg }]}
    >
      <Ionicons name={count > 0 ? 'warning' : 'checkmark-circle'} size={16} color={fg} />
      <Txt weight="semibold" size={13} color={fg}>
        {count === 0 ? 'Tudo certo' : count === 1 ? '1 alerta' : `${count} alertas`}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  days: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  dayTab: { flex: 1, height: 60, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 18, marginTop: 10 },
  leg: { marginLeft: 64, marginVertical: 6 },
  alerts: { height: 40, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
