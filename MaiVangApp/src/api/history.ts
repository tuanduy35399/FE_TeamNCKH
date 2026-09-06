import { AI_TIMEOUT_MS } from './config';
import { apiRequest } from './client';
import { HISTORY_ENDPOINTS } from './endpoints';
import { normalizeHistoryDetail, normalizeHistoryItem } from './normalizers';
import type { HistoryItem, SelectedImage } from '../types/domain';
import { ApiError } from './errors';

type HistoryListDto = { id: number; title: string; created_at: string; updated_at: string };
type MessageDto = { id: number; role: string; content: string; created_at: string };
type HistoryDetailDto = HistoryListDto & { messages: MessageDto[] };
export type InteractionDto = { question?: unknown; answer?: unknown; history_id?: unknown; detections?: unknown };

export async function getHistory(): Promise<HistoryItem[]> {
  const value = await apiRequest<HistoryListDto[]>(HISTORY_ENDPOINTS.list, { auth: true });
  if (!Array.isArray(value)) return [];
  const byId = new Map<number, HistoryItem>();
  value.map(normalizeHistoryItem).forEach(item => byId.set(item.id, item));
  return [...byId.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}
export async function getHistoryDetail(id: number): Promise<HistoryItem> {
  return normalizeHistoryDetail(await apiRequest<HistoryDetailDto>(HISTORY_ENDPOINTS.detail(id), { auth: true }));
}
export async function createHistory(title: string): Promise<HistoryItem> {
  return normalizeHistoryItem(await apiRequest<HistoryListDto>(HISTORY_ENDPOINTS.list, { method: 'POST', auth: true, body: JSON.stringify({ title }) }));
}
export async function deleteHistory(id: number): Promise<void> {
  await apiRequest(HISTORY_ENDPOINTS.detail(id), { method: 'DELETE', auth: true });
}
export async function sendHistoryText(id: number, question: string): Promise<InteractionDto> {
  return apiRequest<InteractionDto>(HISTORY_ENDPOINTS.chat(id), { method: 'POST', auth: true, timeoutMs: AI_TIMEOUT_MS, body: JSON.stringify({ question }) });
}
async function imagePart(image: SelectedImage): Promise<Blob | { uri: string; name: string; type: string }> {
  if (image.file) return image.file;
  if (typeof document === 'undefined') return { uri: image.uri, name: image.name, type: image.mimeType || 'image/jpeg' };
  const response = await fetch(image.uri);
  return response.blob();
}
export async function sendHistoryImage(id: number, image: SelectedImage, question?: string): Promise<InteractionDto> {
  const body = new FormData();
  const part = await imagePart(image);
  if (part instanceof Blob) body.append('image', part, image.name);
  else body.append('image', part as unknown as Blob);
  if (question) body.append('question', question);
  try {
    return await apiRequest<InteractionDto>(HISTORY_ENDPOINTS.imageChat(id), { method: 'POST', auth: true, timeoutMs: AI_TIMEOUT_MS, body });
  } catch (error) {
    if (error instanceof ApiError && [400, 413, 415, 422].includes(error.status || 0)) throw new ApiError('Ảnh này chưa thể sử dụng. Vui lòng chọn ảnh khác.', error.status, error.fieldErrors);
    throw error;
  }
}
