import type { SseEvent } from '../api/sse';

export type ProgressStage = 'preparing' | 'processing' | 'complete';
export type ProgressDisplay = { stage: Exclude<ProgressStage, 'complete'>; message: string; icon: Exclude<ProgressStage, 'complete'> };

export function progressForEvent(event: SseEvent): ProgressDisplay | undefined {
  if (event.type !== 'progress') return undefined;
  if (event.stage === 'preparing') return { stage: 'preparing', message: 'Đang chuẩn bị câu hỏi...', icon: 'preparing' };
  if (event.stage === 'processing') return { stage: 'processing', message: 'MaiCare đang phân tích thông tin...', icon: 'processing' };
  return undefined;
}
