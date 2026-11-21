import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKEND_CONFIG_STORAGE_KEY, backendScopedStorageKeys, loadBackendConfig } from './backendConfigCore';
import { getBuildApiBaseUrl, normalizeApiBaseUrl } from './config';

function memoryStorage(previous: string | null = null) {
  return { getItem: async (key: string) => { assert.equal(key, BACKEND_CONFIG_STORAGE_KEY); return previous; } };
}
test('validates and canonicalizes a Django base URL', () => {
  assert.equal(normalizeApiBaseUrl(' http://192.168.1.15:8000/// '), 'http://192.168.1.15:8000');
  assert.throws(() => normalizeApiBaseUrl('192.168.1.15:8000'));
  assert.throws(() => normalizeApiBaseUrl('ftp://192.168.1.15'));
  assert.throws(() => normalizeApiBaseUrl('http://user:secret@localhost:8000'));
});
test('env is the only backend source and a saved override triggers session cleanup', async () => {
  const baseUrl = 'https://env.example.test';
  assert.deepEqual(await loadBackendConfig(memoryStorage('http://old.test'), baseUrl), { baseUrl, backendChanged: true });
  assert.deepEqual(await loadBackendConfig(memoryStorage(baseUrl), baseUrl), { baseUrl, backendChanged: false });
  assert.deepEqual(await loadBackendConfig(memoryStorage(), baseUrl), { baseUrl, backendChanged: false });
  assert.equal((await loadBackendConfig(memoryStorage('http://old.test'))).baseUrl, getBuildApiBaseUrl());
});
test('missing env never falls back to a saved override', async () => {
  assert.deepEqual(await loadBackendConfig(memoryStorage('http://old.test'), null), { baseUrl: null, backendChanged: true });
});
test('storage failure retains the env and requests session cleanup', async () => {
  const storage = { getItem: async () => { throw new Error('read'); } };
  assert.deepEqual(await loadBackendConfig(storage, 'http://env.test'), { baseUrl: 'http://env.test', backendChanged: true });
});
test('changing the backend clears history but preserves tutorial preferences', () => {
  assert.deepEqual(backendScopedStorageKeys(['@maicare/active-history/7', '@maicare/diagnosis/7', '@maicare/tutorial/v3/completed', BACKEND_CONFIG_STORAGE_KEY]), ['@maicare/active-history/7', '@maicare/diagnosis/7']);
});
