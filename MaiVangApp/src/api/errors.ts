export type FieldErrors = Record<string, string>;
export class ApiError extends Error {
  constructor(public userMessage: string, public status?: number, public fieldErrors?: FieldErrors, public kind: 'http' | 'network' | 'browser' | 'timeout' | 'malformed' | 'unavailable' = 'http') { super(userMessage); this.name = 'ApiError'; }
}
const messages: Record<number, string> = {
  400: 'Thông tin gửi lên chưa hợp lệ.', 401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.', 404: 'Không tìm thấy nội dung được yêu cầu.',
  409: 'Tên đăng nhập hoặc email đã được sử dụng.',
  413: 'Hình ảnh vượt quá dung lượng máy chủ cho phép.', 415: 'Định dạng hình ảnh không được máy chủ hỗ trợ.',
  422: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.', 429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  502: 'Dịch vụ AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.',
  503: 'Dịch vụ AI đang khởi động hoặc tạm thời gián đoạn. Vui lòng thử lại.',
  504: 'Quá thời gian xử lý. Vui lòng thử lại sau.',
};
export function fieldErrorsFromPayload(payload: unknown): FieldErrors | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const output: FieldErrors = {};
  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (Array.isArray(value)) output[key] = value.map(String).join(' ');
    else if (typeof value === 'string') output[key] = value;
  });
  return Object.keys(output).length ? output : undefined;
}
export function apiMessage(status: number, payload: unknown): string {
  if (messages[status]) return messages[status]!;
  if (status >= 500) return 'MaiCare chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.';
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.length < 240) return detail;
  }
  return messages[status] || 'Không thể hoàn tất yêu cầu.';
}
