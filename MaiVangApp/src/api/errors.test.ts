import assert from 'node:assert/strict';
import test from 'node:test';
import { apiMessage, fieldErrorsFromPayload, transportDiagnostics } from './errors';

test('maps backend status codes to safe Vietnamese messages', () => {
  for (const status of [400, 401, 403, 404, 409, 413, 415, 422, 429, 500]) {
    const message = apiMessage(status, {});
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 8);
  }
});

test('does not expose a server detail for 401 or 500', () => {
  assert.doesNotMatch(apiMessage(401, { detail: 'token_not_valid internals' }), /internals/);
  assert.doesNotMatch(apiMessage(500, { detail: 'database password leaked' }), /password/);
});

test('normalizes DRF field error arrays', () => {
  assert.deepEqual(fieldErrorsFromPayload({ username: ['Already exists.'], email: ['Invalid.'] }), {
    username: 'Already exists.', email: 'Invalid.',
  });
  assert.equal(fieldErrorsFromPayload(null), undefined);
});

test('network and timeout diagnostics remain distinct without credentials', () => {
  const network = transportDiagnostics(Object.assign(new TypeError('Network request failed'), { code: 'ERR_NETWORK' }));
  assert.equal(network.network, true);
  assert.equal(network.timeout, false);
  assert.equal(network.code, 'ERR_NETWORK');
  const timeout = transportDiagnostics(Object.assign(new Error('Aborted'), { name: 'AbortError' }), true);
  assert.equal(timeout.timeout, true);
  assert.equal(timeout.abort, true);
  assert.equal(timeout.network, false);
});
