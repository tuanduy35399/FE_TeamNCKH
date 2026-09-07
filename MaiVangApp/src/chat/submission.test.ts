import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireSubmissionLock, captureSubmission, imageAfterRequest, releaseSubmissionLock } from './submission';

test('text submit clears the composer immediately while preserving the immutable request payload', async () => {
  const captured = captureSubmission('  chăm mai bị đốm lá  ', false, false, false);
  assert.equal(captured.nextComposerText, '');
  await Promise.resolve();
  assert.equal(captured.submittedText, 'chăm mai bị đốm lá');
});

test('image submit keeps its optional question until success or explicit removal', () => {
  const captured = captureSubmission('Lá này bị gì?', true, false, false);
  assert.equal(captured.nextComposerText, 'Lá này bị gì?');
});

test('double tap cannot acquire the submission lock twice', () => {
  const lock = { current: false };
  assert.equal(acquireSubmissionLock(lock), true);
  assert.equal(acquireSubmissionLock(lock), false);
  releaseSubmissionLock(lock);
  assert.equal(acquireSubmissionLock(lock), true);
});

test('failed image remains selected while successful image clears', () => {
  const image = { uri: 'file:///leaf.jpg' };
  assert.strictEqual(imageAfterRequest(image, 'failed'), image);
  assert.equal(imageAfterRequest(image, 'success'), undefined);
});
