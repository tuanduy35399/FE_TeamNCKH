import type { ChatMessage } from '../types/domain';

/**
 * Django persists the user turn before calling AI. A manual retry therefore
 * creates another identical user row. Keep the server data authoritative while
 * collapsing only the consecutive retry copies in the rendered conversation.
 */
export function collapsePersistedRetryCopies(messages: ChatMessage[], question: string): ChatMessage[] {
  const normalized = question.trim();
  if (!normalized || messages.length < 2) return messages;
  let latestUser = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') { latestUser = index; break; }
  }
  if (latestUser < 1 || messages[latestUser]?.content.trim() !== normalized) return messages;
  let firstCopy = latestUser;
  while (firstCopy > 0) {
    const previous = messages[firstCopy - 1];
    if (previous?.role !== 'user' || previous.content.trim() !== normalized) break;
    firstCopy -= 1;
  }
  if (firstCopy === latestUser) return messages;
  return messages.filter((_message, index) => index < firstCopy || index >= latestUser);
}
