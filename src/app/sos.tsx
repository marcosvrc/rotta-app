import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Divider, PrimaryButton, ScreenHeader, SectionTitle, TextField, Txt } from '@/components/ui';
import { SosInfo, countryCodeOf, dialable, emergencyNumbersFor } from '@/core/sos';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

function call(phone: string) {
  const number = dialable(phone);
  if (number) Linking.openURL(`tel:${number}`).catch(() => undefined);
}

/** Números de emergência do destino e contatos anotados pelo usuário. Abre sem internet. */
export default function SosScreen() {
  const { trip, record, updateSos } = useRotta();
  const [editing, setEditing] = useState(false);
  const code = countryCodeOf(trip.country, record.geo?.countryCode);
  const numbers = emergencyNumbersFor(code);
  const country = record.geo?.country || trip.country || trip.destination;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="SOS" subtitle={`${trip.destination} · funciona sem internet`} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.emergency}>
          <Txt weight="semibold" size={13} color={colors.criticalInk}>
            {`EMERGÊNCIA ${country ? `· ${country.toUpperCase()}` : ''}`}
          </Txt>
          {numbers ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              {numbers.map((n) => (
                <Pressable
                  key={`${n.label}-${n.number}`}
                  onPress={() => call(n.number)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ligar para ${n.label}, ${n.number}`}
                  style={styles.callButton}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Txt weight="semibold" size={15} color="#FFFFFF" style={{ flex: 1 }}>
                    {n.label}
                  </Txt>
                  <Txt weight="medium" size={22} color="#FFFFFF">
                    {n.number}
                  </Txt>
                </Pressable>
              ))}
            </View>
          ) : (
            <Txt size={14} color={colors.criticalInk} style={{ marginTop: 8 }}>
              {`Ainda não tenho os números de emergência de ${country || 'deste destino'}. Pesquise na fonte oficial antes de viajar e anote nas observações abaixo.`}
            </Txt>
          )}
          <Txt size={12} color={colors.criticalInk} style={{ marginTop: 10 }}>
            Confira os números em fonte oficial antes de viajar.
          </Txt>
        </View>

        {editing ? (
          <SosForm
            initial={record.sos}
            onCancel={() => setEditing(false)}
            onSave={(info) => {
              updateSos(info);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <SectionTitle>Seus contatos</SectionTitle>
            <Card padding={0}>
              <InfoRow icon="bed-outline" label="Hospedagem" value={record.sos.stayAddress} phone={record.sos.stayPhone} />
              <Divider />
              <InfoRow
                icon="medkit-outline"
                label={record.sos.insuranceName || 'Seguro viagem'}
                value={record.sos.insurancePolicy ? `Apólice ${record.sos.insurancePolicy}` : undefined}
                phone={record.sos.insurancePhone}
              />
              <Divider />
              <InfoRow icon="flag-outline" label="Consulado do Brasil" phone={record.sos.consulatePhone} />
              <Divider />
              <InfoRow icon="person-outline" label={record.sos.contactName || 'Contato de emergência'} phone={record.sos.contactPhone} />
              {record.sos.notes ? (
                <>
                  <Divider />
                  <InfoRow icon="document-text-outline" label="Observações" value={record.sos.notes} />
                </>
              ) : null}
            </Card>
            <PrimaryButton label="Editar contatos" filled={false} onPress={() => setEditing(true)} style={{ marginTop: 14 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  phone,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  phone?: string;
}) {
  const empty = !value && !phone;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.body} />
      <View style={{ flex: 1 }}>
        <Txt weight="semibold" size={15}>
          {label}
        </Txt>
        <Txt size={13} color={colors.muted} selectable>
          {empty ? 'Não preenchido' : [value, phone].filter(Boolean).join(' · ')}
        </Txt>
      </View>
      {phone && dialable(phone) ? (
        <Pressable onPress={() => call(phone)} accessibilityRole="button" accessibilityLabel={`Ligar para ${label}`} style={styles.smallCall}>
          <Ionicons name="call-outline" size={20} color={colors.goodInk} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SosForm({ initial, onSave, onCancel }: { initial: SosInfo; onSave: (info: SosInfo) => void; onCancel: () => void }) {
  const [info, setInfo] = useState<SosInfo>(initial);
  const field = (key: keyof SosInfo) => ({
    value: info[key] ?? '',
    onChangeText: (v: string) => setInfo((s) => ({ ...s, [key]: v })),
  });
  const clean = (): SosInfo =>
    Object.fromEntries(Object.entries(info).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => [k, v.trim()]));

  return (
    <View style={{ gap: 16, marginTop: 20 }}>
      <TextField label="Endereço da hospedagem" {...field('stayAddress')} placeholder="Para mostrar ao taxista" multiline />
      <TextField label="Telefone da hospedagem" {...field('stayPhone')} placeholder="+351 ..." keyboardType="phone-pad" />
      <TextField label="Seguradora" {...field('insuranceName')} placeholder="Nome do seguro viagem" />
      <TextField label="Telefone do seguro (24h)" {...field('insurancePhone')} keyboardType="phone-pad" />
      <TextField label="Número da apólice" {...field('insurancePolicy')} />
      <TextField label="Telefone do consulado do Brasil" {...field('consulatePhone')} keyboardType="phone-pad" hint="Consulte o site do Itamaraty para o plantão consular do destino." />
      <TextField label="Contato de emergência" {...field('contactName')} placeholder="Nome" />
      <TextField label="Telefone do contato" {...field('contactPhone')} keyboardType="phone-pad" />
      <TextField label="Observações" {...field('notes')} placeholder="Ex.: tipo sanguíneo, alergias, número local da polícia turística" multiline />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PrimaryButton label="Cancelar" filled={false} onPress={onCancel} />
        <PrimaryButton label="Salvar" onPress={() => onSave(clean())} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  emergency: { backgroundColor: colors.alertBg, borderRadius: 22, padding: 16 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#B42318',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 8, paddingVertical: 12, minHeight: 64 },
  smallCall: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goodBg, alignItems: 'center', justifyContent: 'center' },
});
