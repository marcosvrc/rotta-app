import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { Fragment, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceAvatar } from '@/components/illustrations';
import { Badge, Card, ScreenHeader, Txt } from '@/components/ui';
import { DayWeatherLine, WeatherStatusBar } from '@/components/weather';
import { shortDateLabel, timeLabel } from '@/core/calendar';
import { formatDistance, formatDuration } from '@/core/format';
import { sortStops, tripRangeLabel } from '@/core/model';
import { TRAVEL_MODE_LABEL, legBetween } from '@/core/travel';
import { ISSUE_KIND_LABEL, Issue } from '@/core/validator';
import { weatherOn } from '@/core/weather';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

export default function ItineraryScreen() {
  const { trip, record, catalog, openIssues, selectedDay, setSelectedDay, validator, weatherStatus, refreshWeather, toggleRain, palette: p } =
    useRotta();
  useFocusEffect(
    useCallback(() => {
      refreshWeather();
    }, [refreshWeather]),
  );
  const day = trip.days[selectedDay];
  const stops = sortStops(day.stops);
  const dayIssues = openIssues.filter((i) => i.dayIndex === selectedDay);
  const legs = stops.slice(1).map((s, i) => legBetween(catalog.get(stops[i].placeId).location, catalog.get(s.placeId).location));
  const totalKm = legs.reduce((sum, l) => sum + (l?.distanceKm ?? 0), 0);
  const forecast = weatherOn(record.weather, day.date);
  const addStop = () => router.push({ pathname: '/parada', params: { day: String(selectedDay) } });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader
        title={trip.destination}
        subtitle={tripRangeLabel(trip)}
        right={<AlertsChip issues={openIssues} />}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.days}
        accessibilityRole="tablist"
      >
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
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <WeatherStatusBar
          trip={trip}
          status={weatherStatus}
          cache={record.weather}
          onRefresh={() => refreshWeather({ force: true })}
        />
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
            {forecast ? (
              day.rainExpected && <Badge label="Chuva prevista" bg="#DCE7F5" fg="#1F3B63" />
            ) : (
              <Pressable
                onPress={() => toggleRain(selectedDay)}
                accessibilityRole="switch"
                accessibilityState={{ checked: day.rainExpected }}
                accessibilityLabel="Chuva neste dia"
                hitSlop={8}
                style={[styles.rainToggle, day.rainExpected && { backgroundColor: '#DCE7F5', borderColor: '#DCE7F5' }]}
              >
                <Ionicons name={day.rainExpected ? 'rainy' : 'rainy-outline'} size={16} color={day.rainExpected ? '#1F3B63' : colors.muted} />
                <Txt size={12} weight="semibold" color={day.rainExpected ? '#1F3B63' : colors.muted}>
                  {day.rainExpected ? 'Chuva marcada' : 'Marcar chuva'}
                </Txt>
              </Pressable>
            )}
          </View>
          {forecast && <DayWeatherLine weather={forecast} />}
          <View style={styles.statsRow}>
            <Stat value={String(stops.length)} label="paradas" />
            <Stat value={legs.some(Boolean) ? formatDistance(totalKm) : '–'} label="entre paradas" />
            <Stat value={formatDuration(validator.dayLoadMinutes(day))} label="de programação" />
          </View>
        </Card>

        <View style={{ height: 14 }} />
        {stops.length === 0 && (
          <Txt color={colors.muted} style={{ marginBottom: 8 }}>
            Nenhuma parada neste dia ainda.
          </Txt>
        )}
        {stops.map((stop, index) => {
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
        <Pressable
          onPress={addStop}
          accessibilityRole="button"
          style={[styles.addStop, { borderColor: p.accent }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={p.accent} />
          <Txt weight="semibold" color={p.accent}>
            Adicionar parada
          </Txt>
        </Pressable>
        <Txt size={12} color={colors.muted} style={{ marginTop: 16 }}>
          Distâncias estimadas em linha reta. Lugares criados por você não têm mapa até a integração com o Google Maps.
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
  dayTab: { width: 58, height: 60, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 18, marginTop: 10 },
  leg: { marginLeft: 64, marginVertical: 6 },
  rainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addStop: {
    marginTop: 14,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  alerts: { height: 40, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
