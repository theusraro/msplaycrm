import { normalizeBrazilianPhone } from '../utils/phoneNormalizer';

/**
 * Serviço centralizado para links e interações do WhatsApp
 */

export interface OpenWhatsAppOptions {
  phone: string;
  message?: string;
  defaultDDD?: string;
}

export function generateWhatsAppUrl(phone: string, message: string = '', defaultDDD: string = '32'): string {
  const normalized = normalizeBrazilianPhone(phone, defaultDDD);
  const cleanPhone = normalized.isValid ? normalized.e164 : phone.replace(/\D/g, '');
  const encodedText = message ? encodeURIComponent(message.trim()) : '';
  
  return encodedText 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/${cleanPhone}`;
}

export function openWhatsAppConversation(options: OpenWhatsAppOptions): void {
  const { phone, message, defaultDDD = '32' } = options;
  const normalized = normalizeBrazilianPhone(phone, defaultDDD);
  const cleanPhone = normalized.isValid ? normalized.e164 : phone.replace(/\D/g, '');
  const encodedText = message ? encodeURIComponent(message.trim()) : '';

  // 1. Tenta abrir via deep-link nativo do WhatsApp se em ambiente mobile
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    const nativeUri = encodedText 
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?phone=${cleanPhone}`;
    
    // Tenta abrir o app nativo
    window.location.href = nativeUri;
    
    // Fallback para navegador web caso o app não abra em 1.5s
    setTimeout(() => {
      const webUrl = encodedText 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://api.whatsapp.com/send?phone=${cleanPhone}`;
      window.open(webUrl, '_blank');
    }, 1500);
  } else {
    // Desktop: abre wa.me direto em nova aba
    const webUrl = generateWhatsAppUrl(phone, message, defaultDDD);
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (err) {
    console.error('Falha ao copiar:', err);
    return false;
  }
}
