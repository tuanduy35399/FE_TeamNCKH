import assert from 'node:assert/strict';
import test from 'node:test';
import { apiRequest } from './client';
import { ApiError } from './errors';

test('request timeout always settles and is distinct from a no-status network error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => await new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      const error = new Error('aborted'); error.name = 'AbortError'; reject(error);
    });
  });
  try {
    await assert.rejects(
      () => apiRequest('/test-timeout/', { timeoutMs: 5 }),
      (error: unknown) => error instanceof ApiError
        && error.kind === 'timeout'
        && error.userMessage === 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
    );
  } finally { globalThis.fetch = originalFetch; }
});
