import assert from 'node:assert/strict';
import test from 'node:test';
import { submitDiagnosis } from './diagnosis';
import { ApiError } from './errors';
import { getHistory, getHistoryDetail, nativeImageDescriptor, sendHistoryImage } from './history';

const timestamp = '2026-09-03T10:00:00Z';
const historyDto = (id: number, title = 'MaiCare conversation', updatedAt = timestamp) => ({
  id, title, created_at: timestamp, updated_at: updatedAt,
});

test('rejects an empty diagnosis without making a request', async () => {
  await assert.rejects(() => submitDiagnosis({}), (error: unknown) => error instanceof ApiError && error.status === 422);
});

test('HIST-01 and HIST-03 create one persistent session and reuse it for a follow-up', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    if (calls.length === 1) return new Response(JSON.stringify(historyDto(7, 'Yellow leaves')), { status: 201 });
    return new Response(JSON.stringify({ question: 'Question', answer: 'Answer', history_id: 7 }), { status: 200 });
  };
  try {
    const first = await submitDiagnosis({ text: 'Question' });
    const followUp = await submitDiagnosis({ text: 'Follow-up', conversationId: first.conversationId });
    assert.equal(first.conversationId, 7);
    assert.equal(followUp.conversationId, 7);
    assert.equal(calls.filter(call => call.url.endsWith('/api/v1/history/')).length, 1);
    assert.equal(calls.filter(call => call.url.endsWith('/api/v1/history/7/chat/')).length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('HIST-06 successful image creates one session and preserves bytes, filename, MIME, and omitted question', async () => {
  const originalFetch = globalThis.fetch;
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_input, init) => {
    calls.push(init || {});
    if (calls.length === 1) return new Response(JSON.stringify(historyDto(8, 'Image check')), { status: 201 });
    return new Response(JSON.stringify({ answer: 'Diagnosis', history_id: 8, detections: [{ name: 'đốm lá', confidence: 0.91 }] }), { status: 200 });
  };
  try {
    const result = await submitDiagnosis({ image: { uri: 'file:///leaf.jpg', name: 'leaf.jpg', mimeType: 'image/jpeg', file: new Blob(['leaf-bytes'], { type: 'image/jpeg' }) } });
    const form = calls[1]!.body as FormData;
    const file = form.get('image') as Blob & { name?: string };
    assert.equal(file.name, 'leaf.jpg');
    assert.equal(file.type, 'image/jpeg');
    assert.equal(Buffer.from(await file.arrayBuffer()).toString(), 'leaf-bytes');
    assert.equal(form.has('question'), false);
    assert.equal(new Headers(calls[1]!.headers).has('Content-Type'), false);
    assert.equal(calls.length, 2);
    assert.deepEqual(result.detections, [{ label: 'đốm lá', confidence: 0.91 }]);
  } finally { globalThis.fetch = originalFetch; }
});

test('multipart image-plus-text uses the exact optional question field', async () => {
  const originalFetch = globalThis.fetch;
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_input, init) => {
    calls.push(init || {});
    if (calls.length === 1) return new Response(JSON.stringify(historyDto(9, 'Brown spots')), { status: 201 });
    return new Response(JSON.stringify({ answer: 'Diagnosis', history_id: 9, detections: [] }), { status: 200 });
  };
  try {
    await submitDiagnosis({ image: { uri: 'file:///leaf.png', name: 'leaf.png', mimeType: 'image/png', file: new Blob(['png-bytes'], { type: 'image/png' }) }, text: 'Brown spots' });
    const form = calls[1]!.body as FormData;
    assert.equal((form.get('image') as Blob & { name?: string }).name, 'leaf.png');
    assert.equal(form.get('question'), 'Brown spots');
  } finally { globalThis.fetch = originalFetch; }
});

test('HIST-07 failed image removes the newly created empty session', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method || 'GET' });
    if (calls.length === 1) return new Response(JSON.stringify(historyDto(10, 'Image check')), { status: 201 });
    if (calls.length === 2) return new Response(JSON.stringify({ image: ['invalid'] }), { status: 400 });
    return new Response(null, { status: 204 });
  };
  try {
    await assert.rejects(() => submitDiagnosis({ image: { uri: 'file:///leaf.jpg', name: 'leaf.jpg', file: new Blob(['leaf']) } }), ApiError);
    assert.deepEqual(calls.map(call => call.method), ['POST', 'POST', 'DELETE']);
    assert.equal(calls[2]!.url.endsWith('/api/v1/history/10/'), true);
  } finally { globalThis.fetch = originalFetch; }
});

test('HIST-07 malformed success also removes the newly created session', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method || 'GET' });
    if (calls.length === 1) return new Response(JSON.stringify(historyDto(11, 'Malformed result')), { status: 201 });
    if (calls.length === 2) return new Response(JSON.stringify({ answer: '', history_id: 11 }), { status: 200 });
    return new Response(null, { status: 204 });
  };
  try {
    await assert.rejects(() => submitDiagnosis({ text: 'Question' }), (error: unknown) => error instanceof ApiError && error.kind === 'malformed');
    assert.deepEqual(calls.map(call => call.method), ['POST', 'POST', 'DELETE']);
    assert.equal(calls[2]!.url.endsWith('/api/v1/history/11/'), true);
  } finally { globalThis.fetch = originalFetch; }
});

test('HIST-08 retry success leaves exactly the successful session', async () => {
  const originalFetch = globalThis.fetch;
  let nextId = 10;
  let failed = false;
  const created: number[] = [];
  const deleted: number[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/v1/history/')) {
      const id = ++nextId; created.push(id);
      return new Response(JSON.stringify(historyDto(id, 'Image check')), { status: 201 });
    }
    if (init?.method === 'DELETE') {
      deleted.push(Number(url.split('/history/')[1]?.split('/')[0]));
      return new Response(null, { status: 204 });
    }
    if (!failed) {
      failed = true;
      return new Response(JSON.stringify({ detail: 'temporary failure' }), { status: 503 });
    }
    return new Response(JSON.stringify({ answer: 'Diagnosis', history_id: nextId, detections: [] }), { status: 200 });
  };
  const input = { image: { uri: 'file:///leaf.jpg', name: 'leaf.jpg', file: new Blob(['leaf']) } };
  try {
    await assert.rejects(() => submitDiagnosis(input), ApiError);
    const result = await submitDiagnosis(input);
    assert.deepEqual(created, [11, 12]);
    assert.deepEqual(deleted, [11]);
    assert.equal(result.conversationId, 12);
  } finally { globalThis.fetch = originalFetch; }
});

test('HIST-02 detail keeps multiple messages inside one conversation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ...historyDto(20, 'One conversation'),
    messages: [
      { id: 1, role: 'user', content: 'Question', created_at: timestamp },
      { id: 2, role: 'assistant', content: 'Answer', created_at: timestamp },
      { id: 3, role: 'user', content: 'Follow-up', created_at: timestamp },
      { id: 4, role: 'assistant', content: 'Second answer', created_at: timestamp },
    ],
  }), { status: 200 });
  try {
    const detail = await getHistoryDetail(20);
    assert.equal(detail.id, 20);
    assert.equal(detail.messages?.length, 4);
  } finally { globalThis.fetch = originalFetch; }
});

test('HIST-04 and HIST-09 retain distinct sessions by ID and remove duplicate source IDs', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([
    historyDto(30, 'Same text', '2026-09-03T10:00:00Z'),
    historyDto(31, 'Same text', '2026-09-03T12:00:00Z'),
    historyDto(30, 'Same text', '2026-09-03T10:00:00Z'),
  ]), { status: 200 });
  try {
    const list = await getHistory();
    assert.deepEqual(list.map(item => item.id), [31, 30]);
    assert.equal(list.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('history parser never turns malformed server responses into a false empty state', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ results: [] }), { status: 200 });
    await assert.rejects(() => getHistory(), (error: unknown) => error instanceof ApiError && error.kind === 'malformed');
    globalThis.fetch = async () => new Response(JSON.stringify(historyDto(21)), { status: 200 });
    await assert.rejects(() => getHistoryDetail(21), (error: unknown) => error instanceof ApiError && error.kind === 'malformed');
  } finally { globalThis.fetch = originalFetch; }
});

test('History A and B remain isolated when each is reopened and continued', async () => {
  const originalFetch = globalThis.fetch;
  const histories = new Map([
    [71, [
      { id: 1, role: 'user', content: 'A1', created_at: timestamp },
      { id: 2, role: 'assistant', content: 'assistant A1', created_at: timestamp },
    ]],
    [72, [
      { id: 3, role: 'user', content: 'B1', created_at: timestamp },
      { id: 4, role: 'assistant', content: 'assistant B1', created_at: timestamp },
    ]],
  ]);
  globalThis.fetch = async (input, init) => {
    const id = Number(String(input).match(/history\/(\d+)\//)?.[1]);
    if ((init?.method || 'GET') === 'POST') {
      const question = JSON.parse(String(init?.body)).question as string;
      const list = histories.get(id)!;
      list.push(
        { id: list.length + 10, role: 'user', content: question, created_at: timestamp },
        { id: list.length + 11, role: 'assistant', content: `assistant ${question}`, created_at: timestamp },
      );
      return new Response(JSON.stringify({ question, answer: `assistant ${question}`, history_id: id }), { status: 200 });
    }
    return new Response(JSON.stringify({ ...historyDto(id, `History ${id}`), messages: histories.get(id) }), { status: 200 });
  };
  try {
    assert.deepEqual((await getHistoryDetail(71)).messages?.map(value => value.content), ['A1', 'assistant A1']);
    await submitDiagnosis({ text: 'A2', conversationId: 71 });
    assert.deepEqual((await getHistoryDetail(72)).messages?.map(value => value.content), ['B1', 'assistant B1']);
    await submitDiagnosis({ text: 'B2', conversationId: 72 });
    const a = (await getHistoryDetail(71)).messages?.map(value => value.content) || [];
    const b = (await getHistoryDetail(72)).messages?.map(value => value.content) || [];
    assert.deepEqual(a, ['A1', 'assistant A1', 'A2', 'assistant A2']);
    assert.equal(a.some(value => value.includes('B')), false);
    assert.deepEqual(b, ['B1', 'assistant B1', 'B2', 'assistant B2']);
    assert.equal(b.some(value => value.includes('A')), false);
  } finally { globalThis.fetch = originalFetch; }
});

test('native iOS file upload descriptor preserves URI, filename, MIME, and question', () => {
  assert.deepEqual(nativeImageDescriptor({ uri: 'file:///var/mobile/IMG_0230.jpg', name: 'IMG_0230.jpg', mimeType: 'image/jpeg' }, 'test diagnosis'), {
    uri: 'file:///var/mobile/IMG_0230.jpg', name: 'IMG_0230.jpg', mimeType: 'image/jpeg', parameters: { question: 'test diagnosis' },
  });
});

test('HTTP 503 is an upstream diagnosis failure, never an empty-detections success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'YOLO service unavailable' }), { status: 503 });
  try {
    await assert.rejects(
      () => sendHistoryImage(41, { uri: 'file:///leaf.jpg', name: 'leaf.jpg', file: new Blob(['leaf'], { type: 'image/jpeg' }) }),
      (error: unknown) => error instanceof ApiError
        && error.status === 503
        && error.userMessage.includes('chẩn đoán hình ảnh hiện chưa sẵn sàng'),
    );
  } finally { globalThis.fetch = originalFetch; }
});

test('HTTP 200 with detections [] remains a real successful no-detection response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    question: 'Kiểm tra lá', answer: 'Không thấy dấu hiệu đủ rõ.', history_id: 42, detections: [],
  }), { status: 200 });
  try {
    const result = await sendHistoryImage(42, { uri: 'file:///leaf.jpg', name: 'leaf.jpg', file: new Blob(['leaf'], { type: 'image/jpeg' }) }, 'Kiểm tra lá');
    assert.equal(result.history_id, 42);
    assert.deepEqual(result.detections, []);
    assert.equal(result.answer, 'Không thấy dấu hiệu đủ rõ.');
  } finally { globalThis.fetch = originalFetch; }
});

test('image no-status transport failure remains distinct from HTTP 503', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('Network request failed'); };
  try {
    await assert.rejects(
      () => sendHistoryImage(43, { uri: 'file:///leaf.jpg', name: 'leaf.jpg', file: new Blob(['leaf'], { type: 'image/jpeg' }) }),
      (error: unknown) => error instanceof ApiError
        && error.status === undefined
        && error.kind === 'network'
        && error.userMessage.includes('Không thể kết nối máy chủ'),
    );
  } finally { globalThis.fetch = originalFetch; }
});
