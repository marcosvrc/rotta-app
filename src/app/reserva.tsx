import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ChoiceChips, ErrorBox, FormScreen, PrimaryButton, TextField, Txt, confirmAction } from '@/components/ui';
import { formatDateBr, parseDateBr, parseTime, timeLabel } from '@/core/calendar';
import { makeId } from '@/core/editing';
import { Attachment, RESERVATION_TYPE_LABEL, ReservationType, isImage, validateReservation } from '@/core/reservations';
import { deleteAttachment, saveAttachment } from '@/state/files';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/reservas');
}

/** Nova reserva ou edição (?id=), com anexo de ingresso, QR code ou PDF. */
export default function ReservationFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { trip, record, saveReservation, removeReservation, palette: p } = useRotta();
  const existing = id ? record.reservations.find((r) => r.id === id) : undefined;

  const [type, setType] = useState<ReservationType>(existing?.type ?? 'INGRESSO');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(formatDateBr(existing?.date ?? trip.days[0].date));
  const [time, setTime] = useState(existing?.time !== undefined ? timeLabel(existing.time) : '');
  const [code, setCode] = useState(existing?.code ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [attachment, setAttachment] = useState<Attachment | undefined>(existing?.attachment);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Anexo escolhido nesta tela e ainda não salvo: apaga se o usuário sair sem salvar.
  const pending = useRef<Attachment | undefined>(undefined);
  useEffect(() => () => deleteAttachment(pending.current), []);

  const pick = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const saved = await saveAttachment(result.assets[0]);
      deleteAttachment(pending.current);
      pending.current = saved;
      setAttachment(saved);
      setErrors([]);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Não foi possível anexar o arquivo.']);
    } finally {
      setBusy(false);
    }
  };

  const detach = () => {
    deleteAttachment(pending.current);
    pending.current = undefined;
    setAttachment(undefined);
  };

  const save = () => {
    const parsedDate = parseDateBr(date) ?? undefined;
    const parsedTime = time.trim() ? parseTime(time) : undefined;
    const draft = {
      id: existing?.id ?? makeId('reserva'),
      type,
      title: title.trim(),
      date: parsedDate,
      time: parsedTime ?? undefined,
      code: code.trim() || undefined,
      notes: notes.trim() || undefined,
      attachment,
    };
    const problems = validateReservation(draft);
    if (parsedTime === null) problems.push('Horário inválido. Use hh:mm ou deixe em branco.');
    setErrors(problems);
    if (problems.length > 0 || !parsedDate) return;
    saveReservation({ ...draft, date: parsedDate });
    pending.current = undefined;
    close();
  };

  const remove = () =>
    existing &&
    confirmAction('Apagar reserva?', `${existing.title} e o anexo serão apagados.`, 'Apagar', () => {
      removeReservation(existing.id);
      close();
    });

  return (
    <FormScreen
      title={existing ? 'Editar reserva' : 'Nova reserva'}
      subtitle={trip.destination}
      onSave={save}
      footerExtra={existing ? <PrimaryButton label="Apagar" filled={false} onPress={remove} /> : undefined}
    >
      <ErrorBox errors={errors} />
      <ChoiceChips<ReservationType>
        label="Tipo"
        value={type}
        onChange={setType}
        options={(Object.keys(RESERVATION_TYPE_LABEL) as ReservationType[]).map((k) => ({ value: k, label: RESERVATION_TYPE_LABEL[k] }))}
      />
      <TextField label="Nome" value={title} onChangeText={setTitle} placeholder="Ex.: Mosteiro dos Jerónimos" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1.3 }}>
          <TextField label="Data" value={date} onChangeText={setDate} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Horário" value={time} onChangeText={setTime} placeholder="opcional" keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <TextField label="Código da reserva" value={code} onChangeText={setCode} placeholder="Ex.: TP-8K2M" />
      <TextField label="Observações" value={notes} onChangeText={setNotes} placeholder="Ex.: chegar 15 min antes" multiline />

      <View style={{ gap: 6 }}>
        <Txt weight="semibold" size={13} color={colors.muted}>
          Ingresso ou QR code
        </Txt>
        {attachment ? (
          <View style={[styles.attachment, { borderColor: p.soft, backgroundColor: p.tint }]}>
            <Ionicons name={isImage(attachment) ? 'image-outline' : 'document-outline'} size={20} color={p.ink} />
            <Txt weight="semibold" size={14} color={p.ink} numberOfLines={1} style={{ flex: 1 }}>
              {attachment.name}
            </Txt>
            <Pressable onPress={detach} accessibilityRole="button" accessibilityLabel="Remover anexo" style={styles.small}>
              <Ionicons name="close" size={20} color={p.ink} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={pick}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.attachment, styles.dashed, { borderColor: p.accent }]}
          >
            {busy ? <ActivityIndicator color={p.accent} /> : <Ionicons name="attach" size={20} color={p.accent} />}
            <Txt weight="semibold" color={p.accent}>
              Anexar imagem ou PDF
            </Txt>
          </Pressable>
        )}
        <Txt size={12} color={colors.muted}>
          O arquivo é copiado para dentro do app e abre mesmo sem internet.
        </Txt>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  attachment: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashed: { borderStyle: 'dashed', borderWidth: 1.5, justifyContent: 'center' },
  small: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
