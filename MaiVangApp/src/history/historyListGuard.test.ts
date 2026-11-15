import assert from 'node:assert/strict';
import test from 'node:test';
import { HistoryListGuard } from './historyListGuard';

test('only the newest overlapping history refresh may update the list', () => {
  const guard = new HistoryListGuard();
  const slow = guard.beginLoad();
  const fast = guard.beginLoad();
  assert.equal(guard.isCurrent(fast), true);
  assert.equal(guard.isCurrent(slow), false);
});

test('a slow GET cannot reintroduce a deleted history item', () => {
  const guard = new HistoryListGuard();
  guard.beginLoad();
  guard.markDeleted(12);
  assert.deepEqual(guard.visible([{ id: 11 }, { id: 12 }, { id: 13 }]), [{ id: 11 }, { id: 13 }]);
  guard.restore(12);
  assert.deepEqual(guard.visible([{ id: 12 }]), [{ id: 12 }]);
});

test('deleting the last item produces an empty list without affecting other IDs', () => {
  const guard = new HistoryListGuard();
  guard.markDeleted(9);
  assert.deepEqual(guard.visible([{ id: 9 }]), []);
  assert.deepEqual(guard.visible([{ id: 10 }]), [{ id: 10 }]);
});
