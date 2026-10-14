import type { DocumentPickerAsset } from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import { makeId } from '@/core/editing';
import { Attachment } from '@/core/reservations';

const MAX_WEB_BYTES = 1_500_000;

function attachmentsDir(): Directory {
  const dir = new Directory(Paths.document, 'anexos');
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/**
 * Guarda uma cópia do arquivo escolhido dentro do app, para abrir mesmo sem internet.
 * Na web não há sistema de arquivos: o anexo fica embutido nos dados (até ~1,5 MB).
 */
export async function saveAttachment(asset: DocumentPickerAsset): Promise<Attachment> {
  const name = asset.name || 'anexo';
  if (Platform.OS === 'web') {
    const base64 = (asset as DocumentPickerAsset & { base64?: string }).base64;
    if (asset.size && asset.size > MAX_WEB_BYTES) throw new Error('Arquivo grande demais para a versão web.');
    const uri = base64?.startsWith('data:') ? base64 : base64 ? `data:${asset.mimeType ?? ''};base64,${base64}` : asset.uri;
    return { uri, name, mimeType: asset.mimeType };
  }
  const source = new File(asset.uri);
  const safeName = name.replace(/[^\w.\-]+/g, '_');
  const dest = new File(attachmentsDir(), `${makeId('anexo')}-${safeName}`);
  await source.copy(dest);
  return { uri: dest.uri, name, mimeType: asset.mimeType };
}

export function deleteAttachment(attachment: Attachment | undefined): void {
  if (!attachment || Platform.OS === 'web') return;
  try {
    const file = new File(attachment.uri);
    if (file.exists) file.delete();
  } catch {
    // O arquivo já não existe: nada a fazer.
  }
}

export function deleteAllAttachments(): void {
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, 'anexos');
    if (dir.exists) dir.delete();
  } catch {
    // Sem anexos guardados.
  }
}

/** Abre PDFs e outros arquivos no app do sistema. Imagens abrem na tela de anexo do Rotta. */
export async function openWithSystem(attachment: Attachment): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(attachment.uri);
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(attachment.uri, { mimeType: attachment.mimeType, dialogTitle: attachment.name });
  }
}
