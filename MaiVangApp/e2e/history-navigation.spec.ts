import { expect, test } from '@playwright/test';

const now = '2026-11-19T08:00:00Z';
const longTitle = 'Cuộc trò chuyện kiểm tra tiêu đề lịch sử rất dài trên màn hình nhỏ';

test('History remains a single visible bottom-tab path and conversations reopen safely', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('@maicare/tutorial/v3/completed', 'true'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/user/login/') && request.method() === 'POST') {
      return route.fulfill({ json: { access: 'navigation-access', refresh: 'navigation-refresh' } });
    }
    if (pathname.endsWith('/user/me/') && request.method() === 'GET') {
      return route.fulfill({ json: { id: 41, username: 'navigation-fixture', name: 'Navigation Fixture', email: 'navigation@example.test', is_staff: false, date_joined: now } });
    }
    if (pathname.endsWith('/history/51/') && request.method() === 'GET') {
      return route.fulfill({ json: {
        id: 51, title: longTitle, created_at: now, updated_at: now,
        messages: [
          { id: 501, role: 'user', content: 'Nội dung đúng của cuộc trò chuyện 51', created_at: now },
          { id: 502, role: 'assistant', content: 'Phản hồi đã lưu của MaiCare', created_at: now },
        ],
      } });
    }
    if (pathname.endsWith('/history/') && request.method() === 'GET') {
      return route.fulfill({ json: [{ id: 51, title: longTitle, created_at: now, updated_at: now }] });
    }
    return route.fulfill({ status: 404, json: { detail: 'Not part of the navigation fixture' } });
  });

  await page.goto('/');
  await page.getByTestId('login-username').fill('navigation-fixture');
  await page.getByTestId('login-password').fill('fixture-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('chat-screen')).toBeVisible();

  await expect(page.getByLabel('Mở lịch sử')).toHaveCount(0);
  await expect(page.locator('[data-testid="header-alignment-spacer"]')).toBeVisible();
  const spacerState = await page.locator('[data-testid="header-alignment-spacer"]').evaluate(element => ({
    tabIndex: (element as HTMLElement).tabIndex,
    role: element.getAttribute('role'),
    pointerEvents: getComputedStyle(element).pointerEvents,
  }));
  expect(spacerState).toEqual({ tabIndex: -1, role: null, pointerEvents: 'none' });
  await expect(page.getByLabel('Cuộc trò chuyện mới')).toBeVisible();

  for (const viewport of [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    expect(await page.locator('body').evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    for (const label of ['Trò chuyện', 'Lịch sử', 'Tài khoản']) {
      const tab = page.getByRole('tab', { name: new RegExp(label) });
      await expect(tab).toBeVisible();
      expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const brand = await page.getByText('MaiCare AI', { exact: true }).boundingBox();
    expect(Math.abs((brand!.x + brand!.width / 2) - viewport.width / 2)).toBeLessThanOrEqual(2);
    const composer = await page.getByPlaceholder('Nhắn tin cho MaiCare...').boundingBox();
    const tabs = await page.getByRole('tab', { name: /Lịch sử/ }).boundingBox();
    expect(composer!.y + composer!.height).toBeLessThanOrEqual(tabs!.y);
    await page.screenshot({ path: testInfo.outputPath(`chat-${viewport.width}x${viewport.height}.png`), fullPage: true });
  }

  const historyTab = page.getByRole('tab', { name: /Lịch sử/ });
  await historyTab.click();
  await expect(historyTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('history-screen')).toBeVisible();
  await expect(page.getByText(longTitle, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('history-active.png'), fullPage: true });

  await page.getByLabel(`Tùy chọn cuộc trò chuyện ${longTitle}`).click();
  await expect(page.getByTestId('history-management-modal')).toBeVisible();
  await page.getByTestId('history-management-modal').getByRole('button', { name: 'Hủy' }).click();
  await expect(page.getByTestId('history-management-modal')).toHaveCount(0);
  await expect(page.getByText(longTitle, { exact: true })).toBeVisible();

  await page.getByRole('button').filter({ hasText: longTitle }).first().click();
  const chatScreen = page.getByTestId('chat-screen');
  await expect(chatScreen).toBeVisible();
  await expect(chatScreen.getByText('Nội dung đúng của cuộc trò chuyện 51', { exact: true })).toBeVisible();
  const chatSubtitle = chatScreen.getByText(longTitle, { exact: true });
  await expect(chatSubtitle).toBeVisible();
  const subtitle = await chatSubtitle.boundingBox();
  expect(subtitle!.x).toBeGreaterThanOrEqual(0);
  expect(subtitle!.x + subtitle!.width).toBeLessThanOrEqual(412);
  await page.screenshot({ path: testInfo.outputPath('reopened-conversation.png'), fullPage: true });

  await page.getByRole('tab', { name: /Lịch sử/ }).click();
  await expect(page.getByTestId('history-screen').getByText(longTitle, { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Trò chuyện/ }).click();
  await expect(page.getByTestId('chat-screen').getByText('Nội dung đúng của cuộc trò chuyện 51', { exact: true })).toBeVisible();

  const composer = page.getByPlaceholder('Nhắn tin cho MaiCare...');
  await composer.focus();
  await composer.blur();
  await expect(page.getByRole('tab', { name: /Lịch sử/ })).toBeVisible();

  await page.getByLabel('Cuộc trò chuyện mới').click();
  await expect(page.getByTestId('assistant-message')).toHaveCount(0);
  await expect(page.getByTestId('user-message')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Lịch sử/ })).toBeVisible();
});
