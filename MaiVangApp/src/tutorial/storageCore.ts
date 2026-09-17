import { LEGACY_TUTORIAL_STORAGE_KEY, TUTORIAL_STORAGE_KEY } from '../storage/keys';
export { TUTORIAL_STORAGE_KEY } from '../storage/keys';
export type TutorialStorage = { getItem: (key: string) => Promise<string | null | undefined> | string | null | undefined; setItem: (key: string, value: string) => Promise<void> | void };
export async function isTutorialCompletedWith(storage: TutorialStorage): Promise<boolean> {
  try {
    const current = await storage.getItem(TUTORIAL_STORAGE_KEY);
    if (current === 'true') return true;
    const legacy = await storage.getItem(LEGACY_TUTORIAL_STORAGE_KEY);
    if (legacy === 'true') await storage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    return legacy === 'true';
  } catch { return false; }
}
export async function saveTutorialCompletedWith(storage: TutorialStorage): Promise<void> {
  try { await storage.setItem(TUTORIAL_STORAGE_KEY, 'true'); } catch { /* Tutorial persistence is optional. */ }
}
