import assert from 'node:assert/strict';
import test from 'node:test';
import { clampFab, normalizedFab, restoreFab, snapFab, type FabBounds } from './fabPosition';

const bounds: FabBounds = { minX: 12, maxX: 234, minY: 72, maxY: 510 };

test('drag position clamps on all four safe edges', () => {
  assert.deepEqual(clampFab(-40, -20, bounds), { x: 12, y: 72 });
  assert.deepEqual(clampFab(900, 900, bounds), { x: 234, y: 510 });
});

test('release snaps to the nearest left or right edge', () => {
  assert.deepEqual(snapFab(40, 200, bounds), { x: 12, y: 200, side: 'left' });
  assert.deepEqual(snapFab(220, 200, bounds), { x: 234, y: 200, side: 'right' });
});

test('normalized position restores across screen and inset changes', () => {
  const saved = normalizedFab('right', 291, bounds);
  assert.deepEqual(saved, { side: 'right', normalizedY: .5 });
  assert.deepEqual(restoreFab(saved, { minX: 20, maxX: 410, minY: 80, maxY: 680 }), { x: 410, y: 380, side: 'right' });
});

test('invalid or outdated saved positions safely reclamp', () => {
  assert.deepEqual(restoreFab({ side: 'left', normalizedY: -4 }, bounds), { x: 12, y: 72, side: 'left' });
  assert.deepEqual(restoreFab({ side: 'right', normalizedY: 9 }, bounds), { x: 234, y: 510, side: 'right' });
  assert.deepEqual(restoreFab(null, bounds), { x: 234, y: 510, side: 'right' });
});

test('safe bottom changes for inset, composer, and keyboard reflow the FAB', () => {
  for (const inset of [0, 16, 24, 34, 48]) {
    const dynamic = { ...bounds, maxY: 510 - inset };
    const point = restoreFab({ side: 'right', normalizedY: 1 }, dynamic);
    assert.equal(point.y, dynamic.maxY);
    assert.ok(point.y <= 510 - inset);
  }
  const keyboard = { ...bounds, maxY: 260 };
  assert.equal(restoreFab({ side: 'right', normalizedY: 1 }, keyboard).y, 260);
});
