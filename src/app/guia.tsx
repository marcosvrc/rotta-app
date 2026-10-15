import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiButton, AiErrorText, SourceLinks, useAiCall } from '@/components/ai';
import { Card, ScreenHeader, SectionTitle, Txt } from '@/components/ui';
import { GUIDE_SECTION_TITLE, GuideOutput, GuideSectionKey } from '@/core/ai';
import { askAi } from '@/state/cloud/ai';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

const ORDER: GuideSectionKey[] = ['comer', 'beber', 'transporte', 'cultura', 'dicas'];

/** Guia do destino: comida, bebida, transporte, cultura e dicas. Gerado uma vez e guardado para ler offline. */
export default function GuideScreen() {
  const { trip, record, saveGuide, palette: p } = useRotta();
  const ai = useAiCall<GuideOutput>();
  const guide = record.guide?.data;

  const generate = async () => {
    const result = await ai.run(async () => {
      const r = await askAi({ task: 'guia_destino', input: { destination: trip.destination, country: trip.country } });
      return r.data;
    });
    if (result) saveGuide(result);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Guia do destino" subtitle={trip.country ? `${trip.destination}, ${trip.country}` : trip.destination} />
      <ScrollView contentContainerStyle={styles.content}>
        {!guide ? (
          <Card>
            <Txt weight="semibold" size={15}>
              {`O que comer, beber e como circular em ${trip.destination}`}
            </Txt>
            <Txt size={13} color={colors.muted} style={{ marginTop: 4 }}>
              A IA monta o guia a partir do Wikivoyage e mostra a fonte. Depois de gerado, ele fica salvo para ler sem internet.
            </Txt>
            <View style={{ marginTop: 12 }}>
              <AiButton label="Gerar guia" onPress={generate} loading={ai.loading} />
              <AiErrorText error={ai.error} />
            </View>
          </Card>
        ) : (
          <>
            <View style={[styles.summary, { backgroundColor: p.tint }]}>
              <Txt size={15} color={p.ink}>
                {guide.summary}
              </Txt>
            </View>
            {ORDER.map((key) => {
              const section = guide.sections.find((s) => s.key === key);
              if (!section) return null;
              return (
                <View key={key}>
                  <SectionTitle>{GUIDE_SECTION_TITLE[key]}</SectionTitle>
                  <Card padding={0}>
                    {section.items.map((item, i) => (
                      <View key={`${item.name}-${i}`} style={[styles.item, i > 0 && styles.itemBorder]}>
                        <Txt weight="semibold" size={15}>
                          {item.name}
                        </Txt>
                        <Txt size={13} color={colors.body}>
                          {item.description}
                        </Txt>
                      </View>
                    ))}
                  </Card>
                </View>
              );
            })}
            <SourceLinks sources={guide.sources} />
            <Txt size={12} color={colors.muted} style={{ marginTop: 8 }}>
              {guide.sources.length > 0
                ? 'Texto gerado por IA a partir da fonte acima. Confira preços e horários no local.'
                : 'Não havia guia de referência para este destino: o texto é de conhecimento geral da IA. Confira antes de seguir.'}
            </Txt>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  summary: { borderRadius: 18, padding: 16 },
  item: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
});
