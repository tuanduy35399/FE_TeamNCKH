import { AI_TIMEOUT_MS } from './config';
import { apiRequest } from './client';
import { CHAT_ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
export type HistoryMessageDto = { role: 'user' | 'assistant'; content: string };
export type ChatRequestDto = { question: string; history: HistoryMessageDto[] };
export type ChatResponseDto = { answer: string };
export async function chat(request: ChatRequestDto): Promise<ChatResponseDto> {
  const response = await apiRequest<ChatResponseDto>(CHAT_ENDPOINTS.chat, { service: 'chat', method: 'POST', timeoutMs: AI_TIMEOUT_MS, body: JSON.stringify(request) });
  if (typeof response.answer !== 'string') throw new ApiError('MaiCare chưa nhận được nội dung trả lời.', undefined, undefined, 'malformed');
  return response;
}
