/** The mobile app only knows the public Django gateway. */
export const BUILD_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '';
let runtimeApiBaseUrl = '';
export const AUTH_TIMEOUT_MS = 45_000;
export const AI_TIMEOUT_MS = 120_000;
export const IMAGE_TIMEOUT_MS = 180_000;
export const backendCapabilities = { diagnosis: true, history: true, conversationContext: true } as const;

export function normalizeApiBaseUrl(value: string): string {
  const candidate = value.trim();
  if (!candidate) throw new Error('Vui lòng nhập địa chỉ máy chủ Django.');
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { throw new Error('Địa chỉ máy chủ không hợp lệ.'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Địa chỉ phải bắt đầu bằng http:// hoặc https://.');
  if (!parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Địa chỉ máy chủ không được chứa tài khoản, truy vấn hoặc dấu #.');
  const pathname = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.protocol}//${parsed.host}${pathname === '/' ? '' : pathname}`;
}
export function setRuntimeApiBaseUrl(value: string | null): void { runtimeApiBaseUrl = value ? normalizeApiBaseUrl(value) : ''; }
export function getApiBaseUrl(): string {
  if (!runtimeApiBaseUrl) throw new Error('MaiCare chưa được cấu hình máy chủ cục bộ.');
  return runtimeApiBaseUrl;
}
export function getBuildApiBaseUrl(): string | null {
  if (!BUILD_API_BASE_URL) return null;
  try { return normalizeApiBaseUrl(BUILD_API_BASE_URL); } catch { return null; }
}
export function resolveBackendUrl(value?: string | null, base?: string): string | undefined {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${base || getApiBaseUrl()}/${value.replace(/^\/+/, '')}`;
}
