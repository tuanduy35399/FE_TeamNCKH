import { getBuildApiBaseUrl } from './config';

export const BACKEND_CONFIG_STORAGE_KEY = '@maicare/backend-base-url/v1';
type BackendConfigStorage = { getItem(key: string): Promise<string | null> };

export async function loadBackendConfig(storage: BackendConfigStorage, baseUrl = getBuildApiBaseUrl()) {
  try {
    const previous = await storage.getItem(BACKEND_CONFIG_STORAGE_KEY);
    return { baseUrl, backendChanged: previous !== null && previous !== baseUrl };
  } catch {
    return { baseUrl, backendChanged: true };
  }
}

export function backendScopedStorageKeys(keys: readonly string[]): string[] {
  return keys.filter(key => key.startsWith('@maicare/active-history/') || key.startsWith('@maicare/diagnosis/'));
}
