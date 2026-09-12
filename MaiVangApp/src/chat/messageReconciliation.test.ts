import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMessage } from '../types/domain';
import { collapsePersistedRetryCopies } from './messageReconciliation';

const at = '2026-09-12T00:00:00Z';
const message = (id: number, role: 'user' | 'assistant', content: string): ChatMessage => ({ id, role, content, createdAt: at });

test('manual retry does not render duplicate persisted user turns', () => {
  const result = collapsePersistedRetryCopies([
    message(1, 'assistant', 'Earlier answer'),
    message(2, 'user', 'Lá này bị gì?'),
    message(3, 'user', 'Lá này bị gì?'),
    message(4, 'assistant', 'Kết quả thật'),
  ], 'Lá này bị gì?');
  assert.deepEqual(result.map(item => item.id), [1, 3, 4]);
});

test('ordinary repeated questions separated by an answer remain visible', () => {
  const source = [message(1, 'user', 'Bón phân?'), message(2, 'assistant', 'Lần một'), message(3, 'user', 'Bón phân?')];
  assert.deepEqual(collapsePersistedRetryCopies(source, 'Bón phân?'), source);
});
