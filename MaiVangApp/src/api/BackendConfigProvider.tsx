import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { BACKEND_CONFIG_STORAGE_KEY, backendScopedStorageKeys, loadBackendConfig } from './backendConfigCore';
import { setRuntimeApiBaseUrl } from './config';
import { clearSession } from '../auth/storage';

type BackendConfigContextValue = { ready: boolean; baseUrl: string | null };
const BackendConfigContext = createContext<BackendConfigContextValue | null>(null);

export function BackendConfigProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<BackendConfigContextValue>({ ready: false, baseUrl: null });
  useEffect(() => {
    void (async () => {
      const { baseUrl, backendChanged } = await loadBackendConfig(AsyncStorage);
      if (backendChanged) {
        // An env change must not send the old server's session to the new server.
        await clearSession();
        const keys = await AsyncStorage.getAllKeys().catch(() => []);
        const scoped = backendScopedStorageKeys(keys);
        if (scoped.length) await AsyncStorage.multiRemove(scoped).catch(() => undefined);
      }
      // Remember the server identity only; this value never overrides the env.
      if (baseUrl) await AsyncStorage.setItem(BACKEND_CONFIG_STORAGE_KEY, baseUrl).catch(() => undefined);
      else await AsyncStorage.removeItem(BACKEND_CONFIG_STORAGE_KEY).catch(() => undefined);
      setRuntimeApiBaseUrl(baseUrl);
      setState({ ready: true, baseUrl });
    })();
  }, []);
  return <BackendConfigContext.Provider value={state}>{children}</BackendConfigContext.Provider>;
}
export function useBackendConfig() { const value = useContext(BackendConfigContext); if (!value) throw new Error('useBackendConfig must be used inside BackendConfigProvider'); return value; }
