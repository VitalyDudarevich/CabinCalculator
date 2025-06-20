// auth.ts — утилиты для работы с access/refresh токенами

import { API_URL as BASE_API_URL } from './api';
const API_URL = `${BASE_API_URL}/api/auth`;

export async function refreshAccessToken() {
  try {
    // Пытаемся обновить access token через refresh token
    // Сначала пробуем через httpOnly cookie, потом через localStorage
    const refreshToken = localStorage.getItem('refreshToken');

    const res = await fetch(`${API_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Важно для отправки cookies
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });

    if (!res.ok) {
      throw new Error('Не удалось обновить access token');
    }

    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);
      return data.accessToken;
    }

    throw new Error('Нет access token в ответе');
  } catch (error) {
    // Если обновление не удалось, очищаем все токены
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    throw error;
  }
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
  tryRefresh = true,
): Promise<Response> {
  let token = localStorage.getItem('token') || '';

  // Первая попытка с текущим токеном
  const headers = {
    ...(init.headers || {}),
    Authorization: token ? `Bearer ${token}` : '',
  };

  let res = await fetch(input, {
    ...init,
    headers,
    credentials: 'include', // Важно для работы с cookies
  });

  // Если получили 401 и разрешено обновление токена
  if (res.status === 401 && tryRefresh) {
    try {
      token = await refreshAccessToken();
      const retryHeaders = {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      res = await fetch(input, {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
      });
    } catch {
      // Refresh не удался - пользователь будет разлогинен
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  return res;
}

export async function logout() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');

    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Всегда очищаем локальные токены
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
  }
}
