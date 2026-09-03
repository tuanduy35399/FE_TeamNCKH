import { ApiError } from './errors';
import type { HistoryItem } from '../types/domain';
export async function getHistory(): Promise<HistoryItem[]> {
  throw new ApiError('Tính năng lịch sử chưa sẵn sàng.', undefined, undefined, 'unavailable');
}
