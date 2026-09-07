export const AUTH_ENDPOINTS = {
  register: '/api/v1/user/register/',
  login: '/api/v1/user/login/',
  refresh: '/api/v1/user/login/refresh/',
  me: '/api/v1/user/me/',
  logout: '/api/v1/user/logout/',
} as const;
export const HISTORY_ENDPOINTS = {
  list: '/api/v1/history/',
  detail: (id: number) => `/api/v1/history/${id}/`,
  chat: (id: number) => `/api/v1/history/${id}/chat/`,
  imageChat: (id: number) => `/api/v1/history/${id}/chat/image/`,
} as const;
