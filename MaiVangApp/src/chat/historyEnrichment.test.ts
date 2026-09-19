import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '../types/domain';
import { safelyEnrichServerMessages } from './historyEnrichment';

const messages: ChatMessage[] = Array.from({ length: 11 }, (_, index) => ({
  id: index + 1,
  role: index % 2 ? 'assistant' : 'user',
  content: `server-message-${index + 1}`,
  createdAt: new Date(index * 1000).toISOString(),
}));

test('history 150 renders all 11 server messages when local enrichment throws', async () => {
  const failures: unknown[] = [];
  const result = await safelyEnrichServerMessages(messages, async () => {
    throw new Error('Local diagnosis metadata is unavailable.');
  }, error => failures.push(error));
  assert.strictEqual(result, messages);
  assert.equal(result.length, 11);
  assert.equal(failures.length, 1);
});

test('a true empty server history remains an intentional empty history', async () => {
  const result = await safelyEnrichServerMessages([], async () => { throw new Error('storage unavailable'); });
  assert.deepEqual(result, []);
});
