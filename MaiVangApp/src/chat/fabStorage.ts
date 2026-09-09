import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SavedFabPosition } from './fabPosition';
const KEY = 'maicare-camera-fab-v1';
export async function loadFabPosition(): Promise<SavedFabPosition | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedFabPosition>;
    return (value.side === 'left' || value.side === 'right') && typeof value.normalizedY === 'number' ? value as SavedFabPosition : null;
  } catch { return null; }
}
export async function saveFabPosition(value: SavedFabPosition) {
  const raw = JSON.stringify(value);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}
