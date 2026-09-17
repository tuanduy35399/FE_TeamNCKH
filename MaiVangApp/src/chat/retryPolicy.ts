import type { SelectedImage } from '../types/domain';

export type FailedRequestState = {
  kind: 'text' | 'image';
  question: string;
  image?: SelectedImage;
  historyId?: number;
  message: string;
  status?: number;
};

export function preserveFailedRequest(input: Omit<FailedRequestState, 'historyId'>, resolvedHistoryId: number | null | undefined): FailedRequestState {
  return { ...input, historyId: resolvedHistoryId || undefined };
}

export function retryUsesHistory(failed: FailedRequestState): number | undefined {
  return failed.historyId;
}

export function shouldCooldownImageRetry(status?: number): boolean {
  return status !== undefined && [500, 502, 503, 504].includes(status);
}
