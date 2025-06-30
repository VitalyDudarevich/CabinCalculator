import React, { useState } from 'react';
import { API_URL } from '../utils/api';
import { logout } from '../utils/auth';

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
  const [loading, setLoading] = useState(false);

  const AUTH_API_URL = `${API_URL}/auth`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    
    try {
      const res = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Важно для получения cookies
        body: JSON.stringify({ 
          emailOrUsername: form.emailOrUsername, 
          password: form.password,
          rememberMe: rememberMe
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.accessToken) {
        setLocalToken(data.accessToken);
        setLocalUser(data.user);
        setUser(data.user);
        setToken(data.accessToken);
        setMessage('Успешный вход!');
        
        // Сохраняем rememberMe флаг
        localStorage.setItem('rememberMe', String(rememberMe));
        
        if (rememberMe) {
          // Если "Запомнить меня" включен - сохраняем в localStorage (постоянное хранение)
          localStorage.setItem('token', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        } else {
          // Если "Запомнить меня" отключен - сохраняем в sessionStorage (удаляется при закрытии браузера)
          sessionStorage.setItem('token', data.accessToken);
          if (data.refreshToken) {
            sessionStorage.setItem('refreshToken', data.refreshToken);
          }
          // Очищаем localStorage если там были старые токены
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      } else {
        setMessage(data.error || 'Ошибка входа');
      }
    } catch (error) {
      setMessage('Ошибка соединения с сервером');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMe = async () => {
    setMessage('');
    setLoading(true);
    
    try {
      const res = await fetch(`${AUTH_API_URL}/me`, {
        headers: { Authorization: `Bearer ${localToken}` },
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(`Пользователь: ${JSON.stringify(data.user, null, 2)}`);
      } else {
        setMessage(`Ошибка: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      setMessage('Ошибка проверки авторизации');
      console.error('Me check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    
    try {
      await logout();
      setLocalToken('');
      setLocalUser(null);
      setMessage('Вы вышли из системы.');
      setForm({});
      setUser(null);
      setToken('');
    } catch (error) {
      console.error('Logout error:', error);
      setMessage('Ошибка при выходе из системы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .custom-checkbox {
          position: relative;
          display: inline-block;
          width: 16px;
          height: 16px;
        }
        
        .custom-checkbox input[type="checkbox"] {
          opacity: 0;
          width: 16px;
          height: 16px;
          margin: 0;
          cursor: pointer;
        }
        
        .custom-checkbox::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 16px;
          height: 16px;
          background: #ffffff;
          border: 1px solid #ccc;
          border-radius: 3px;
          pointer-events: none;
        }
        
        .custom-checkbox input[type="checkbox"]:checked ~ .custom-checkbox::before {
          background: #646cff;
          border-color: #646cff;
        }
        
        .custom-checkbox::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 5px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          opacity: 0;
          pointer-events: none;
        }
        
        .custom-checkbox input[type="checkbox"]:checked ~ .custom-checkbox::after {
          opacity: 1;
        }
      `}</style>
      <div style={{ minHeight: '100vh', minWidth: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fa' }}>
        <div style={{ maxWidth: 400, width: '100%', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0001' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Вход в систему</h2>
        
        {!localUser && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                name="emailOrUsername"
                placeholder="Email или имя пользователя"
                value={form.emailOrUsername || ''}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ 
                  padding: 10, 
                  borderRadius: 8, 
                  border: '1px solid #ccc', 
                  fontSize: 16, 
                  width: '100%', 
                  boxSizing: 'border-box',
                  opacity: loading ? 0.7 : 1,
                  backgroundColor: '#ffffff',
                  color: '#333333',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                name="password"
                placeholder="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={form.password || ''}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ 
                  padding: 10, 
                  borderRadius: 8, 
                  border: '1px solid #ccc', 
                  fontSize: 16, 
                  width: '100%', 
                  boxSizing: 'border-box',
                  opacity: loading ? 0.7 : 1,
                  backgroundColor: '#ffffff',
                  color: '#333333',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                disabled={loading}
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
                  opacity: loading ? 0.7 : 1,
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
              <div className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={loading}
                  onChange={e => {
                    setRememberMe(e.target.checked);
                    localStorage.setItem('rememberMe', String(e.target.checked));
                  }}
                />
              </div>
              Запомнить меня
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{ 
                padding: 12, 
                borderRadius: 8, 
                background: loading ? '#ccc' : '#646cff', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: 16, 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        )}
        
        <div style={{ 
          margin: '24px 0', 
          color: message.includes('Ошибка') ? 'crimson' : 'green', 
          minHeight: 24, 
          textAlign: 'center', 
          whiteSpace: 'pre-wrap',
          fontSize: 14,
        }}>
          {message}
        </div>
        
        {localUser && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <b>Пользователь:</b> {localUser.username} ({localUser.email})<br />
              <b>Роль:</b> {localUser.role}
            </div>
            <div style={{ fontSize: 12, marginBottom: 16, color: '#666' }}>
              accessToken: {localToken.slice(0, 20)}...
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={handleMe}
                disabled={loading}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 8, 
                  border: '1px solid #ccc', 
                  background: '#fafafa', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {loading ? 'Проверяем...' : 'Проверить /me'}
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 8, 
                  border: '1px solid #ccc', 
                  background: '#fafafa', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {loading ? 'Выходим...' : 'Выйти'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
} 