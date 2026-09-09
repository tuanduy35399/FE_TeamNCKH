import { resolveBackendUrl } from './config';
import { ApiError } from './errors';
import type { Account, ChatMessage, DiseaseDetail, HistoryItem } from '../types/domain';
export function normalizeAccount(value: unknown): Account {
  if (!value || typeof value !== 'object') throw new ApiError('Dữ liệu tài khoản không hợp lệ.', undefined, undefined, 'malformed');
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'number' || typeof raw.username !== 'string' || typeof raw.name !== 'string' || typeof raw.email !== 'string') throw new ApiError('Dữ liệu tài khoản không đầy đủ.', undefined, undefined, 'malformed');
  return { id: raw.id, username: raw.username, name: raw.name, email: raw.email, isStaff: raw.is_staff === true, dateJoined: typeof raw.date_joined === 'string' ? raw.date_joined : undefined };
}
export function normalizeDisease(value: unknown): DiseaseDetail {
  const raw = (value || {}) as Record<string, unknown>;
  return { id: Number(raw.id), name: String(raw.name || ''), information: String(raw.infor || ''), imageUrl: resolveBackendUrl(typeof raw.img_ex === 'string' ? raw.img_ex : undefined) };
}
export function normalizeHistoryItem(value: unknown): HistoryItem {
  if (!value || typeof value !== 'object') throw new ApiError('Dữ liệu lịch sử không hợp lệ.', undefined, undefined, 'malformed');
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'number' || typeof raw.title !== 'string' || typeof raw.created_at !== 'string' || typeof raw.updated_at !== 'string') throw new ApiError('Dữ liệu lịch sử không đầy đủ.', undefined, undefined, 'malformed');
  return { id: raw.id, title: raw.title, createdAt: raw.created_at, updatedAt: raw.updated_at };
}
function normalizeMessage(value: unknown): ChatMessage {
  if (!value || typeof value !== 'object') throw new ApiError('Tin nhắn lịch sử không hợp lệ.', undefined, undefined, 'malformed');
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'number' || (raw.role !== 'user' && raw.role !== 'assistant') || typeof raw.content !== 'string' || typeof raw.created_at !== 'string') throw new ApiError('Tin nhắn lịch sử không đầy đủ.', undefined, undefined, 'malformed');
  return { id: raw.id, role: raw.role, content: raw.content, createdAt: raw.created_at };
}
export function normalizeHistoryDetail(value: unknown): HistoryItem {
  const item = normalizeHistoryItem(value);
  const messages = (value as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) throw new ApiError('Chi tiết lịch sử không có danh sách tin nhắn.', undefined, undefined, 'malformed');
  return { ...item, messages: messages.map(normalizeMessage) };
}
