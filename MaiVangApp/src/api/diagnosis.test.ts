import assert from 'node:assert/strict';
import test from 'node:test';
import { submitDiagnosis } from './diagnosis';
import { ApiError } from './errors';

test('production diagnosis does not invent an answer when capability is unavailable', async () => {
  await assert.rejects(() => submitDiagnosis({ text: 'Lá mai bị vàng?' }), (error: unknown) => error instanceof ApiError && error.kind === 'unavailable' && !/backend|endpoint|api|model|rag|yolo/i.test(error.userMessage));
});
