import { resolveBackendUrl } from './config';
import { ApiError } from './errors';
import type { Account, BoundingBox, ChatMessage, ChatResult, Detection, DiseaseDetail, HistoryItem } from '../types/domain';
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

function optionalBox(raw: Record<string, unknown>): BoundingBox | undefined {
  const candidate = raw.bbox ?? raw.bbox_xyxy ?? raw.box ?? raw.xyxy ?? raw.coordinates;
  if (!Array.isArray(candidate) || candidate.length !== 4 || !candidate.every(item => typeof item === 'number' && Number.isFinite(item))) return undefined;
  return candidate as BoundingBox;
}
export function normalizeDetection(value: unknown): Detection {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const labelValue = raw.name ?? raw.class_name ?? raw.label ?? raw.disease_name ?? raw.class_id;
  const confidenceValue = raw.confidence ?? raw.score ?? raw.conf;
  const detection: Detection = {};
  if (typeof labelValue === 'string' || typeof labelValue === 'number') detection.label = String(labelValue);
  if (typeof confidenceValue === 'number' && Number.isFinite(confidenceValue)) detection.confidence = confidenceValue;
  const bbox = optionalBox(raw); if (bbox) detection.bbox = bbox;
  if (typeof raw.class_id === 'number') detection.classId = raw.class_id;
  if (typeof raw.disease_name === 'string') detection.diseaseName = raw.disease_name;
  return detection;
}
export function normalizeInteraction(value: unknown, fallbackHistoryId?: number): ChatResult {
  if (!value || typeof value !== 'object') throw new ApiError('Phản hồi hội thoại không hợp lệ.', undefined, undefined, 'malformed');
  const raw = value as Record<string, unknown>; const historyId = typeof raw.history_id === 'number' ? raw.history_id : fallbackHistoryId;
  if (!historyId || typeof raw.answer !== 'string' || !raw.answer.trim()) throw new ApiError('Phản hồi hội thoại không đầy đủ.', undefined, undefined, 'malformed');
  return { historyId, question: typeof raw.question === 'string' ? raw.question : '', answer: raw.answer, detections: Array.isArray(raw.detections) ? raw.detections.map(normalizeDetection) : [], metadata: typeof raw.metadata === 'object' && raw.metadata ? raw.metadata as Record<string, unknown> : undefined };
}
