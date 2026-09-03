import { apiRequest } from './client';
import { normalizeAccount } from './normalizers';
import { ApiError } from './errors';
import type { Account, Session } from '../types/domain';
import { AUTH_ENDPOINTS } from './endpoints';

export type RegistrationRequest = { username: string; name: string; email: string; password: string };
export async function register(input: RegistrationRequest): Promise<void> {
  await apiRequest(AUTH_ENDPOINTS.register, { method: 'POST', body: JSON.stringify(input) });
}
export async function login(username: string, password: string): Promise<Session> {
  const result = await apiRequest<{ access?: unknown; refresh?: unknown }>(AUTH_ENDPOINTS.login, { method: 'POST', body: JSON.stringify({ username, password }) });
  if (typeof result?.access !== 'string' || typeof result?.refresh !== 'string') throw new ApiError('Phản hồi đăng nhập không hợp lệ.', undefined, undefined, 'malformed');
  return { accessToken: result.access, refreshToken: result.refresh };
}
export async function getMe(): Promise<Account> { return normalizeAccount(await apiRequest(AUTH_ENDPOINTS.me, { auth: true })); }
export async function logout(refreshToken: string): Promise<void> { await apiRequest(AUTH_ENDPOINTS.logout, { method: 'POST', body: JSON.stringify({ refresh: refreshToken }) }); }
export async function deleteMe(): Promise<void> { await apiRequest(AUTH_ENDPOINTS.me, { method: 'DELETE', auth: true }); }
