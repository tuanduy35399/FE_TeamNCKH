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
  assert.doesNotMatch(config, /chat-service-nckh|\/chat\/image/);
});

test('history route opening cannot race session restore or use a list index', () => {
  const chat = readFileSync(path.join(process.cwd(), 'src', 'screens', 'chat', 'ChatScreen.tsx'), 'utf8');
  const routeBlock = chat.slice(chat.indexOf('const requested = route.params?.historyId'), chat.indexOf('}, [route.params?.historyId'));
  assert.match(routeBlock, /restored\.current = true; void openHistory\(requested\)/);
  assert.doesNotMatch(routeBlock, /navigation\.setParams/);
  assert.match(chat, /setHistoryId\(detail\.id\)/);
});
