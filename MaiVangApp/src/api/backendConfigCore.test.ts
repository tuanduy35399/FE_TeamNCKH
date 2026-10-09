import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKEND_CONFIG_STORAGE_KEY, backendScopedStorageKeys, inferDevelopmentApiBaseUrl, loadBackendConfig, resetBackendConfig, saveBackendConfig } from './backendConfigCore';
import { getBuildApiBaseUrl, normalizeApiBaseUrl } from './config';

function memoryStorage(initial?: string, fail = false) { let value = initial ?? null; return {
  getItem: async () => { if (fail) throw new Error('read'); return value; },
  setItem: async (key: string, next: string) => { assert.equal(key, BACKEND_CONFIG_STORAGE_KEY); if (fail) throw new Error('write'); value = next; },
  removeItem: async () => { if (fail) throw new Error('remove'); value = null; }, value: () => value,
}; }
test('validates and canonicalizes a local Django base URL', () => {
  assert.equal(normalizeApiBaseUrl(' http://192.168.1.15:8000/// '), 'http://192.168.1.15:8000');
  assert.throws(() => normalizeApiBaseUrl('192.168.1.15:8000')); assert.throws(() => normalizeApiBaseUrl('ftp://192.168.1.15')); assert.throws(() => normalizeApiBaseUrl('http://user:secret@localhost:8000'));
});
test('saved override wins and reset returns to the optional build default', async () => {
  const storage = memoryStorage('http://10.0.0.8:8000/'); const loaded = await loadBackendConfig(storage);
  assert.equal(loaded.baseUrl, 'http://10.0.0.8:8000'); assert.equal(loaded.source, 'saved');
  assert.equal(await saveBackendConfig(storage, 'http://192.168.0.20:8000/'), 'http://192.168.0.20:8000'); assert.equal(storage.value(), 'http://192.168.0.20:8000'); assert.equal(await resetBackendConfig(storage), getBuildApiBaseUrl());
});
test('storage read failure is caught and produces setup-required state without a build default', async () => {
  const loaded = await loadBackendConfig(memoryStorage(undefined, true)); const build = getBuildApiBaseUrl(); assert.equal(loaded.baseUrl, build); assert.equal(loaded.source, build ? 'build' : 'missing'); assert.ok(loaded.storageWarning);
});
test('Expo development host inference is lower priority than a saved override', async () => {
  assert.equal(inferDevelopmentApiBaseUrl('http://10.5.6.124:8081/index.bundle'), 'http://10.5.6.124:8000');
  assert.equal(inferDevelopmentApiBaseUrl('http://127.0.0.1:8081/index.bundle'), null);
  const inferred = await loadBackendConfig(memoryStorage(), 'http://10.5.6.124:8000');
  const build = getBuildApiBaseUrl(); assert.equal(inferred.baseUrl, build || 'http://10.5.6.124:8000'); assert.equal(inferred.source, build ? 'build' : 'inferred');
  const saved = await loadBackendConfig(memoryStorage('https://deploy.example.test'), 'http://10.5.6.124:8000');
  assert.equal(saved.baseUrl, 'https://deploy.example.test'); assert.equal(saved.source, 'saved');
});
test('server switching removes only backend-bound non-secret state', () => {
  assert.deepEqual(backendScopedStorageKeys(['@maicare/active-history/7', '@maicare/diagnosis/7', '@maicare/tutorial/v3/completed', BACKEND_CONFIG_STORAGE_KEY]), ['@maicare/active-history/7', '@maicare/diagnosis/7']);
});
