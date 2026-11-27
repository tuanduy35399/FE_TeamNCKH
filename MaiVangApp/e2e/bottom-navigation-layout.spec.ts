import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const routes = ['Chat', 'History', 'Account'];
const names = ['Trò chuyện', 'Lịch sử', 'Tài khoản'];
const sizes = [[320,568],[320,720],[360,640],[360,800],[375,667],[375,812],[384,854],
  [390,844],[393,852],[393,873],[412,915],[430,932],[480,960],[768,1024],[1024,768],
  [640,360],[844,390],[1280,720],[1440,900],[1920,1080]];

async function login(page: Page) {
  await page.addInitScript(() => localStorage.setItem('@maicare/tutorial/v3/completed', 'true'));
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    const json = url.endsWith('/login/') ? { access: 'layout-access', refresh: 'layout-refresh' }
      : url.endsWith('/me/') ? { id: 41, username: 'layout', name: 'Layout fixture', email: 'layout@example.test' }
        : [];
    return route.fulfill({ json });
  });
  await page.goto('/');
  await page.getByTestId('login-username').fill('layout');
  await page.getByTestId('login-password').fill('fixture-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('chat-screen')).toBeVisible();
}

async function inspect(page: Page, bottom: number, selected = 0) {
  for (const [index, name] of names.entries()) {
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', String(index === selected));
  }
  await expect.poll(() => page.evaluate(({ bottom, routes }) => {
    const get = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const bar = get('bottom-tab-surface').getBoundingClientRect();
    const shell = get('app-shell').getBoundingClientRect();
    const list = document.querySelector<HTMLElement>('[role="tablist"]')!;
    const row = list.getBoundingClientRect();
    const outer = list.parentElement!.getBoundingClientRect();
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
    const eps = 2;
    const inside = (small: DOMRect, big: DOMRect) => small.height > 0 && small.width > 0
      && small.top >= big.top - eps && small.bottom <= big.bottom + eps
      && small.left >= big.left - eps && small.right <= big.right + eps;
    if (!inside(bar, shell) || !inside(outer, shell) || !inside(row, bar)
      || Math.abs(shell.bottom - bar.bottom - (bottom + 10)) > eps
      || Math.abs(outer.height - row.height - (bottom + 10)) > eps) return 'safe-area reservation';
    if (row.height < 64 || tabs.length !== 3) return 'interactive row';
    const boxes = tabs.map(tab => tab.getBoundingClientRect());
    const iconTop = tabs[0]!.firstElementChild!.getBoundingClientRect().top;
    for (const [index, tab] of tabs.entries()) {
      const rect = boxes[index]!;
      const label = get('bottom-tab-label-' + routes[index]);
      const icon = tab.firstElementChild!;
      const labelBox = label.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(label);
      const glyphs = [...range.getClientRects()];
      if (!inside(rect, row) || rect.width < 48 || rect.height < 48
        || Math.abs(rect.width - boxes[0]!.width) > eps) return 'unequal or small tab';
      if (!inside(labelBox, rect) || !inside(iconBox, rect) || iconBox.bottom > labelBox.top + eps || Math.abs(iconBox.top - iconTop) > eps
        || !glyphs.length || glyphs.some(glyph => !inside(glyph, rect))) return 'clipped or overlapping tab content';
      for (let node: HTMLElement | null = label; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (['hidden', 'clip'].includes(style.overflowY) && glyphs.some(glyph => !inside(glyph, node!.getBoundingClientRect()))) {
          return 'ancestor clips label';
        }
        if (node === get('app-shell')) break;
      }
      if (!tab.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))) return 'unreachable tab';
    }
    const composer = get('tutorial-target-composer');
    const camera = get('diagnosis-toggle');
    if (composer?.getClientRects().length && getComputedStyle(composer).visibility === 'visible') {
      const input = composer.getBoundingClientRect();
      if (input.bottom > bar.top + eps) return 'composer overlaps navigation';
      if (camera?.getClientRects().length && camera.getBoundingClientRect().bottom > input.top + eps) return 'camera overlaps composer';
    }
    return 'fits';
  }, { bottom, routes })).toBe('fits');
}

async function capture(page: Page, name: string) {
  if (process.env.BOTTOM_NAV_EVIDENCE) {
    await page.screenshot({ path: path.join(process.env.BOTTOM_NAV_EVIDENCE, name + '.png') });
  }
}

test('the real tabs fit at all viewport sizes', async ({ page }) => {
  await login(page);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width: width!, height: height! });
    await test.step(`${width}×${height}`, () => inspect(page, 0));
    if ([320,390,412,640,1440].includes(width!)) await capture(page, `tabs-${width}x${height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const selected of [1, 2, 0, 2, 0]) {
    const tab = page.getByRole('tab', { name: names[selected]!, exact: true });
    await tab.focus();
    await page.keyboard.press('Enter');
    await inspect(page, 0, selected);
    if (selected) await capture(page, `selected-${routes[selected]}`);
  }
  const composer = page.getByPlaceholder('Nhắn tin cho MaiCare...');
  await composer.fill('Dòng đầu tiên\nDòng thứ hai\nDòng thứ ba');
  await inspect(page, 0);
  await capture(page, 'multiline-composer');
  await composer.blur();
  await page.getByTestId('diagnosis-toggle').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('fab-gallery-option').click();
  await (await chooser).setFiles({ name: 'leaf.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByTestId('selected-image')).toBeVisible();
  await inspect(page, 0);
  await page.getByLabel('Xóa ảnh chẩn đoán', { exact: true }).click();
  await expect(page.getByTestId('diagnosis-toggle')).toBeVisible();
  await inspect(page, 0);
});

test.describe('synthetic Chromium inset and high density', () => {
  test.use({ deviceScaleFactor: 2 });
  test('native-like inset values and enlarged wrapped text preserve space and tutorial targets', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } });
    await login(page);
    await inspect(page, 34);
    await capture(page, 'after-synthetic-inset-34');
    for (const bottom of [60, 0, 8, 16, 20, 24, 32, 48, 34]) {
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom } });
      await inspect(page, bottom);
    }
    await page.setViewportSize({ width: 320, height: 568 });
    for (const scale of [1, 1.15, 1.3, 1.5, 2]) {
      const css = await page.addStyleTag({ content: `[data-testid^="bottom-tab-label-"] { font-size: ${12 * scale}px !important; }` });
      try {
        await inspect(page, 34);
        if (scale === 2) await capture(page, 'large-font-synthetic-inset-34');
      } finally {
        await css.evaluate(element => (element as HTMLElement).remove());
      }
    }
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.2 });
    await inspect(page, 34);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await page.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
    await page.getByTestId('replay-tutorial').click();
    for (let step = 1; step <= 7; step++) {
      const card = page.getByTestId('tutorial-tooltip');
      await expect(card.getByText(`${step} / 7`, { exact: true })).toBeVisible();
      await expect(page.getByTestId('tutorial-focus')).toBeVisible();
      if (step === 5 || step === 7) {
        const name = step === 5 ? 'history' : 'account';
        await expect.poll(async () => {
          const [focus, tab] = await Promise.all([page.getByTestId('tutorial-focus').boundingBox(),
            page.getByTestId('tutorial-target-' + name).boundingBox()]);
          return !!focus && !!tab && focus.x <= tab.x + 2 && focus.y <= tab.y + 2
            && focus.x + focus.width >= tab.x + tab.width - 2 && focus.y + focus.height >= tab.y + tab.height - 2;
        }).toBe(true);
        await capture(page, `tutorial-step-${step}-synthetic-inset-34`);
      }
      await page.getByTestId('tutorial-next').click();
    }
    await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
    await inspect(page, 34);
  });
});
