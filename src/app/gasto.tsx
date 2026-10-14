import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ChoiceChips, ErrorBox, FormScreen, TextField } from '@/components/ui';
import { shortDateLabel } from '@/core/calendar';
import { EXPENSE_CATEGORY_LABEL, ExpenseCategory, PAYMENT_LABEL, PaymentMethod, validateExpense } from '@/core/expenses';
import { parseMoney } from '@/core/format';
import { useRotta } from '@/state/rotta';

export default function ExpenseFormScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const { trip, selectedDay, addExpense } = useRotta();
  const initialDay = params.day !== undefined ? Number(params.day) : selectedDay;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dayIndex, setDayIndex] = useState(Math.min(Math.max(initialDay, 0), trip.days.length - 1));
  const [category, setCategory] = useState<ExpenseCategory>('ALIMENTACAO');
  const [payment, setPayment] = useState<PaymentMethod>('CREDITO');
  const [errors, setErrors] = useState<string[]>([]);

  const save = () => {
    const amountBrl = parseMoney(amount) ?? 0;
    const expense = { dayIndex, description: description.trim(), category, payment, amountBrl };
    const problems = validateExpense(expense);
    setErrors(problems);
    if (problems.length > 0) return;
    addExpense(expense);
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/custos', params: { aba: 'gastos' } });
  };

  return (
    <FormScreen title="Registrar gasto" subtitle={trip.destination} onSave={save}>
      <ErrorBox errors={errors} />
      <TextField label="Valor (R$)" value={amount} onChangeText={setAmount} placeholder="35,50" keyboardType="decimal-pad" autoFocus />
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
    </FormScreen>
  );
}
