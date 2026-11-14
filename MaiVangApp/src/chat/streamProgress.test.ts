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

test('displays backend progress messages including new LLM stages', () => {
  for (const stage of ['preparing', 'processing', 'retrieving', undefined]) {
    const display = progressForEvent({ type: 'progress', stage, message: '  Đang tìm tài liệu về lá mai...  ' });
    assert.equal(display?.message, 'Đang tìm tài liệu về lá mai...');
    assert.equal(display?.stage, stage === 'preparing' ? 'preparing' : 'processing');
  }
});

test('falls back for missing, blank and invalid messages and keeps the image label', () => {
  for (const message of [undefined, null, '', '  ', 42, { text: 'không hợp lệ' }]) {
    assert.equal(progressForEvent({ type: 'progress', stage: 'processing', message })?.message, 'MaiCare đang phân tích thông tin...');
    assert.equal(progressForEvent({ type: 'progress', stage: 'processing', message }, true)?.message, 'MaiCare đang phân tích hình ảnh...');
  }
});

test('does not turn an answer or error message into progress text', () => {
  assert.equal(progressForEvent({ type: 'complete', message: 'Đã xong', answer: 'Lá khỏe' }), undefined);
  assert.equal(progressForEvent({ type: 'error', message: 'Kết nối gián đoạn' }), undefined);
});
