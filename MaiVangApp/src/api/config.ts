const authNativeBase = process.env.EXPO_PUBLIC_AUTH_API_BASE_URL?.trim() || 'https://chat-bot-maivang-backend.onrender.com';
const chatNativeBase = process.env.EXPO_PUBLIC_CHAT_API_BASE_URL?.trim() || 'https://chat-service-nckh.onrender.com';
const webBridgeBase = process.env.EXPO_PUBLIC_WEB_API_BASE_URL?.trim() || 'http://127.0.0.1:8010';
const isDevelopmentWeb = typeof document !== 'undefined' && __DEV__;
export const AUTH_API_BASE_URL = (isDevelopmentWeb ? webBridgeBase : authNativeBase).replace(/\/+$/, '');
export const CHAT_API_BASE_URL = (isDevelopmentWeb ? `${webBridgeBase}/ai` : chatNativeBase).replace(/\/+$/, '');
export const AUTH_TIMEOUT_MS = 45_000;
export const AI_TIMEOUT_MS = 150_000;
export const backendCapabilities = { diagnosis: true, history: true, conversationContext: true } as const;
export function resolveBackendUrl(value?: string | null, base = AUTH_API_BASE_URL): string | undefined {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${base}/${value.replace(/^\/+/, '')}`;
}
