import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { Reminder } from '@/core/reminders';

const CHANNEL = 'lembretes';

/** No Expo Go para Android, o módulo nativo de notificações não vem incluído: o app só funciona sem lembretes. */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const remindersSupported = Platform.OS !== 'web' && !(isExpoGo && Platform.OS === 'android');

/** Por que os lembretes não estão disponíveis aqui, para mostrar na tela de ajustes. */
export const remindersUnavailableReason =
  Platform.OS === 'web'
    ? 'Os lembretes funcionam no app do celular.'
    : 'No Expo Go os lembretes não funcionam. Instale o APK de teste (Releases do GitHub) para usar.';

type NotificationsModule = typeof import('expo-notifications');

let loaded: Promise<NotificationsModule | null> | null = null;

/**
 * Carrega o expo-notifications só quando precisa. Importar no topo do arquivo derruba o app inteiro
 * quando o módulo nativo não existe (Expo Go no Android).
 */
function notifications(): Promise<NotificationsModule | null> {
  if (!remindersSupported) return Promise.resolve(null);
  if (!loaded) {
    loaded = import('expo-notifications')
      .then(async (N) => {
        N.setNotificationHandler({
          handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
        });
        if (Platform.OS === 'android') {
          // No Android 13+, o pedido de permissão só aparece depois que existe um canal.
          await N.setNotificationChannelAsync(CHANNEL, { name: 'Lembretes da viagem', importance: N.AndroidImportance.DEFAULT });
        }
        return N;
      })
      .catch(() => null);
  }
  return loaded;
}

export async function requestReminderPermission(): Promise<boolean> {
  const N = await notifications();
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  return (await N.requestPermissionsAsync()).granted;
}

/** Troca todos os avisos agendados pela lista nova. */
export async function scheduleReminders(reminders: Reminder[]): Promise<void> {
  const N = await notifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
  for (const r of reminders) {
    await N.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
}

export async function cancelReminders(): Promise<void> {
  const N = await notifications();
  if (N) await N.cancelAllScheduledNotificationsAsync();
}
