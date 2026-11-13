import assert from 'node:assert/strict';
import test from 'node:test';
import { sendHistoryImageStream, sendHistoryTextStream } from './history';
import { ApiError } from './errors';
import { setRuntimeApiBaseUrl } from './config';

setRuntimeApiBaseUrl('http://local.test');

test('text stream client sends the stream endpoint and returns complete payload', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      'data: {"type":"progress","stage":"preparing"}\n\n'
        + 'data: {"type":"complete","answer":"Đã xong","history_id":7,"detections":[]}\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
    );
  };
  try {
    const events: unknown[] = [];
    const result = await sendHistoryTextStream(7, 'Lá vàng?', event => events.push(event));
    assert.equal(calls[0]!.url, 'http://local.test/api/v1/history/7/chat/stream/');
    assert.equal(calls[0]!.init?.method, 'POST');
    assert.deepEqual(result, { type: 'complete', answer: 'Đã xong', history_id: 7, detections: [] });
    assert.equal(events.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('text stream client converts terminal SSE error to ApiError', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    'data: {"type":"error","code":"rag_timeout","message":"Quá lâu"}\n\n',
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
  try {
    await assert.rejects(
      () => sendHistoryTextStream(8, 'Câu hỏi', () => undefined),
      (error: unknown) => error instanceof ApiError && error.userMessage === 'Quá lâu',
    );
  } finally { globalThis.fetch = originalFetch; }
});

test('image stream client sends multipart data to the image stream endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      'data: {"type":"complete","answer":"Đã xong","history_id":9,"detections":[]}\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    );
  };
  try {
    await sendHistoryImageStream(9, {
      uri: 'file:///leaf.jpg', name: 'leaf.jpg', mimeType: 'image/jpeg',
      file: new Blob(['leaf-bytes'], { type: 'image/jpeg' }),
    }, 'Bệnh gì?', () => undefined);
    assert.equal(calls[0]!.url, 'http://local.test/api/v1/history/9/chat/image/stream/');
    assert.equal(calls[0]!.init?.method, 'POST');
    assert.equal(calls[0]!.init?.body instanceof FormData, true);
  } finally { globalThis.fetch = originalFetch; }
});
