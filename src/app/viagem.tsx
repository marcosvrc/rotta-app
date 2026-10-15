import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ErrorBox, FormScreen, PrimaryButton, Segmented, Stepper, TextField, Txt, confirmAction } from '@/components/ui';
import { formatDateBr, parseDateBr, plusDays, tripDate } from '@/core/calendar';
import { MAX_TRIP_DAYS, createTrip, updateTripInfo, validateNewTrip } from '@/core/editing';
import { PACES, Pace } from '@/core/model';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function todayPlus(days: number) {
  const now = new Date();
  return plusDays(tripDate(now.getFullYear(), now.getMonth() + 1, now.getDate()), days);
}

/** Nova viagem ou edição da viagem atual (?id=). */
export default function TripFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, addTrip, updateTrip, deleteTrip, setTripCurrency } = useRotta();
  const existing = id ? data.trips.find((r) => r.trip.id === id)?.trip : undefined;
  const editing = !!existing;

  const [destination, setDestination] = useState(existing?.destination ?? '');
  const [country, setCountry] = useState(existing?.country ?? '');
  const [start, setStart] = useState(formatDateBr(existing?.days[0].date ?? todayPlus(30)));
  const [days, setDays] = useState(existing?.days.length ?? 5);
  const [travelers, setTravelers] = useState(existing?.travelers ?? 2);
  const [budget, setBudget] = useState(existing ? String(existing.budgetBrl) : '');
  const [pace, setPace] = useState<Pace>(existing?.pace ?? 'MEDIO');
  const existingRecord = id ? data.trips.find((r) => r.trip.id === id) : undefined;
  const [currency, setCurrency] = useState(existingRecord?.currency ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  const save = () => {
    const startDate = parseDateBr(start) ?? undefined;
    const budgetBrl = budget.trim() === '' ? 0 : Number(budget.replace(/\./g, '').replace(',', '.'));
    const input = { destination, country, start: startDate, days, travelers, budgetBrl: Number.isFinite(budgetBrl) ? budgetBrl : -1, pace };
    const problems = validateNewTrip(input);
    const code = currency.trim().toUpperCase();
    if (code && !/^[A-Z]{3}$/.test(code)) problems.push('A moeda precisa ter 3 letras, como EUR ou USD.');
    setErrors(problems);
    if (problems.length > 0 || !startDate) return;
    const valid = { ...input, start: startDate, budgetBrl: Math.round(input.budgetBrl) };
    if (existing) {
      updateTrip((t) => updateTripInfo(t, valid));
      setTripCurrency(code || undefined);
    } else {
      addTrip(createTrip(valid));
      if (code) setTripCurrency(code);
    }
    if (editing) close();
    else router.replace('/roteiro');
  };

  const remove = () =>
    existing &&
    confirmAction(
      'Apagar viagem?',
      `${existing.destination}: roteiro, gastos, reservas e anexos serão apagados deste aparelho.`,
      'Apagar',
      () => {
        deleteTrip(existing.id);
        router.replace('/');
      },
    );

  return (
    <FormScreen
      title={editing ? 'Editar viagem' : 'Nova viagem'}
      subtitle={editing ? existing.destination : 'O roteiro começa vazio e você monta dia a dia'}
      saveLabel={editing ? 'Salvar' : 'Criar viagem'}
      onSave={save}
      footerExtra={
        editing && data.trips.length > 1 ? <PrimaryButton label="Apagar" filled={false} onPress={remove} /> : undefined
      }
    >
      <ErrorBox errors={errors} />
      <TextField label="Destino" value={destination} onChangeText={setDestination} placeholder="Ex.: Porto" autoFocus={!editing} />
      <TextField label="País" value={country} onChangeText={setCountry} placeholder="Ex.: Portugal" />
      <TextField
        label="Data de ida"
        value={start}
        onChangeText={setStart}
        placeholder="dd/mm/aaaa"
        keyboardType="numbers-and-punctuation"
        hint={editing ? 'Mudar a data move todos os dias do roteiro junto.' : undefined}
      />
      {!editing && (
        <Row label="Dias de viagem">
          <Stepper value={days} min={1} max={MAX_TRIP_DAYS} unit="um dia" onChange={setDays} />
        </Row>
      )}
      <Row label="Viajantes">
        <Stepper value={travelers} min={1} max={8} unit="um viajante" onChange={setTravelers} />
      </Row>
      <TextField
        label="Orçamento total (R$)"
        value={budget}
        onChangeText={setBudget}
        placeholder="Ex.: 15000"
        keyboardType="numeric"
      />
      <TextField
        label="Moeda local (opcional)"
        value={currency}
        onChangeText={(v) => setCurrency(v.toUpperCase().slice(0, 3))}
        placeholder="EUR, USD, ARS…"
        hint="Em branco, o app usa a moeda do país. Os gastos são convertidos para reais."
      />
      <View style={{ gap: 6 }}>
        <Txt weight="semibold" size={13} color={colors.muted}>
          Ritmo
        </Txt>
        <Segmented<Pace>
          value={pace}
          onChange={setPace}
          options={(Object.keys(PACES) as Pace[]).map((k) => ({ value: k, label: PACES[k].label }))}
        />
      </View>
    </FormScreen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Txt weight="semibold" size={15} style={{ flex: 1 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}
