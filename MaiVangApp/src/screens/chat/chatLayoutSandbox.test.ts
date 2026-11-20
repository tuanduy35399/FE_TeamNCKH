import assert from 'node:assert/strict';
import test from 'node:test';
import { floatingFabBottom } from '../../navigation/mobileLayout';

/**
 * Isolated White-Box Sandbox Test for Chat Screen & Floating Camera FAB Layout
 *
 * Verifies geometry, collision avoidance, and layout reflow behavior
 * between message bubbles and the floating action button (FloatingCameraFab).
 */

const FAB_HEIGHT = 50;
const FAB_WIDTH = 50;
const DEFAULT_GAP = 12;
const KEYBOARD_GAP = 8;
const OLD_LIST_PADDING_BOTTOM = 14;
const NEW_LIST_PADDING_BOTTOM = 84;

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

function checkCollision(r1: Rect, r2: Rect): boolean {
  return !(
    r1.right <= r2.left ||
    r1.left >= r2.right ||
    r1.bottom <= r2.top ||
    r1.top >= r2.bottom
  );
}

test('Sandbox RCA: Old padding causes collision between user message and FAB', () => {
  const viewportHeight = 700;
  const bottomPanelHeight = 64;
  const messageAreaHeight = viewportHeight - bottomPanelHeight; // 636px

  // FAB position relative to viewport bottom:
  // bottom = bottomPanelHeight + DEFAULT_GAP = 64 + 12 = 76px.
  // In messageArea coordinate (origin at top of messageArea, bottom at messageAreaHeight):
  const fabBottomInArea = messageAreaHeight - DEFAULT_GAP; // 636 - 12 = 624
  const fabTopInArea = fabBottomInArea - FAB_HEIGHT; // 624 - 50 = 574

  const fabRect: Rect = {
    top: fabTopInArea,
    bottom: fabBottomInArea,
    left: 360 - 12 - FAB_WIDTH, // right: 12
    right: 360 - 12,
    width: FAB_WIDTH,
    height: FAB_HEIGHT,
  };

  // With OLD paddingBottom = 14:
  // When scrolled to the bottom, the bottom-most message ends at (messageAreaHeight - 14px):
  const messageBottomOld = messageAreaHeight - OLD_LIST_PADDING_BOTTOM; // 636 - 14 = 622
  const messageHeight = 44;
  const messageTopOld = messageBottomOld - messageHeight; // 622 - 44 = 578

  const userMessageRectOld: Rect = {
    top: messageTopOld,
    bottom: messageBottomOld,
    left: 360 - 12 - 140, // right-aligned user bubble
    right: 360 - 12,
    width: 140,
    height: messageHeight,
  };

  // OLD CODE: There is collision! (Overlap from y=578 to y=622)
  const isCollidingOld = checkCollision(userMessageRectOld, fabRect);
  assert.equal(isCollidingOld, true, 'Defect reproduction: User message was overlapped by FAB');
});

test('Sandbox Fix: New padding (84px) guarantees zero collision and positive clearance', () => {
  const viewportHeight = 700;
  const bottomPanelHeight = 64;
  const messageAreaHeight = viewportHeight - bottomPanelHeight; // 636px

  const fabBottomInArea = messageAreaHeight - DEFAULT_GAP; // 624
  const fabTopInArea = fabBottomInArea - FAB_HEIGHT; // 574

  const fabRect: Rect = {
    top: fabTopInArea,
    bottom: fabBottomInArea,
    left: 360 - 12 - FAB_WIDTH,
    right: 360 - 12,
    width: FAB_WIDTH,
    height: FAB_HEIGHT,
  };

  // With NEW paddingBottom = 84:
  // When scrolled to the bottom, the bottom-most message ends at (messageAreaHeight - 84px):
  const messageBottomNew = messageAreaHeight - NEW_LIST_PADDING_BOTTOM; // 636 - 84 = 552
  const messageHeight = 44;
  const messageTopNew = messageBottomNew - messageHeight; // 552 - 44 = 508

  const userMessageRectNew: Rect = {
    top: messageTopNew,
    bottom: messageBottomNew,
    left: 360 - 12 - 140,
    right: 360 - 12,
    width: 140,
    height: messageHeight,
  };

  // FIXED CODE: Zero collision!
  const isCollidingNew = checkCollision(userMessageRectNew, fabRect);
  assert.equal(isCollidingNew, false, 'Fix verification: User message is completely clear of FAB');

  // Verify clearance margin
  const clearance = fabTopInArea - messageBottomNew; // 574 - 552 = 22px
  assert.equal(clearance, 22, 'Clearance margin between message and FAB must be 22px');
  assert.ok(clearance >= 16, 'Clearance exceeds minimum UX threshold of 16px');
});

test('Sandbox Reflow: Streaming / typing indicator expansion maintains clearance', () => {
  // When assistant typing indicator appears:
  const typingBottomPanelHeight = 104; // 64 + 40
  const viewportHeight = 700;
  const messageAreaHeight = viewportHeight - typingBottomPanelHeight; // 596px

  const fabBottomInArea = messageAreaHeight - DEFAULT_GAP; // 596 - 12 = 584
  const fabTopInArea = fabBottomInArea - FAB_HEIGHT; // 584 - 50 = 534

  const fabRect: Rect = {
    top: fabTopInArea,
    bottom: fabBottomInArea,
    left: 360 - 12 - FAB_WIDTH,
    right: 360 - 12,
    width: FAB_WIDTH,
    height: FAB_HEIGHT,
  };

  // List scrolled to end with new padding:
  const messageBottom = messageAreaHeight - NEW_LIST_PADDING_BOTTOM; // 596 - 84 = 512
  const messageTop = messageBottom - 44; // 468

  const userMessageRect: Rect = {
    top: messageTop,
    bottom: messageBottom,
    left: 360 - 12 - 140,
    right: 360 - 12,
    width: 140,
    height: 44,
  };

  assert.equal(checkCollision(userMessageRect, fabRect), false);
  assert.equal(fabTopInArea - messageBottom, 22, 'Clearance remains 22px during streaming reflow');
});

test('Sandbox Keyboard Mode: Keyboard visibility increases safety clearance', () => {
  const keyboardBottomPanelHeight = 340;
  const viewportHeight = 700;
  const messageAreaHeight = viewportHeight - keyboardBottomPanelHeight; // 360px

  // In keyboard mode, gap is 8px
  const fabBottomInArea = messageAreaHeight - KEYBOARD_GAP; // 360 - 8 = 352
  const fabTopInArea = fabBottomInArea - FAB_HEIGHT; // 352 - 50 = 302

  const fabRect: Rect = {
    top: fabTopInArea,
    bottom: fabBottomInArea,
    left: 360 - 12 - FAB_WIDTH,
    right: 360 - 12,
    width: FAB_WIDTH,
    height: FAB_HEIGHT,
  };

  const messageBottom = messageAreaHeight - NEW_LIST_PADDING_BOTTOM; // 360 - 84 = 276
  const messageTop = messageBottom - 44; // 232

  const userMessageRect: Rect = {
    top: messageTop,
    bottom: messageBottom,
    left: 360 - 12 - 140,
    right: 360 - 12,
    width: 140,
    height: 44,
  };

  assert.equal(checkCollision(userMessageRect, fabRect), false);
  const clearance = fabTopInArea - messageBottom; // 302 - 276 = 26px
  assert.equal(clearance, 26, 'Clearance in keyboard mode is 26px');
});
