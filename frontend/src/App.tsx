import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import AdminPanel from './pages/AdminPanel';
import CalculatorPage from './pages/CalculatorPage';
import Header from './components/Header';
import type { Company } from './types/Company';
import { fetchWithAuth } from './utils/auth';

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

  // Восстановление пользователя при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchWithAuth('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user);
        })
        .catch(() => setUser(null));
    }
  }, []);

  // Загрузка компаний для суперадмина
  useEffect(() => {
    if (user && user.role === 'superadmin') {
      fetchWithAuth('http://localhost:5000/api/companies')
        .then(res => res.json())
        .then(data => {
          setCompanies(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0) {
            setSelectedCompanyId(data[0]._id);
          }
        })
        .catch(() => setCompanies([]));
    } else if (user && user.companyId) {
      setSelectedCompanyId(
        typeof user.companyId === 'string'
          ? user.companyId
          : isCompanyObj(user.companyId)
            ? user.companyId._id
            : ''
      );
    }
  }, [user]);

  // Логика выхода
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  // Для роутинга
  return (
    <Router>
      <Header
        user={user}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        setSelectedCompanyId={setSelectedCompanyId}
        onLogout={handleLogout}
      />
      <div style={{ marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
        <Routes>
          {(user && (user.role === 'admin' || user.role === 'superadmin')) && (
            <Route path="/admin" element={<AdminPanel user={user} companies={companies} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} onLogout={handleLogout} onCalculator={() => window.location.href = '/calculator'} />} />
          )}
          {user && (
            <Route path="/calculator" element={<CalculatorPage companyId={selectedCompanyId} user={user} selectedCompanyId={selectedCompanyId} />} />
          )}
          <Route path="/" element={
            user
              ? (user.role === 'admin' || user.role === 'superadmin'
                  ? <Navigate to="/admin" replace />
                  : <Navigate to="/calculator" replace />)
              : <AuthPage setUser={setUser} setToken={() => {}} />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
