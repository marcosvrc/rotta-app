import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Card, ChoiceChips, FormScreen, Txt } from '@/components/ui';
import { shortDateLabel } from '@/core/calendar';
import { swapDays } from '@/core/editing';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';

/** Troca o programa de um dia com outro, por exemplo quando a chuva muda de dia. */
export default function SwapDayScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const { trip, updateTrip, setSelectedDay } = useRotta();
  const from = Math.min(Math.max(Number(params.day ?? 0) || 0, 0), trip.days.length - 1);
  const others = trip.days.map((_, i) => i).filter((i) => i !== from);
  const [to, setTo] = useState(others[0] ?? from);
  const label = (i: number) => `Dia ${i + 1} · ${shortDateLabel(trip.days[i].date)}`;

  const save = () => {
    updateTrip((t) => swapDays(t, from, to));
    setSelectedDay(to);
    if (router.canGoBack()) router.back();
    else router.replace('/roteiro');
  };

  return (
    <FormScreen title="Trocar dias" subtitle={label(from)} saveLabel="Trocar" onSave={save}>
      <Card>
        <Txt weight="semibold" size={15}>
          {trip.days[from].title}
        </Txt>
        <Txt size={13} color={colors.muted}>
          {`${trip.days[from].stops.length} paradas · ${label(from)}`}
        </Txt>
      </Card>
      <ChoiceChips<number> label="Trocar com" value={to} onChange={setTo} options={others.map((i) => ({ value: i, label: label(i) }))} />
      <View>
        <Card>
          <Txt weight="semibold" size={15}>
            {trip.days[to].title}
          </Txt>
          <Txt size={13} color={colors.muted}>
            {`${trip.days[to].stops.length} paradas · ${label(to)}`}
          </Txt>
        </Card>
        <Txt size={12} color={colors.muted} style={{ marginTop: 8 }}>
          Os dois dias trocam de programa, com os mesmos horários. A previsão do tempo fica com cada data, e o validador
          confere se os lugares abrem no novo dia.
        </Txt>
      </View>
    </FormScreen>
  );
}
