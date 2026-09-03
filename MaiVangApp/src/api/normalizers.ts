import { resolveBackendUrl } from './config';
import { ApiError } from './errors';
import type { Account, DiseaseDetail } from '../types/domain';
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
