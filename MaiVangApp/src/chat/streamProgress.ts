import type { SseEvent } from '../api/sse';

export type ProgressStage = 'preparing' | 'processing' | 'complete';
export type ProgressDisplay = { stage: ProgressStage; message: string; icon: ProgressStage };

export function progressForEvent(event: SseEvent, hasImage = false): ProgressDisplay | undefined {
  if (event.type !== 'progress') return undefined;
  const message = typeof event.message === 'string' ? event.message.trim() : '';
  if (event.stage === 'preparing') return { stage: 'preparing', message: message || 'Đang chuẩn bị câu hỏi...', icon: 'preparing' };
  if (event.stage === 'processing' || message) return {
    stage: 'processing',
    message: message || (hasImage ? 'MaiCare đang phân tích hình ảnh...' : 'MaiCare đang phân tích thông tin...'),
    icon: 'processing',
  };
  return undefined;
}
