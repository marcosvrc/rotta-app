import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconName, Txt } from '@/components/ui';
import { shortDateLabel } from '@/core/calendar';
import { Trip } from '@/core/model';
import { DayWeather, WEATHER_LABEL, WeatherCache, WeatherKind, forecastAvailableFrom, weatherKind } from '@/core/weather';
import type { WeatherStatus } from '@/state/rotta';
import { colors } from '@/theme';

export const WEATHER_ICON: Record<WeatherKind, IconName> = {
  SOL: 'sunny-outline',
  NUVENS: 'partly-sunny-outline',
  NEBLINA: 'cloudy-outline',
  GAROA: 'rainy-outline',
  CHUVA: 'rainy-outline',
  NEVE: 'snow-outline',
  TEMPESTADE: 'thunderstorm-outline',
};

export function DayWeatherLine({ weather }: { weather: DayWeather }) {
  const kind = weatherKind(weather.code);
  const rain = weather.rainChance !== null ? ` · chuva ${weather.rainChance}%` : '';
  return (
    <View style={styles.line} accessible accessibilityLabel={`${WEATHER_LABEL[kind]}, máxima ${weather.maxC} graus, mínima ${weather.minC}${rain}`}>
      <Ionicons name={WEATHER_ICON[kind]} size={18} color={colors.body} />
      <Txt size={13} color={colors.body}>
        {`${WEATHER_LABEL[kind]} · ${weather.maxC}° / ${weather.minC}°${rain}`}
      </Txt>
    </View>
  );
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Linha de estado da previsão no topo do roteiro, com botão para atualizar. */
export function WeatherStatusBar({
  trip,
  status,
  cache,
  onRefresh,
}: {
  trip: Trip;
  status: WeatherStatus;
  cache: WeatherCache | undefined;
  onRefresh: () => void;
}) {
  let text: string;
  if (status === 'loading') text = 'Atualizando a previsão do tempo…';
  else if (status === 'sem-conexao')
    text = cache ? `Sem conexão. Previsão salva às ${hhmm(cache.fetchedAt)}.` : 'Sem conexão para buscar a previsão.';
  else if (status === 'nao-encontrado') text = `Não encontrei ${trip.destination} no mapa. Confira o nome do destino.`;
  else if (status === 'fora-da-janela')
    text = `A previsão do tempo sai a partir de ${shortDateLabel(forecastAvailableFrom(trip))}. Até lá, marque a chuva à mão.`;
  else if (cache) text = `Previsão do Open-Meteo, atualizada às ${hhmm(cache.fetchedAt)}.`;
  else text = 'Previsão do tempo ainda não consultada.';

  return (
    <View style={styles.bar}>
      <Ionicons name="partly-sunny-outline" size={18} color={colors.muted} />
      <Txt size={12} color={colors.muted} style={{ flex: 1 }}>
        {text}
      </Txt>
      {status !== 'loading' && status !== 'fora-da-janela' && (
        <Pressable onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Atualizar previsão" hitSlop={8} style={styles.refresh}>
          <Ionicons name="refresh" size={18} color={colors.body} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, minHeight: 36 },
  refresh: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
