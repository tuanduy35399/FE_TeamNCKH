import assert from 'node:assert/strict';
import test from 'node:test';
import { recordsWithoutConversation } from './localImageHistoryScope';

test('local diagnosis cleanup removes only the matching user and conversation', () => {
  const records = [
    { userId: 1, conversationId: 10, key: 'target-a' },
    { userId: 1, conversationId: 10, key: 'target-b' },
    { userId: 1, conversationId: 11, key: 'same-user-other-chat' },
    { userId: 2, conversationId: 10, key: 'other-user-same-chat-id' },
  ];
  assert.deepEqual(recordsWithoutConversation(records, 1, 10), [records[2], records[3]]);
});
