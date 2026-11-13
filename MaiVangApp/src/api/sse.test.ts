import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeSseResponse, parseSseChunks } from './sse';
import { ApiError } from './errors';

async function collect(chunks: Array<string | Uint8Array>) {
  return [...(await (async () => {
    const events = [];
    for await (const event of parseSseChunks((async function* () {
      for (const chunk of chunks) yield chunk;
    })())) events.push(event);
    return events;
  })())];
}

test('SSE parser joins an event split across network chunks', async () => {
  const events = await collect([
    'data: {"type":"progress","stage":"pre',
    'paring"}\n\n',
  ]);

  assert.deepEqual(events, [{ type: 'progress', stage: 'preparing' }]);
});

test('SSE parser emits every event when one chunk contains multiple frames', async () => {
  const events = await collect([
    'data: {"type":"progress","stage":"preparing"}\n\n'
      + 'data: {"type":"progress","stage":"processing"}\n\n',
  ]);

  assert.deepEqual(events, [
    { type: 'progress', stage: 'preparing' },
    { type: 'progress', stage: 'processing' },
  ]);
});

test('SSE parser ignores heartbeat comments and accepts UTF-8 byte chunks', async () => {
  const events = await collect([
    new TextEncoder().encode(': keep-alive\n\n'),
    new TextEncoder().encode('data: {"type":"complete","answer":"Đã xong"}\n\n'),
  ]);

  assert.deepEqual(events, [{ type: 'complete', answer: 'Đã xong' }]);
});

test('SSE parser rejects malformed JSON and incomplete trailing frames', async () => {
  await assert.rejects(
    () => collect(['data: {not-json}\n\n']),
    /Dữ liệu SSE không hợp lệ/,
  );
  await assert.rejects(
    () => collect(['data: {"type":"complete"}']),
    /Luồng SSE kết thúc trước khi nhận đủ event/,
  );
});

test('SSE response maps an aborted body read to a timeout ApiError', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const error = new Error('aborted');
      error.name = 'AbortError';
      controller.error(error);
    },
  });

  await assert.rejects(
    () => consumeSseResponse(new Response(stream), () => undefined),
    (error: unknown) => error instanceof ApiError && error.kind === 'timeout',
  );
});

test('SSE response cancels the reader when a terminal error arrives', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"error","code":"rag_timeout","message":"Quá lâu"}\n\n'));
    },
    cancel() { cancelled = true; },
  });

  await assert.rejects(
    () => consumeSseResponse(new Response(stream), () => undefined),
    (error: unknown) => error instanceof ApiError && error.kind === 'timeout' && error.status === 504,
  );
  assert.equal(cancelled, true);
});
