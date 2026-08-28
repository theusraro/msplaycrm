import url from 'node:url';

/**
 * Validates endpoint URLs against Server-Side Request Forgery (SSRF)
 */
export function validateSafeUrl(rawUrl: string, allowLocalInDev = true): { valid: boolean; reason?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'URL inválida ou vazia.' };
  }

  let parsed: url.URL;
  try {
    parsed = new url.URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Formato de URL inválido.' };
  }

  // 1. Protocol Validation
  if (!['http:', 'https:', 'mock:'].includes(parsed.protocol)) {
    return { valid: false, reason: `Protocolo '${parsed.protocol}' não permitido. Use apenas HTTP ou HTTPS.` };
  }

  // Allow mock:// for internal mock clusters
  if (parsed.protocol === 'mock:') {
    return { valid: true };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block Loopback, Cloud Metadata & Private IP Ranges in Production
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0';
  const isCloudMetadata = hostname === '169.254.169.254' || hostname === 'metadata.google.internal';

  if (isCloudMetadata) {
    return { valid: false, reason: 'Acesso a endpoints de metadata em nuvem é estritamente bloqueado.' };
  }

  if (isLocalHost) {
    if (isProduction || !allowLocalInDev) {
      return { valid: false, reason: 'Acesso a endereços locais (localhost/127.0.0.1) é bloqueado por segurança.' };
    }
  }

  // Check RFC1918 private subnets in production
  if (isProduction) {
    const isPrivateIp = (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
    if (isPrivateIp) {
      return { valid: false, reason: 'Acesso a faixas de IP privadas (RFC 1918) é bloqueado em produção.' };
    }
  }

  return { valid: true };
}
