import assert from 'node:assert/strict';
import test from 'node:test';
import { progressForEvent } from './streamProgress';

test('maps SSE preparing and processing events to user-facing progress assets', () => {
  assert.deepEqual(progressForEvent({ type: 'progress', stage: 'preparing' }), {
    stage: 'preparing',
    message: 'Đang chuẩn bị câu hỏi...',
    icon: 'preparing',
  });
  assert.deepEqual(progressForEvent({ type: 'progress', stage: 'processing' }), {
    stage: 'processing',
    message: 'MaiCare đang phân tích thông tin...',
    icon: 'processing',
  });
});

test('ignores heartbeat-like and unknown events for the progress UI', () => {
  assert.equal(progressForEvent({ type: 'complete', answer: 'Đã xong' }), undefined);
  assert.equal(progressForEvent({ type: 'progress', stage: 'unknown' }), undefined);
});
