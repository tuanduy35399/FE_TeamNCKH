export const TUTORIAL_STORAGE_KEY = 'maicare_tutorial_v3_completed';
export type TutorialStorage = { getItem: (key: string) => Promise<string | null | undefined> | string | null | undefined; setItem: (key: string, value: string) => Promise<void> | void };
export async function isTutorialCompletedWith(storage: TutorialStorage): Promise<boolean> { try { return await storage.getItem(TUTORIAL_STORAGE_KEY) === 'true'; } catch { return false; } }
export async function saveTutorialCompletedWith(storage: TutorialStorage): Promise<void> { await storage.setItem(TUTORIAL_STORAGE_KEY, 'true'); }
