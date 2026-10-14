import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { AppData, backupFileName, exportBackup, parseBackup } from '@/core/appdata';

/** Gera o arquivo de backup e abre o compartilhamento (Drive, e-mail, WhatsApp...). Na web, baixa o arquivo. */
export async function shareBackup(data: AppData): Promise<void> {
  const now = new Date();
  const text = exportBackup(data, now);
  const name = backupFileName(now);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível neste aparelho.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup do Rotta' });
}

export type ImportResult = { kind: 'ok'; data: AppData } | { kind: 'cancelado' } | { kind: 'invalido' };

export async function pickBackup(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { kind: 'cancelado' };
  const text = Platform.OS === 'web' ? await (asset.file ? asset.file.text() : fetch(asset.uri).then((r) => r.text())) : await new File(asset.uri).text();
  const data = parseBackup(text);
  return data ? { kind: 'ok', data } : { kind: 'invalido' };
}
