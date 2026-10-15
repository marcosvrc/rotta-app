import { useEffect, useRef } from 'react';

import { buildReminders } from '@/core/reminders';
import { cancelReminders, remindersSupported, scheduleReminders } from '@/state/notifications';
import { useRotta } from '@/state/rotta';

/** Reagenda os lembretes alguns segundos depois de cada mudança relevante. Não desenha nada. */
export function ReminderScheduler() {
  const { data, ready } = useRotta();
  const settings = data.settings.reminders;
  const last = useRef<string | null>(null);

  // Assinatura de todos os avisos possíveis (sem filtrar por data): muda só quando os dados mudam.
  const all = buildReminders(data.trips, settings, 0, Infinity);
  const signature = settings.enabled ? all.map((r) => `${r.id}@${r.at}:${r.title}|${r.body}`).join('\n') : 'off';

  useEffect(() => {
    if (!ready || !remindersSupported || signature === last.current) return;
    const timer = setTimeout(() => {
      last.current = signature;
      const task = signature === 'off' ? cancelReminders() : scheduleReminders(buildReminders(data.trips, settings, Date.now()));
      task.catch(() => {
        last.current = null;
      });
    }, 2000);
    return () => clearTimeout(timer);
    // data e settings mudam junto com signature
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready]);

  return null;
}
