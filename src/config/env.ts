/**
 * MSPLAY Environment & Feature Flags Configuration
 */

export interface AppConfigEnv {
  USE_REMOTE_BACKEND: boolean;
  API_BASE_URL: string;
  APP_VERSION: string;
}

const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return base.endsWith('/v1') ? base : `${base}/v1`;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return 'https://api.theussobral.shop/v1';
  }
  return 'http://localhost:3001/v1';
};

export const envConfig: AppConfigEnv = {
  // When false, MSPLAY operates 100% locally with mock data and repositories.
  // When true, connects to the local/remote backend server.
  USE_REMOTE_BACKEND: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_REMOTE_BACKEND === 'true') || false,
  API_BASE_URL: getApiBaseUrl(),
  APP_VERSION: '3.0.0',
};
