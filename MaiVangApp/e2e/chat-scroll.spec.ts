import { expect, test, type Page } from '@playwright/test';

const now = '2026-11-20T01:00:00Z';
const answer = Array.from({ length: 12 }, (_, index) => `${index + 1}. Theo dõi lá mai, kiểm tra độ ẩm và chăm sóc cây ở nơi thoáng mát. Tránh tưới quá nhiều nước khi đất vẫn còn ẩm.`).join('\n\n');
type Message = { id: number; role: string; content: string; created_at: string };

async function fixture(page: Page) {
  const messages: Message[] = Array.from({ length: 24 }, (_, index) => ({
    id: index + 1, role: index % 2 ? 'assistant' : 'user',
    content: index % 2 ? answer : `Câu hỏi chăm sóc mai số ${index / 2 + 1}`,
    created_at: now,
  }));
  const history = { id: 51, title: 'Kiểm tra cuộn chat', created_at: now, updated_at: now };
  let releaseAnswer: (() => void) | undefined;
  let pauseAnswer: Promise<void> | undefined;
  await page.addInitScript(() => localStorage.setItem('@maicare/tutorial/v3/completed', 'true'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/user/login/')) return route.fulfill({ json: { access: 'scroll-access', refresh: 'scroll-refresh' } });
    if (pathname.endsWith('/user/me/')) return route.fulfill({ json: { id: 41, username: 'scroll-fixture', name: 'Scroll Fixture', email: 'scroll@example.test', is_staff: false, date_joined: now } });
    if (pathname.endsWith('/history/')) return route.fulfill({ json: request.method() === 'POST' ? history : [history] });
    if (pathname.endsWith('/history/51/')) return route.fulfill({ json: { ...history, messages } });
    if (pathname.endsWith('/chat/stream/') || pathname.endsWith('/chat/image/stream/')) {
      const image = pathname.endsWith('/image/stream/');
      const question = image ? 'Kiểm tra ảnh lá mai' : request.postDataJSON().question;
      messages.push({ id: messages.length + 1, role: 'user', content: question, created_at: now });
      await pauseAnswer;
      messages.push({ id: messages.length + 1, role: 'assistant', content: answer, created_at: now });
      return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ type: 'complete', history_id: 51, answer, ...(image ? { detections: [] } : {}) })}\n\n` });
    }
    return route.fulfill({ status: 404, json: { detail: 'Outside scroll fixture' } });
  });
  await page.goto('/');
  await page.getByTestId('login-username').fill('scroll-fixture');
  await page.getByTestId('login-password').fill('fixture-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('chat-screen')).toBeVisible();
  await page.getByRole('tab', { name: /Lịch sử/ }).click();
  await page.getByRole('button').filter({ hasText: history.title }).first().click();
  await expect(page.getByTestId('chat-messages')).toBeVisible();
  return {
    hold() { pauseAnswer = new Promise(resolve => { releaseAnswer = resolve; }); },
    release() { releaseAnswer?.(); pauseAnswer = undefined; },
  };
}

async function distanceFromBottom(page: Page) {
  return page.getByTestId('chat-messages').evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop);
}

async function expectAtBottom(page: Page) {
  await expect.poll(() => distanceFromBottom(page)).toBeLessThanOrEqual(2);
}

test('long history, replies and image layout settle at the latest message without jumping back', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  await expectAtBottom(page);
  const input = page.getByPlaceholder('Nhắn tin cho MaiCare...');
  for (let turn = 1; turn <= 2; turn++) {
    await input.fill(`Câu hỏi tiếp theo ${turn}`);
    await page.getByTestId('chat-send').click();
    await expect(input).toBeEditable();
    await expectAtBottom(page);
    // Observe several layout/virtualization batches after the progress row disappears.
    const distances = await page.getByTestId('chat-messages').evaluate(async node => {
      const samples: number[] = [];
      for (let index = 0; index < 90; index++) {
        await new Promise(requestAnimationFrame);
        samples.push(node.scrollHeight - node.clientHeight - node.scrollTop);
      }
      return samples;
    });
    expect(Math.max(...distances)).toBeLessThanOrEqual(2);
  }

  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expectAtBottom(page);
    const camera = page.getByTestId('diagnosis-toggle');
    const composer = await page.getByTestId('tutorial-target-composer').boundingBox();
    const button = await camera.boundingBox();
    expect(button!.x).toBeGreaterThanOrEqual(composer!.x);
    expect(button!.y + button!.height).toBeLessThan(composer!.y);
    expect(composer!.y - button!.y - button!.height).toBeLessThanOrEqual(18);
    expect(button!.width).toBe(50);
    expect(button!.height).toBe(50);
    await expect(camera).toHaveCSS('background-color', 'rgb(37, 99, 235)');
    const listBounds = await page.getByTestId('chat-messages').boundingBox();
    const lastMessage = await page.getByTestId('assistant-message').last().boundingBox();
    expect(lastMessage!.y + lastMessage!.height).toBeLessThan(listBounds!.y + listBounds!.height - 70);
    await expect(camera).toHaveText(/^[^A-Za-zÀ-ỹ]*$/u);
    expect(await page.locator('body').evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath(`chat-${viewport.width}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('diagnosis-toggle').click();
  await page.getByTestId('camera-speed-dial').waitFor({ state: 'visible' });
  await page.screenshot({ path: testInfo.outputPath('camera-dropdown.png'), fullPage: true });
  await page.getByTestId('fab-tips-option').click();
  await expect(page.getByTestId('photo-tips')).toBeVisible();
  await page.getByRole('button', { name: 'Đã hiểu' }).click();
  await page.getByTestId('diagnosis-toggle').click();
  await page.getByLabel('Đóng tùy chọn ảnh', { exact: true }).click({ position: { x: 10, y: 10 } });
  await expect(page.getByTestId('camera-speed-dial')).toHaveCount(0);
  await page.getByTestId('diagnosis-toggle').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('fab-gallery-option').click();
  await (await chooser).setFiles({ name: 'leaf.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByTestId('selected-image')).toBeVisible();
  await expectAtBottom(page);
  await page.getByPlaceholder('Thêm câu hỏi (không bắt buộc)...').fill('Kiểm tra ảnh lá mai');
  await page.getByTestId('chat-send').click();
  await expect(input).toBeEditable();
  await expect(page.getByTestId('diagnosed-image').last()).toBeVisible();
  await expectAtBottom(page);
  await page.screenshot({ path: testInfo.outputPath('image-reply.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('reading older messages stays in place until the user sends again', async ({ page }) => {
  const response = await fixture(page);
  await expectAtBottom(page);
  const input = page.getByPlaceholder('Nhắn tin cho MaiCare...');
  response.hold();
  await input.fill('Câu hỏi đang xử lý');
  await page.getByTestId('chat-send').click();
  await expectAtBottom(page);
  const list = page.getByTestId('chat-messages');
  await list.hover();
  await page.mouse.wheel(0, -500);
  await expect.poll(() => distanceFromBottom(page)).toBeGreaterThan(300);
  // Let the wheel gesture finish before measuring the reading position.
  await expect.poll(async () => Math.round(await list.evaluate(node => node.scrollTop))).toBeGreaterThan(0);
  const position = await list.evaluate(node => node.scrollTop);
  response.release();
  await expect(input).toBeEditable();
  await expect.poll(async () => Math.abs(await list.evaluate(node => node.scrollTop) - position)).toBeLessThanOrEqual(2);
  await input.fill('Đưa tôi về tin nhắn mới nhất');
  await page.getByTestId('chat-send').click();
  await expect(input).toBeEditable();
  await expectAtBottom(page);
});
