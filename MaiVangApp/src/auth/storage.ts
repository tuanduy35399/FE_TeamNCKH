import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Session } from '../types/domain';
import { AUTH_STORAGE_KEYS } from '../storage/keys';

const webKey = AUTH_STORAGE_KEYS.legacySession;

async function saveNativeSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.access, session.accessToken);
  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.refresh, session.refreshToken);
  if (session.account) await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.user, JSON.stringify(session.account));
  else await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.user);
}

export async function saveSession(session: Session): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(webKey, JSON.stringify(session));
    return;
  }
  await saveNativeSession(session);
}

export async function loadSession(): Promise<Session | null> {
  try {
    if (Platform.OS === 'web') {
      const value = globalThis.localStorage?.getItem(webKey);
      if (!value) return null;
      const parsed = JSON.parse(value) as Partial<Session>;
      return parsed.accessToken && parsed.refreshToken ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, account: parsed.account } : null;
    }
    let accessToken = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.access);
    let refreshToken = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.refresh);
    let accountValue = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.user);
    if (!accessToken || !refreshToken) {
      const legacyValue = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.legacySession);
      if (legacyValue) {
        const legacy = JSON.parse(legacyValue) as Partial<Session>;
        if (legacy.accessToken && legacy.refreshToken) {
          await saveNativeSession(legacy as Session);
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.legacySession);
          accessToken = legacy.accessToken;
          refreshToken = legacy.refreshToken;
          accountValue = legacy.account ? JSON.stringify(legacy.account) : null;
        }
      }
    }
    if (!accessToken || !refreshToken) return null;
    let account: Session['account'];
    try { account = accountValue ? JSON.parse(accountValue) : undefined; } catch { account = undefined; }
    return { accessToken, refreshToken, account };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    try { globalThis.localStorage?.removeItem(webKey); } catch { /* Best-effort local logout. */ }
    return;
  }
  await Promise.allSettled([
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.access),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.refresh),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.user),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.legacySession),
  ]);
}
