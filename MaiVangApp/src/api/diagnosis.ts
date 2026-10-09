import { ApiError } from './errors';
import { createHistory, deleteHistory, sendHistoryImage, sendHistoryText } from './history';
import type { Detection, DiagnosisResult, SelectedImage } from '../types/domain';
import { normalizeDetection } from './normalizers';

export type DiagnosisInput = { text?: string; image?: SelectedImage; conversationId?: number };
function detectionList(value: unknown): Detection[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeDetection);
}
function titleFor(input: DiagnosisInput): string {
  const text = input.text?.trim();
  if (text) return text.slice(0, 120);
  return input.image ? 'Kiểm tra ảnh lá mai' : 'Trò chuyện với MaiCare';
}
export async function submitDiagnosis(input: DiagnosisInput): Promise<DiagnosisResult> {
  const text = input.text?.trim();
  if (!input.image && !text) throw new ApiError('Hãy thêm ảnh hoặc nhập câu hỏi để tiếp tục.', 422);
  const createdHere = input.conversationId === undefined;
  const conversationId = input.conversationId ?? (await createHistory(titleFor(input))).id;
  let response;
  try {
    response = input.image ? await sendHistoryImage(conversationId, input.image, text) : await sendHistoryText(conversationId, text!);
    if (typeof response.answer !== 'string' || !response.answer.trim()) {
      throw new ApiError('MaiCare chưa nhận được nội dung trả lời. Vui lòng thử lại.', undefined, undefined, 'malformed');
    }
  } catch (error) {
    if (createdHere) {
      try { await deleteHistory(conversationId); } catch { /* Preserve the original request error. */ }
    }
    throw error;
  }
  const detections = detectionList(response.detections);
  return { answer: response.answer, conversationId, detections, originalImageUri: input.image?.uri };
}
