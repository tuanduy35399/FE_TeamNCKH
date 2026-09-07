import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'maicare-active-history-v1';
const keyFor = (userId: number) => `${KEY_PREFIX}:${userId}`;

export async function saveActiveHistoryId(userId: number, historyId: number | null) {
  const key = keyFor(userId);
  if (Platform.OS === 'web') {
    if (historyId === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, String(historyId));
    return;
  }
  if (historyId === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, String(historyId));
}

export async function loadActiveHistoryId(userId: number): Promise<number | null> {
  try {
    const key = keyFor(userId);
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key);
    const value = raw ? Number(raw) : NaN;
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
