import { Share } from '@capacitor/share';
import { copyToClipboard } from './whatsappService';

export interface ShareContentOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function shareContent(options: ShareContentOptions): Promise<{ shared: boolean; method: 'native' | 'clipboard' }> {
  const { title = 'MSPLAY CRM', text = '', url = '', dialogTitle = 'Compartilhar com' } = options;

  // 1. Tentar Capacitor Share se disponível
  try {
    const canShareCapacitor = await Share.canShare();
    if (canShareCapacitor.value) {
      await Share.share({
        title,
        text,
        url: url || undefined,
        dialogTitle,
      });
      return { shared: true, method: 'native' };
    }
  } catch (_) {
    // Capacitor Share fallback
  }

  // 2. Tentar Web Share API padrão do navegador
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: url || undefined,
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'native' };
      }
    }
  }

  // 3. Fallback: Copiar conteúdo para o Clipboard
  const contentToCopy = [text, url].filter(Boolean).join('\n');
  await copyToClipboard(contentToCopy);
  return { shared: true, method: 'clipboard' };
}
