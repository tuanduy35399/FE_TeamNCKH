import { expect, test, type Page } from '@playwright/test';

const account = { id: 41, username: 'composer-fixture', name: 'Kiểm tra giao diện', email: 'composer@example.test', is_staff: false };
const session = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh', account };

async function mockApi(page: Page) {
  const now = '2026-11-21T01:00:00Z';
  const history = { id: 51, title: 'Kiểm tra ô nhập', created_at: now, updated_at: now };
  const messages: { id: number; role: string; content: string; created_at: string }[] = [];
  await page.addInitScript(() => localStorage.setItem('@maicare/tutorial/v3/completed', 'true'));
  await page.route('**/api/v1/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/user/login/')) return route.fulfill({ json: { access: session.accessToken, refresh: session.refreshToken } });
    if (pathname.endsWith('/user/me/')) return route.fulfill({ json: account });
    if (pathname.endsWith('/history/')) return route.fulfill({ json: route.request().method() === 'POST' ? { ...history, messages } : [] });
    if (pathname.endsWith('/history/51/')) return route.fulfill({ json: { ...history, messages } });
    if (pathname.endsWith('/chat/stream/')) {
      messages.push({ id: 1, role: 'user', content: route.request().postDataJSON().question, created_at: now });
      messages.push({ id: 2, role: 'assistant', content: 'Đã nhận câu hỏi.', created_at: now });
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ type: 'complete', history_id: 51, answer: 'Đã nhận câu hỏi.' })}\n\n` });
    }
    return route.fulfill({ status: 404, json: { detail: 'Outside composer fixture' } });
  });
}

async function login(page: Page) {
  await page.getByTestId('login-username').fill(account.username);
  await page.getByTestId('login-password').fill('fixture-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('chat-screen')).toBeVisible();
}

test('composer grows for wrapping and newlines, shrinks after edits and send', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockApi(page);
  await page.goto('/');
  await login(page);
  const input = page.getByPlaceholder('Nhắn tin cho MaiCare...');
  const shell = page.getByTestId('tutorial-target-composer');
  const height = () => shell.evaluate(node => node.getBoundingClientRect().height);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await input.fill('');
    await expect.poll(height).toBe(44);
    await input.fill('Lá mai chuyển vàng từ mép lá, cây trồng trong chậu và gần đây có mưa nhiều. '.repeat(4));
    await expect.poll(height).toBeGreaterThan(44);
    await expect.poll(() => input.evaluate(node => node.clientHeight)).toBeLessThanOrEqual(132);
    await expect.poll(async () => {
      const camera = await page.getByTestId('diagnosis-toggle').boundingBox();
      const composer = await shell.boundingBox();
      return composer!.y - camera!.y - camera!.height;
    }).toBeGreaterThanOrEqual(8);
    const composer = await shell.boundingBox();
    const send = await page.getByTestId('chat-send').boundingBox();
    expect(Math.abs(send!.y + send!.height - composer!.y - composer!.height + 5)).toBeLessThanOrEqual(1);
    await input.fill('Dòng một');
    await input.press('End');
    await input.press('Enter');
    await input.pressSequentially('Dòng hai');
    await expect(input).toHaveValue('Dòng một\nDòng hai');
    await expect.poll(height).toBeGreaterThan(44);
    await expect.poll(() => input.evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`composer-${width}.png`), fullPage: true });
    await input.fill(Array.from({ length: 20 }, (_, index) => `Dòng ${index + 1}`).join('\n'));
    await expect.poll(() => input.evaluate(node => node.clientHeight)).toBe(132);
    expect(await input.evaluate(node => node.scrollHeight)).toBeGreaterThan(132);
    await input.fill('Một dòng');
    await expect.poll(height).toBe(44);
    expect(await page.locator('body').evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await input.fill('Câu hỏi dài\nCây mai bị vàng lá\nCần chăm sóc thế nào?');
  await page.getByTestId('chat-send').click();
  await expect(input).toHaveValue('');
  await expect(input).toBeEditable();
  await expect.poll(height).toBe(44);
  await expect(page.getByTestId('assistant-message')).toContainText('Đã nhận câu hỏi.');
  expect(errors).toEqual([]);
});

test('env replaces saved server, removes setup UI and preserves login on reload', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.addInitScript(({ session }) => {
    if (localStorage.getItem('config-fixture-seeded')) return;
    localStorage.setItem('config-fixture-seeded', 'true');
    localStorage.setItem('@maicare/backend-base-url/v1', 'https://obsolete-server.example.test');
    localStorage.setItem('mai-vang-session-v1', JSON.stringify(session));
    localStorage.setItem('@maicare/active-history/41', '99');
  }, { session });
  const requestedUrls: string[] = [];
  page.on('request', request => requestedUrls.push(request.url()));
  await page.goto('/');
  await expect(page.getByTestId('login-username')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mai-vang-session-v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('@maicare/active-history/41'))).toBeNull();
  await expect(page.getByTestId('backend-setup-screen')).toHaveCount(0);
  await login(page);
  await page.getByRole('tab', { name: /Tài khoản/ }).click();
  await expect(page.getByTestId('account-screen')).toBeVisible();
  await expect(page.getByTestId('backend-config-card')).toHaveCount(0);
  await expect(page.getByText('Địa chỉ Django', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('logout-button')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('account-without-server.png'), fullPage: true });
  await page.reload();
  await expect(page.getByTestId('chat-screen')).toBeVisible();
  expect(requestedUrls.some(url => url.includes('obsolete-server.example.test'))).toBe(false);
});
