import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function productionSources(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) return productionSources(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

test('production UI has no hardcoded history ID or fake diagnosis confidence', () => {
  const files = productionSources(path.join(process.cwd(), 'src'));
  const source = files.map(file => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /history(?:Id|_id)\s*[:=]\s*1\b/i);
  assert.doesNotMatch(source, /(?:96|98)%\s*(?:chính xác)?/i);
});

test('legacy floating gear is absent and debug logging cannot include auth secrets', () => {
  const files = productionSources(path.join(process.cwd(), 'src'));
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /name=["'](?:settings|settings-outline|cog|gear)["']/i, file);
    assert.doesNotMatch(source, /(?:floating|debug)(?:Settings|Gear)/i, file);
    for (const line of source.split(/\r?\n/).filter(value => /console\.(?:info|warn|log|error)/.test(value))) {
      assert.doesNotMatch(line, /authorization|accessToken|refreshToken|password/i, file);
    }
  }
});

test('release configuration defaults to the deployed Django API only', () => {
  const config = readFileSync(path.join(process.cwd(), 'src', 'api', 'config.ts'), 'utf8');
  const eas = readFileSync(path.join(process.cwd(), 'eas.json'), 'utf8');
  const bridge = readFileSync(path.join(process.cwd(), 'scripts', 'api-bridge.cjs'), 'utf8');
  const deployedWeb = readFileSync(path.join(process.cwd(), 'scripts', 'start-deployed-web.ps1'), 'utf8');
  const releaseSources = [config, eas, bridge, deployedWeb].join('\n');
  assert.match(config, /https:\/\/chat-bot-maivang-backend\.onrender\.com/);
  assert.match(eas, /EXPO_PUBLIC_API_BASE_URL[\s\S]*chat-bot-maivang-backend\.onrender\.com/);
  assert.doesNotMatch(releaseSources, /asia-southeast1\.run\.app|chat-service-nckh\.onrender\.com/);
  const timeout = Number(config.match(/IMAGE_TIMEOUT_MS\s*=\s*([\d_]+)/)?.[1]?.replaceAll('_', ''));
  assert.ok(timeout >= 120_000 && timeout <= 180_000);
  assert.doesNotMatch(config, /chat-service-nckh|\/chat\/image/);
});

test('one shared session store atomically loads history before navigation and guards stale responses', () => {
  const provider = readFileSync(path.join(process.cwd(), 'src', 'chat', 'ChatSessionProvider.tsx'), 'utf8');
  const history = readFileSync(path.join(process.cwd(), 'src', 'screens', 'history', 'HistoryScreen.tsx'), 'utf8');
  const chat = readFileSync(path.join(process.cwd(), 'src', 'screens', 'chat', 'ChatScreen.tsx'), 'utf8');
  assert.match(provider, /detail\.id !== id/);
  assert.match(provider, /!isCurrentGeneration\(token\)/);
  assert.match(provider, /setCurrentHistoryId\(id\)[\s\S]*setMessages\(\[\]\)[\s\S]*getHistoryDetail\(id\)/);
  assert.match(provider, /setMessages\(serverMessages\)[\s\S]*safelyEnrichServerMessages/);
  assert.match(history, /const opened = await openHistory\(item\.id\)[\s\S]*if \(opened\) navigation\.navigate\('Chat'\)/);
  assert.doesNotMatch(chat, /route\.params|setMessages\(\[\]\).*focus/);
  assert.match(chat, /conversationRevision[\s\S]*releaseSubmissionLock\(sendLocked\)/);
});

test('final diagnosis entry is one adaptive camera speed dial with only API-backed bbox geometry', () => {
  const chat = readFileSync(path.join(process.cwd(), 'src', 'screens', 'chat', 'ChatScreen.tsx'), 'utf8');
  const fab = readFileSync(path.join(process.cwd(), 'src', 'components', 'FloatingCameraFab.tsx'), 'utf8');
  const sourceSheetPath = path.join(process.cwd(), 'src', 'screens', 'diagnosis', 'ImageSourceSheet.tsx');
  assert.match(fab, /floatingFabBottom/);
  assert.match(fab, /bottomReserved/);
  assert.match(fab, /Animated\.spring/);
  assert.match(fab, /actions: \{[^}]*bottom: HEIGHT \+ 9/);
  assert.match(fab, /Keyboard\.dismiss/);
  assert.match(fab, /camera-speed-dial/);
  assert.match(fab, /Mẹo chụp ảnh rõ/);
  assert.match(fab, /Chọn từ thư viện/);
  assert.match(fab, /Chụp ảnh/);
  assert.match(fab, /BackHandler\.addEventListener\('hardwareBackPress'/);
  assert.equal(existsSync(sourceSheetPath), false);
  assert.doesNotMatch(chat, /ImageSourceSheet|sheetOpen|diagnosisMode|testID="add-image"/);
  assert.doesNotMatch(chat + fab, /scan-outline/);
  assert.match(chat, /bbox_xyxy/);
  assert.match(chat, /scaleContainedBoundingBox/);
  assert.doesNotMatch(chat, /bbox:\s*\[[\d\s,.]+\]/);
});

test('SecureStore is restricted to fixed auth keys and history uses AsyncStorage', () => {
  const auth = readFileSync(path.join(process.cwd(), 'src', 'auth', 'storage.ts'), 'utf8');
  const chat = readFileSync(path.join(process.cwd(), 'src', 'chat', 'storage.ts'), 'utf8');
  const tutorial = readFileSync(path.join(process.cwd(), 'src', 'tutorial', 'storage.ts'), 'utf8');
  const history = readFileSync(path.join(process.cwd(), 'src', 'history', 'imageHistory.ts'), 'utf8');
  assert.match(auth, /AUTH_STORAGE_KEYS\.(?:access|refresh|user|legacySession)/);
  assert.doesNotMatch(auth, /SecureStore\.(?:setItemAsync|getItemAsync|deleteItemAsync)\(`|SecureStore\.(?:setItemAsync|getItemAsync|deleteItemAsync)\([^A]/);
  assert.match(chat, /@react-native-async-storage\/async-storage/);
  assert.match(tutorial, /@react-native-async-storage\/async-storage/);
  assert.doesNotMatch(chat + tutorial + history, /expo-secure-store|SecureStore/);
});

test('failed image state has one coherent action panel and suppresses duplicate staging actions', () => {
  const chat = readFileSync(path.join(process.cwd(), 'src', 'screens', 'chat', 'ChatScreen.tsx'), 'utf8');
  assert.match(chat, /failed\?\.kind !== "image"[\s\S]*testID="selected-image"/);
  assert.match(chat, /testID="failed-image-panel"/);
  assert.match(chat, /shouldCooldownImageRetry/);
});
