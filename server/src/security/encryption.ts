import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from environment secret or fallback dev key
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.PROVIDER_CREDENTIALS_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: PROVIDER_CREDENTIALS_KEY é obrigatório em ambiente de produção para criptografia de credenciais.');
    }
    // Fixed development key (32 bytes) for local dev only
    return crypto.createHash('sha256').update('msplay_dev_credentials_key_secret_2026').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts sensitive provider credentials using AES-256-GCM
 */
export function encryptCredentials(plainText: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypts sensitive provider credentials using AES-256-GCM
 */
export function decryptCredentials(encryptedData: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Redacts sensitive URLs and query parameters for safe logging
 */
export function sanitizeLogUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) parsed.password = '••••••••';
    if (parsed.searchParams.has('password')) parsed.searchParams.set('password', '••••••••');
    if (parsed.searchParams.has('token')) parsed.searchParams.set('token', '••••••••');
    if (parsed.searchParams.has('k')) parsed.searchParams.set('k', '••••••••');
    return parsed.toString();
  } catch {
    return rawUrl.replace(/password=[^&]+/gi, 'password=••••••••').replace(/token=[^&]+/gi, 'token=••••••••');
  }
}
