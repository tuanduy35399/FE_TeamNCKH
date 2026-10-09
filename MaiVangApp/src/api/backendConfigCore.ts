import { getBuildApiBaseUrl, normalizeApiBaseUrl } from './config';

export const BACKEND_CONFIG_STORAGE_KEY = '@maicare/backend-base-url/v1';
export type BackendConfigStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
export type LoadedBackendConfig = { baseUrl: string | null; buildDefault: string | null; source: 'saved' | 'build' | 'inferred' | 'missing'; storageWarning?: string };

export async function loadBackendConfig(storage: BackendConfigStorage, inferredDevelopmentUrl?: string | null): Promise<LoadedBackendConfig> {
  const buildDefault = getBuildApiBaseUrl();
  let inferred: string | null = null;
  if (inferredDevelopmentUrl) { try { inferred = normalizeApiBaseUrl(inferredDevelopmentUrl); } catch { inferred = null; } }
  try {
    const saved = await storage.getItem(BACKEND_CONFIG_STORAGE_KEY);
    if (saved) {
      try { return { baseUrl: normalizeApiBaseUrl(saved), buildDefault, source: 'saved' }; }
      catch { await storage.removeItem(BACKEND_CONFIG_STORAGE_KEY).catch(() => undefined); }
    }
    const baseUrl = buildDefault || inferred;
    return { baseUrl, buildDefault, source: buildDefault ? 'build' : inferred ? 'inferred' : 'missing' };
  } catch {
    const baseUrl = buildDefault || inferred;
    return { baseUrl, buildDefault, source: buildDefault ? 'build' : inferred ? 'inferred' : 'missing', storageWarning: 'Không thể đọc cấu hình đã lưu.' };
  }
}
export async function saveBackendConfig(storage: BackendConfigStorage, value: string): Promise<string> {
  const normalized = normalizeApiBaseUrl(value);
  await storage.setItem(BACKEND_CONFIG_STORAGE_KEY, normalized);
  return normalized;
}
export async function resetBackendConfig(storage: BackendConfigStorage): Promise<string | null> {
  await storage.removeItem(BACKEND_CONFIG_STORAGE_KEY);
  return getBuildApiBaseUrl();
}

export function inferDevelopmentApiBaseUrl(scriptUrl?: string | null): string | null {
  if (!scriptUrl) return null;
  try {
    const host = new URL(scriptUrl).hostname;
    if (!host || host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost' || host.startsWith('169.254.')) return null;
    return `http://${host}:8000`;
  } catch { return null; }
}
export function backendScopedStorageKeys(keys: readonly string[]): string[] {
  return keys.filter(key => key.startsWith('@maicare/active-history/') || key.startsWith('@maicare/diagnosis/'));
}
