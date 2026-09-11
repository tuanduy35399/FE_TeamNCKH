import assert from 'node:assert/strict';
import test from 'node:test';
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

test('diagnosis spotlight describes the final camera pill', () => {
  const step = tutorialSteps.find(value => value.target === 'diagnosis');
  assert.equal(step?.title, 'Chẩn đoán bằng ảnh');
  assert.equal(step?.text, 'Nhấn nút camera để chụp lá bệnh hoặc chọn ảnh từ thư viện.');
});
