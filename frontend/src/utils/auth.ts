// auth.ts — утилиты для работы с access/refresh токенами

// Дублируем API_URL чтобы избежать циклической зависимости с api.ts
const BASE_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';
const API_URL = `${BASE_API_URL}/auth`;

// Функция для получения токена из любого хранилища
export function getToken(): string {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

// Функция для получения refresh токена из любого хранилища
export function getRefreshToken(): string {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || '';
}

// Функция для сохранения токена в нужное хранилище
function setToken(token: string): void {
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  if (rememberMe) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
}

export async function refreshAccessToken() {
  try {
    // Пытаемся обновить access token через refresh token
    // Сначала пробуем через httpOnly cookie, потом через localStorage/sessionStorage
    const refreshToken = getRefreshToken();

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
      setToken(data.accessToken);
      return data.accessToken;
    }

    throw new Error('Нет access token в ответе');
  } catch (error) {
    // Если обновление не удалось, очищаем все токены
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    throw error;
  }
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
  tryRefresh = true,
): Promise<Response> {
  let token = getToken();

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
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
    }
  }

  return res;
}

export async function logout() {
  try {
    const refreshToken = getRefreshToken();

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
    // Всегда очищаем токены из обоих хранилищ
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
  }
}
