import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChoiceChips, ErrorBox, FormScreen, PrimaryButton, Segmented, TextField, Txt, confirmAction } from '@/components/ui';
import { parseTime, shortDateLabel, timeLabel } from '@/core/calendar';
import {
  addStop,
  createCustomPlace,
  moveStopInDay,
  removeStop,
  suggestStart,
  unscheduledPlaces,
  updateStop,
  validateStop,
} from '@/core/editing';
import { formatDuration } from '@/core/format';
import { PLACE_KINDS, PlaceKind, dayIndexOf, sortStops } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/roteiro');
}

type Source = 'sugestao' | 'novo';

/**
 * Adiciona ou edita uma parada.
 * ?day= dia de destino; ?place= lugar já existente (edita se já estiver no roteiro).
 */
export default function StopFormScreen() {
  const params = useLocalSearchParams<{ day?: string; place?: string }>();
  const { trip, updateTrip, setSelectedDay } = useRotta();
  const clampDay = (n: number) => Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), trip.days.length - 1);

  const fixedPlace = params.place ? trip.places.find((p) => p.id === params.place) : undefined;
  const scheduledDay = fixedPlace ? dayIndexOf(trip, fixedPlace.id) : null;
  const editing = scheduledDay !== null;
  const existingStop = editing ? trip.days[scheduledDay].stops.find((s) => s.placeId === fixedPlace!.id) : undefined;

  const suggestions = unscheduledPlaces(trip);
  const [dayIndex, setDayIndex] = useState(clampDay(editing ? scheduledDay : Number(params.day ?? 0)));
  const [source, setSource] = useState<Source>(suggestions.length > 0 ? 'sugestao' : 'novo');
  const [pickedId, setPickedId] = useState<string | null>(fixedPlace?.id ?? null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaceKind>('Outro');
  const [indoor, setIndoor] = useState<'sim' | 'nao'>('nao');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(timeLabel(existingStop?.start ?? suggestStart(trip.days[dayIndex])));
  const [duration, setDuration] = useState(String(existingStop?.durationMinutes ?? fixedPlace?.suggestedMinutes ?? 60));
  const [errors, setErrors] = useState<string[]>([]);

  const picked = fixedPlace ?? suggestions.find((p) => p.id === pickedId);
  const dayStops = editing ? sortStops(trip.days[scheduledDay].stops) : [];
  const position = editing ? dayStops.findIndex((s) => s.placeId === fixedPlace!.id) : -1;
  const reorder = (direction: -1 | 1) => {
    if (!editing) return;
    const target = position + direction;
    if (target < 0 || target >= dayStops.length) return;
    const next = moveStopInDay(trip, scheduledDay, fixedPlace!.id, direction);
    updateTrip(() => next);
    const moved = next.days[scheduledDay].stops.find((s) => s.placeId === fixedPlace!.id);
    if (moved) setTime(timeLabel(moved.start));
  };

  const changeDay = (d: number) => {
    setDayIndex(d);
    if (!editing) setTime(timeLabel(suggestStart(trip.days[d])));
  };

  const pick = (id: string) => {
    setPickedId(id);
    const place = suggestions.find((p) => p.id === id);
    if (place) setDuration(String(place.suggestedMinutes));
  };

  const save = () => {
    const start = parseTime(time);
    const minutes = Number(duration) || null;
    const problems = validateStop(start, minutes);
    const creatingNew = !fixedPlace && source === 'novo';
    if (creatingNew && !name.trim()) problems.unshift('Dê um nome para o lugar.');
    if (!fixedPlace && source === 'sugestao' && !picked) problems.unshift('Escolha um lugar da lista.');
    setErrors(problems);
    if (problems.length > 0 || start === null || !minutes) return;

    if (editing) {
      updateTrip((t) => updateStop(t, scheduledDay, fixedPlace!.id, { start, durationMinutes: minutes, toDay: dayIndex }));
    } else {
      const place = creatingNew ? createCustomPlace({ name, kind, indoor: indoor === 'sim', notes }) : picked!;
      updateTrip((t) => addStop(t, dayIndex, place, start, minutes));
    }
    setSelectedDay(dayIndex);
    close();
  };

  const remove = () =>
    fixedPlace &&
    confirmAction('Tirar do roteiro?', `${fixedPlace.name} sai do Dia ${scheduledDay! + 1}.`, 'Tirar', () => {
      updateTrip((t) => removeStop(t, scheduledDay!, fixedPlace.id));
      router.replace('/roteiro');
    });

  return (
    <FormScreen
      title={editing ? 'Editar parada' : 'Nova parada'}
      subtitle={fixedPlace?.name ?? trip.destination}
      saveLabel={editing ? 'Salvar' : 'Adicionar'}
      onSave={save}
      footerExtra={editing ? <PrimaryButton label="Remover" filled={false} onPress={remove} /> : undefined}
    >
      <ErrorBox errors={errors} />

      {!fixedPlace && (
        <>
          {suggestions.length > 0 && (
            <Segmented<Source>
              value={source}
              onChange={setSource}
              options={[
                { value: 'sugestao', label: 'Lugares da viagem' },
                { value: 'novo', label: 'Novo lugar' },
              ]}
            />
          )}
          {source === 'sugestao' && suggestions.length > 0 ? (
            <ChoiceChips<string>
              label="Lugar"
              value={pickedId ?? ''}
              onChange={pick}
              options={suggestions.map((p) => ({ value: p.id, label: p.name }))}
            />
          ) : (
            <>
              <TextField label="Nome do lugar" value={name} onChangeText={setName} placeholder="Ex.: Livraria Lello" autoFocus />
              <ChoiceChips<PlaceKind>
                label="Tipo"
                value={kind}
                onChange={setKind}
                options={PLACE_KINDS.map((k) => ({ value: k, label: k }))}
              />
              <View style={{ gap: 6 }}>
                <Txt weight="semibold" size={13} color={colors.muted}>
                  Ambiente
                </Txt>
                <Segmented<'sim' | 'nao'>
                  value={indoor}
                  onChange={setIndoor}
                  options={[
                    { value: 'nao', label: 'Ao ar livre' },
                    { value: 'sim', label: 'Coberto' },
                  ]}
                />
              </View>
              <TextField label="Anotações (opcional)" value={notes} onChangeText={setNotes} placeholder="Ex.: comprar ingresso antes" multiline />
            </>
          )}
        </>
      )}

      {editing && dayStops.length > 1 && (
        <View style={{ gap: 6 }}>
          <Txt weight="semibold" size={13} color={colors.muted}>
            {`Ordem no dia: ${position + 1}ª de ${dayStops.length}`}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PrimaryButton label="↑ Antes" filled={false} onPress={() => reorder(-1)} style={{ flex: 1, opacity: position === 0 ? 0.4 : 1 }} />
            <PrimaryButton
              label="Depois ↓"
              filled={false}
              onPress={() => reorder(1)}
              style={{ flex: 1, opacity: position === dayStops.length - 1 ? 0.4 : 1 }}
            />
          </View>
          <Txt size={12} color={colors.muted}>
            Troca na hora com a parada vizinha, mantendo o intervalo entre elas.
          </Txt>
        </View>
      )}

      <ChoiceChips<number>
        label="Dia"
        value={dayIndex}
        onChange={changeDay}
        options={trip.days.map((d, i) => ({ value: i, label: `D${i + 1} · ${shortDateLabel(d.date)}` }))}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField label="Horário" value={time} onChangeText={setTime} placeholder="09:30" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Duração (min)"
            value={duration}
            onChangeText={setDuration}
            placeholder="60"
            keyboardType="number-pad"
            hint={Number(duration) >= 60 ? formatDuration(Number(duration)) : undefined}
          />
        </View>
      </View>
      <Txt size={12} color={colors.muted}>
        Depois de salvar, o validador confere horário de funcionamento, deslocamento, chuva e ritmo do dia.
      </Txt>
    </FormScreen>
  );
}
