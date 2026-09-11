import assert from 'node:assert/strict';
import test from 'node:test';
import { bottomSafePadding, floatingFabBottom, tabBarHeight } from './mobileLayout';

test('bottom tab bar includes every representative Android safe-area inset', () => {
  for (const inset of [0, 16, 24, 32, 48]) {
    assert.ok(bottomSafePadding(inset) >= inset);
    assert.ok(tabBarHeight(inset) - bottomSafePadding(inset) >= 58);
  }
});

test('composer measurement and keyboard reflow move the floating camera capsule', () => {
  assert.equal(floatingFabBottom(64), 76);
  assert.equal(floatingFabBottom(128), 140);
  assert.ok(floatingFabBottom(128) > floatingFabBottom(64));
});
