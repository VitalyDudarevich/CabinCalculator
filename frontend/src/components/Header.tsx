import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  user: { username: string; role: string } | null;
  companies?: { _id: string; name: string }[];
  selectedCompanyId?: string;
  setSelectedCompanyId?: (id: string) => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, companies = [], selectedCompanyId = '', setSelectedCompanyId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#fff', boxShadow: '0 2px 8px #0001', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', zIndex: 100 }}>
      {/* Дропдаун выбора компании для суперадмина */}
      {user && user.role === 'superadmin' && setSelectedCompanyId && (
        <select
          value={selectedCompanyId}
          onChange={e => setSelectedCompanyId(e.target.value)}
          style={{ marginRight: 16, padding: 8, borderRadius: 8, fontSize: 16 }}
        >
          <option value="">Выберите компанию...</option>
          {companies.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      )}
      {/* Для админа/суперадмина */}
      {user && (user.role === 'admin' || user.role === 'superadmin') && (
        <>
          <button
            onClick={() => navigate('/calculator')}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              background: location.pathname === '/calculator' ? '#646cff' : '#fff',
              color: location.pathname === '/calculator' ? '#fff' : '#646cff',
              border: '2px solid #646cff',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: 8,
              boxShadow: '0 1px 4px #646cff22',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Калькулятор
          </button>
          <button
            onClick={() => navigate('/admin')}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              background: location.pathname === '/admin' ? '#646cff' : '#fff',
              color: location.pathname === '/admin' ? '#fff' : '#646cff',
              border: '2px solid #646cff',
              fontWeight: 600,
              marginRight: 16,
              cursor: 'pointer',
              boxShadow: '0 1px 4px #646cff22',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Админ-панель
          </button>
        </>
      )}
      {/* Для пользователя */}
      {user && user.role === 'user' && (
        <>
          <button
            onClick={() => navigate('/calculator')}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              background: location.pathname === '/calculator' ? '#646cff' : '#fff',
              color: location.pathname === '/calculator' ? '#fff' : '#646cff',
              border: '2px solid #646cff',
              fontWeight: 600,
              marginRight: 16,
              cursor: 'pointer',
              boxShadow: '0 1px 4px #646cff22',
            }}
          >
            Калькулятор
          </button>
        </>
      )}
      {/* Профиль или войти */}
      {user ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#333', cursor: 'pointer', userSelect: 'none' }}
            title={user.username}
          >
            {user.username ? user.username[0].toUpperCase() : '?'}
          </div>
          <button
            onClick={onLogout}
            style={{ marginLeft: 8, padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#333', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}
          >
            Выйти
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate('/')}
          style={{ padding: '8px 24px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, marginLeft: 16, cursor: 'pointer', boxShadow: '0 1px 4px #646cff22' }}
        >
          Войти
        </button>
      )}
    </header>
  );
};

export default Header; 