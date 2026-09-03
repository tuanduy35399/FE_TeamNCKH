import { ApiError } from './errors';
import type { DiagnosisResult, SelectedImage } from '../types/domain';
export type DiagnosisInput = { text?: string; image?: SelectedImage };
export async function submitDiagnosis(_input: DiagnosisInput): Promise<DiagnosisResult> {
  throw new ApiError('Tính năng này chưa sẵn sàng. Vui lòng thử lại sau.', undefined, undefined, 'unavailable');
}
