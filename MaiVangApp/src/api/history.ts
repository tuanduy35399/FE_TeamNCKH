import { AI_TIMEOUT_MS, API_BASE_URL, IMAGE_TIMEOUT_MS } from './config';
import { apiNativeMultipartUpload, apiRequest } from './client';
import { HISTORY_ENDPOINTS } from './endpoints';
import { normalizeHistoryDetail, normalizeHistoryItem } from './normalizers';
import type { HistoryItem, SelectedImage } from '../types/domain';
import { ApiError } from './errors';

type HistoryListDto = { id: number; title: string; created_at: string; updated_at: string };
type MessageDto = { id: number; role: string; content: string; created_at: string };
type HistoryDetailDto = HistoryListDto & { messages: MessageDto[] };
export type InteractionDto = { question?: unknown; answer?: unknown; history_id?: unknown; detections?: unknown };
const developmentDiagnostics = typeof __DEV__ !== 'undefined' && __DEV__;
export function nativeImageDescriptor(image: SelectedImage, question?: string) {
  return {
    uri: image.uploadUri || image.uri,
    name: image.uploadName || image.name,
    mimeType: image.uploadMimeType || image.mimeType || 'image/jpeg',
    parameters: question ? { question } : undefined,
  };
}

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
export async function renameHistory(id: number, title: string): Promise<HistoryItem> {
  return normalizeHistoryDetail(await apiRequest<HistoryDetailDto>(HISTORY_ENDPOINTS.detail(id), { method: 'PATCH', auth: true, body: JSON.stringify({ title }) }));
}
export async function sendHistoryText(id: number, question: string): Promise<InteractionDto> {
  return apiRequest<InteractionDto>(HISTORY_ENDPOINTS.chat(id), { method: 'POST', auth: true, timeoutMs: AI_TIMEOUT_MS, body: JSON.stringify({ question }) });
}
async function imagePart(image: SelectedImage): Promise<Blob | { uri: string; name: string; type: string }> {
  if (image.file) return image.file;
  if (typeof document === 'undefined') return { uri: image.uploadUri || image.uri, name: image.uploadName || image.name, type: image.uploadMimeType || image.mimeType || 'image/jpeg' };
  const response = await fetch(image.uploadUri || image.uri);
  return response.blob();
}
export async function sendHistoryImage(id: number, image: SelectedImage, question?: string): Promise<InteractionDto> {
  const startedAt = Date.now();
  const descriptor = nativeImageDescriptor(image, question);
  const uploadUri = descriptor.uri;
  const uploadMimeType = descriptor.mimeType;
  const uploadName = descriptor.name;
  const endpoint = HISTORY_ENDPOINTS.imageChat(id);
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  let body: FormData | undefined;
  if (!isReactNative) {
    body = new FormData();
    const part = await imagePart(image);
    if (part instanceof Blob) body.append('image', part, uploadName);
    else body.append('image', part as unknown as Blob);
    if (question) body.append('question', question);
  }
  if (developmentDiagnostics) console.info('[MaiCare image request]', {
    endpoint: `${API_BASE_URL}${endpoint}`, method: 'POST', historyId: id, uriScheme: uploadUri.split(':', 1)[0],
    mimeType: uploadMimeType, filename: uploadName, width: image.width, height: image.height,
    approximateBytes: image.uploadSize || image.size, startedAt: new Date(startedAt).toISOString(),
  });
  try {
    const response = isReactNative
      ? await apiNativeMultipartUpload<InteractionDto>(endpoint, { uri: uploadUri, mimeType: uploadMimeType, fieldName: 'image', parameters: descriptor.parameters }, IMAGE_TIMEOUT_MS)
      : await apiRequest<InteractionDto>(endpoint, { method: 'POST', auth: true, timeoutMs: IMAGE_TIMEOUT_MS, body: body! });
    if (developmentDiagnostics) console.info('[MaiCare image response]', { endpoint: `${API_BASE_URL}${endpoint}`, historyId: id, status: 200, elapsedMs: Date.now() - startedAt, detectionsCount: Array.isArray(response.detections) ? response.detections.length : undefined });
    return response;
  } catch (error) {
    if (developmentDiagnostics && error instanceof ApiError) console.warn('[MaiCare image response]', {
      endpoint: `${API_BASE_URL}${endpoint}`, historyId: id, status: error.status, elapsedMs: Date.now() - startedAt,
      kind: error.kind, detail: error.debugDetail, errorName: error.transport?.name, errorMessage: error.transport?.message,
      errorCode: error.transport?.code, timeout: error.transport?.timeout ?? false, abort: error.transport?.abort ?? false, network: error.transport?.network ?? error.kind === 'network',
    });
    if (error instanceof ApiError && [400, 415, 422].includes(error.status || 0)) throw new ApiError('Ảnh không hợp lệ hoặc định dạng chưa được hỗ trợ.', error.status, error.fieldErrors, error.kind, error.debugDetail);
    if (error instanceof ApiError && error.status === 413) throw new ApiError('Ảnh vượt quá dung lượng máy chủ cho phép. Vui lòng chọn ảnh nhỏ hơn.', 413, error.fieldErrors, error.kind, error.debugDetail);
    if (error instanceof ApiError && error.status === 502) throw new ApiError('Dịch vụ chẩn đoán trả về dữ liệu không hợp lệ. Ảnh của bạn vẫn được giữ lại.', 502, error.fieldErrors, error.kind, error.debugDetail);
    if (error instanceof ApiError && error.status === 503) throw new ApiError('Dịch vụ chẩn đoán hình ảnh hiện chưa sẵn sàng. Ảnh của bạn vẫn được giữ lại để thử lại.', 503, error.fieldErrors, error.kind, error.debugDetail);
    if (error instanceof ApiError && (error.status === 504 || error.kind === 'timeout')) throw new ApiError('Chẩn đoán ảnh đang mất nhiều thời gian hơn bình thường. Ảnh của bạn vẫn được giữ lại để thử lại.', error.status, error.fieldErrors, error.kind, error.debugDetail);
    if (error instanceof ApiError && error.status && error.status >= 500) throw new ApiError('Dịch vụ chẩn đoán hình ảnh đang tạm thời gián đoạn. Ảnh của bạn vẫn được giữ lại để thử lại.', error.status, error.fieldErrors, error.kind, error.debugDetail);
    throw error;
  }
}
