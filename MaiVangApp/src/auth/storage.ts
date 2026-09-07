import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Session } from '../types/domain';
const KEY = 'mai-vang-session-v1';
export async function saveSession(session: Session): Promise<void> {
  const value = JSON.stringify(session);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, value); else await SecureStore.setItemAsync(KEY, value);
}
export async function loadSession(): Promise<Session | null> {
  try {
    const value = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Session>;
    return parsed.accessToken && parsed.refreshToken ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, account: parsed.account } : null;
  } catch { await clearSession(); return null; }
}
export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY); else await SecureStore.deleteItemAsync(KEY);
}
