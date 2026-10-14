import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreRing } from '@/components/illustrations';
import { Badge, Card, PrimaryButton, ScreenHeader, SectionTitle, Txt } from '@/components/ui';
import { shortDateLabel, timeLabel } from '@/core/calendar';
import { ISSUE_KIND_LABEL, Issue, scoreFor } from '@/core/validator';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

export default function CheckScreen() {
  const { trip, report, openIssues, dismissed, applyFix, keepIssue, lastApplied, clearLastApplied, palette: p } =
    useRotta();
  const kept = report.issues.filter((i) => dismissed.has(i.id));
  const score = scoreFor(openIssues);

  // Ao sair da tela, some o aviso do último plano B aplicado.
  useFocusEffect(useCallback(() => clearLastApplied, [clearLastApplied]));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScreenHeader
        back
        title="Verificação do roteiro"
        subtitle={`${trip.destination} · ${report.checkedStops} paradas conferidas`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <ScoreRing score={score} color={openIssues.length === 0 ? p.soft : '#E8B07A'} />
          <View style={{ flex: 1 }}>
            <Txt weight="semibold" size={17} color="#FFFFFF">
              {openIssues.length === 0
                ? 'Roteiro pronto para viajar'
                : openIssues.length === 1
                  ? '1 ponto para revisar'
                  : `${openIssues.length} pontos para revisar`}
            </Txt>
            <Txt size={13} color={colors.nightMuted}>
              Horários, deslocamentos, clima e ritmo conferidos em código.
            </Txt>
          </View>
        </View>

        {lastApplied ? (
          <View style={styles.applied} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark" size={18} color={colors.goodInk} />
            <Txt size={13} color={colors.goodInk} style={{ flex: 1 }}>
              {`Plano B aplicado: ${lastApplied}`}
            </Txt>
          </View>
        ) : null}

        {openIssues.length > 0 && <SectionTitle>Precisa de atenção</SectionTitle>}
        <View style={{ gap: 10 }}>
          {openIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onApply={() => applyFix(issue)} onKeep={() => keepIssue(issue)} />
          ))}
        </View>

        {kept.length > 0 && (
          <>
            <SectionTitle>Mantidos como estavam</SectionTitle>
            {kept.map((issue) => (
              <Txt key={issue.id} color={colors.muted} style={{ marginLeft: 4, marginBottom: 4 }}>
                {`· ${issue.title}`}
              </Txt>
            ))}
          </>
        )}

        <SectionTitle>Tudo certo</SectionTitle>
        <Card padding={14}>
          <View style={{ gap: 10 }}>
            {report.passedChecks.map((line) => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="checkmark" size={18} color={colors.goodInk} />
                <Txt style={{ flex: 1 }}>{line}</Txt>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function IssueCard({ issue, onApply, onKeep }: { issue: Issue; onApply: () => void; onKeep: () => void }) {
  const { trip, palette: p } = useRotta();
  const day = trip.days[issue.dayIndex];
  const critical = issue.severity === 'CRITICA';
  const stop = issue.placeId ? day.stops.find((s) => s.placeId === issue.placeId) : undefined;
  const where = `Dia ${issue.dayIndex + 1} · ${shortDateLabel(day.date)}${stop ? ` · ${timeLabel(stop.start)}` : ''}`;

  return (
    <Card borderColor={critical ? colors.criticalBorder : colors.line}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Badge
          label={ISSUE_KIND_LABEL[issue.kind]}
          bg={critical ? colors.criticalBg : colors.warningBg}
          fg={critical ? colors.criticalInk : colors.warningInk}
        />
        <Txt size={12} color={colors.muted}>
          {where}
        </Txt>
      </View>
      <Txt weight="semibold" size={15} style={{ marginTop: 8 }}>
        {issue.title}
      </Txt>
      <Txt size={13} color={colors.body}>
        {issue.detail}
      </Txt>

      {issue.fix && issue.fixDescription ? (
        <View style={styles.planB}>
          <Txt weight="bold" size={11} color={p.ink} style={{ letterSpacing: 0.8 }}>
            PLANO B
          </Txt>
          <Txt weight="medium" style={{ marginTop: 4 }}>
            {issue.fixDescription}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <PrimaryButton label="Aplicar" onPress={onApply} style={{ flex: 1 }} />
            <PrimaryButton label="Manter assim" onPress={onKeep} filled={false} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <PrimaryButton label="Entendi" onPress={onKeep} filled={false} style={{ marginTop: 10 }} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.night,
    borderRadius: 22,
    padding: 16,
  },
  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.goodBg,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  planB: { backgroundColor: colors.background, borderRadius: 14, padding: 12, marginTop: 10 },
});
