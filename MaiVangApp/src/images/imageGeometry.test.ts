import assert from 'node:assert/strict';
import test from 'node:test';
import { scaleContainedBoundingBox } from './imageGeometry';

test('scales real xyxy coordinates through contain letterboxing', () => {
  assert.deepEqual(scaleContainedBoundingBox([100, 200, 500, 1000], { width: 1000, height: 2000 }, { width: 200, height: 200 }), { left: 60, top: 20, width: 40, height: 80 });
});

test('rejects invalid geometry instead of drawing a fabricated box', () => {
  assert.equal(scaleContainedBoundingBox([10, 10, 5, 20], { width: 100, height: 100 }, { width: 200, height: 200 }), undefined);
});
