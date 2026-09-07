import { expect, test } from '@playwright/test';
import path from 'node:path';

let cleanupCredentials: { username: string; password: string } | undefined;
test.afterEach(async ({ request }) => {
  if (!cleanupCredentials) return;
  const login = await request.post('http://127.0.0.1:8010/api/v1/user/login/', { data: cleanupCredentials, timeout: 60_000 }).catch(() => undefined);
  if (login?.ok()) {
    const tokens = await login.json() as { access?: string };
    if (tokens.access) await request.delete('http://127.0.0.1:8010/api/v1/user/me/', { headers: { Authorization: `Bearer ${tokens.access}` }, timeout: 60_000 }).catch(() => undefined);
  }
  cleanupCredentials = undefined;
});

test('chat-first auth, isolated history continuation, opt-in diagnosis, persistence and responsive layout', async ({ page }) => {
  const suffix = Date.now(); const username = `mobile_${suffix}`; const password = `MaiCare!${suffix}z`;
  cleanupCredentials = { username, password };
  const apiResponses: string[] = []; const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => { if (response.url().includes('/api/')) apiResponses.push(`${response.request().method()} ${response.status()} ${new URL(response.url()).pathname}`); });
  const waitForAnswerOrServiceError = async (minimumAnswers: number) => {
    await expect.poll(async () => await page.getByTestId('assistant-message').count() >= minimumAnswers || await page.getByRole('alert').isVisible().catch(() => false), { timeout: 180_000 }).toBe(true);
  };

  await page.goto('/'); await expect(page.getByTestId('login-screen')).toBeVisible();
  await page.getByRole('link', { name: /Đăng ký/ }).click();
  await page.getByLabel('Họ và tên').fill('Người dùng kiểm thử'); await page.getByLabel('Email').fill(`${username}@local.test`);
  await page.getByTestId('register-username').fill(username); await page.getByTestId('register-password').fill(password); await page.getByTestId('register-confirm').fill(password); await page.getByTestId('register-submit').click();
  await expect(page.getByText('Đăng ký thành công. Hãy đăng nhập để tiếp tục.')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('login-password').last().fill(password); await page.getByTestId('login-submit').last().click(); await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 45_000 });

  await expect(page.getByText('Camera hoặc Thư viện')).toHaveCount(0);
  await page.getByPlaceholder('Nhắn tin cho MaiCare...').fill('Cách chăm mai sau Tết?'); await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('assistant-message')).toBeVisible({ timeout: 180_000 });
  await page.getByText('Lịch sử', { exact: true }).last().click();
  const firstHistory = page.getByRole('button').filter({ hasText: 'Cách chăm mai sau Tết?' }).first(); await expect(firstHistory).toBeVisible(); await firstHistory.click();
  await page.getByPlaceholder('Nhắn tin cho MaiCare...').fill('Tôi nên theo dõi trong bao lâu?'); await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('assistant-message')).toHaveCount(2, { timeout: 180_000 });

  await page.getByLabel('Cuộc trò chuyện mới').click(); await expect(page.getByTestId('assistant-message')).toHaveCount(0);
  await page.getByPlaceholder('Nhắn tin cho MaiCare...').fill('Khi nào nên bón phân cho mai?'); await page.getByTestId('chat-send').click(); await waitForAnswerOrServiceError(1);
  await page.getByText('Lịch sử', { exact: true }).last().click();
  await expect(page.getByRole('button').filter({ hasText: 'Cách chăm mai sau Tết?' })).toHaveCount(1); await expect(page.getByRole('button').filter({ hasText: 'Khi nào nên bón phân cho mai?' })).toHaveCount(1);

  await page.getByText('Trò chuyện', { exact: true }).last().click(); await page.getByLabel('Cuộc trò chuyện mới').click(); await page.getByTestId('diagnosis-toggle').click();
  await expect(page.getByText('Camera hoặc Thư viện')).toBeVisible(); await page.getByTestId('add-image').click(); await expect(page.getByTestId('camera-option')).toBeVisible();
  const sampleImage = path.resolve(process.cwd(), '..', '..', 'reference', 'django-backend', 'diseases', '20260124_151321.jpg');
  const chooser = page.waitForEvent('filechooser'); await page.getByTestId('library-option').click(); await (await chooser).setFiles(sampleImage); await expect(page.getByTestId('selected-image')).toBeVisible();
  await page.getByPlaceholder('Thêm câu hỏi (không bắt buộc)...').fill('Lá này có dấu hiệu gì?'); await page.getByTestId('chat-send').click(); await waitForAnswerOrServiceError(1);
  const answersBeforeFollowUp = await page.getByTestId('assistant-message').count();
  await page.getByPlaceholder('Thêm câu hỏi (không bắt buộc)...').fill('Tôi nên xử lý bước đầu thế nào?'); await page.getByTestId('chat-send').click(); await waitForAnswerOrServiceError(answersBeforeFollowUp + 1);

  await page.reload(); await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 45_000 }); await expect(page.getByText('Tôi nên xử lý bước đầu thế nào?')).toBeVisible({ timeout: 45_000 });
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport); expect(await page.locator('body').evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(viewport.width); await expect(page.getByTestId('chat-send')).toBeVisible();
  }

  await page.getByText('Tài khoản', { exact: true }).last().click(); await page.getByTestId('delete-account-button').click(); await page.getByTestId('confirm-delete').click(); await expect(page.getByText('Tài khoản đã được xóa.')).toBeVisible(); cleanupCredentials = undefined;
  expect(apiResponses).toContain('POST 201 /api/v1/user/register/'); expect(apiResponses.some(item => item.endsWith('/chat/'))).toBe(true); expect(apiResponses.some(item => item.endsWith('/chat/image/'))).toBe(true); expect(pageErrors).toEqual([]);
});
