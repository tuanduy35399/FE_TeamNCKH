import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import { ApiError, apiMessage, fieldErrorsFromPayload } from './errors';
import type { Session } from '../types/domain';
import { AUTH_ENDPOINTS } from './endpoints';
type SessionHooks = { getSession: () => Session | null; updateSession: (session: Session) => Promise<void>; invalidate: (message?: string) => Promise<void> };
let hooks: SessionHooks | null = null;
let refreshPromise: Promise<string> | null = null;
export function configureApiSession(next: SessionHooks | null) { hooks = next; }
async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch {
    if (response.ok) throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ.', response.status, undefined, 'malformed');
    return { detail: text.slice(0, 200) };
  }
}
async function refreshAccessToken(): Promise<string> {
  const session = hooks?.getSession();
  if (!session?.refreshToken) throw new ApiError('Phiên đăng nhập đã hết hạn.', 401);
  const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.refresh}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: session.refreshToken }),
  });
  const payload = await parseResponse(response) as { access?: unknown; refresh?: unknown } | null;
  if (!response.ok || typeof payload?.access !== 'string') throw new ApiError('Phiên đăng nhập đã hết hạn.', 401);
  const next = { accessToken: payload.access, refreshToken: typeof payload.refresh === 'string' ? payload.refresh : session.refreshToken };
  await hooks?.updateSession(next);
  return next.accessToken;
}
export async function apiRequest<T>(path: string, options: RequestInit & { auth?: boolean; timeoutMs?: number; retryAuth?: boolean } = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? API_TIMEOUT_MS);
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.auth) {
    const access = hooks?.getSession()?.accessToken;
    if (access) headers.set('Authorization', `Bearer ${access}`);
  }
  try {
    let response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    if (response.status === 401 && options.auth && options.retryAuth !== false && hooks) {
      try {
        refreshPromise ||= refreshAccessToken().finally(() => { refreshPromise = null; });
        headers.set('Authorization', `Bearer ${await refreshPromise}`);
        response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
      } catch {
        await hooks.invalidate('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }
    }
    const payload = await parseResponse(response);
    if (!response.ok) throw new ApiError(apiMessage(response.status, payload), response.status, fieldErrorsFromPayload(payload));
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('Kết nối quá thời gian. Vui lòng thử lại.', undefined, undefined, 'timeout');
    const isWeb = typeof window !== 'undefined';
    const message = isWeb
      ? 'Trình duyệt không thể kết nối API. Hãy bảo đảm máy chủ đang chạy và cho phép đúng nguồn web.'
      : 'Không thể kết nối máy chủ. Hãy kiểm tra địa chỉ API và kết nối mạng.';
    throw new ApiError(message, undefined, undefined, isWeb ? 'browser' : 'network');
  } finally { clearTimeout(timeout); }
}
