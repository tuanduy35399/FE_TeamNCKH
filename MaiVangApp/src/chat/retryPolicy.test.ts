import assert from 'node:assert/strict';
import test from 'node:test';
import { preserveFailedRequest, retryUsesHistory } from './retryPolicy';

test('diagnosis failure preserves the selected image and typed question', () => {
  const image = { uri: 'file:///original.heic', name: 'original.heic', uploadUri: 'file:///normalized.jpg', uploadName: 'normalized.jpg', uploadMimeType: 'image/jpeg' };
  const failed = preserveFailedRequest({ kind: 'image', question: 'Lá này bị gì?', image, message: 'Dịch vụ tạm gián đoạn.', status: 503 }, 73);
  assert.strictEqual(failed.image, image);
  assert.equal(failed.question, 'Lá này bị gì?');
});

test('image retry reuses the same active backend history ID', () => {
  const failed = preserveFailedRequest({ kind: 'image', question: '', image: { uri: 'file:///leaf.jpg', name: 'leaf.jpg' }, message: 'Thử lại.' }, 84);
  assert.equal(retryUsesHistory(failed), 84);
});
