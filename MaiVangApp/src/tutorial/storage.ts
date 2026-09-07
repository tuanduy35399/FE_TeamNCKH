import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { isTutorialCompletedWith, saveTutorialCompletedWith, type TutorialStorage } from './storageCore';

const defaultStorage: TutorialStorage = {
  getItem: key => Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key, value) => Platform.OS === 'web' ? globalThis.localStorage?.setItem(key, value) : SecureStore.setItemAsync(key, value),
};

export async function isTutorialCompleted(storage: TutorialStorage = defaultStorage): Promise<boolean> {
  return isTutorialCompletedWith(storage);
}

export async function saveTutorialCompleted(storage: TutorialStorage = defaultStorage): Promise<void> {
  await saveTutorialCompletedWith(storage);
}
