import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ListRow, PrimaryButton, ScreenHeader, SectionTitle, Segmented, Toggle, ToggleChip, Txt, confirmAction } from '@/components/ui';
import { PACES, Pace } from '@/core/model';
import { PRIVACY_URL } from '@/core/legal';
import { useAccount } from '@/state/account';
import { pickBackup, shareBackup } from '@/state/backup';
import { remindersSupported, remindersUnavailableReason, requestReminderPermission } from '@/state/notifications';
import { useRotta } from '@/state/rotta';
import { ACCENT_OPTIONS, colors } from '@/theme';

const INTERESTS = ['História', 'Gastronomia', 'Natureza', 'Praia', 'Vida noturna', 'Compras', 'Arte'];

export default function SettingsScreen() {
  const { accentId, setAccentId, trip, updateTrip, interests, toggleInterest, data, lastSavedAt, resetToSample, replaceData, setReminderSettings } = useRotta();
  const account = useAccount();
  const reminders = data.settings.reminders;
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const toggleReminders = async (on: boolean) => {
    setReminderMessage(null);
    if (!on) {
      setReminderSettings({ enabled: false });
      return;
    }
    const granted = await requestReminderPermission();
    if (granted) setReminderSettings({ enabled: true });
    else setReminderMessage('Permissão negada. Libere as notificações do Rotta nas configurações do celular.');
  };
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const exportData = async () => {
    try {
      await shareBackup(data);
      setBackupMessage('Backup gerado. Guarde o arquivo num lugar seguro, como o Google Drive.');
    } catch {
      setBackupMessage('Não foi possível gerar o backup.');
    }
  };

  const importData = async () => {
    try {
      const result = await pickBackup();
      if (result.kind === 'cancelado') return;
      if (result.kind === 'invalido') {
        setBackupMessage('Esse arquivo não é um backup do Rotta.');
        return;
      }
      const count = result.data.trips.length;
      confirmAction(
        'Restaurar backup?',
        `Os dados deste aparelho serão trocados pelos do backup (${count} ${count === 1 ? 'viagem' : 'viagens'}). Anexos não vêm no backup.`,
        'Restaurar',
        () => {
          replaceData(result.data);
          setBackupMessage('Backup restaurado.');
        },
      );
    } catch {
      setBackupMessage('Não foi possível ler o arquivo.');
    }
  };
  const reservations = data.trips.reduce((n, r) => n + r.reservations.length, 0);
  const attachments = data.trips.reduce((n, r) => n + r.reservations.filter((x) => x.attachment).length, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader title="Ajustes" subtitle="Do jeito que você viaja" />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Cor do app</SectionTitle>
        <Card>
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {ACCENT_OPTIONS.map((o) => {
              const selected = o.id === accentId;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setAccentId(o.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={o.label}
                  style={styles.swatchItem}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: o.color, borderColor: selected ? colors.ink : 'transparent' },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={22} color="#FFFFFF" />}
                  </View>
                  <Txt size={12} color={colors.body} numberOfLines={1}>
                    {o.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle>Ritmo das viagens</SectionTitle>
        <Card>
          <Segmented<Pace>
            value={trip.pace}
            onChange={(pace) => updateTrip((t) => ({ ...t, pace }))}
            options={(Object.keys(PACES) as Pace[]).map((k) => ({ value: k, label: PACES[k].label }))}
          />
          <Txt size={13} color={colors.muted} style={{ marginTop: 8 }}>
            {`O validador avisa quando um dia passa de ${PACES[trip.pace].maxMinutesPerDay / 60} horas de programação.`}
          </Txt>
        </Card>

        <SectionTitle>Interesses</SectionTitle>
        <Card>
          <Txt size={13} color={colors.muted}>
            Usados pelo simulador e, no futuro, pelo agente para sugerir roteiros.
          </Txt>
          <View style={styles.chips}>
            {INTERESTS.map((name) => (
              <ToggleChip key={name} label={name} checked={interests.has(name)} onToggle={() => toggleInterest(name)} />
            ))}
          </View>
        </Card>

        <SectionTitle>Lembretes</SectionTitle>
        <Card>
          {!remindersSupported ? (
            <Txt size={13} color={colors.muted}>
              {remindersUnavailableReason}
            </Txt>
          ) : (
            <>
              <SwitchRow
                label="Avisar no celular"
                hint={reminders.enabled ? 'Funciona sem internet, no horário do destino.' : 'Prazos do checklist, véspera das reservas e começo de cada dia.'}
                value={reminders.enabled}
                onChange={toggleReminders}
              />
              {reminders.enabled && (
                <View style={{ marginTop: 8, gap: 4 }}>
                  <SwitchRow label="Prazos do checklist" value={reminders.checklist} onChange={(v) => setReminderSettings({ checklist: v })} />
                  <SwitchRow label="Reservas (véspera e 2h antes)" value={reminders.reservations} onChange={(v) => setReminderSettings({ reservations: v })} />
                  <SwitchRow label="Começo de cada dia do roteiro" value={reminders.dayStart} onChange={(v) => setReminderSettings({ dayStart: v })} />
                </View>
              )}
              {reminderMessage ? (
                <Txt size={13} color={colors.criticalInk} style={{ marginTop: 6 }}>
                  {reminderMessage}
                </Txt>
              ) : null}
            </>
          )}
        </Card>

        <SectionTitle>Conta e nuvem</SectionTitle>
        <Card padding={0}>
          <ListRow
            icon={account.email ? 'cloud-done-outline' : 'person-circle-outline'}
            title={account.email ?? (account.configured ? 'Entrar ou criar conta' : 'Conta')}
            subtitle={
              !account.configured
                ? 'Nuvem ainda não configurada nesta versão'
                : account.email
                  ? 'Viagens sincronizadas com a nuvem'
                  : 'Veja suas viagens em outro celular'
            }
            onPress={() => router.push('/conta')}
          />
        </Card>

        <SectionTitle>Dados no aparelho</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.offlineIcon}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.goodInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold" size={15}>
                Funciona sem internet
              </Txt>
              <Txt size={13} color={colors.muted}>
                {lastSavedAt
                  ? `Salvo às ${String(lastSavedAt.getHours()).padStart(2, '0')}:${String(lastSavedAt.getMinutes()).padStart(2, '0')}`
                  : 'Salvo automaticamente a cada mudança'}
              </Txt>
            </View>
          </View>
          <Txt size={13} color={colors.body} style={{ marginTop: 10 }}>
            {`${data.trips.length} ${data.trips.length === 1 ? 'viagem' : 'viagens'} · ${reservations} ${reservations === 1 ? 'reserva' : 'reservas'} · ${attachments} ${attachments === 1 ? 'anexo' : 'anexos'}`}
          </Txt>
          <Txt size={12} color={colors.muted} style={{ marginTop: 4 }}>
            {account.email
              ? 'Roteiros, gastos e reservas ficam neste aparelho e na sua conta. Anexos ficam só aqui.'
              : 'Roteiros, gastos, reservas e ingressos ficam guardados só neste aparelho. Faça um backup antes de trocar de celular.'}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <PrimaryButton label="Fazer backup" filled={false} onPress={exportData} style={{ flex: 1 }} />
            <PrimaryButton label="Restaurar" filled={false} onPress={importData} style={{ flex: 1 }} />
          </View>
          {backupMessage ? (
            <Txt size={13} color={colors.body} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
              {backupMessage}
            </Txt>
          ) : null}
          <PrimaryButton
            label="Apagar tudo e voltar ao exemplo"
            filled={false}
            style={{ marginTop: 10 }}
            onPress={() =>
              confirmAction(
                'Restaurar exemplo?',
                'Todas as viagens, gastos, reservas e anexos deste aparelho serão apagados e a viagem a Lisboa volta.',
                'Restaurar',
                resetToSample,
              )
            }
          />
        </Card>

        <SectionTitle>Sobre</SectionTitle>
        <Card>
          <Txt weight="semibold" size={15}>
            Rotta 0.8.0
          </Txt>
          <Txt size={13} color={colors.muted}>
            Versão de testes. Mapas do Google chegam numa próxima etapa.
          </Txt>
          <Txt size={12} color={colors.muted} style={{ marginTop: 6 }}>
            Previsão do tempo: Open-Meteo.com (CC BY 4.0). Localização: GeoNames. Câmbio: Frankfurter.
          </Txt>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" style={{ paddingVertical: 10 }}>
            <Txt size={14} weight="semibold" color={colors.body}>
              Política de privacidade
            </Txt>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchItem: { width: 72, alignItems: 'center', gap: 6, paddingVertical: 4 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  offlineIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goodBg, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});

function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
      <View style={{ flex: 1 }}>
        <Txt weight="semibold" size={15}>
          {label}
        </Txt>
        {hint ? (
          <Txt size={12} color={colors.muted}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}
