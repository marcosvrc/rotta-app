import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ChoiceChips, ErrorBox, FormScreen, TextField, ToggleChip, Txt } from '@/components/ui';
import { tripCurrencyOf } from '@/core/appdata';
import { shortDateLabel } from '@/core/calendar';
import { BRL, currencySymbol, dateBr, formatMoney, isRateFresh, parseRate, toBrl } from '@/core/currency';
import { EXPENSE_CATEGORY_LABEL, ExpenseCategory, PAYMENT_LABEL, PaymentMethod, validateExpense } from '@/core/expenses';
import { formatBrlCents, parseMoney } from '@/core/format';
import { fetchRate } from '@/state/rates';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

const NO_PAYER = '__ninguem__';

export default function ExpenseFormScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const { trip, record, data, selectedDay, addExpense, saveRate, palette: p } = useRotta();
  const initialDay = params.day !== undefined ? Number(params.day) : selectedDay;
  const localCurrency = tripCurrencyOf(record);
  const participants = record.participants;

  const [currency, setCurrency] = useState(localCurrency);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dayIndex, setDayIndex] = useState(Math.min(Math.max(initialDay, 0), trip.days.length - 1));
  const [category, setCategory] = useState<ExpenseCategory>('ALIMENTACAO');
  const [payment, setPayment] = useState<PaymentMethod>('CREDITO');
  const [paidBy, setPaidBy] = useState<string>(participants[0]?.id ?? NO_PAYER);
  const [splitWith, setSplitWith] = useState<Set<string>>(new Set(participants.map((x) => x.id)));
  const [errors, setErrors] = useState<string[]>([]);
  // Moedas cuja busca de cotação já terminou (com ou sem sucesso) nesta tela.
  const [attempted, setAttempted] = useState<string[]>([]);
  const [manualRate, setManualRate] = useState<string | null>(null);

  const cached = currency === BRL ? undefined : data.rates[currency];
  const loadingRate = currency !== BRL && !isRateFresh(cached, new Date()) && !attempted.includes(currency);
  const rate = currency === BRL ? 1 : manualRate !== null ? parseRate(manualRate) : (cached?.rate ?? null);

  // Busca a cotação do dia quando o gasto não é em reais. Sem internet, usa a última guardada ou pede para digitar.
  useEffect(() => {
    if (currency === BRL || isRateFresh(data.rates[currency], new Date())) return;
    let alive = true;
    fetchRate(currency).then((r) => {
      if (!alive) return;
      setAttempted((a) => [...a, currency]);
      if (r) saveRate(currency, { ...r, fetchedAt: new Date().toISOString() });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const value = parseMoney(amount.replace(/[^\d.,]/g, ''));
  const amountBrl = value !== null && rate ? toBrl(value, rate) : null;

  const save = () => {
    const expense = {
      dayIndex,
      description: description.trim(),
      category,
      payment,
      amountBrl: amountBrl ?? 0,
      ...(currency !== BRL && value !== null && rate
        ? { currency, originalAmount: value, rate, rateDate: manualRate !== null ? undefined : cached?.date }
        : {}),
      ...(participants.length > 0 && paidBy !== NO_PAYER
        ? { paidBy, splitWith: splitWith.size === participants.length ? undefined : [...splitWith] }
        : {}),
    };
    const problems = validateExpense(expense);
    if (currency !== BRL && !rate) problems.push(`Informe a cotação: quantos reais vale 1 ${currency}.`);
    if (participants.length > 0 && paidBy !== NO_PAYER && splitWith.size === 0) problems.push('Escolha com quem dividir.');
    setErrors(problems);
    if (problems.length > 0) return;
    addExpense(expense);
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/custos', params: { aba: 'gastos' } });
  };

  const toggleSplit = (id: string) =>
    setSplitWith((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <FormScreen title="Registrar gasto" subtitle={trip.destination} onSave={save}>
      <ErrorBox errors={errors} />
      {localCurrency !== BRL && (
        <ChoiceChips<string>
          label="Moeda"
          value={currency}
          onChange={(c) => {
            setCurrency(c);
            setManualRate(null);
          }}
          options={[
            { value: localCurrency, label: `${currencySymbol(localCurrency)} ${localCurrency}` },
            { value: BRL, label: 'R$ Real' },
          ]}
        />
      )}
      <TextField
        label={`Valor (${currencySymbol(currency)})`}
        value={amount}
        onChangeText={setAmount}
        placeholder={currency === 'JPY' ? '1500' : '35,50'}
        keyboardType="decimal-pad"
        autoFocus
      />
      {currency !== BRL && (
        <View style={[styles.rate, { backgroundColor: p.tint }]}>
          {loadingRate && rate === null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={p.ink} />
              <Txt size={13} color={p.ink}>
                Buscando a cotação do dia…
              </Txt>
            </View>
          ) : manualRate === null && cached ? (
            <>
              <Txt size={14} weight="semibold" color={p.ink}>
                {amountBrl !== null ? `≈ ${formatBrlCents(amountBrl)}` : `1 ${currency} = ${formatMoney(cached.rate, BRL)}`}
              </Txt>
              <Txt size={12} color={p.ink}>
                {`Cotação de ${dateBr(cached.date)}: 1 ${currency} = R$ ${cached.rate.toFixed(4).replace('.', ',')}`}
              </Txt>
              <Pressable onPress={() => setManualRate(String(cached.rate).replace('.', ','))} accessibilityRole="button" style={{ paddingVertical: 6 }}>
                <Txt size={13} weight="semibold" color={p.accent}>
                  Usar outra cotação (ex.: a do cartão)
                </Txt>
              </Pressable>
            </>
          ) : (
            <>
              <TextField
                label={`Cotação: reais por 1 ${currency}`}
                value={manualRate ?? ''}
                onChangeText={setManualRate}
                placeholder="5,62"
                keyboardType="decimal-pad"
                hint={cached ? undefined : 'Sem internet e sem cotação guardada: digite a do cartão ou da casa de câmbio.'}
              />
              {amountBrl !== null && (
                <Txt size={14} weight="semibold" color={p.ink} style={{ marginTop: 6 }}>
                  {`≈ ${formatBrlCents(amountBrl)}`}
                </Txt>
              )}
            </>
          )}
        </View>
      )}
      <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Almoço no Time Out Market" />
      <ChoiceChips<number>
        label="Dia"
        value={dayIndex}
        onChange={setDayIndex}
        options={trip.days.map((d, i) => ({ value: i, label: `D${i + 1} · ${shortDateLabel(d.date)}` }))}
      />
      <ChoiceChips<ExpenseCategory>
        label="Categoria"
        value={category}
        onChange={setCategory}
        options={(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((k) => ({ value: k, label: EXPENSE_CATEGORY_LABEL[k] }))}
      />
      <ChoiceChips<PaymentMethod>
        label="Forma de pagamento"
        value={payment}
        onChange={setPayment}
        options={(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((k) => ({ value: k, label: PAYMENT_LABEL[k] }))}
      />
      {participants.length > 0 && (
        <>
          <ChoiceChips<string>
            label="Quem pagou"
            value={paidBy}
            onChange={setPaidBy}
            options={[...participants.map((x) => ({ value: x.id, label: x.name })), { value: NO_PAYER, label: 'Não dividir' }]}
          />
          {paidBy !== NO_PAYER && participants.length > 1 && (
            <View style={{ gap: 6 }}>
              <Txt weight="semibold" size={13} color={colors.muted}>
                Dividir entre
              </Txt>
              <View style={styles.chips}>
                {participants.map((x) => (
                  <ToggleChip key={x.id} label={x.name} checked={splitWith.has(x.id)} onToggle={() => toggleSplit(x.id)} />
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  rate: { borderRadius: 14, padding: 12, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
