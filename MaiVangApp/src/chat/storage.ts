import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadActiveHistoryIdWith, saveActiveHistoryIdWith } from './storageCore';

export async function saveActiveHistoryId(userId: number, historyId: number | null) {
  return saveActiveHistoryIdWith(AsyncStorage, userId, historyId);
}

export async function loadActiveHistoryId(userId: number): Promise<number | null> {
  return loadActiveHistoryIdWith(AsyncStorage, userId);
}
