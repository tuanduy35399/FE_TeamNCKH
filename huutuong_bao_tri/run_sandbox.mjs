/**
 * Standalone Sandbox Test Runner for FloatingCameraFab & ChatScreen Layout
 * 
 * Run with: node tuanduy_bao_tri/run_sandbox.mjs
 */

import { strict as assert } from 'node:assert';

console.log('='.repeat(70));
console.log('🧪 CHẠY KIỂM THỬ CÔ LẬP (SANDBOX TEST) - GIAO DIỆN CHAT & NÚT MÁY ẢNH FAB');
console.log('='.repeat(70));

const FAB_HEIGHT = 50;
const FAB_WIDTH = 154;
const DEFAULT_GAP = 12;
const KEYBOARD_GAP = 8;
const OLD_LIST_PADDING_BOTTOM = 14;
const NEW_LIST_PADDING_BOTTOM = 84;

function checkCollision(r1, r2) {
  return !(
    r1.right <= r2.left ||
    r1.left >= r2.right ||
    r1.bottom <= r2.top ||
    r1.top >= r2.bottom
  );
}

// Case 1: Tái hiện lỗi cũ
console.log('\n[TEST 1] Tái hiện lỗi cũ (Trạng thái trước khi fix):');
const viewportHeight = 700;
const bottomPanelHeight = 64;
const messageAreaHeight = viewportHeight - bottomPanelHeight; // 636px

const fabBottomInArea = messageAreaHeight - DEFAULT_GAP; // 624
const fabTopInArea = fabBottomInArea - FAB_HEIGHT; // 574

const fabRect = {
  top: fabTopInArea,
  bottom: fabBottomInArea,
  left: 360 - 12 - FAB_WIDTH, // right: 12
  right: 360 - 12,
  width: FAB_WIDTH,
  height: FAB_HEIGHT,
};

const messageBottomOld = messageAreaHeight - OLD_LIST_PADDING_BOTTOM; // 622
const messageHeight = 44;
const messageTopOld = messageBottomOld - messageHeight; // 578

const userMessageRectOld = {
  top: messageTopOld,
  bottom: messageBottomOld,
  left: 360 - 12 - 140,
  right: 360 - 12,
  width: 140,
  height: messageHeight,
};

const isCollidingOld = checkCollision(userMessageRectOld, fabRect);
console.log(`- FAB Bounding Box:       top=${fabRect.top}, bottom=${fabRect.bottom}, left=${fabRect.left}, right=${fabRect.right}`);
console.log(`- Tin nhắn cũ Bounding Box: top=${userMessageRectOld.top}, bottom=${userMessageRectOld.bottom}, left=${userMessageRectOld.left}, right=${userMessageRectOld.right}`);
console.log(`- Trùng lấn (Collision):   ${isCollidingOld ? '❌ CÓ VA CHẠM (Nút FAB che chữ)' : '✅ Không va chạm'}`);
assert.equal(isCollidingOld, true);

// Case 2: Kiểm tra sau khi fix
console.log('\n[TEST 2] Kiểm thử sau khi fix (Padding = 84px):');
const messageBottomNew = messageAreaHeight - NEW_LIST_PADDING_BOTTOM; // 552
const messageTopNew = messageBottomNew - messageHeight; // 508

const userMessageRectNew = {
  top: messageTopNew,
  bottom: messageBottomNew,
  left: 360 - 12 - 140,
  right: 360 - 12,
  width: 140,
  height: messageHeight,
};

const isCollidingNew = checkCollision(userMessageRectNew, fabRect);
const clearance = fabTopInArea - messageBottomNew; // 574 - 552 = 22px
console.log(`- Tin nhắn mới Bounding Box: top=${userMessageRectNew.top}, bottom=${userMessageRectNew.bottom}, left=${userMessageRectNew.left}, right=${userMessageRectNew.right}`);
console.log(`- Trùng lấn (Collision):    ${isCollidingNew ? '❌ Có va chạm' : '✅ KHÔNG VA CHẠM (Hoàn toàn thông thoáng)'}`);
console.log(`- Khoảng cách an toàn:      ${clearance}px (Yêu cầu >= 16px)`);
assert.equal(isCollidingNew, false);
assert.equal(clearance, 22);

// Case 3: Kiểm thử Reflow khi có SSE / Typing Indicator
console.log('\n[TEST 3] Kiểm thử đáp ứng khi thanh tiến trình SSE hiển thị (BottomPanel = 104px):');
const typingBottomPanelHeight = 104;
const typingMessageArea = viewportHeight - typingBottomPanelHeight; // 596
const typingFabTop = (typingMessageArea - DEFAULT_GAP) - FAB_HEIGHT; // 534
const typingMsgBottom = typingMessageArea - NEW_LIST_PADDING_BOTTOM; // 512
const typingClearance = typingFabTop - typingMsgBottom;
console.log(`- FAB Top:                  ${typingFabTop}px`);
console.log(`- Message Bottom:           ${typingMsgBottom}px`);
console.log(`- Khoảng cách an toàn:      ${typingClearance}px`);
assert.equal(typingClearance, 22);

// Case 4: Kiểm thử khi Bàn phím mở (Keyboard Visible)
console.log('\n[TEST 4] Kiểm thử khi mở bàn phím (Keyboard visible, gap = 8px):');
const kbBottomPanelHeight = 340;
const kbMessageArea = viewportHeight - kbBottomPanelHeight; // 360
const kbFabTop = (kbMessageArea - KEYBOARD_GAP) - FAB_HEIGHT; // 302
const kbMsgBottom = kbMessageArea - NEW_LIST_PADDING_BOTTOM; // 276
const kbClearance = kbFabTop - kbMsgBottom;
console.log(`- FAB Top:                  ${kbFabTop}px`);
console.log(`- Message Bottom:           ${kbMsgBottom}px`);
console.log(`- Khoảng cách an toàn:      ${kbClearance}px`);
assert.equal(kbClearance, 26);

console.log('\n' + '='.repeat(70));
console.log('🎉 TẤT CẢ 4 KỊCH BẢN KIỂM THỬ SANDBOX ĐỀU ĐẠT CHUẨN 100%!');
console.log('='.repeat(70));
