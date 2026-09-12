export const PRODUCTION_API_BASE_URL = 'https://maivang-api-775925161402.asia-southeast1.run.app';
const nativeBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || PRODUCTION_API_BASE_URL;
const webBridgeBase = process.env.EXPO_PUBLIC_WEB_API_BASE_URL?.trim() || nativeBase;
const isDevelopmentWeb = typeof document !== 'undefined' && __DEV__;
export const API_BASE_URL = (isDevelopmentWeb ? webBridgeBase : nativeBase).replace(/\/+$/, '');
export const AUTH_TIMEOUT_MS = 45_000;
export const AI_TIMEOUT_MS = 90_000;
export const IMAGE_TIMEOUT_MS = 180_000;
export const backendCapabilities = { diagnosis: true, history: true, conversationContext: true } as const;
export function resolveBackendUrl(value?: string | null, base = API_BASE_URL): string | undefined {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${base}/${value.replace(/^\/+/, '')}`;
}
