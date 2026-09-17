import type { ChatMessage } from '../types/domain';
import { mergeLocalImageTurns, type LocalImageTurnMetadata } from '../history/imageHistoryMerge';

export async function safelyEnrichServerMessages(
  serverMessages: ChatMessage[],
  loadMetadata: () => Promise<LocalImageTurnMetadata[]>,
  onFailure?: (error: unknown) => void,
): Promise<ChatMessage[]> {
  try {
    return mergeLocalImageTurns(serverMessages, await loadMetadata());
  } catch (error) {
    onFailure?.(error);
    return serverMessages;
  }
}
