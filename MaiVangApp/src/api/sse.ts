import { ApiError } from './errors';

export type SseEvent = Record<string, unknown> & { type: string };

function parseFrame(frame: string): SseEvent | undefined {
  const dataLines = frame
    .split('\n')
    .filter(line => !line.startsWith(':') && line.startsWith('data:'))
    .map(line => line.slice(5).replace(/^ /, ''));
  if (!dataLines.length) return undefined;
  try {
    const payload: unknown = JSON.parse(dataLines.join('\n'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof (payload as { type?: unknown }).type !== 'string') {
      throw new Error('missing event type');
    }
    return payload as SseEvent;
  } catch {
    throw new ApiError('Dữ liệu SSE không hợp lệ.', undefined, undefined, 'malformed');
  }
}

export async function* parseSseChunks(
  chunks: AsyncIterable<string | Uint8Array>,
): AsyncGenerator<SseEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  const emitFrames = async function* (): AsyncGenerator<SseEvent> {
    buffer = buffer.replace(/\r\n?/g, '\n');
    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex >= 0) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const parsed = parseFrame(frame);
      if (parsed) yield parsed;
      separatorIndex = buffer.indexOf('\n\n');
    }
  };

  for await (const chunk of chunks) {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    for await (const event of emitFrames()) yield event;
  }
  buffer += decoder.decode();
  for await (const event of emitFrames()) yield event;
  if (buffer.trim()) throw new ApiError('Luồng SSE kết thúc trước khi nhận đủ event.', undefined, undefined, 'network');
}

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: SseEvent) => void,
): Promise<SseEvent> {
  if (!response.body) throw new ApiError('Máy chủ không hỗ trợ luồng dữ liệu.', response.status, undefined, 'malformed');
  const reader = response.body.getReader();
  let readerDone = false;
  async function* chunks(): AsyncGenerator<Uint8Array> {
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) {
          readerDone = true;
          return;
        }
        if (result.value) yield result.value;
      }
    } finally {
      if (!readerDone) {
        try { await reader.cancel(); } catch { /* The body may already be closed. */ }
      }
      reader.releaseLock();
    }
  }

  try {
    let terminal: SseEvent | undefined;
    for await (const event of parseSseChunks(chunks())) {
      onEvent(event);
      if (event.type === 'error') {
        const message = typeof event.message === 'string' ? event.message : 'MaiCare không thể hoàn tất yêu cầu.';
        const code = typeof event.code === 'string' ? event.code : undefined;
        const timeout = code === 'rag_timeout';
        const status = timeout ? 504 : code === 'rag_unavailable' ? 503 : code === 'rag_invalid_response' ? 502 : undefined;
        throw new ApiError(message, status, undefined, timeout ? 'timeout' : status === 503 ? 'unavailable' : 'http', code);
      }
      if (event.type === 'complete') terminal = event;
    }
    if (!terminal) throw new ApiError('Luồng SSE kết thúc trước khi nhận câu trả lời.', undefined, undefined, 'malformed');
    return terminal;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', undefined, undefined, 'timeout');
    }
    throw new ApiError('Kết nối tới máy chủ bị gián đoạn. Vui lòng thử lại.', undefined, undefined, 'network');
  }
}
