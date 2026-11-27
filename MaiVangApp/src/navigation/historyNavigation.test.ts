import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('Chat header has no duplicate History action and uses a noninteractive spacer', () => {
  const source = read('src/screens/chat/ChatScreen.tsx');
  assert.equal(source.includes('accessibilityLabel="Mở lịch sử"'), false);
  assert.equal(source.includes('name="menu"'), false);
  assert.equal(source.includes('navigation.navigate("History")'), false);
  assert.match(source, /testID="header-alignment-spacer"[\s\S]*?accessibilityElementsHidden[\s\S]*?importantForAccessibility="no-hide-descendants"[\s\S]*?pointerEvents="none"/);
  assert.match(source, /headerSpacer:\s*\{\s*width:\s*44,\s*height:\s*44\s*\}/);
  assert.match(source, /accessibilityLabel="Cuộc trò chuyện mới"/);
});

test('bottom History navigation and its tutorial target remain visible', () => {
  const source = read('src/navigation/RootNavigator.tsx');
  assert.match(source, /Chat: 'Trò chuyện'/);
  assert.match(source, /History: 'Lịch sử'/);
  assert.match(source, /Account: 'Tài khoản'/);
  assert.match(source, /<Tabs\.Screen name="History" component=\{HistoryScreen\}/);
  assert.match(source, /tabBarButton:[^\n]+TutorialTabButton[^\n]+route.name === 'History' \? 'history'/);
  assert.match(source, /<PlatformPressable[^\n]+testID=/);
  assert.match(source, /tabBarHideOnKeyboard:\s*true/);
});
