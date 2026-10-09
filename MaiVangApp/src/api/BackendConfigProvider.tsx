import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { NativeModules } from 'react-native';
import { backendScopedStorageKeys, inferDevelopmentApiBaseUrl, loadBackendConfig, resetBackendConfig, saveBackendConfig, type LoadedBackendConfig } from './backendConfigCore';
import { normalizeApiBaseUrl, setRuntimeApiBaseUrl } from './config';
import { invalidateApiRequests } from './client';

type BackendConfigContextValue = LoadedBackendConfig & { ready: boolean; save(value: string): Promise<string>; reset(): Promise<string | null>; test(value: string): Promise<void> };
const BackendConfigContext = createContext<BackendConfigContextValue | null>(null);

export function BackendConfigProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<LoadedBackendConfig>({ baseUrl: null, buildDefault: null, source: 'missing' });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const scriptUrl = typeof __DEV__ !== 'undefined' && __DEV__ ? (NativeModules.SourceCode as { scriptURL?: string } | undefined)?.scriptURL : undefined;
    void loadBackendConfig(AsyncStorage, inferDevelopmentApiBaseUrl(scriptUrl)).then(next => { setRuntimeApiBaseUrl(next.baseUrl); setState(next); setReady(true); });
  }, []);
  async function clearBackendBoundState() {
    const keys = await AsyncStorage.getAllKeys().catch(() => []);
    const scoped = backendScopedStorageKeys(keys);
    if (scoped.length) await AsyncStorage.multiRemove(scoped).catch(() => undefined);
  }
  const value = useMemo<BackendConfigContextValue>(() => ({
    ...state, ready,
    save: async input => {
      const normalized = await saveBackendConfig(AsyncStorage, input);
      if (state.baseUrl && state.baseUrl !== normalized) { invalidateApiRequests(); await clearBackendBoundState(); }
      setRuntimeApiBaseUrl(normalized);
      setState(current => ({ ...current, baseUrl: normalized, source: 'saved', storageWarning: undefined }));
      return normalized;
    },
    reset: async () => {
      const fallback = await resetBackendConfig(AsyncStorage);
      if (state.baseUrl !== fallback) { invalidateApiRequests(); await clearBackendBoundState(); }
      setRuntimeApiBaseUrl(fallback);
      setState(current => ({ ...current, baseUrl: fallback, source: fallback ? 'build' : 'missing', storageWarning: undefined }));
      return fallback;
    },
    test: async input => {
      const base = normalizeApiBaseUrl(input);
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(`${base}/api/v1/schema/`, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) throw new Error(`Máy chủ phản hồi HTTP ${response.status}.`);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new Error('Máy chủ phản hồi quá lâu.');
        throw error instanceof Error ? error : new Error('Không thể kết nối máy chủ.');
      } finally { clearTimeout(timer); }
    },
  }), [ready, state]);
  return <BackendConfigContext.Provider value={value}>{children}</BackendConfigContext.Provider>;
}
export function useBackendConfig() { const value = useContext(BackendConfigContext); if (!value) throw new Error('useBackendConfig must be used inside BackendConfigProvider'); return value; }
