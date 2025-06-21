import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import AdminPanel from './pages/AdminPanel';
import CalculatorPageWrapper from './pages/CalculatorPage';
import Header from './components/Header';
import type { Company } from './types/Company';
import { fetchWithAuth, refreshAccessToken } from './utils/auth';
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

interface User {
  _id: string;
  role: string;
  username: string;
  email: string;
  companyId?: string;
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
    const loadUser = async () => {
      setError('');
      
      if (token) {
        try {
          const res = await fetchWithAuth(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          const data = await res.json();
          
          if (res.ok && data.user) {
            setUser(data.user);
          } else {
            setUser(null);
            setToken('');
            localStorage.removeItem('token');
          }
        } catch (err) {
          console.error('User load error:', err);
          setUser(null);
          setToken('');
          localStorage.removeItem('token');
          setError('Ошибка загрузки пользователя.');
        }
      } else {
        setUser(null);
      }
      
      setUserLoaded(true);
    };

    loadUser();
  }, [token]);

  // Автоматическое восстановление accessToken через refreshToken при rememberMe
  useEffect(() => {
    const initAuth = async () => {
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const storedToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Если нет токена, но есть флаг "запомнить меня" и refresh токен
      if (!storedToken && rememberMe && refreshToken) {
        try {
          const newToken = await refreshAccessToken();
          setToken(newToken);
        } catch (error) {
          console.error('Auto refresh failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('rememberMe');
        }
      } else if (storedToken) {
        setToken(storedToken);
      }
    };

    initAuth();
  }, []);

  // Загрузка компаний для суперадмина
  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchWithAuth(`${API_URL}/companies`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCompanies(data);
            if (data.length > 0 && !selectedCompanyId) {
              setSelectedCompanyId(data[0]._id);
            }
          }
        })
        .catch(err => {
          console.error('Failed to load companies:', err);
          setCompanies([]);
        });
    } else {
      setCompanies([]);
      setSelectedCompanyId('');
    }
  }, [user, selectedCompanyId]);

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setCompanies([]);
    setSelectedCompanyId('');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
  };

  if (!userLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: 16,
        color: '#666',
      }}>
        Загрузка...
      </div>
    );
  }

  if (!user) {
    return <AuthPage setUser={setUser} setToken={setToken} />;
  }

  return (
    <Router>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header 
          user={user} 
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          setSelectedCompanyId={setSelectedCompanyId}
          onLogout={handleLogout}
        />
        
        {error && (
          <div style={{ 
            background: '#fee', 
            color: '#c00', 
            padding: 12, 
            textAlign: 'center',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}
        
        <Routes>
          <Route path="/calculator" element={
            <CalculatorPageWrapper 
              user={user} 
              selectedCompanyId={selectedCompanyId}
            />
          } />
          
          {user.role === 'superadmin' && (
            <Route path="/admin" element={
              <AdminPanel 
                user={user} 
                companies={companies} 
                selectedCompanyId={selectedCompanyId} 
                setSelectedCompanyId={setSelectedCompanyId}
                setCompanies={setCompanies}
                onLogout={handleLogout}
              />
            } />
          )}
          
          <Route path="/" element={
            <Navigate to={user.role === 'superadmin' ? '/admin' : '/calculator'} replace />
          } />
          
          <Route path="*" element={
            <Navigate to={user.role === 'superadmin' ? '/admin' : '/calculator'} replace />
          } />
        </Routes>
      </div>
    </Router>
  );
}
