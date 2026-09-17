import AsyncStorage from '@react-native-async-storage/async-storage';

import { isTutorialCompletedWith, saveTutorialCompletedWith, type TutorialStorage } from './storageCore';

const defaultStorage: TutorialStorage = AsyncStorage;

export async function isTutorialCompleted(storage: TutorialStorage = defaultStorage): Promise<boolean> {
  return isTutorialCompletedWith(storage);
}

export async function saveTutorialCompleted(storage: TutorialStorage = defaultStorage): Promise<void> {
  await saveTutorialCompletedWith(storage);
}
