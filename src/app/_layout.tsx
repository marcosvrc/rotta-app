import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { RottaProvider, useRotta } from '@/state/rotta';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  if (!loaded && !error) return null;
  return (
    <RottaProvider>
      <AppStack />
    </RottaProvider>
  );
}

/** Só mostra o app depois de carregar os dados salvos, para não piscar a viagem de exemplo. */
function AppStack() {
  const { ready } = useRotta();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lugar/[id]" />
        <Stack.Screen name="verificacao" />
        <Stack.Screen name="viagem" />
        <Stack.Screen name="parada" />
        <Stack.Screen name="gasto" />
        <Stack.Screen name="reservas" />
        <Stack.Screen name="reserva" />
        <Stack.Screen name="anexo" />
        <Stack.Screen name="checklist" />
        <Stack.Screen name="mala" />
        <Stack.Screen name="sos" />
      </Stack>
    </>
  );
}
