/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'papaparse';

declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    body: any;
    query: Record<string, string | string[]>;
  }
  export interface VercelResponse {
    status: (code: number) => VercelResponse;
    json: (body: any) => void;
    send: (body: any) => void;
  }
}

