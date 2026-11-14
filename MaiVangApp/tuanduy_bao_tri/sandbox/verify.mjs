import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startSandbox } from './server.mjs';

const baseline = process.argv.includes('--baseline');
const phase = baseline ? 'truoc-sua' : 'sau-sua';
const output = new URL('../minh_chung/', import.meta.url);
await mkdir(output, { recursive: true });
const results = [];
const errors = [];
const failedRequests = [];
const externalRequests = [];
const measurements = [];
const { server, url } = await startSandbox();
let browser;

async function check(name, run) {
  try {
    await run();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', detail: error.message });
  }
}

async function layout(preview) {
  return preview.evaluate(root => Array.from(root.children).map(node => {
    const children = Array.from(node.children);
    const marker = children[0];
    const isList = children.length === 2 && /^(•|\d+\.)$/.test(marker.textContent);
    const body = isList ? children[1] : node;
    // Range rectangles measure actual wrapped text, not only the outer row.
    const range = document.createRange();
    range.selectNodeContents(body);
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0);
    const lines = new Map();
    for (const rect of rects) {
      const y = Math.round(rect.y);
      lines.set(y, Math.min(lines.get(y) ?? Infinity, rect.x));
    }
    return {
      text: body.textContent,
      isList,
      x: body.getBoundingClientRect().x,
      markerWidth: isList ? marker.getBoundingClientRect().width : undefined,
      lineStarts: [...lines.values()],
      overflow: body.scrollWidth > body.clientWidth + 1,
    };
  }));
}

try {
  browser = await chromium.launch({ headless: true, channel: process.env.MARKDOWN_BROWSER_CHANNEL || 'chrome' });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.route('**/*', async route => {
    const target = route.request().url();
    if (target.startsWith(`${url}/`)) await route.continue();
    else {
      externalRequests.push(target);
      await route.abort();
    }
  });
  const preview = page.getByTestId('markdown-preview');
  for (const width of [320, 360, 390, 412, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await preview.waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const name of ['steps', 'headings', 'indentation', 'numbered']) {
      await page.getByLabel('Tình huống', { exact: true }).selectOption(name);
      const rows = await layout(preview);
      measurements.push({ width, case: name, rows });
      await check(`${width}px / ${name} / alignment`, () => {
        if (name === 'headings') {
          assert.equal(rows.length, 5);
          assert.equal(new Set(rows.map(row => row.x)).size, 1, 'Heading phải cùng lề trái');
          assert.ok(rows.every(row => !row.text.includes('#')), 'Không lộ dấu heading');
        } else {
          const items = rows.filter(row => row.isList);
          assert.equal(items.length, name === 'steps' ? 9 : name === 'indentation' ? 4 : 3);
          assert.ok(items.every(row => Math.abs(row.markerWidth - 22) <= 0.1), 'Cột dấu đầu dòng phải giữ nguyên 22px');
          assert.ok(Math.max(...items.map(row => row.x)) - Math.min(...items.map(row => row.x)) <= 1,
            `Các dòng bị lệch: ${items.map(row => row.x).join(', ')}`);
          assert.ok(items.every(row => row.lineStarts.every(x => Math.abs(x - row.x) <= 1)), 'Dòng xuống hàng phải thẳng với nội dung đầu dòng');
          const steps = items.filter(row => /^Bước /.test(row.text));
          if (name === 'steps') assert.equal(steps.length, 4, 'Đủ bốn tiêu đề bước');
        }
      });
      await check(`${width}px / ${name} / no-overflow`, async () => {
        assert.ok(rows.every(row => !row.overflow), 'Nội dung bị tràn khung');
        assert.ok(await page.locator('body').evaluate(node => node.scrollWidth <= innerWidth), 'Trang bị tràn ngang');
      });
      if (name === 'steps' || (width === 390 && name === 'headings')) {
        await preview.screenshot({ path: new URL(`${phase}-${name}-${width}.png`, output).pathname });
      }
    }
  }
  await page.getByLabel('Tình huống', { exact: true }).selectOption('regression');
  await check('Giữ nội dung, in đậm, in nghiêng, code và liên kết', async () => {
    const text = await preview.innerText();
    for (const content of ['Tình trạng lá', 'Nguyên nhân có thể', 'Chăm sóc nhẹ nhàng.', 'Không dùng quá liều', 'Thông tin tham khảo']) assert.ok(text.includes(content));
    assert.doesNotMatch(text, /\*\*|##|`|\]\(/);
    const style = async text => preview.getByText(text, { exact: true }).evaluate(node => ({
      family: getComputedStyle(node).fontFamily,
      italic: getComputedStyle(node).fontStyle,
      background: getComputedStyle(node).backgroundColor,
    }));
    assert.match((await style('Nguyên nhân có thể')).family, /Roboto_700Bold/);
    assert.equal((await style('Chăm sóc nhẹ nhàng.')).italic, 'italic');
    assert.notEqual((await style('Không dùng quá liều')).background, 'rgba(0, 0, 0, 0)');
    assert.equal(await preview.getByRole('link', { name: 'Thông tin tham khảo' }).count(), 1);
  });
  await page.getByLabel('Tình huống', { exact: true }).selectOption('empty');
  await check('Nội dung rỗng không tạo dòng thừa', async () => assert.equal(await preview.locator(':scope > *').count(), 0));
  await check('Gõ Markdown và cập nhật từng phần như streaming', async () => {
    const input = page.getByLabel('Nội dung Markdown', { exact: true });
    for (const chunk of ['## Theo dõi', '## Theo dõi\n\n- **Bước 01', '## Theo dõi\n\n- **Bước 01:** Kiểm tra lá.\n- **Bước 02:** Ghi lại triệu chứng.']) {
      await input.fill(chunk);
      assert.ok((await preview.innerText()).includes('Theo dõi'));
    }
    assert.equal((await layout(preview)).filter(row => row.isList).length, 2);
  });
  await check('Không có lỗi trình duyệt hoặc yêu cầu thất bại', () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(failedRequests, []);
  });
  await check('Không gửi yêu cầu ra BE hay dịch vụ ngoài', () => assert.deepEqual(externalRequests, []));
  const report = {
    phase, browser: browser.version(), timestamp: new Date().toISOString(),
    passed: results.filter(result => result.status === 'PASS').length,
    failed: results.filter(result => result.status === 'FAIL').length,
    results, measurements, errors, failedRequests, externalRequests,
  };
  await writeFile(new URL(`${phase}-browser.json`, output), JSON.stringify(report, null, 2) + '\n');
  console.log(`${phase}: ${report.passed} PASS, ${report.failed} FAIL`);
  for (const result of results.filter(result => result.status === 'FAIL')) console.log(`FAIL ${result.name}: ${result.detail}`);
  if (report.failed) process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
