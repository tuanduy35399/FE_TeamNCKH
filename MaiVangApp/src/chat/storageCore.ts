import { activeHistoryStorageKey } from '../storage/keys';

export type NonSecretStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export async function saveActiveHistoryIdWith(storage: NonSecretStorage, userId: unknown, historyId: number | null): Promise<boolean> {
  const key = activeHistoryStorageKey(userId);
  if (!key) return false;
  try {
    if (historyId === null) await storage.removeItem(key);
    else if (Number.isInteger(historyId) && historyId > 0) await storage.setItem(key, String(historyId));
    else return false;
    return true;
  } catch {
    return false;
  }
}

export async function loadActiveHistoryIdWith(storage: NonSecretStorage, userId: unknown): Promise<number | null> {
  const key = activeHistoryStorageKey(userId);
  if (!key) return null;
  try {
    const raw = await storage.getItem(key);
    const value = raw ? Number(raw) : NaN;
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
