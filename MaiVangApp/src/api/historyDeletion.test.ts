import assert from 'node:assert/strict';
import test from 'node:test';
import { configureApiSession } from './client';
import { setRuntimeApiBaseUrl } from './config';
import { ApiError } from './errors';
import { deleteHistory } from './history';

setRuntimeApiBaseUrl('http://history.test');

test('history deletion sends one authenticated DELETE to the exact detail endpoint and accepts 204', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; authorization: string | null }> = [];
  configureApiSession({ getSession: () => ({ accessToken: 'access', refreshToken: 'refresh' }), updateSession: async () => undefined, invalidate: async () => undefined });
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method, authorization: new Headers(init?.headers).get('Authorization') });
    return new Response(null, { status: 204 });
  };
  try {
    await deleteHistory(42);
    assert.deepEqual(calls, [{ url: 'http://history.test/api/v1/history/42/', method: 'DELETE', authorization: 'Bearer access' }]);
  } finally { globalThis.fetch = originalFetch; configureApiSession(null); }
});

test('history deletion accepts compatible successful 200 and 202 responses', async () => {
  const originalFetch = globalThis.fetch;
  configureApiSession({ getSession: () => ({ accessToken: 'access', refreshToken: 'refresh' }), updateSession: async () => undefined, invalidate: async () => undefined });
  try {
    for (const status of [200, 202]) {
      globalThis.fetch = async () => new Response(status === 200 ? '{}' : null, { status });
      await deleteHistory(status);
    }
  } finally { globalThis.fetch = originalFetch; configureApiSession(null); }
});

test('history deletion retries exactly once with a refreshed JWT after 401', async () => {
  const originalFetch = globalThis.fetch;
  let accessToken = 'expired';
  const calls: string[] = [];
  configureApiSession({
    getSession: () => ({ accessToken, refreshToken: 'refresh' }),
    updateSession: async session => { accessToken = session.accessToken; },
    invalidate: async () => assert.fail('session should not be invalidated after a successful refresh'),
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input); calls.push(`${init?.method || 'GET'} ${url} ${new Headers(init?.headers).get('Authorization') || ''}`);
    if (url.endsWith('/user/login/refresh/')) return new Response(JSON.stringify({ access: 'fresh' }), { status: 200 });
    if (new Headers(init?.headers).get('Authorization') === 'Bearer expired') return new Response('{}', { status: 401 });
    return new Response(null, { status: 204 });
  };
  try {
    await deleteHistory(7);
    assert.equal(calls.length, 3);
    assert.match(calls[0]!, /DELETE .*\/history\/7\/.*Bearer expired/);
    assert.match(calls[1]!, /POST .*\/user\/login\/refresh\//);
    assert.match(calls[2]!, /DELETE .*\/history\/7\/.*Bearer fresh/);
  } finally { globalThis.fetch = originalFetch; configureApiSession(null); }
});

test('history deletion preserves HTTP failures and transport failure kinds', async () => {
  const originalFetch = globalThis.fetch;
  configureApiSession({ getSession: () => ({ accessToken: 'access', refreshToken: 'refresh' }), updateSession: async () => undefined, invalidate: async () => undefined });
  try {
    for (const status of [403, 404, 500]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ detail: `failure ${status}` }), { status });
      await assert.rejects(() => deleteHistory(status), (error: unknown) => error instanceof ApiError && error.status === status);
    }
    globalThis.fetch = async () => { throw new TypeError('offline'); };
    await assert.rejects(() => deleteHistory(8), (error: unknown) => error instanceof ApiError && error.kind === 'network');
    globalThis.fetch = async (_input, init) => await new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => { const error = new Error('aborted'); error.name = 'AbortError'; reject(error); }));
    await assert.rejects(() => deleteHistory(9, 5), (error: unknown) => error instanceof ApiError && error.kind === 'timeout');
  } finally { globalThis.fetch = originalFetch; configureApiSession(null); }
});
