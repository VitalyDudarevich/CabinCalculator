import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import AdminPanel from './pages/AdminPanel';
import CalculatorPageWrapper from './pages/CalculatorPage';
import Header from './components/Header';
import type { Company } from './types/Company';
import { fetchWithAuth } from './utils/auth';
import { API_URL } from './utils/api';

// interface Company {
//   _id: string;
//   name: string;
//   city?: string;
//   owner?: string;
//   ownerPhone?: string;
//   ownerName?: string;
//   ownerContact?: string;
//   currency?: string;
// }

function isCompanyObj(val: unknown): val is { _id: string } {
  return !!val && typeof val === 'object' && '_id' in val && typeof (val as { _id?: unknown })._id === 'string';
}

interface User {
  _id: string;
  role: string;
  username: string;
  email: string;
  companyId?: string | { _id: string; name: string };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [token, setToken] = useState<string>(() => localStorage.getItem('token') || '');
  const [userLoaded, setUserLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  // Восстановление пользователя при изменении токена
  useEffect(() => {
    setError('');
    if (token) {
      fetchWithAuth(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
          else setUser(null);
        })
        .catch(() => {
          setUser(null);
          setError('Ошибка загрузки пользователя.');
        })
        .finally(() => setUserLoaded(true));
    } else {
      setUser(null);
      setUserLoaded(true);
    }
  }, [token]);

  // Загрузка компаний для суперадмина и админа
  useEffect(() => {
    setError('');
    if (user && user.role === 'superadmin') {
      fetchWithAuth(`${API_URL}/api/companies`)
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          setCompanies(list);
        })
        .catch(() => {
          setCompanies([]);
          setError('Ошибка загрузки компаний.');
        });
    } else if (user && user.companyId) {
      // companyId может быть строкой или объектом
      const adminCompanyId = typeof user.companyId === 'string'
        ? user.companyId
        : isCompanyObj(user.companyId) ? user.companyId._id : '';
      if (adminCompanyId && selectedCompanyId !== adminCompanyId) {
        setSelectedCompanyId(adminCompanyId);
      }
      if (adminCompanyId) {
        fetchWithAuth(`${API_URL}/api/companies/${adminCompanyId}`)
          .then(res => res.json())
          .then(data => {
            setCompanies(data && data._id ? [data] : []);
          })
          .catch(() => {
            setCompanies([]);
            setError('Ошибка загрузки компании.');
          });
      }
    } else {
      setCompanies([]);
    }
  }, [user]);

  // Логика выхода
  const handleLogout = () => {
    setUser(null);
    setToken('');
    setCompanies([]);
    setSelectedCompanyId('');
    setUserLoaded(false);
    setError('');
    localStorage.removeItem('token');
  };

  // Временный лог для диагностики проблем с логином
  console.log('user:', user, 'token:', token);

  // Для роутинга
  return (
    <Router>
      <Header
        user={user}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        setSelectedCompanyId={setSelectedCompanyId}
        onLogout={handleLogout}
      >
        {error && (
          <div style={{
            background: '#fff1f0',
            color: '#cf1322',
            fontWeight: 600,
            fontSize: 16,
            padding: '10px 0',
            textAlign: 'center',
            borderBottom: '1px solid #ffa39e',
            boxShadow: '0 2px 8px #cf132222',
            zIndex: 101,
            position: 'relative',
          }}>{error}</div>
        )}
      </Header>
      <div style={{ marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
        {!userLoaded ? (
          <div>Загрузка...</div>
        ) : (
          <Routes>
            {/* /admin доступен только если selectedCompanyId определён */}
            {user && (user.role === 'admin' || user.role === 'superadmin') && (
              <Route
                path="/admin"
                element={
                  user.role === 'superadmin' || selectedCompanyId
                    ? <AdminPanel
                        user={user}
                        companies={companies}
                        selectedCompanyId={selectedCompanyId}
                        setSelectedCompanyId={setSelectedCompanyId}
                        setCompanies={setCompanies}
                        onLogout={handleLogout}
                      />
                    : <div>Нет доступа: проверь companyId</div>
                }
              />
            )}
            {/* /calculator доступен для всех ролей */}
            {user && ['superadmin', 'admin', 'user'].includes(user.role) && (
              <Route path="/calculator" element={<CalculatorPageWrapper user={user} selectedCompanyId={selectedCompanyId} />} />
            )}
            <Route path="/" element={
              user
                ? ((user.role === 'admin' || user.role === 'superadmin') && selectedCompanyId
                    ? <Navigate to="/admin" replace />
                    : <Navigate to="/calculator" replace />)
                : <AuthPage setUser={setUser} setToken={setToken} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}
