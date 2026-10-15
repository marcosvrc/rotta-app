import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, ScreenHeader, Txt } from '@/components/ui';
import { shortDateLabel, timeLabel } from '@/core/calendar';
import { openWithSystem } from '@/state/files';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

/** Mostra o ingresso ou QR code em tela cheia, com fundo branco para leitura no portão. */
export default function AttachmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { record } = useRotta();
  const reservation = record.reservations.find((r) => r.id === id);
  const attachment = reservation?.attachment;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScreenHeader
        back
        title={reservation?.title ?? 'Anexo'}
        subtitle={
          reservation
            ? [shortDateLabel(reservation.date), reservation.time !== undefined ? timeLabel(reservation.time) : null, reservation.code]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
      />
      {attachment ? (
        <>
          <ScrollView contentContainerStyle={styles.content} maximumZoomScale={4} minimumZoomScale={1} centerContent>
            <Image
              source={{ uri: attachment.uri }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={`Anexo ${attachment.name}`}
            />
          </ScrollView>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Txt size={12} color={colors.muted} style={{ textAlign: 'center', marginBottom: 8 }}>
              Dica: aumente o brilho da tela para ler o QR code.
            </Txt>
            <PrimaryButton label="Abrir em outro app" filled={false} onPress={() => openWithSystem(attachment)} />
          </View>
        </>
      ) : (
        <Txt style={{ padding: 20 }}>Anexo não encontrado.</Txt>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  image: { width: '100%', aspectRatio: 0.75 },
});
