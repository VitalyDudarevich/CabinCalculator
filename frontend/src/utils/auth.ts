// auth.ts — утилиты для работы с access/refresh токенами

import { API_URL as BASE_API_URL } from './api';
const API_URL = `${BASE_API_URL}/api/auth`;

export async function refreshAccessToken() {
  // Пытаемся обновить access token через refresh token (refresh хранится в httpOnly cookie)
  const res = await fetch(`${API_URL}/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Не удалось обновить access token');
  const data = await res.json();
  if (data.accessToken) {
    localStorage.setItem('token', data.accessToken);
    return data.accessToken;
  }
  throw new Error('Нет access token');
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
  tryRefresh = true,
): Promise<Response> {
  let token = localStorage.getItem('token') || '';
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
  let res = await fetch(input, { ...init, headers });
  if (res.status === 401 && tryRefresh) {
    try {
      token = await refreshAccessToken();
      const retryHeaders = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
      res = await fetch(input, { ...init, headers: retryHeaders });
    } catch {
      // refresh не удался — разлогинить пользователя (пусть обработает вызывающий)
    }
  }
  return res;
}
