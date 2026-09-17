export const AUTH_STORAGE_KEYS = {
  access: 'maicare.auth.access',
  refresh: 'maicare.auth.refresh',
  user: 'maicare.auth.user',
  legacySession: 'mai-vang-session-v1',
} as const;

export const TUTORIAL_STORAGE_KEY = '@maicare/tutorial/v3/completed';
export const LEGACY_TUTORIAL_STORAGE_KEY = 'maicare_tutorial_v3_completed';

export function safeUserId(value: unknown): string | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? String(value) : null;
}

export function activeHistoryStorageKey(userId: unknown): string | null {
  const safe = safeUserId(userId);
  return safe ? `@maicare/active-history/${safe}` : null;
}

export function diagnosisMetadataStorageKey(userId: unknown): string | null {
  const safe = safeUserId(userId);
  return safe ? `@maicare/diagnosis/${safe}` : null;
}
