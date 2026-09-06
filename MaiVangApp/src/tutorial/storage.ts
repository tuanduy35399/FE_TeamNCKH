import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const TUTORIAL_STORAGE_KEY = 'maicare_tutorial_v2_completed';

export async function isTutorialCompleted(): Promise<boolean> {
  try {
    const value = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(TUTORIAL_STORAGE_KEY)
      : await SecureStore.getItemAsync(TUTORIAL_STORAGE_KEY);
    return value === 'true';
  } catch { return false; }
}

export async function saveTutorialCompleted(): Promise<void> {
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(TUTORIAL_STORAGE_KEY, 'true');
  else await SecureStore.setItemAsync(TUTORIAL_STORAGE_KEY, 'true');
}
