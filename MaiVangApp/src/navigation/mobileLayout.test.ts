import assert from 'node:assert/strict';
import test from 'node:test';
import { bottomTabLayout, floatingFabBottom, TAB_BAR_ICON_HEIGHT, TAB_BAR_ITEM_PADDING, TAB_BAR_LABEL_GAP, TAB_BAR_OUTSIDE_GAP } from './mobileLayout';

test('the bar reserves each bottom inset exactly once without reducing its interactive height', () => {
  for (const inset of [0, 8, 16, 20, 24, 32, 34, 48, 60]) {
    const layout = bottomTabLayout(inset, 16);
    assert.equal(layout.bottomPadding, inset + TAB_BAR_OUTSIDE_GAP);
    assert.equal(layout.height - layout.contentHeight, layout.bottomPadding);
    assert.equal(layout.contentHeight, 64);
  }
});

test('measured font and wrapping heights grow the interactive area independently of insets', () => {
  for (const scale of [1, 1.15, 1.3, 1.5, 2]) {
    for (const lines of [1, 2, 3]) {
      const label = lines * 16 * scale;
      const needed = TAB_BAR_ICON_HEIGHT + 2 * TAB_BAR_ITEM_PADDING + TAB_BAR_LABEL_GAP + label;
      const actual = bottomTabLayout(34, label);
      assert.ok(actual.contentHeight >= needed);
      assert.ok(actual.contentHeight >= 48);
      assert.equal(actual.contentHeight, bottomTabLayout(0, label).contentHeight);
    }
  }
  assert.equal(bottomTabLayout(34, 16).contentHeight < bottomTabLayout(34, 64).contentHeight, true);
});

test('invalid inset and measurement inputs do not produce negative or nonfinite dimensions', () => {
  for (const value of [NaN, Infinity, -Infinity, -20]) {
    assert.deepEqual(bottomTabLayout(value, value), bottomTabLayout(0, 0));
  }
});

test('composer measurement and keyboard reflow move the floating camera capsule', () => {
  assert.equal(floatingFabBottom(64), 76);
  assert.equal(floatingFabBottom(128), 140);
  assert.ok(floatingFabBottom(128) > floatingFabBottom(64));
});
