import crypto from 'node:crypto';

export interface HashResult {
  hash: string;
  salt: string;
  iterations: number;
  algorithm: string;
}

export const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha512';
export const PASSWORD_HASH_ITERATIONS = parseInt(process.env.PASSWORD_HASH_ITERATIONS || '250000', 10);
export const PASSWORD_KEY_LENGTH = 64;
export const PASSWORD_DIGEST = 'sha512';

/**
 * Generates a high-security password hash with PBKDF2/SHA-512 (250,000 calibrated iterations)
 */
export function hashPassword(
  password: string,
  existingSalt?: string,
  iterations: number = PASSWORD_HASH_ITERATIONS
): HashResult {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
  return {
    hash,
    salt,
    iterations,
    algorithm: PASSWORD_HASH_ALGORITHM,
  };
}

/**
 * Verifies password against stored hash with automatic detection of legacy iteration counts
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  storedIterations: number = PASSWORD_HASH_ITERATIONS
): { valid: boolean; needsRehash: boolean } {
  // First verify against the stored iterations
  const computed = crypto.pbkdf2Sync(password, storedSalt, storedIterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
  if (computed === storedHash) {
    return {
      valid: true,
      needsRehash: storedIterations < PASSWORD_HASH_ITERATIONS,
    };
  }

  // Fallback checks for legacy dev hashes (100k or 10k iterations)
  const legacyTiers = [100000, 10000];
  for (const tier of legacyTiers) {
    if (storedIterations !== tier) {
      const legacyComputed = crypto.pbkdf2Sync(password, storedSalt, tier, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
      if (legacyComputed === storedHash) {
        return { valid: true, needsRehash: true };
      }
    }
  }

  return { valid: false, needsRehash: false };
}

/**
 * Computes a fast SHA-256 hash of a session token for secure database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a cryptographically random secure token
 */
export function generateSecureToken(prefix = 'msplay_tok'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
}
