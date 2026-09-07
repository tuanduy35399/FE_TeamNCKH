import assert from 'node:assert/strict';
import test from 'node:test';
import { imageNormalizationPlan, JPEG_QUALITY, MAX_IMAGE_EDGE } from './imagePolicy';

test('keeps a normal JPG unchanged', () => {
  assert.deepEqual(imageNormalizationPlan({ uri: 'file://leaf.jpg', name: 'leaf.jpg', mimeType: 'image/jpeg', width: 1200, height: 900, size: 2_000_000 }), { normalize: false });
});

test('converts HEIC to JPEG without discarding the preview URI', () => {
  const plan = imageNormalizationPlan({ uri: 'file://leaf.heic', name: 'leaf.HEIC', mimeType: 'image/heic', width: 1600, height: 1200 });
  assert.equal(plan.normalize, true); assert.equal(plan.reason, 'heic'); assert.equal(plan.resize, undefined);
});

test('resizes only the long edge of a large mobile photo', () => {
  assert.deepEqual(imageNormalizationPlan({ uri: 'content://photo', name: 'photo.jpg', mimeType: 'image/jpeg', width: 4032, height: 3024, size: 12_000_000 }), { normalize: true, resize: { width: MAX_IMAGE_EDGE }, reason: 'large' });
  assert.ok(JPEG_QUALITY >= 0.8 && JPEG_QUALITY <= 0.9);
});

test('normalizes Android content URI once into an uploadable file URI', () => {
  const plan = imageNormalizationPlan({ uri: 'content://media/external/images/17', name: 'leaf.jpg', mimeType: 'image/jpeg', width: 1200, height: 900 });
  assert.equal(plan.normalize, true);
  assert.equal(plan.reason, 'content-uri');
});
