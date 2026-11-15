export function recordsWithoutConversation<T extends { userId: number; conversationId: number }>(records: T[], userId: number, conversationId: number): T[] {
  return records.filter(record => record.userId !== userId || record.conversationId !== conversationId);
}
