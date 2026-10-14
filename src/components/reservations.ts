import { router } from 'expo-router';

import { IconName } from '@/components/ui';
import { Reservation, ReservationType, isImage } from '@/core/reservations';
import { openWithSystem } from '@/state/files';

export const RESERVATION_ICON: Record<ReservationType, IconName> = {
  VOO: 'airplane-outline',
  HOSPEDAGEM: 'bed-outline',
  INGRESSO: 'ticket-outline',
  TRANSPORTE: 'train-outline',
  OUTRO: 'document-text-outline',
};

export function openAttachment(r: Reservation) {
  if (!r.attachment) return;
  if (isImage(r.attachment)) router.push({ pathname: '/anexo', params: { id: r.id } });
  else openWithSystem(r.attachment);
}
