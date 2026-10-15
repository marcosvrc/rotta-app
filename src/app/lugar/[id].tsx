import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiButton, AiErrorText, useAiCall } from '@/components/ai';
import { CityIllustration } from '@/components/illustrations';
import { Badge, Card, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { timeLabel } from '@/core/calendar';
import { formatDuration } from '@/core/format';
import { Place, dayIndexOf, hoursLabel } from '@/core/model';
import { photoCredit } from '@/core/photos';
import { StoryOutput } from '@/core/ai';
import { askAi } from '@/state/cloud/ai';
import { fetchPlacePhotos } from '@/state/photos';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

type Section = 'historia' | 'info' | 'dicas';

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, selectedDay, updateTrip, palette: p } = useRotta();
  const [section, setSection] = useState<Section>('historia');
  const place = trip.places.find((x) => x.id === id);
  const ai = useAiCall<StoryOutput>();
  const [storyMissing, setStoryMissing] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);

  // Fotos do Commons: busca uma vez por lugar e guarda (com autor e licença) junto da viagem.
  const needsPhotos = !!place && !place.photos;
  const placeName = place?.name ?? '';
  useEffect(() => {
    if (!needsPhotos) return;
    let alive = true;
    fetchPlacePhotos(placeName, trip.destination)
      .then((photos) => {
        if (!alive) return;
        updateTrip((t) => ({
          ...t,
          places: t.places.map((x) => (x.id === id ? { ...x, photos: { photos, fetchedAt: new Date().toISOString() } } : x)),
        }));
      })
      .catch((e) => {
        // Aparece no Terminal do Expo: ajuda a saber se foi rede, bloqueio (403) ou outra coisa.
        console.warn('Fotos do lugar:', e instanceof Error ? e.message : e);
        if (alive) setPhotoError(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsPhotos, placeName, photoAttempt]);
  const photoStatus: PhotoStatus = place?.photos ? 'pronto' : photoError ? 'sem-conexao' : 'buscando';

  if (!place) {
    return (
      <SafeAreaView style={styles.screen}>
        <Txt style={{ padding: 20 }}>Lugar não encontrado.</Txt>
      </SafeAreaView>
    );
  }

  const fetchStory = async () => {
    const result = await ai.run(async () => {
      const r = await askAi({
        task: 'historia_lugar',
        input: { placeName: place.name, city: trip.destination, country: trip.country },
      });
      return r.data;
    });
    if (!result) return;
    if (!result.found) {
      setStoryMissing(true);
      return;
    }
    updateTrip((t) => ({
      ...t,
      places: t.places.map((x) => (x.id === place.id ? { ...x, story: result.story, sourceUrl: result.source?.url } : x)),
    }));
  };

  const dayIndex = dayIndexOf(trip, place.id);
  const stop = dayIndex !== null ? trip.days[dayIndex].stops.find((s) => s.placeId === place.id) : undefined;

  return (
    <View style={styles.screen}>
      <View>
        <PhotoHeader
          place={place}
          status={photoStatus}
          onRetry={() => {
            setPhotoError(false);
            setPhotoAttempt((n) => n + 1);
          }}
        />
        <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/roteiro'))}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Txt weight="semibold" size={12} color={p.ink} style={{ letterSpacing: 0.8 }}>
          {(place.neighborhood ? `${place.kind} · ${place.neighborhood}` : place.kind).toUpperCase()}
        </Txt>
        <Txt weight="medium" size={28}>
          {place.name}
        </Txt>
        <Txt size={14} color={colors.muted} style={{ marginTop: 2, marginBottom: 16 }}>
          {hoursLabel(place.hours)}
        </Txt>

        <Segmented<Section>
          value={section}
          onChange={setSection}
          options={[
            { value: 'historia', label: 'História' },
            { value: 'info', label: 'Informações' },
            { value: 'dicas', label: 'Dicas' },
          ]}
        />
        <View style={{ height: 14 }} />

        {section === 'historia' && !place.story && (
          <View>
            <Txt color={colors.muted}>
              {storyMissing
                ? 'Não encontramos uma fonte confiável sobre este lugar, então a IA não escreve uma história para ele.'
                : 'Ainda não há história para este lugar. A IA busca na Wikipedia e, se não achar, em sites oficiais, e mostra a fonte.'}
            </Txt>
            {!storyMissing && (
              <View style={{ marginTop: 12 }}>
                <AiButton label="Buscar história" onPress={fetchStory} loading={ai.loading} />
                <AiErrorText error={ai.error} />
              </View>
            )}
          </View>
        )}

        {section === 'historia' && !!place.story && (
          <View>
            <Badge label="Resumo com IA, com fonte" bg={p.tint} fg={p.ink} />
            <Txt size={16} style={{ marginTop: 10, lineHeight: 24 }}>
              {place.story}
            </Txt>
            {place.sourceUrl ? (
              <Pressable onPress={() => Linking.openURL(place.sourceUrl!)} accessibilityRole="link" style={{ paddingVertical: 10 }}>
                <Txt weight="semibold" color={p.accent}>
                  Ler a fonte
                </Txt>
              </Pressable>
            ) : null}
          </View>
        )}

        {section === 'info' && (
          <Card padding={0}>
            <InfoRow label="Horário" value={hoursLabel(place.hours)} />
            <InfoRow label="Tempo sugerido" value={formatDuration(place.suggestedMinutes)} />
            <InfoRow label="Ambiente" value={place.indoor ? 'Coberto' : 'Ao ar livre'} />
            {place.neighborhood ? <InfoRow label="Bairro" value={place.neighborhood} /> : null}
          </Card>
        )}

        {section === 'dicas' && (
          <View style={{ gap: 8 }}>
            {place.tips.length === 0 && <Txt color={colors.muted}>Nenhuma dica anotada.</Txt>}
            {place.tips.map((tip) => (
              <View key={tip} style={styles.tip}>
                <Txt>{tip}</Txt>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {dayIndex !== null && stop ? (
          <View style={styles.footerRow}>
            <View style={[styles.status, { backgroundColor: p.tint }]}>
              <Txt weight="semibold" size={15} color={p.ink}>
                {`Dia ${dayIndex + 1}, ${timeLabel(stop.start)}`}
              </Txt>
            </View>
            <PrimaryButton
              label="Editar parada"
              onPress={() =>
                router.push({ pathname: '/parada', params: { day: String(dayIndex), place: place.id } })
              }
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <PrimaryButton
            label="Adicionar ao roteiro"
            onPress={() => router.push({ pathname: '/parada', params: { day: String(selectedDay), place: place.id, novo: '1' } })}
            style={{ marginBottom: 12 }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

type PhotoStatus = 'buscando' | 'pronto' | 'sem-conexao';

/** Fotos do lugar em carrossel, com crédito do autor e licença (exigido pelo Commons). */
function PhotoHeader({ place, status, onRetry }: { place: Place; status: PhotoStatus; onRetry: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const photos = place.photos?.photos ?? [];

  if (photos.length === 0) {
    const label =
      status === 'buscando' ? 'Buscando fotos…' : status === 'sem-conexao' ? 'Não deu para buscar fotos · tocar para tentar de novo' : 'Sem fotos deste lugar';
    return (
      <View>
        <CityIllustration height={240} />
        <Pressable
          onPress={status === 'sem-conexao' ? onRetry : undefined}
          disabled={status !== 'sem-conexao'}
          accessibilityRole={status === 'sem-conexao' ? 'button' : undefined}
          style={styles.photoBadge}
        >
          <Badge label={label} bg="rgba(27,34,48,0.72)" fg="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  const current = photos[Math.min(index, photos.length - 1)];
  return (
    <View style={{ height: 260, backgroundColor: colors.night }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={64}
      >
        {photos.map((ph) => (
          <Image
            key={ph.sourceUrl}
            source={{ uri: ph.url }}
            style={{ width, height: 260 }}
            resizeMode="cover"
            accessibilityLabel={`Foto de ${place.name}`}
          />
        ))}
      </ScrollView>
      <View style={styles.photoFooter} pointerEvents="box-none">
        <Pressable onPress={() => Linking.openURL(current.sourceUrl)} accessibilityRole="link" style={{ flex: 1 }}>
          <Txt size={11} color="#FFFFFF" numberOfLines={1}>
            {photoCredit(current)}
          </Txt>
        </Pressable>
        {photos.length > 1 && (
          <Txt size={11} weight="semibold" color="#FFFFFF">
            {`${Math.min(index, photos.length - 1) + 1}/${photos.length}`}
          </Txt>
        )}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt color={colors.muted}>{label}</Txt>
      <Txt weight="semibold" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0 },
  back: {
    margin: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: { position: 'absolute', right: 12, bottom: 12 },
  photoFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(27,34,48,0.6)',
  },
  content: { padding: 20, paddingBottom: 32 },
  tip: { backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  footer: { backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 12 },
  footerRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  status: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
