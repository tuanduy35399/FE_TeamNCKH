import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_STORAGE_KEYS, activeHistoryStorageKey, diagnosisMetadataStorageKey } from '../storage/keys';
import { loadActiveHistoryIdWith, saveActiveHistoryIdWith, type NonSecretStorage } from './storageCore';

const secureStoreKeyPattern = /^[A-Za-z0-9._-]+$/;

test('all native SecureStore auth keys are fixed and valid', () => {
  for (const key of Object.values(AUTH_STORAGE_KEYS)) {
    assert.match(key, secureStoreKeyPattern);
    assert.ok(key.length > 0);
  }
});

test('non-secret storage keys require a stable positive server user ID', () => {
  assert.equal(activeHistoryStorageKey(72), '@maicare/active-history/72');
  assert.equal(diagnosisMetadataStorageKey(72), '@maicare/diagnosis/72');
  for (const value of [undefined, null, '', 0, -1, NaN]) {
    assert.equal(activeHistoryStorageKey(value), null);
    assert.equal(diagnosisMetadataStorageKey(value), null);
  }
});

test('active history persistence is optional and storage failures never reject', async () => {
  const failing: NonSecretStorage = {
    getItem: async () => { throw new Error('read failed'); },
    setItem: async () => { throw new Error('write failed'); },
    removeItem: async () => { throw new Error('remove failed'); },
  };
  assert.equal(await saveActiveHistoryIdWith(failing, 4, 150), false);
  assert.equal(await saveActiveHistoryIdWith(failing, 4, null), false);
  assert.equal(await loadActiveHistoryIdWith(failing, 4), null);
});

test('active history accepts only valid server IDs', async () => {
  const values = new Map<string, string>();
  const memory: NonSecretStorage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
  assert.equal(await saveActiveHistoryIdWith(memory, 4, 150), true);
  assert.equal(await loadActiveHistoryIdWith(memory, 4), 150);
  assert.equal(await saveActiveHistoryIdWith(memory, 4, 0), false);
  assert.equal(await saveActiveHistoryIdWith(memory, undefined, 150), false);
});
