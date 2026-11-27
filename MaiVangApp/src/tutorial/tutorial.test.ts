import assert from 'node:assert/strict';
import test from 'node:test';
import { LEGACY_TUTORIAL_STORAGE_KEY } from '../storage/keys';
import { TutorialTargetRegistry, tutorialSteps } from './model';
import { isTutorialCompletedWith as isTutorialCompleted, saveTutorialCompletedWith as saveTutorialCompleted, TUTORIAL_STORAGE_KEY, type TutorialStorage } from './storageCore';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>(); if (initial) values.set(TUTORIAL_STORAGE_KEY, initial);
  const storage: TutorialStorage = { getItem: key => values.get(key), setItem: (key, value) => { values.set(key, value); } };
  return { storage, values };
}

test('new user tour is incomplete, while Skip and Finish persist completion', async () => {
  const first = memoryStorage(); assert.equal(await isTutorialCompleted(first.storage), false);
  await saveTutorialCompleted(first.storage); assert.equal(first.values.get(TUTORIAL_STORAGE_KEY), 'true');
  assert.equal(await isTutorialCompleted(first.storage), true);
});

test('completed tutorial does not auto-open on the next entry', async () => {
  assert.equal(await isTutorialCompleted(memoryStorage('true').storage), true);
});

test('all seven spotlight targets are registered by name', () => {
  const registry = new TutorialTargetRegistry<object>(); const cleanups = tutorialSteps.map(step => registry.register(step.target, {}));
  assert.equal(tutorialSteps.length, 7); tutorialSteps.forEach(step => assert.equal(registry.has(step.target), true)); cleanups.forEach(cleanup => cleanup());
});

test('diagnosis spotlight describes the camera action', () => {
  const step = tutorialSteps.find(value => value.target === 'diagnosis');
  assert.equal(step?.title, 'Chẩn đoán bằng ảnh');
  assert.equal(step?.text, 'Nhấn nút camera để chụp lá bệnh hoặc chọn ảnh từ thư viện.');
});

test('unmounting one conversation target keeps other mounted targets registered', () => {
  const registry = new TutorialTargetRegistry<string>();
  const removeWelcome = registry.register('messageArea', 'welcome');
  const removeMessage = registry.register('messageArea', 'message');
  assert.deepEqual(registry.getAll('messageArea'), ['welcome', 'message']);
  removeWelcome();
  assert.deepEqual(registry.getAll('messageArea'), ['message']);
  removeMessage();
  assert.equal(registry.has('messageArea'), false);
});

test('a legacy completion remains valid when its migration cannot be written', async () => {
  const storage: TutorialStorage = {
    getItem: key => key === LEGACY_TUTORIAL_STORAGE_KEY ? 'true' : null,
    setItem: () => { throw new Error('Storage is read-only'); },
  };
  assert.equal(await isTutorialCompleted(storage), true);
});
