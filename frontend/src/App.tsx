import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import AdminPanel from './pages/AdminPanel';
import CalculatorPageWrapper from './pages/CalculatorPage';
import ProjectProgressPage from './pages/ProjectProgressPage';
import Header from './components/Header';
import type { Company } from './types/Company';
import type { User } from './types/User';
import { fetchWithAuth, refreshAccessToken } from './utils/auth';
import { API_URL } from './utils/api';





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
            console.log('User loaded successfully:', data.user);
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

  // Автоматическое восстановление токенов при старте приложения
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      console.log('🚀 App init auth:', { 
        hasStoredToken: !!storedToken, 
        hasRefreshToken: !!refreshToken 
      });
      
      // Если есть сохраненный токен - используем его
      if (storedToken) {
        console.log('✅ Found stored token, using it');
        setToken(storedToken);
      } 
      // Если нет токена, но есть refresh токен - пытаемся обновить
      else if (refreshToken) {
        console.log('🔄 No stored token, but have refresh token, trying to refresh');
        try {
          const newToken = await refreshAccessToken();
          console.log('✅ Successfully refreshed token');
          setToken(newToken);
        } catch (error) {
          console.error('❌ Auto refresh failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('rememberMe');
        }
      } else {
        console.log('❌ No tokens found');
      }
    };

    initAuth();
  }, []);

  // Загрузка компаний для админов
  useEffect(() => {
    console.log('Companies useEffect triggered:', { user: user?.role, selectedCompanyId });
    
    if (user?.role === 'superadmin') {
      console.log('Loading companies for superadmin...');
      // Суперадмин видит все компании
      fetchWithAuth(`${API_URL}/companies`)
        .then(res => res.json())
        .then(data => {
          console.log('Companies loaded for superadmin:', data);
          if (Array.isArray(data)) {
            setCompanies(data);
            if (data.length > 0 && !selectedCompanyId) {
              setSelectedCompanyId(data[0]._id);
            }
          } else {
            console.log('❌ Invalid companies data received:', data);
            setCompanies([]);
          }
        })
        .catch(err => {
          console.error('❌ Failed to load companies:', err);
          setCompanies([]);
          setError('Ошибка загрузки компаний. Проверьте соединение.');
        });
    } else if (user?.role === 'admin') {
      console.log('Loading companies for admin...', { companyId: user.companyId });
      // Обычный админ видит все компании, но по умолчанию выбрана его компания
      fetchWithAuth(`${API_URL}/companies`)
        .then(res => res.json())
        .then(data => {
          console.log('Companies loaded for admin:', data);
          if (Array.isArray(data)) {
            setCompanies(data);
            // Устанавливаем компанию админа как выбранную
            if (user.companyId && !selectedCompanyId) {
              const companyId = typeof user.companyId === 'string' ? user.companyId : user.companyId._id;
              console.log('Setting selected company ID:', companyId);
              setSelectedCompanyId(companyId);
            }
          } else {
            console.log('❌ Invalid companies data received:', data);
            setCompanies([]);
          }
        })
        .catch(err => {
          console.error('❌ Failed to load companies:', err);
          setCompanies([]);
          setError('Ошибка загрузки компаний. Проверьте соединение.');
        });
    } else {
      console.log('User role not admin/superadmin, clearing companies');
      setCompanies([]);
      setSelectedCompanyId('');
    }
  }, [user]); // УБРАЛИ selectedCompanyId из зависимостей

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
      <div style={{ 
        minHeight: '100vh', 
        background: '#f5f5f5',
        // Важно: позволяем горизонтальную прокрутку на уровне всего приложения
        overflowX: 'auto',
        overflowY: 'auto'
      }}>
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
          
          <Route path="/project-progress" element={
            <ProjectProgressPage 
              user={user} 
              selectedCompanyId={selectedCompanyId}
            />
          } />
          
          {(user.role === 'admin' || user.role === 'superadmin') && (
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
            <Navigate to={(user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/calculator'} replace />
          } />
          
          <Route path="*" element={
            <Navigate to={(user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/calculator'} replace />
          } />
        </Routes>
      </div>
    </Router>
  );
}
