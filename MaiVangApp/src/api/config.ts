import { Platform } from 'react-native';

const nativeOrProductionBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://127.0.0.1:8000';
const webDevelopmentBase = process.env.EXPO_PUBLIC_WEB_API_BASE_URL?.trim() || 'http://127.0.0.1:8010';
export const API_BASE_URL = (Platform.OS === 'web' && __DEV__ ? webDevelopmentBase : nativeOrProductionBase).replace(/\/+$/, '');
export const API_TIMEOUT_MS = 15_000;
export const backendCapabilities = { diagnosis: false, history: false } as const;
export function resolveBackendUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${API_BASE_URL}/${value.replace(/^\/+/, '')}`;
}
