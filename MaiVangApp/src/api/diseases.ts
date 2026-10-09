import { apiRequest } from './client';
import { DISEASE_ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import { normalizeDisease } from './normalizers';
import type { DiseaseDetail } from '../types/domain';
export async function list(): Promise<DiseaseDetail[]> { const value = await apiRequest<unknown>(DISEASE_ENDPOINTS.list, { auth: true }); if (!Array.isArray(value)) throw new ApiError('Danh sách bệnh không hợp lệ.', undefined, undefined, 'malformed'); return value.map(normalizeDisease); }
export async function get(id: number): Promise<DiseaseDetail> { return normalizeDisease(await apiRequest(DISEASE_ENDPOINTS.detail(id), { auth: true })); }
