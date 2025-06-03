import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import AdminPanel from './pages/AdminPanel';

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
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState('');

  // Восстановление пользователя при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
        })
        .catch(() => setUser(null));
    }
  }, []);

  // Загрузка компаний
  useEffect(() => {
    setCompaniesLoading(true);
    setCompaniesError('');
    fetch('/api/companies')
      .then(res => res.json())
      .catch(() => setCompaniesError('Ошибка загрузки компаний'))
      .finally(() => setCompaniesLoading(false));
  }, []);

  // Логика выхода
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  // Кнопка-заглушка калькулятора
  const handleCalculator = () => {
    alert('Переход на страницу калькулятора (заглушка)');
  };

  // Если пользователь — админ или суперадмин, показываем админку с кнопками
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    if (companiesLoading) return <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Загрузка компаний...</div>;
    if (companiesError) return <div style={{ padding: 32, textAlign: 'center', color: 'crimson' }}>{companiesError}</div>;
    return <AdminPanel user={user} onLogout={handleLogout} onCalculator={handleCalculator} />;
  }

  // Для всех остальных — форма логина по центру
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fa' }}>
      <AuthPage setUser={setUser} setToken={() => {}} />
    </div>
  );
}
