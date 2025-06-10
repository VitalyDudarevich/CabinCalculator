import React, { useState, useEffect } from 'react';
import SettingsTab from '../components/SettingsTab';
import CompaniesTab from '../components/CompaniesTab';
import UsersTab from '../components/UsersTab';
import HardwareTab from '../components/HardwareTab';
// import HardwareTab from '../components/HardwareTab'; // если понадобится
import type { User } from '../types/User';
import type { Company } from '../types/Company';
import type { HardwareItem } from '../types/HardwareItem';
import Header from '../components/Header';

const sections = [
  { key: 'companies', label: 'Компании' },
  { key: 'users', label: 'Пользователи' },
  { key: 'hardware', label: 'Цены' },
  // { key: 'services', label: 'Услуги' }, // Удалено по просьбе пользователя
  { key: 'settings', label: 'Настройки' },
];

const currencyOptions = ['GEL', 'USD', 'RR'];

interface AdminPanelProps {
  user: User;
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  setCompanies: (companies: Company[]) => void;
  onLogout: () => void;
  onCalculator: () => void;
}

// Универсальная функция fetch с авто-рефрешем токена
async function fetchWithAuth(input: RequestInfo, init?: RequestInit, retry = true, onLogoutCb?: () => void): Promise<Response> {
  const url = typeof input === 'string' && input.startsWith('/api')
    ? `http://localhost:5000${input}`
    : input;
  const token = localStorage.getItem('token');
  const headers = { ...(init?.headers || {}), Authorization: `Bearer ${token || ''}` };
  const res = await fetch(url, { ...init, headers });

  if ((res.status === 401 || res.status === 400) && retry) {
    // Попытка обновить токен
    const refreshRes = await fetch('http://localhost:5000/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      const { token: newToken } = await refreshRes.json();
      if (newToken) {
        localStorage.setItem('token', newToken);
        // Повторяем исходный запрос с новым токеном
        return fetchWithAuth(input, init, false, onLogoutCb);
      }
    }
    // Не удалось обновить — разлогин
    localStorage.removeItem('token');
    if (onLogoutCb) onLogoutCb();
    throw new Error('Не удалось обновить токен');
  }

  return res;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  setCompanies,
  onLogout,
  onCalculator,
}) => {
  const [section, setSection] = useState('companies');
  const [users, setUsers] = useState<User[]>([]);
  const [hardwareByCompany, setHardwareByCompany] = useState<Record<string, HardwareItem[]>>({});

  useEffect(() => {
    if (section !== 'users') return;
    let url = '/api/users';
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      url += `?companyId=${selectedCompanyId}`;
    }
    fetchWithAuth(url, undefined, true, onLogout)
      .then((res: unknown) => (res as Response).json())
      .then((data: unknown) => setUsers(Array.isArray(data) ? data : []));
  }, [section, selectedCompanyId, onLogout]);

  useEffect(() => {
    if (!selectedCompanyId || selectedCompanyId === 'all') return;
    fetchWithAuth(`/api/hardware?companyId=${selectedCompanyId}`, undefined, true, onLogout)
      .then((res: unknown) => (res as Response).json())
      .then((data: unknown) => setHardwareByCompany(prev => ({ ...prev, [selectedCompanyId]: Array.isArray(data) ? data : [] })))
      .catch(() => setHardwareByCompany(prev => ({ ...prev, [selectedCompanyId]: [] })));
  }, [selectedCompanyId, onLogout]);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'crimson', fontSize: 20 }}>Нет доступа к админ-панели</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
      <Header 
        user={user} 
        companies={companies} 
        selectedCompanyId={selectedCompanyId} 
        setSelectedCompanyId={setSelectedCompanyId} 
        onLogout={onLogout} 
      />
      {/* Main content */}
      <div style={{ display: 'flex', marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <nav style={{ minWidth: 200, background: '#fff', borderRight: '1px solid #eee', padding: '24px 0', height: '100%' }}>
          {sections.map((s) => (
            <div
              key={s.key}
              onClick={() => {
                if (companies.length === 0 && s.key !== 'companies') return;
                setSection(s.key);
              }}
              style={{
                padding: '14px 32px',
                cursor: companies.length === 0 && s.key !== 'companies' ? 'not-allowed' : 'pointer',
                background: section === s.key ? '#f6f8ff' : 'none',
                fontWeight: section === s.key ? 600 : 400,
                color: companies.length === 0 && s.key !== 'companies' ? '#bbb' : (section === s.key ? '#646cff' : '#333'),
                transition: 'background 0.15s',
              }}
            >
              {s.label}
            </div>
          ))}
        </nav>
        {/* Content */}
        <div style={{ flex: 1, padding: 32, minHeight: 'calc(100vh - 56px)' }}>
          {/* Компании */}
          {section === 'companies' && (
            <CompaniesTab
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              setSelectedCompanyId={setSelectedCompanyId}
              setCompanies={setCompanies}
              user={user}
              fetchWithAuth={(input, init, retry) => fetchWithAuth(input, init, retry, onLogout)}
              onLogout={onLogout}
            />
          )}
          {section === 'users' && companies.length > 0 && (
            <UsersTab
              users={users}
              setUsers={setUsers}
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              userRole={user.role}
              fetchWithAuth={(input, init, retry) => fetchWithAuth(input, init, retry, onLogout)}
            />
          )}
          {section === 'hardware' && companies.length > 0 && (
            <HardwareTab
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              hardwareByCompany={hardwareByCompany}
              user={user}
              onLogout={onLogout}
              onCalculator={onCalculator}
            />
          )}
          {section === 'settings' && companies.length > 0 && (
            <SettingsTab
              currencyOptions={currencyOptions}
              company={companies.find(c => c._id === selectedCompanyId) || null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel; 