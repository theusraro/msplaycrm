import { ContentProviderAdapter } from './types.js';
import { MockProviderAdapter } from './MockProviderAdapter.js';
import { AuthorizedXtreamAdapter } from './AuthorizedXtreamAdapter.js';
import { AuthorizedM3uAdapter } from './AuthorizedM3uAdapter.js';
import { SourceEntity } from '../database/types.js';
import { decryptCredentials } from '../security/encryption.js';

export interface SourceCredentialsPayload {
  username?: string;
  password?: string;
  encryptedAuth?: { encrypted: string; iv: string; tag: string };
  timeoutMs?: number;
}

export class AdapterFactory {
  static createAdapter(source: SourceEntity, credentials?: SourceCredentialsPayload): ContentProviderAdapter {
    let username = credentials?.username || '';
    let password = credentials?.password || '';

    // Decrypt if stored encrypted
    if (credentials?.encryptedAuth) {
      try {
        const decrypted = JSON.parse(decryptCredentials(credentials.encryptedAuth));
        username = decrypted.username || username;
        password = decrypted.password || password;
      } catch (err: any) {
        console.warn(`[AdapterFactory] Falha ao descriptografar credenciais da fonte ${source.id}: ${err.message}`);
      }
    }

    switch (source.type) {
      case 'xtream':
        return new AuthorizedXtreamAdapter(source.id, source.name, {
          baseUrl: source.endpoint,
          username,
          password,
          timeoutMs: credentials?.timeoutMs,
        });

      case 'm3u':
        return new AuthorizedM3uAdapter(source.id, source.name, {
          playlistUrl: source.endpoint,
          timeoutMs: credentials?.timeoutMs,
        });

      case 'mock_catalog':
      default:
        return new MockProviderAdapter(source.id, source.name);
    }
  }
}
