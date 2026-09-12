import type { ChatMessage, Detection } from '../types/domain';

export type LocalImageTurnMetadata = {
  conversationId: number;
  description?: string;
  detections: Detection[];
  imageUri?: string;
  imageWidth?: number;
  imageHeight?: number;
  userMessageId?: number;
  assistantMessageId?: number;
};

/**
 * Server messages remain authoritative. Local metadata only enriches matching turns
 * and never creates or removes a message.
 */
export function mergeLocalImageTurns(messages: ChatMessage[], records: LocalImageTurnMetadata[]): ChatMessage[] {
  if (!messages.length || !records.length) return messages;
  const merged = messages.map(message => ({ ...message }));
  records.forEach(record => {
    if (!record.imageUri) return;
    let userIndex = record.userMessageId == null ? -1 : merged.findIndex(message => message.id === record.userMessageId && message.role === 'user');
    if (userIndex < 0 && record.description) {
      userIndex = merged.findIndex(message => message.role === 'user' && message.content.trim() === record.description!.trim());
    }
    if (userIndex < 0) {
      for (let index = merged.length - 1; index >= 0; index -= 1) {
        if (merged[index]?.role === 'user') { userIndex = index; break; }
      }
    }
    if (userIndex < 0) return;
    merged[userIndex] = { ...merged[userIndex]!, imageUri: record.imageUri, imageWidth: record.imageWidth, imageHeight: record.imageHeight, detections: record.detections };

    let assistantIndex = record.assistantMessageId == null ? -1 : merged.findIndex(message => message.id === record.assistantMessageId && message.role === 'assistant');
    if (assistantIndex < 0) {
      assistantIndex = merged.findIndex((message, index) => index > userIndex && message.role === 'assistant');
    }
    if (assistantIndex >= 0) merged[assistantIndex] = { ...merged[assistantIndex]!, detections: record.detections };
  });
  return merged;
}
