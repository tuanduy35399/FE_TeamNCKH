import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeLocalImageTurns } from './imageHistoryMerge';
import type { ChatMessage } from '../types/domain';

const messages: ChatMessage[] = [
  { id: 1, role: 'user', content: 'Ảnh A', createdAt: '1' },
  { id: 2, role: 'assistant', content: 'Kết quả A', createdAt: '2' },
  { id: 3, role: 'user', content: 'Theo dõi thêm?', createdAt: '3' },
  { id: 4, role: 'assistant', content: 'Câu trả lời tiếp theo', createdAt: '4' },
];

test('same-device image metadata enriches its exact turn without moving to a later follow-up', () => {
  const merged = mergeLocalImageTurns(messages, [{ conversationId: 9, userMessageId: 1, assistantMessageId: 2, imageUri: 'file:///leaf.jpg', detections: [{ label: 'rust', confidence: 0.8487 }] }]);
  assert.equal(merged.length, messages.length);
  assert.equal(merged[0]?.imageUri, 'file:///leaf.jpg');
  assert.deepEqual(merged[1]?.detections, [{ label: 'rust', confidence: 0.8487 }]);
  assert.equal(merged[2]?.imageUri, undefined);
  assert.equal(merged[3]?.detections, undefined);
});

test('missing local image metadata leaves authoritative server text untouched', () => {
  assert.deepEqual(mergeLocalImageTurns(messages, []), messages);
});

test('legacy metadata falls back to matching the original question, not the latest message', () => {
  const merged = mergeLocalImageTurns(messages, [{ conversationId: 9, description: 'Ảnh A', imageUri: 'file:///legacy.jpg', detections: [] }]);
  assert.equal(merged[0]?.imageUri, 'file:///legacy.jpg');
  assert.deepEqual(merged[1]?.detections, []);
  assert.equal(merged[2]?.imageUri, undefined);
});
