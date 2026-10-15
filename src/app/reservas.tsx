import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RESERVATION_ICON, openAttachment } from '@/components/reservations';
import { Card, PrimaryButton, ScreenHeader, Txt } from '@/components/ui';
import { shortDateLabel, timeLabel } from '@/core/calendar';
import { RESERVATION_TYPE_LABEL, groupByDate, isImage } from '@/core/reservations';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

export default function ReservationsScreen() {
  const { trip, record, palette: p } = useRotta();
  const groups = groupByDate(record.reservations);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Reservas" subtitle={`${trip.destination} · disponíveis sem internet`} />
      <ScrollView contentContainerStyle={styles.content}>
        {groups.length === 0 && (
          <Card>
            <Txt weight="semibold" size={15}>
              Nenhuma reserva ainda
            </Txt>
            <Txt size={13} color={colors.muted}>
              Guarde voos, hotéis e ingressos com o código e o QR code. Tudo fica no aparelho para abrir sem internet.
            </Txt>
          </Card>
        )}
        {groups.map((g) => (
          <View key={`${g.date.year}-${g.date.month}-${g.date.day}`} style={{ marginBottom: 6 }}>
            <Txt weight="semibold" size={13} color={colors.muted} style={styles.dateTitle}>
              {shortDateLabel(g.date).toUpperCase()}
            </Txt>
            <View style={{ gap: 8 }}>
              {g.items.map((r) => (
                <Card
                  key={r.id}
                  padding={14}
                  onPress={() => router.push({ pathname: '/reserva', params: { id: r.id } })}
                  accessibilityLabel={`${RESERVATION_TYPE_LABEL[r.type]}: ${r.title}`}
                >
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={[styles.icon, { backgroundColor: p.tint }]}>
                      <Ionicons name={RESERVATION_ICON[r.type]} size={20} color={p.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt weight="semibold" size={15}>
                        {r.title}
                      </Txt>
                      <Txt size={13} color={colors.muted}>
                        {[RESERVATION_TYPE_LABEL[r.type], r.time !== undefined ? timeLabel(r.time) : null, r.code ? `Código ${r.code}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Txt>
                    </View>
                  </View>
                  {r.attachment && (
                    <Pressable
                      onPress={() => openAttachment(r)}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir anexo ${r.attachment.name}`}
                      style={[styles.attachment, { borderColor: p.soft }]}
                    >
                      <Ionicons name={isImage(r.attachment) ? 'qr-code-outline' : 'document-attach-outline'} size={18} color={p.ink} />
                      <Txt weight="semibold" size={13} color={p.ink} numberOfLines={1} style={{ flex: 1 }}>
                        {isImage(r.attachment) ? 'Ver ingresso / QR code' : r.attachment.name}
                      </Txt>
                      <Ionicons name="chevron-forward" size={16} color={p.ink} />
                    </Pressable>
                  )}
                </Card>
              ))}
            </View>
          </View>
        ))}
        <PrimaryButton label="Nova reserva" onPress={() => router.push('/reserva')} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 60 },
  dateTitle: { letterSpacing: 0.6, marginTop: 14, marginBottom: 8, marginLeft: 4 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  attachment: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
