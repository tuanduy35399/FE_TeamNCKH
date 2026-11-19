export const AUTH_ENDPOINTS = {
  register: '/api/v1/user/register/',
  passwordResetRequest: '/api/v1/user/password-reset/request/',
  passwordResetConfirm: '/api/v1/user/password-reset/confirm/',
  login: '/api/v1/user/login/',
  refresh: '/api/v1/user/login/refresh/',
  me: '/api/v1/user/me/',
  logout: '/api/v1/user/logout/',
} as const;
export const HISTORY_ENDPOINTS = {
  list: '/api/v1/history/',
  detail: (id: number) => `/api/v1/history/${id}/`,
  chat: (id: number) => `/api/v1/history/${id}/chat/`,
  chatStream: (id: number) => `/api/v1/history/${id}/chat/stream/`,
  imageChat: (id: number) => `/api/v1/history/${id}/chat/image/`,
  imageChatStream: (id: number) => `/api/v1/history/${id}/chat/image/stream/`,
} as const;
export const DISEASE_ENDPOINTS = { list: '/api/v1/diseases/', detail: (id: number) => `/api/v1/diseases/${id}/` } as const;
