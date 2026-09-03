export const AUTH_ENDPOINTS = {
  register: '/api/v1/user/register/',
  login: '/api/v1/user/login/',
  refresh: '/api/v1/user/login/refresh/',
  me: '/api/v1/user/me/',
  logout: '/api/v1/user/logout/',
} as const;
