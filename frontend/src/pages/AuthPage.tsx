import React, { useState } from 'react';
import { API_URL } from '../utils/api';

interface User {
  _id: string;
  role: string;
  username: string;
  email: string;
  companyId?: string;
}

interface AuthPageProps {
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
}

export default function AuthPage({ setUser, setToken }: AuthPageProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [localToken, setLocalToken] = useState('');
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    const stored = localStorage.getItem('rememberMe');
    return stored === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);

  const AUTH_API_URL = `${API_URL}/api/auth`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const res = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: form.emailOrUsername, password: form.password }),
    });
    const data = await res.json();
    if (data.accessToken) {
      setLocalToken(data.accessToken);
      setLocalUser(data.user);
      setUser(data.user);
      setToken(data.accessToken);
      setMessage('Успешный вход!');
      if (rememberMe) {
        localStorage.setItem('token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    } else {
      setMessage(data.error || 'Ошибка входа');
    }
  };

  const handleMe = async () => {
    setMessage('');
    const res = await fetch(`${AUTH_API_URL}/me`, {
      headers: { Authorization: `Bearer ${localToken}` },
    });
    const data = await res.json();
    setMessage(JSON.stringify(data.user || data));
  };

  const handleLogout = () => {
    setLocalToken('');
    setLocalUser(null);
    setMessage('Вы вышли из системы.');
    setForm({});
    setUser(null);
    setToken('');
  };

  return (
    <div style={{ minHeight: '100vh', minWidth: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fa' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0001' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Вход в систему</h2>
        {!localUser && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                name="emailOrUsername"
                placeholder="Email или имя пользователя"
                onChange={handleChange}
                required
                style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                name="password"
                placeholder="Пароль"
                type={showPassword ? 'text' : 'password'}
                onChange={handleChange}
                required
                style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 24,
                  width: 32,
                  outline: 'none',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                onMouseDown={e => e.preventDefault()}
              >
                <img
                  src={showPassword ? '/eye.png' : '/eye-off.png'}
                  alt={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  style={{ width: 24, height: 24, outline: 'none', boxShadow: 'none' }}
                  draggable={false}
                />
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => {
                  setRememberMe(e.target.checked);
                  localStorage.setItem('rememberMe', String(e.target.checked));
                }}
                style={{ accentColor: '#646cff' }}
              />
              Запомнить меня
            </label>
            <button
              type="submit"
              style={{ padding: 12, borderRadius: 8, background: '#646cff', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer' }}
            >
              Войти
            </button>
          </form>
        )}
        <div style={{ margin: '24px 0', color: message.startsWith('Ошибка') ? 'crimson' : 'green', minHeight: 24, textAlign: 'center', whiteSpace: 'pre-wrap' }}>{message}</div>
        {localUser && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <b>Пользователь:</b> {localUser.username} ({localUser.email})<br />
              <b>Роль:</b> {localUser.role}
            </div>
            <div style={{ fontSize: 12, marginBottom: 16 }}>accessToken: {localToken.slice(0, 20)}...</div>
            <button
              onClick={handleMe}
              style={{ marginRight: 8, padding: '8px 24px', borderRadius: 8, border: '1px solid #ccc', background: '#fafafa', cursor: 'pointer' }}
            >
              Проверить авторизацию (me)
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 24px', borderRadius: 8, border: '1px solid #ccc', background: '#fafafa', cursor: 'pointer' }}
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 