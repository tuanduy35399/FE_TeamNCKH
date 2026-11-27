import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const evidence = process.env.TUTORIAL_EVIDENCE;
const targets = ['tutorial-target-messageArea', 'tutorial-target-composer', 'chat-send', 'diagnosis-toggle',
  'tutorial-target-history', 'tutorial-target-newChat', 'tutorial-target-account'];
const viewports = [[320, 568], [320, 720], [360, 640], [360, 800], [375, 667], [384, 854], [393, 873],
  [412, 915], [375, 812], [390, 844], [393, 852], [430, 932], [480, 960], [768, 1024], [1024, 768],
  [640, 360], [844, 390], [1280, 720], [1440, 900], [1920, 1080]];

async function login(page: Page, history: 'normal' | 'empty' | 'error' = 'normal', detailsReady?: Promise<void>) {
  await page.route('**/api/v1/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const now = '2026-11-19T08:00:00Z';
    const summary = { id: 51, title: 'Cuộc trò chuyện đã lưu', created_at: now, updated_at: now };
    if (pathname.endsWith('/user/login/')) return route.fulfill({ json: { access: 'tutorial-access', refresh: 'tutorial-refresh' } });
    if (pathname.endsWith('/user/me/')) return route.fulfill({ json: { id: 41, username: 'tutorial', name: 'Tutorial Fixture', email: 'tutorial@example.test' } });
    if (pathname.endsWith('/history/51/')) {
      await detailsReady;
      return history === 'error'
      ? route.fulfill({ status: 500, json: { detail: 'Fixture error' } })
      : route.fulfill({ json: { ...summary, messages: history === 'empty' ? [] : [
        { id: 501, role: 'user', content: 'Một câu hỏi đã lưu', created_at: now },
        { id: 502, role: 'assistant', content: 'Một câu trả lời đã lưu', created_at: now },
      ] } });
    }
    if (pathname.endsWith('/history/')) return route.fulfill({ json: [summary] });
    return route.fulfill({ status: 404, json: { detail: 'Outside fixture' } });
  });
  await page.goto('/');
  await page.getByTestId('login-username').fill('tutorial');
  await page.getByTestId('login-password').fill('fixture-password');
  await page.getByTestId('login-submit').click();
}

async function capture(page: Page, name: string) {
  if (evidence) await page.screenshot({ path: path.join(evidence, name + '.png') });
}

async function assertStep(page: Page, step: number, { overlappingAllowed = false } = {}) {
  const card = page.getByTestId('tutorial-tooltip');
  await expect(card.getByText(`${step + 1} / 7`, { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const data = await page.evaluate(id => {
      const find = (name: string) => document.querySelector(`[data-testid="${name}"]`);
      const box = (element: Element | null) => element?.getBoundingClientRect().toJSON();
      const card = find('tutorial-tooltip');
      return {
        shell: box(find('app-shell')), overlay: box(find('tutorial-overlay')), focus: box(find('tutorial-focus')),
        card: box(card), messageViewport: box(find('chat-messages')), target: [...document.querySelectorAll(`[data-testid="${id}"]`)].map(box),
        controls: [...(card?.querySelectorAll('[role="button"]') ?? [])].map(box),
        viewportWidth: window.innerWidth, overflow: document.documentElement.scrollWidth,
        preparing: !!find('tutorial-preparing') || !!find('tutorial-unavailable'),
      };
    }, targets[step]!);
    const { overlay, focus, card, target, controls, shell } = data;
    if (!overlay || !focus || !card || !target.length || !shell || data.preparing) return 'waiting for measurement';
    // DOM and Yoga layout can round a fractional CSS pixel differently.
    const tolerance = 2;
    const inside = (a: DOMRect, b: DOMRect) => a.left >= b.left - tolerance && a.top >= b.top - tolerance
      && a.right <= b.right + tolerance && a.bottom <= b.bottom + tolerance && a.width > 0 && a.height > 0;
    if (!inside(overlay, shell) || !inside(shell, overlay) || !inside(focus, overlay) || !inside(card, overlay)) return 'overlay geometry';
    if (!target.some((rect: DOMRect) => {
      const visible = step === 0 && data.messageViewport ? data.messageViewport : overlay;
      const left = Math.max(rect.left, visible.left);
      const top = Math.max(rect.top, visible.top);
      const right = Math.min(rect.right, visible.right);
      const bottom = Math.min(rect.bottom, visible.bottom);
      return inside({ left, top, right, bottom, width: right - left, height: bottom - top } as DOMRect, focus)
        && focus.width <= right - left + 16 && focus.height <= bottom - top + 16;
    })) return 'target alignment';
    if (!overlappingAllowed && focus.left < card.right - tolerance && focus.right > card.left + tolerance
      && focus.top < card.bottom - tolerance && focus.bottom > card.top + tolerance) return 'tooltip covers target';
    if (data.overflow > data.viewportWidth + tolerance || controls.length !== (step ? 3 : 2)
      || controls.some((rect: DOMRect) => !inside(rect, card) || rect.width < 44 || rect.height < 44)) return 'overflow or clipped controls';
    return 'aligned';
  }, { timeout: 10000 }).toBe('aligned');
}

async function replay(page: Page) {
  await page.getByRole('tab', { name: /Tài khoản/ }).click();
  await page.getByTestId('replay-tutorial').click();
}

test('all seven real targets remain aligned across the viewport matrix', async ({ page }) => {
  await login(page);
  for (let step = 0; step < targets.length; step++) {
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width: width!, height: height! });
      await test.step(`Step ${step + 1} at ${width}×${height}`, () => assertStep(page, step));
      if (width === 390 || ([320, 640, 1440].includes(width!) && [568, 360, 900].includes(height!) && [0, 4, 6].includes(step))) {
        await capture(page, `step-${step + 1}-${width}x${height}`);
      }
    }
    await page.getByTestId('tutorial-next').click();
  }
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('@maicare/tutorial/v3/completed'))).toBe('true');
  await page.reload();
  await expect(page.getByTestId('chat-screen')).toBeVisible();
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  await replay(page);
  await assertStep(page, 0);
  await capture(page, 'account-replay');
  await page.getByTestId('tutorial-next').click();
  await page.getByTestId('tutorial-back').click();
  await assertStep(page, 0);
  await page.getByTestId('tutorial-skip').click();
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  await page.getByTestId('diagnosis-toggle').click();
  await expect(page.getByTestId('camera-speed-dial')).toBeVisible();
});

test.describe('high-density viewport', () => {
  test.use({ deviceScaleFactor: 2 });
  test('replay preserves a history conversation and handles resize, focus and larger content', async ({ page }) => {
    await login(page);
    await page.getByTestId('tutorial-skip').click();
    await page.getByRole('tab', { name: /Lịch sử/ }).click();
    await page.getByText('Cuộc trò chuyện đã lưu', { exact: true }).click();
    await expect(page.getByText('Một câu trả lời đã lưu')).toBeVisible();
    await page.getByPlaceholder('Nhắn tin cho MaiCare...').fill('Dòng một\nDòng hai\nDòng ba');
    await replay(page);
    await assertStep(page, 0);
    await expect(page.getByText('Một câu trả lời đã lưu')).toBeVisible();
    await page.getByTestId('tutorial-next').click();
    await assertStep(page, 1);
    await page.setViewportSize({ width: 640, height: 360 });
    await assertStep(page, 1);
    await capture(page, 'resize-landscape');
    await page.addStyleTag({ content: '[data-testid="tutorial-tooltip"] * { font-size: 27px !important; line-height: 1.25 !important; }' });
    await assertStep(page, 1);
    await capture(page, 'large-text-landscape');
    const copy = page.getByTestId('tutorial-copy');
    expect(await copy.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    await copy.evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect.poll(() => copy.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await capture(page, 'large-text-scrolled');
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      expect(await page.getByTestId('tutorial-tooltip').evaluate(node => node.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
    await replay(page);
    await assertStep(page, 0);
    await page.getByTestId('tutorial-skip').click();
    await expect(page.getByText('Một câu trả lời đã lưu')).toBeVisible();
  });
});

test('a missing target releases the preparation state and can be retried or skipped', async ({ page }) => {
  await login(page);
  await assertStep(page, 0);
  const hidden = await page.addStyleTag({ content: '[data-testid="diagnosis-toggle"] { display: none !important }' });
  for (let index = 0; index < 3; index++) await page.getByTestId('tutorial-next').click();
  await expect(page.getByTestId('tutorial-unavailable')).toBeVisible();
  await expect(page.getByTestId('tutorial-focus')).toHaveCount(0);
  await capture(page, 'missing-target');
  await page.getByRole('button', { name: /Th\u1eed l\u1ea1i/ }).click();
  await hidden.evaluate(node => (node as HTMLElement).remove());
  await assertStep(page, 3);
  await page.getByTestId('tutorial-skip').click();
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
});

for (const history of ['empty', 'error'] as const) {
  test(`step one follows loading history into the ${history} state`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await login(page, history, pending);
    await page.getByTestId('tutorial-skip').click();
    await page.getByRole('tab', { name: /Lịch sử/ }).click();
    await page.getByText('Cuộc trò chuyện đã lưu', { exact: true }).click();
    try {
      await page.getByRole('tab', { name: /Tr\u00f2 chuy\u1ec7n/ }).click();
      await expect(page.getByText('Đang tải cuộc trò chuyện...')).toBeVisible();
      await replay(page);
      await assertStep(page, 0);
    } finally {
      release();
    }
    await expect(page.getByTestId('chat-screen').getByText(history === 'empty' ? 'Cuộc trò chuyện này chưa có tin nhắn.' : 'Không thể tải cuộc trò chuyện.')).toBeVisible();
    await assertStep(page, 0);
    await page.getByTestId('tutorial-skip').click();
    await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  });
}

test('tutorial storage failures still allow immediate dismissal and navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === '@maicare/tutorial/v3/completed') throw new Error('Injected tutorial read failure');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === '@maicare/tutorial/v3/completed') throw new Error('Injected tutorial write failure');
      return setItem.call(this, key, value);
    };
  });
  await login(page);
  await assertStep(page, 0);
  await page.getByTestId('tutorial-next').click();
  await page.getByTestId('tutorial-back').click();
  await page.getByTestId('tutorial-next').click();
  await assertStep(page, 1);
  await page.getByTestId('tutorial-skip').click();
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  await replay(page);
  await assertStep(page, 0);
  await page.getByTestId('tutorial-skip').click();
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
});

test('Chromium page magnification clips geometry to the visual viewport', async ({ page, context }) => {
  await login(page);
  await assertStep(page, 0);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.25 });
  await expect.poll(async () => page.getByTestId('tutorial-tooltip').evaluate(card => {
    const viewport = window.visualViewport!;
    const rect = card.getBoundingClientRect();
    return viewport.scale > 1 && rect.right <= viewport.offsetLeft + viewport.width + 2
      && rect.bottom <= viewport.offsetTop + viewport.height + 2;
  })).toBe(true);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await assertStep(page, 0);
});
