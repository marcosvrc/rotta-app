import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Reminder } from '@/core/reminders';

const CHANNEL = 'lembretes';

/** Notificações locais: funcionam sem internet e no Expo Go. Na web não há suporte. */
export const remindersSupported = Platform.OS !== 'web';

let configured = false;

async function configure() {
  if (configured || !remindersSupported) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    // No Android 13+, o pedido de permissão só aparece depois que existe um canal.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Lembretes da viagem',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  await configure();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Troca todos os avisos agendados pela lista nova. */
export async function scheduleReminders(reminders: Reminder[]): Promise<void> {
  if (!remindersSupported) return;
  await configure();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
}

export async function cancelReminders(): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
