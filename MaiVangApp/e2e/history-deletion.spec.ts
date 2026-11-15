import { expect, test, type APIRequestContext } from '@playwright/test';

const apiOrigin = process.env.MAIVANG_DJANGO_ORIGIN || 'http://127.0.0.1:8000';
const disposableAccounts: Array<{ username: string; password: string }> = [];

async function loginApi(request: APIRequestContext, credentials: { username: string; password: string }) {
  const response = await request.post(`${apiOrigin}/api/v1/user/login/`, { data: credentials, timeout: 60_000 });
  expect(response.ok()).toBe(true);
  return await response.json() as { access: string };
}

test.afterEach(async ({ request }) => {
  for (const credentials of disposableAccounts.splice(0)) {
    const tokens = await loginApi(request, credentials).catch(() => undefined);
    if (tokens?.access) await request.delete(`${apiOrigin}/api/v1/user/me/`, { headers: { Authorization: `Bearer ${tokens.access}` }, timeout: 60_000 }).catch(() => undefined);
  }
});

test('deletes disposable histories through the confirmation UI and verifies server state', async ({ page, request }) => {
  test.setTimeout(300_000);
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
  const owner = { username: `delete_owner_${suffix}`, password: `MaiCare!${suffix}z` };
  const other = { username: `delete_other_${suffix}`, password: `MaiCare!${suffix}z` };
  disposableAccounts.push(owner, other);
  for (const [credentials, label] of [[owner, 'Owner'], [other, 'Other']] as const) {
    const registration = await request.post(`${apiOrigin}/api/v1/user/register/`, {
      data: { ...credentials, name: `Deletion ${label}`, email: `${credentials.username}@local.test` }, timeout: 60_000,
    });
    expect(registration.status()).toBe(201);
  }
  const ownerTokens = await loginApi(request, owner);
  const otherTokens = await loginApi(request, other);
  const ownerHeaders = { Authorization: `Bearer ${ownerTokens.access}` };
  const otherHeaders = { Authorization: `Bearer ${otherTokens.access}` };
  const historyA = await (await request.post(`${apiOrigin}/api/v1/history/`, { data: { title: `History A ${suffix}` }, headers: ownerHeaders })).json() as { id: number };
  const historyB = await (await request.post(`${apiOrigin}/api/v1/history/`, { data: { title: `History B ${suffix}` }, headers: ownerHeaders })).json() as { id: number };
  const otherHistory = await (await request.post(`${apiOrigin}/api/v1/history/`, { data: { title: `Other history ${suffix}` }, headers: otherHeaders })).json() as { id: number };
  expect((await request.get(`${apiOrigin}/api/v1/history/`, { headers: ownerHeaders })).status()).toBe(200);
  expect((await request.delete(`${apiOrigin}/api/v1/history/${otherHistory.id}/`, { headers: ownerHeaders })).status()).toBe(404);
  expect((await request.get(`${apiOrigin}/api/v1/history/${otherHistory.id}/`, { headers: otherHeaders })).status()).toBe(200);

  const deleteResponses: number[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (response.request().method() === 'DELETE' && /\/api\/v1\/history\/\d+\/$/.test(new URL(response.url()).pathname)) deleteResponses.push(response.status());
  });
  await page.addInitScript(() => localStorage.setItem('@maicare/tutorial/v3/completed', 'true'));
  await page.goto('/');
  await page.getByTestId('login-username').fill(owner.username);
  await page.getByTestId('login-password').fill(owner.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 45_000 });
  await page.getByRole('tab').nth(1).click();
  await expect(page.getByText(`History A ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`History B ${suffix}`, { exact: true })).toBeVisible();

  await page.getByRole('button').filter({ hasText: `History B ${suffix}` }).first().click();
  await expect(page.getByText(`History B ${suffix}`, { exact: true })).toBeVisible();
  await page.getByRole('tab').nth(1).click();
  await page.getByLabel(`Tùy chọn cuộc trò chuyện History A ${suffix}`).click();
  await page.getByTestId('history-management-modal').getByRole('button', { name: 'Xóa' }).click();
  const confirmation = page.getByTestId('delete-confirmation-modal');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(`History A ${suffix}`);
  await expect(confirmation).toContainText('không thể hoàn tác');
  await confirmation.getByRole('button', { name: 'Hủy' }).click();
  await expect(page.getByText(`History A ${suffix}`, { exact: true })).toBeVisible();
  expect(deleteResponses).toEqual([]);

  await page.getByLabel(`Tùy chọn cuộc trò chuyện History A ${suffix}`).click();
  await page.getByTestId('history-management-modal').getByRole('button', { name: 'Xóa' }).click();
  await page.getByTestId('confirm-history-delete').evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
  await expect(page.getByText(`History A ${suffix}`, { exact: true })).toHaveCount(0, { timeout: 45_000 });
  expect(deleteResponses).toEqual([204]);
  const listAfterA = await request.get(`${apiOrigin}/api/v1/history/`, { headers: ownerHeaders });
  const listAfterAJson = await listAfterA.json() as Array<{ id: number }>;
  expect(listAfterAJson.some(item => item.id === historyA.id)).toBe(false);
  expect(listAfterAJson.some(item => item.id === historyB.id)).toBe(true);
  expect((await request.get(`${apiOrigin}/api/v1/history/${historyA.id}/`, { headers: ownerHeaders })).status()).toBe(404);
  expect((await request.get(`${apiOrigin}/api/v1/history/${historyB.id}/`, { headers: ownerHeaders })).status()).toBe(200);
  await page.getByRole('tab').nth(0).click();
  await expect(page.getByText(`History B ${suffix}`, { exact: true })).toBeVisible();

  await page.getByRole('tab').nth(1).click();
  await page.getByLabel(`Tùy chọn cuộc trò chuyện History B ${suffix}`).click();
  await page.getByTestId('history-management-modal').getByRole('button', { name: 'Xóa' }).click();
  await page.getByTestId('confirm-history-delete').click();
  await expect(page.getByText('Chưa có hoạt động nào.', { exact: true })).toBeVisible({ timeout: 45_000 });
  expect(deleteResponses).toEqual([204, 204]);
  expect(await (await request.get(`${apiOrigin}/api/v1/history/`, { headers: ownerHeaders })).json()).toEqual([]);
  expect((await request.get(`${apiOrigin}/api/v1/history/${historyB.id}/`, { headers: ownerHeaders })).status()).toBe(404);
  await page.getByRole('tab').nth(0).click();
  await expect(page.getByText('Trợ lý chăm sóc mai vàng', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
