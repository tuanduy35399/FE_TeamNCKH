import assert from 'node:assert/strict';
import test from 'node:test';
import { intersection, isCurrentMeasurement, placeTooltip, relativeTo, safeBounds, shadeRects, spotlight, validRect } from './tutorialGeometry';

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const bounds = box(0, 0, 390, 844);

test('centered spotlight pads the actual target', () => {
  assert.deepEqual(spotlight(box(80, 300, 200, 50), bounds), box(73, 293, 214, 64));
});

for (const [name, x, y] of [
  ['top', 120, 0], ['bottom', 120, 824], ['left', 0, 400], ['right', 370, 400],
  ['top left', 0, 0], ['top right', 370, 0], ['bottom left', 0, 824], ['bottom right', 370, 824],
] as const) {
  test(`spotlight and shade stay within the ${name} edge`, () => {
    const target = box(x, y, 20, 20);
    const focus = spotlight(target, bounds)!;
    assert.deepEqual(intersection(focus, target), target);
    assert.deepEqual(intersection(focus, bounds), focus);
    const shade = shadeRects(bounds, focus);
    assert.ok(shade.every(rect => rect.width >= 0 && rect.height >= 0 && !intersection(rect, focus)));
    assert.equal(shade.reduce((sum, rect) => sum + rect.width * rect.height, focus.width * focus.height), bounds.width * bounds.height);
  });
}

test('partial targets are clipped and fully off-screen targets are rejected', () => {
  assert.deepEqual(spotlight(box(-10, 838, 20, 20), bounds), box(0, 831, 17, 13));
  assert.equal(spotlight(box(-40, 400, 20, 20), bounds), null);
});

for (const rect of [box(0, 0, 0, 20), box(0, 0, 20, 0), box(0, 0, -1, 20), box(0, 0, 20, -1),
  box(NaN, 0, 20, 20), box(0, Infinity, 20, 20), box(0, 0, Infinity, 20), box(0, 0, 20, NaN)]) {
  test(`rejects invalid coordinates ${Object.values(rect).join(', ')}`, () => {
    assert.equal(validRect(rect), false);
    assert.equal(spotlight(rect, bounds), null);
    assert.equal(spotlight(bounds, rect), null);
  });
}

test('centered shell and nonzero overlay origin translate into local coordinates', () => {
  const origin = box(490, 20, 460, 750);
  assert.deepEqual(relativeTo(box(520, 140, 50, 45), origin), box(30, 120, 50, 45));
});

test('safe areas preserve asymmetric top, bottom and horizontal insets', () => {
  const safe = safeBounds(box(10, 20, 640, 360), { left: 45, right: 50, top: 36, bottom: 25 });
  assert.deepEqual(safe, box(55, 56, 545, 299));
  assert.deepEqual(spotlight(box(30, 40, 80, 30), safe), box(55, 56, 62, 21));
});

test('tooltip fits below or above using measured content height', () => {
  const focus = box(7, 610, 100, 40);
  assert.deepEqual(placeTooltip(bounds, focus, { width: 350, height: 100 }, 90), box(20, 662, 350, 100));
  assert.deepEqual(placeTooltip(bounds, focus, { width: 350, height: 210 }, 90), box(20, 388, 350, 210));
});

test('landscape uses compact non-overlapping placement for long content', () => {
  const landscape = box(0, 0, 460, 360);
  const focus = box(0, 130, 460, 60);
  const card = placeTooltip(landscape, focus, { width: 354, height: 500 }, 100);
  assert.deepEqual(card, box(53, 202, 354, 158));
  assert.equal(intersection(card, focus), null);
});

test('card uses side placement when the tablet has sufficient room', () => {
  const tablet = box(0, 0, 1024, 768);
  const focus = box(100, 40, 400, 640);
  assert.deepEqual(placeTooltip(tablet, focus, { width: 354, height: 300 }, 100), box(512, 40, 354, 300));
});

test('tiny viewport fallback is deterministic and keeps the card within bounds', () => {
  const small = box(4, 6, 90, 80);
  const focus = box(5, 17, 88, 60);
  const place = () => placeTooltip(small, focus, { width: 354, height: 700 }, 110);
  assert.deepEqual(place(), small);
  assert.deepEqual(place(), place());
});

test('resize recalculates available area from current measured bounds', () => {
  const focus = box(10, 140, 120, 50);
  const size = { width: 354, height: 200 };
  const resized = box(0, 0, 320, 360);
  assert.notDeepEqual(placeTooltip(bounds, focus, size, 90), placeTooltip(resized, focus, size, 90));
  assert.deepEqual(placeTooltip(resized, focus, size, 90), box(0, 202, 320, 158));
});

test('only the latest measurement generation can publish', () => {
  assert.equal(isCurrentMeasurement(4, 4), true);
  assert.equal(isCurrentMeasurement(4, 5), false);
  assert.equal(isCurrentMeasurement(5, 4), false);
});
