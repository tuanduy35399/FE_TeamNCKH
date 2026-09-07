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

test('chat-first auth, isolated history continuation, opt-in diagnosis, persistence and responsive layout', async ({ page, request }) => {
  const suffix = Date.now(); const username = `mobile_${suffix}`; const password = `MaiCare!${suffix}z`;
  cleanupCredentials = { username, password };
  const apiResponses: string[] = []; const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => { if (response.url().includes('/api/')) apiResponses.push(`${response.request().method()} ${response.status()} ${new URL(response.url()).pathname}`); });
  const waitForAnswerOrServiceError = async (minimumAnswers: number) => {
    await expect.poll(async () => await page.getByTestId('assistant-message').count() >= minimumAnswers || await page.getByRole('alert').isVisible().catch(() => false), { timeout: 180_000 }).toBe(true);
  };

  const registration = await request.post('http://127.0.0.1:8010/api/v1/user/register/', { data: { username, name: 'Người dùng kiểm thử', email: `${username}@local.test`, password }, timeout: 120_000 });
  expect(registration.status()).toBe(201);
  await page.goto('/'); await expect(page.getByTestId('login-screen')).toBeVisible();
  await page.getByTestId('login-username').fill(username); await page.getByTestId('login-password').fill(password); await page.getByTestId('login-submit').click(); await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 45_000 });

  await expect(page.getByTestId('tutorial-overlay')).toBeVisible();
  await expect(page.getByText('Trợ lý MaiCare AI', { exact: true })).toBeVisible();
  await expect(page.getByText('1 / 7', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ qua hướng dẫn' }).click();
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('maicare_tutorial_v3_completed'))).toBe('true');

  await expect(page.getByTestId('add-image')).toHaveCount(0);
  const textComposer = page.getByPlaceholder('Nhắn tin cho MaiCare...');
  await textComposer.fill('Cách chăm mai sau Tết?'); await page.getByTestId('chat-send').click();
  await expect(textComposer).toHaveValue('');
  await waitForAnswerOrServiceError(1);
  await page.getByRole('tab', { name: /Lịch sử/ }).click();
  const firstHistory = page.getByRole('button').filter({ hasText: 'Cách chăm mai sau Tết?' }).first(); await expect(firstHistory).toBeVisible(); await firstHistory.click();
  await expect(page.getByTestId('user-message').filter({ hasText: 'Cách chăm mai sau Tết?' })).toBeVisible({ timeout: 45_000 });
  await page.getByPlaceholder('Nhắn tin cho MaiCare...').fill('Tôi nên theo dõi trong bao lâu?'); await page.getByTestId('chat-send').click();
  await waitForAnswerOrServiceError(2);

  await page.getByLabel('Cuộc trò chuyện mới').click(); await expect(page.getByTestId('assistant-message')).toHaveCount(0);
  await page.getByPlaceholder('Nhắn tin cho MaiCare...').fill('Khi nào nên bón phân cho mai?'); await page.getByTestId('chat-send').click(); await waitForAnswerOrServiceError(1);
  await page.getByRole('tab', { name: /Lịch sử/ }).click();
  await expect(page.getByRole('button').filter({ hasText: 'Cách chăm mai sau Tết?' })).toHaveCount(1); await expect(page.getByRole('button').filter({ hasText: 'Khi nào nên bón phân cho mai?' })).toHaveCount(1);

  await page.getByRole('tab', { name: /Trò chuyện/ }).click(); await page.getByLabel('Cuộc trò chuyện mới').click(); await page.getByTestId('diagnosis-toggle').click();
  await expect(page.getByTestId('add-image')).toBeVisible(); await page.getByTestId('add-image').click(); await expect(page.getByTestId('camera-option')).toBeVisible();
  const sampleImage = path.resolve(process.cwd(), '..', '..', 'reference', 'django-backend', 'diseases', '20260124_151321.jpg');
  const chooser = page.waitForEvent('filechooser'); await page.getByTestId('library-option').click(); await (await chooser).setFiles(sampleImage); await expect(page.getByTestId('selected-image')).toBeVisible();
  const diagnosisInput = page.getByPlaceholder('Thêm câu hỏi (không bắt buộc)...');
  await diagnosisInput.fill('Lá này có dấu hiệu gì?'); await page.getByTestId('chat-send').click();
  await expect.poll(async () => await page.getByTestId('request-error').isVisible().catch(() => false) || await page.getByTestId('assistant-message').count() > 0, { timeout: 180_000 }).toBe(true);
  if (await page.getByTestId('request-error').isVisible().catch(() => false)) {
    await expect(page.getByTestId('selected-image')).toBeVisible();
    await expect(diagnosisInput).toHaveValue('Lá này có dấu hiệu gì?');
    await expect(page.getByText('Không phát hiện rõ lớp bệnh trong ảnh.')).toHaveCount(0);
    await page.getByTestId('request-error').getByText('Xóa ảnh', { exact: true }).click();
  } else {
    await expect(page.getByTestId('selected-image')).toHaveCount(0);
    await expect(diagnosisInput).toHaveValue('');
  }
  await diagnosisInput.fill('Tôi nên xử lý bước đầu thế nào?'); await page.getByTestId('chat-send').click(); await waitForAnswerOrServiceError(1);

  await page.reload(); await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 45_000 }); await expect(page.getByText('Tôi nên xử lý bước đầu thế nào?')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport); expect(await page.locator('body').evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(viewport.width); await expect(page.getByTestId('chat-send')).toBeVisible();
  }

  await page.getByRole('tab', { name: /Tài khoản/ }).click();
  await page.getByTestId('replay-tutorial').click();
  for (const [index, title] of ['Trợ lý MaiCare AI', 'Đặt câu hỏi', 'Gửi cho MaiCare', 'Chẩn đoán bằng ảnh', 'Lịch sử trò chuyện', 'Tạo cuộc trò chuyện mới', 'Tài khoản & hướng dẫn'].entries()) {
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`${index + 1} / 7`, { exact: true })).toBeVisible();
    await page.getByTestId('tutorial-next').click();
  }
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
  await page.getByRole('tab', { name: /Tài khoản/ }).click(); await page.getByTestId('delete-account-button').click(); await page.getByTestId('confirm-delete').click(); await expect(page.getByText('Tài khoản đã được xóa.')).toBeVisible(); cleanupCredentials = undefined;
  expect(apiResponses.some(item => item.endsWith('/chat/'))).toBe(true); expect(apiResponses.some(item => item.endsWith('/chat/image/'))).toBe(true); expect(pageErrors).toEqual([]);
});
