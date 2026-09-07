import { API_BASE_URL, AUTH_TIMEOUT_MS } from './config';
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
    if (response.ok) throw new ApiError('MaiCare nhận được dữ liệu không hợp lệ. Vui lòng thử lại.', response.status, undefined, 'malformed');
    return { detail: text.slice(0, 200) };
  }
}
function logValidation(status: number, path: string, payload: unknown) {
  if (process.env.NODE_ENV === 'production' || status !== 422 || !payload || typeof payload !== 'object') return;
  const detail = (payload as { detail?: unknown }).detail;
  if (!Array.isArray(detail)) return;
  console.warn('[MaiCare API validation]', {
    status,
    endpoint: path,
    detail: detail.map(item => {
      const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return { loc: value.loc, msg: value.msg, type: value.type };
    }),
  });
}
async function refreshAccessToken(): Promise<string> {
  const session = hooks?.getSession();
  if (!session?.refreshToken) throw new ApiError('Phiên đăng nhập đã hết hạn.', 401);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.refresh}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: session.refreshToken }), signal: controller.signal,
    });
    const payload = await parseResponse(response) as { access?: unknown; refresh?: unknown } | null;
    if (!response.ok || typeof payload?.access !== 'string') throw new ApiError('Phiên đăng nhập đã hết hạn.', 401);
    const next = { ...session, accessToken: payload.access, refreshToken: typeof payload.refresh === 'string' ? payload.refresh : session.refreshToken };
    await hooks?.updateSession(next);
    return next.accessToken;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('Yêu cầu đang mất nhiều thời gian hơn dự kiến. Vui lòng thử lại.', undefined, undefined, 'timeout');
    throw new ApiError('Không thể kết nối. Kiểm tra mạng rồi thử lại.', undefined, undefined, 'network');
  } finally { clearTimeout(timeout); }
}
type ApiRequestOptions = RequestInit & { auth?: boolean; timeoutMs?: number; retryAuth?: boolean };
const RETRYABLE_GET_STATUSES = new Set([502, 503, 504]);
const retryDelay = (attempt: number) => new Promise(resolve => setTimeout(resolve, attempt * 900));
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? AUTH_TIMEOUT_MS);
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.auth) {
    const access = hooks?.getSession()?.accessToken;
    if (access) headers.set('Authorization', `Bearer ${access}`);
  }
  try {
    const { auth: _auth, retryAuth: _retryAuth, timeoutMs: _timeoutMs, ...fetchOptions } = options;
    let response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers, signal: controller.signal });
    const method = (fetchOptions.method || 'GET').toUpperCase();
    for (let attempt = 1; method === 'GET' && RETRYABLE_GET_STATUSES.has(response.status) && attempt <= 2; attempt += 1) {
      await retryDelay(attempt);
      response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers, signal: controller.signal });
    }
    if (response.status === 401 && options.auth && options.retryAuth !== false && hooks) {
      try {
        refreshPromise ||= refreshAccessToken().finally(() => { refreshPromise = null; });
        headers.set('Authorization', `Bearer ${await refreshPromise}`);
        response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers, signal: controller.signal });
      } catch (error) {
        if (error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout')) throw error;
        await hooks.invalidate('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }
    }
    if (response.status === 401 && options.auth && hooks) {
      await hooks.invalidate('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
    }
    const payload = await parseResponse(response);
    if (!response.ok) {
      logValidation(response.status, path, payload);
      throw new ApiError(apiMessage(response.status, payload), response.status, fieldErrorsFromPayload(payload));
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('Yêu cầu đang mất nhiều thời gian hơn dự kiến. Vui lòng thử lại.', undefined, undefined, 'timeout');
    throw new ApiError('Không thể kết nối. Kiểm tra mạng rồi thử lại.', undefined, undefined, 'network');
  } finally { clearTimeout(timeout); }
}
