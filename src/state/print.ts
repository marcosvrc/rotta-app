import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Gera o PDF do roteiro e abre o compartilhamento. Na web, abre a janela de impressão (salvar como PDF). */
export async function shareItineraryPdf(html: string, fileTitle: string): Promise<void> {
  // Carregado sob demanda: se o módulo nativo faltar, só esta ação falha, não o app.
  const Print = await import('expo-print');
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: fileTitle });
}
