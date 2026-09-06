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

test('MaiCare live auth, assistant, image contract, history, tutorial and responsive shell', async ({ page }) => {
  const suffix = Date.now(); const username = `edge_${suffix}`; const password = `MaiCare!${suffix}`; const email = `${username}@local.test`;
  cleanupCredentials = { username, password };
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const apiResponses: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.url().includes('/api/')) apiResponses.push(`${response.request().method()} ${response.status()} ${new URL(response.url()).pathname}`); });

  await page.goto('/'); await page.evaluate(() => localStorage.removeItem('maicare_tutorial_v2_completed'));
  await expect(page).toHaveTitle('MaiCare – Trợ lý chăm sóc mai vàng'); await expect(page.getByTestId('login-screen')).toBeVisible();
  await page.getByRole('link', { name: /Đăng ký/ }).click(); await page.getByLabel('Họ và tên').fill('Người dùng Edge'); await page.getByLabel('Email').fill(email); await page.getByTestId('register-username').fill(username); await page.getByTestId('register-password').fill(password); await page.getByTestId('register-confirm').fill(password); await page.getByTestId('register-submit').click();
  await expect(page.getByText('Đăng ký thành công. Hãy đăng nhập để tiếp tục.')).toBeVisible({ timeout: 30_000 }); await page.getByTestId('login-password').last().fill(password); await page.getByTestId('login-submit').last().click();

  const tutorial = page.getByTestId('tutorial-overlay'); await expect(tutorial.getByText('Chào mừng bạn đến với MaiCare')).toBeVisible(); await tutorial.getByTestId('tutorial-next').click(); await expect(tutorial.getByText('Thêm ảnh lá mai', { exact: true })).toBeVisible();
  const targetBox = await page.getByTestId('tutorial-target-image').boundingBox(); const focusBox = await page.getByTestId('tutorial-focus').boundingBox(); expect(Math.abs((targetBox?.x || 0) - (focusBox?.x || 0))).toBeLessThanOrEqual(10); expect(Math.abs((targetBox?.y || 0) - (focusBox?.y || 0))).toBeLessThanOrEqual(10);
  await tutorial.getByRole('button', { name: 'Quay lại' }).click(); await expect(tutorial.getByText('Chào mừng bạn đến với MaiCare')).toBeVisible(); await tutorial.getByRole('button', { name: 'Bỏ qua' }).click(); await expect(tutorial).not.toBeVisible(); await expect.poll(() => page.evaluate(() => localStorage.getItem('maicare_tutorial_v2_completed'))).toBe('true');
  await page.reload(); await expect(page.getByTestId('diagnosis-screen')).toBeVisible(); await expect(tutorial).not.toBeVisible();

  const intro = 'Bạn có thể chỉ gửi ảnh. Thêm mô tả sẽ giúp kết quả phù hợp hơn. Nếu chưa có ảnh, bạn vẫn có thể hỏi MaiCare.';
  await expect(page.getByText(intro, { exact: true })).toHaveCount(1); await expect(page.getByText('Thêm ảnh lá mai và mô tả dấu hiệu bạn quan sát được.', { exact: true })).toHaveCount(0);
  const submit = page.getByTestId('diagnosis-submit'); await expect(submit).toBeDisabled();
  await page.getByTestId('diagnosis-description').fill('Lá mai có đốm nâu, tôi nên quan sát gì?'); await expect(submit).toBeEnabled(); await expect(submit).toContainText('Hỏi MaiCare'); await submit.click();
  const assistant = page.getByTestId('assistant-conversation'); const serverError = page.getByText('MaiCare chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.'); await expect.poll(async () => await assistant.isVisible() || await serverError.isVisible(), { timeout: 150_000 }).toBe(true);
  if (await serverError.isVisible()) { await submit.click(); }
  await expect(assistant).toBeVisible({ timeout: 150_000 });
  await expect(assistant.getByTestId('assistant-answer').first()).not.toContainText(/(^|\s)#{1,6}\s|\*\*|`/);
  await page.getByLabel('Câu hỏi cho MaiCare').fill('Tôi nên theo dõi trong bao lâu?'); await page.getByLabel('Gửi câu hỏi').click(); await expect(page.getByText('Tôi nên theo dõi trong bao lâu?')).toBeVisible(); await expect(page.getByText('Đang tìm câu trả lời...')).not.toBeVisible({ timeout: 150_000 });
  const fontFamily = await page.getByText('Kiểm tra tình trạng mai', { exact: true }).evaluate(node => getComputedStyle(node).fontFamily); expect(fontFamily).toContain('Roboto');

  await page.getByText('Lịch sử', { exact: true }).last().click(); const historyCard = page.getByRole('button').filter({ hasText: 'Lá mai có đốm nâu, tôi nên quan sát gì?' }).last(); await expect(historyCard).toBeVisible(); await historyCard.click(); const historyDetail = page.getByTestId('history-detail'); await expect(historyDetail).toBeVisible(); await expect(historyDetail.getByText('Lá mai có đốm nâu, tôi nên quan sát gì?').first()).toBeVisible(); await expect(historyDetail.getByText('Tôi nên theo dõi trong bao lâu?')).toBeVisible(); await expect(historyDetail.getByTestId('history-assistant-answer').first()).not.toContainText(/(^|\s)#{1,6}\s|\*\*|`/); await page.getByLabel('Go back').click(); await page.getByText('Chẩn đoán', { exact: true }).last().click();
  await page.getByText('Trở về kiểm tra tình trạng mai').click();

  await page.getByTestId('add-image-card').click(); await expect(page.getByText('Dùng camera để chụp ảnh mới')).toBeVisible(); await page.getByText('Hủy', { exact: true }).click();
  const sampleImage = path.resolve(process.cwd(), '..', '..', '.backend-api-worktree', 'diseases', '20260124_151321.jpg');
  await page.getByTestId('add-image-card').click(); const chooser = page.waitForEvent('filechooser'); await page.getByTestId('library-option').click(); await (await chooser).setFiles(sampleImage); await expect(page.getByTestId('selected-image-card')).toBeVisible(); await expect(page.getByText('Ảnh đã chọn')).toBeVisible(); await expect(submit).toContainText('Kiểm tra ảnh'); await expect(submit).toBeEnabled();
  await page.getByText('Thay ảnh').click(); const replacement = page.waitForEvent('filechooser'); await page.getByTestId('library-option').click(); await (await replacement).setFiles(sampleImage); await page.getByTestId('remove-image').click(); await expect(page.getByTestId('add-image-card')).toBeVisible();
  await page.getByTestId('add-image-card').click(); const imageOnlyChooser = page.waitForEvent('filechooser'); await page.getByTestId('library-option').click(); await (await imageOnlyChooser).setFiles(sampleImage);
  await submit.click(); await expect.poll(async () => await page.getByTestId('diagnosis-result').isVisible() || await serverError.isVisible(), { timeout: 180_000 }).toBe(true);
  if (await serverError.isVisible()) await submit.click();
  await expect(page.getByTestId('diagnosis-result')).toBeVisible({ timeout: 180_000 });
  await page.getByTestId('diagnosis-result').getByRole('button').last().click();
  await page.getByTestId('add-image-card').click(); const combinedChooser = page.waitForEvent('filechooser'); await page.getByTestId('library-option').click(); await (await combinedChooser).setFiles(sampleImage); await page.getByTestId('diagnosis-description').fill('Lá có đốm nâu ở mép.');
  await submit.click(); await expect.poll(async () => await page.getByTestId('diagnosis-result').isVisible() || await serverError.isVisible(), { timeout: 180_000 }).toBe(true);
  if (await serverError.isVisible()) await submit.click();
  await expect(page.getByTestId('diagnosis-result')).toBeVisible({ timeout: 180_000 });
  await page.getByText('Lịch sử', { exact: true }).last().click();
  await expect(page.getByRole('button').filter({ hasText: 'Kiểm tra ảnh lá mai' })).toHaveCount(1);
  await expect(page.getByRole('button').filter({ hasText: 'Lá có đốm nâu ở mép.' })).toHaveCount(1);
  await page.getByRole('button').filter({ hasText: 'Lá có đốm nâu ở mép.' }).click();
  await expect(page.getByTestId('history-detail').getByText('Ảnh đã kiểm tra')).toBeVisible();
  await expect(page.getByTestId('history-detail').locator('img')).toBeVisible();
  await page.getByLabel('Go back').click();
  await page.reload();
  await expect(page.getByTestId('diagnosis-screen')).toBeVisible();
  await page.getByText('Lịch sử', { exact: true }).last().click();
  await expect(page.getByRole('button').filter({ hasText: 'Kiểm tra ảnh lá mai' })).toHaveCount(1);
  await expect(page.getByRole('button').filter({ hasText: 'Lá có đốm nâu ở mép.' })).toHaveCount(1);
  await page.getByText('Chẩn đoán', { exact: true }).last().click();
  await page.evaluate(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })); await page.getByTestId('add-image-card').click(); await page.getByTestId('camera-option').click(); await expect(page.getByText('Không tìm thấy camera trên thiết bị này.')).toBeVisible(); await expect(page.getByRole('button', { name: 'Chọn ảnh từ thư viện' })).toBeVisible(); await page.getByRole('button', { name: 'Đóng camera' }).click();

  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 360, height: 640 }, { width: 360, height: 800 }, { width: 412, height: 915 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) { await page.setViewportSize(viewport); const bodyWidth = await page.locator('body').evaluate(node => node.scrollWidth); expect(bodyWidth).toBeLessThanOrEqual(viewport.width); }
  expect(await page.getByTestId('app-shell').evaluate(node => node.getBoundingClientRect().width)).toBeLessThanOrEqual(460);

  await page.getByText('Tài khoản', { exact: true }).last().click(); await page.setViewportSize({ width: 320, height: 568 }); await page.getByTestId('replay-tutorial').click(); await expect(tutorial.getByText('Chào mừng bạn đến với MaiCare')).toBeVisible(); for (let step = 0; step < 6; step++) { const box = await tutorial.getByTestId('tutorial-tooltip').boundingBox(); if (box) { expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual((page.viewportSize()?.height || 800) + 1); } await tutorial.getByTestId('tutorial-next').click(); } await expect(tutorial).not.toBeVisible();
  await page.reload(); await expect(page.getByTestId('diagnosis-screen')).toBeVisible(); await page.getByText('Tài khoản', { exact: true }).last().click(); await page.getByTestId('logout-button').click(); await expect(page.getByTestId('login-screen')).toBeVisible(); await page.getByTestId('login-username').last().fill(username); await page.getByTestId('login-password').last().fill(password); await page.getByTestId('login-submit').last().click(); await expect(tutorial).not.toBeVisible(); await page.getByText('Tài khoản', { exact: true }).last().click(); await page.getByTestId('delete-account-button').click(); await page.getByTestId('confirm-delete').click(); await expect(page.getByText('Tài khoản đã được xóa.')).toBeVisible();

  expect(apiResponses).toContain('POST 201 /api/v1/user/register/');
  expect(apiResponses.filter(item => item === 'POST 200 /api/v1/user/login/').length).toBeGreaterThanOrEqual(2);
  expect(apiResponses.filter(item => item === 'GET 200 /api/v1/user/me/').length).toBeGreaterThanOrEqual(2);
  expect(apiResponses.some(item => item.startsWith('POST 200 /api/v1/history/') && item.endsWith('/chat/'))).toBe(true);
  expect(apiResponses.filter(item => item.includes('/chat/image/') && item.includes('200')).length).toBe(2);
  expect(apiResponses).toContain('POST 200 /api/v1/user/logout/');
  expect(apiResponses).toContain('DELETE 204 /api/v1/user/me/');
  expect(consoleErrors).toEqual([]); expect(pageErrors).toEqual([]); expect(failedRequests).toEqual([]);
});
