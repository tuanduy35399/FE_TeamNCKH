import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startSandbox } from './server.mjs';

const output = new URL('../minh_chung/', import.meta.url);
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
const { server, url } = await startSandbox();
let browser;
async function check(name, run) {
  try { await run(); results.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'FAIL', detail: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => route.request().url().startsWith(`${url}/`) ? route.continue() : route.abort());
  await page.goto(`${url}/progress`);
  const text = page.getByTestId('progress-text');
  await page.waitForFunction(() => document.querySelector('[data-testid="progress-text"] [aria-hidden]'));
  await page.evaluate(() => document.fonts.ready);
  const transforms = () => text.evaluate(node => Array.from(node.querySelector('[aria-hidden]')?.children || []).map(word => getComputedStyle(word).transform));
  await check('Chữ chuyển động nhẹ và lệch pha giữa các từ', async () => {
    const before = await transforms();
    await page.waitForTimeout(240);
    const after = await transforms();
    assert.notDeepEqual(before, after);
    const offsets = after.filter(value => value !== 'none').map(value => Number(value.split(',')[5]?.replace(')', '').trim()));
    assert.ok(new Set(offsets.map(value => value.toFixed(2))).size > 1, 'Các từ phải lệch pha');
    assert.ok(offsets.every(value => Math.abs(value) <= 1.3), 'Biên độ sóng phải nhỏ');
  });
  const custom = 'Đang đối chiếu triệu chứng trên lá mai...';
  await page.getByRole('button', { name: 'Nhận event', exact: true }).click();
  await check('Hiển thị message từ event SSE chia chunk', async () => {
    await page.waitForFunction(expected => document.querySelector('[data-testid="progress-text"]')?.textContent === expected, custom);
    assert.equal(await text.textContent(), custom);
    assert.equal(await text.getAttribute('aria-label'), custom);
    assert.equal(await text.getAttribute('aria-live'), 'polite');
  });
  await check('Đổi text không dừng hiệu ứng', async () => {
    const before = await transforms();
    await page.waitForTimeout(200);
    assert.notDeepEqual(before, await transforms());
  });
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await check(`Không tràn ngang tại ${width}px`, async () => {
      assert.ok(await page.locator('body').evaluate(node => node.scrollWidth <= innerWidth));
      assert.ok(await text.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    });
    if (width === 390) await page.getByTestId('progress-row').screenshot({ path: new URL('hieu-ung-chu-390.png', output).pathname });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByLabel('Event SSE mẫu').fill(JSON.stringify({ type: 'progress', stage: 'retrieving', message: 'MaiCare đang tìm kiếm các tài liệu phù hợp và kiểm tra những triệu chứng được mô tả trên hình ảnh của cây mai trước khi tổng hợp câu trả lời.' }));
  await page.getByRole('button', { name: 'Nhận event', exact: true }).click();
  await check('Event giai đoạn LLM mới và text dài xuống hàng', async () => {
    assert.match(await text.textContent(), /MaiCare đang tìm kiếm/);
    assert.ok(await text.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    assert.ok((await text.boundingBox()).height > 40);
  });
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
  await check('Hoàn tất dừng sóng và đổi thông báo', async () => {
    assert.equal(await text.textContent(), 'Đã nhận kết quả.');
    assert.deepEqual(await transforms(), []);
  });
  await page.getByLabel('Event SSE mẫu').fill('{"type":"progress","stage":"processing"}');
  await page.getByRole('button', { name: 'Nhận event', exact: true }).click();
  await check('Thiếu message vẫn hiển thị câu mặc định', async () => assert.equal(await text.textContent(), 'MaiCare đang phân tích thông tin...'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('[data-testid="progress-text"] [aria-hidden]'));
  await check('Tôn trọng cài đặt giảm chuyển động', async () => {
    assert.equal(await text.textContent(), 'MaiCare đang phân tích thông tin...');
    assert.deepEqual(await transforms(), []);
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('[data-testid="progress-text"] [aria-hidden]'));
  await check('Bật lại chuyển động theo cài đặt hệ thống', async () => assert.ok((await transforms()).some(value => value !== 'none')));
  await page.getByRole('button', { name: 'Lỗi', exact: true }).click();
  await check('Lỗi gỡ dòng trạng thái đang chạy', async () => {
    assert.equal(await text.count(), 0);
    assert.match(await page.getByRole('alert').textContent(), /gián đoạn/);
  });
  await page.getByRole('button', { name: 'Nhận event', exact: true }).click();
  await page.getByRole('button', { name: 'Ẩn trạng thái', exact: true }).click();
  await check('Có thể khởi tạo lại rồi gỡ component', async () => assert.equal(await text.count(), 0));
  await check('Không có lỗi JavaScript hoặc console error', () => assert.deepEqual(errors, []));
  const report = { browser: browser.version(), timestamp: new Date().toISOString(), results, errors,
    passed: results.filter(result => result.status === 'PASS').length,
    failed: results.filter(result => result.status === 'FAIL').length };
  await writeFile(new URL('hieu-ung-chu-browser.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`);
  for (const result of results.filter(result => result.status === 'FAIL')) console.log(result.name, result.detail);
  if (report.failed) process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
