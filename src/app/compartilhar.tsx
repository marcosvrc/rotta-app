import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ScreenHeader, Txt } from '@/components/ui';
import { itineraryHtml, itineraryText } from '@/core/share';
import { shareItineraryPdf } from '@/state/print';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

/** Envia o roteiro para quem vai junto: texto (WhatsApp) ou PDF. */
export default function ShareScreen() {
  const { trip, record, palette: p } = useRotta();
  const [withReservations, setWithReservations] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = { reservations: withReservations };
  const text = itineraryText(record, options);

  const sendText = async () => {
    setMessage(null);
    try {
      await Share.share({ message: text, title: `Roteiro: ${trip.destination}` });
    } catch {
      setMessage('Não foi possível abrir o compartilhamento.');
    }
  };

  const sendPdf = async () => {
    setMessage(null);
    setBusy(true);
    try {
      await shareItineraryPdf(itineraryHtml(record, options), `Roteiro ${trip.destination}`);
    } catch {
      setMessage('Não foi possível gerar o PDF neste aparelho.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScreenHeader back title="Compartilhar roteiro" subtitle={trip.destination} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold" size={15}>
                Incluir reservas e códigos
              </Txt>
              <Txt size={12} color={colors.muted}>
                Só para quem vai junto: códigos de reserva dão acesso às suas reservas.
              </Txt>
            </View>
            <Switch
              value={withReservations}
              onValueChange={setWithReservations}
              accessibilityLabel="Incluir reservas e códigos"
              trackColor={{ true: p.accent, false: colors.line }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Txt weight="semibold" size={13} color={colors.muted} style={styles.label}>
          PRÉVIA DO TEXTO
        </Txt>
        <View style={styles.preview}>
          <Txt size={13} style={{ lineHeight: 19 }} selectable>
            {text.replace(/\*/g, '')}
          </Txt>
        </View>
        {message ? (
          <Txt size={13} color={colors.criticalInk} style={{ marginTop: 10 }}>
            {message}
          </Txt>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label={busy ? 'Gerando…' : 'PDF'} filled={false} onPress={busy ? () => undefined : sendPdf} />
        <PrimaryButton label="Enviar texto" onPress={sendText} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  label: { letterSpacing: 0.6, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  preview: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
});
