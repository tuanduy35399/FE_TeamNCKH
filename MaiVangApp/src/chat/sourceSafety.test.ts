import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
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
    assert.doesNotMatch(source, /(?:floating|debug)(?:Settings|Gear|Fab)/i, file);
    for (const line of source.split(/\r?\n/).filter(value => /console\.(?:info|warn|log|error)/.test(value))) {
      assert.doesNotMatch(line, /authorization|accessToken|refreshToken|password/i, file);
    }
  }
});

test('release configuration defaults to the deployed Django API only', () => {
  const config = readFileSync(path.join(process.cwd(), 'src', 'api', 'config.ts'), 'utf8');
  assert.match(config, /https:\/\/chat-bot-maivang-backend\.onrender\.com/);
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
  assert.match(provider, /setCurrentHistoryId\(detail\.id\)[\s\S]*setMessages\(mergeLocalImageTurns/);
  assert.match(history, /const opened = await openHistory\(item\.id\)[\s\S]*if \(opened\) navigation\.navigate\('Chat'\)/);
  assert.doesNotMatch(chat, /route\.params|setMessages\(\[\]\).*focus/);
});

test('final diagnosis entry is one draggable camera speed dial with no fake bbox', () => {
  const chat = readFileSync(path.join(process.cwd(), 'src', 'screens', 'chat', 'ChatScreen.tsx'), 'utf8');
  const fab = readFileSync(path.join(process.cwd(), 'src', 'components', 'FloatingCameraFab.tsx'), 'utf8');
  const sourceSheet = readFileSync(path.join(process.cwd(), 'src', 'screens', 'diagnosis', 'ImageSourceSheet.tsx'), 'utf8');
  assert.match(fab, /PanResponder\.create/);
  assert.match(fab, /DRAG_THRESHOLD/);
  assert.match(fab, /camera-speed-dial/);
  assert.match(fab, /Mẹo chụp ảnh rõ/);
  assert.match(fab, /Chọn từ thư viện/);
  assert.match(fab, /Chụp ảnh/);
  assert.match(sourceSheet, /testID="camera-option"/);
  assert.match(sourceSheet, /testID="library-option"/);
  assert.doesNotMatch(chat + fab, /scan-outline/);
  assert.doesNotMatch(chat + fab, /bbox|xyxy|x1|y1|x2|y2/);
});
