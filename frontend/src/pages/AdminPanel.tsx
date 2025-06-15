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
import { useLocation, useNavigate } from 'react-router-dom';

// Добавляю расширение Window для интеграции с Header
declare global {
  interface Window {
    adminSetSection?: (key: string) => void;
    adminCurrentSection?: string;
    adminSetSubTab?: (sub: string) => void;
    adminCurrentSubTab?: string | null;
  }
}

const currencyOptions = ['GEL', 'USD', 'RR'];

interface AdminPanelProps {
  user: User;
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  setCompanies: (companies: Company[]) => void;
  onLogout: () => void;
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
}) => {
  const [section, setSection] = useState('companies');
  const [users, setUsers] = useState<User[]>([]);
  const [hardwareByCompany, setHardwareByCompany] = useState<Record<string, HardwareItem[]>>({});
  const [showAddCompany, setShowAddCompany] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // --- Мобильный режим: скрываем сайдбар если ширина <600px ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Получаем companyId для admin/user
  let effectiveCompanyId = '';
  if (user && (user.role === 'admin' || user.role === 'user')) {
    effectiveCompanyId = typeof user.companyId === 'string' ? user.companyId : (user.companyId && typeof user.companyId === 'object' && '_id' in user.companyId ? user.companyId._id : '');
  } else if (user && user.role === 'superadmin' && companies.length > 0) {
    effectiveCompanyId = selectedCompanyId;
  }

  // --- Синхронизация секции и подвкладки с query-параметрами ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get('section');
    const subParam = params.get('sub');
    if (sectionParam && sectionParam !== section) {
      setSection(sectionParam);
    }
    // Экспортируем управление секцией и подвкладкой для Header
    window.adminSetSection = (key: string) => {
      setSection(key);
      if (key === 'companies') {
        navigate('/admin');
      } else {
        navigate(`/admin?section=${key}`);
      }
    };
    window.adminCurrentSection = section;
    // Для подвкладок hardware
    window.adminSetSubTab = (sub: string) => {
      const params = new URLSearchParams(location.search);
      params.set('section', 'hardware');
      params.set('sub', sub);
      navigate(`/admin?${params.toString()}`);
    };
    window.adminCurrentSubTab = subParam;
  }, [location, section, navigate]);

  useEffect(() => {
    if (section !== 'users') return;
    let url = '/api/users';
    if (effectiveCompanyId && effectiveCompanyId !== 'all') {
      url += `?companyId=${effectiveCompanyId}`;
    }
    fetchWithAuth(url, undefined, true, onLogout)
      .then((res: unknown) => (res as Response).json())
      .then((data: unknown) => setUsers(Array.isArray(data) ? data : []));
  }, [section, effectiveCompanyId, onLogout]);

  useEffect(() => {
    if (!effectiveCompanyId || effectiveCompanyId === 'all') return;
    if (!effectiveCompanyId) return;
    fetchWithAuth(`/api/hardware?companyId=${effectiveCompanyId}`, undefined, true, onLogout)
      .then((res: unknown) => (res as Response).json())
      .then((data: unknown) => setHardwareByCompany(prev => ({ ...prev, [effectiveCompanyId]: Array.isArray(data) ? data : [] })))
      .catch(() => setHardwareByCompany(prev => ({ ...prev, [effectiveCompanyId]: [] })));
  }, [effectiveCompanyId, onLogout]);

  // --- Принудительно открываем вкладку 'Компании', если компаний нет и superadmin ---
  useEffect(() => {
    if (
      user?.role === 'superadmin' &&
      companies.length === 0 &&
      section !== 'companies'
    ) {
      setSection('companies');
      navigate('/admin?section=companies');
    }
  }, [user, companies, section, navigate]);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'crimson', fontSize: 20 }}>Нет доступа к админ-панели</div>;
  }

  // Формируем вкладки динамически по роли
  const sections = [
    ...(user && user.role === 'superadmin' ? [{ key: 'companies', label: 'Компании' }] : []),
    { key: 'users', label: 'Пользователи' },
    { key: 'hardware', label: 'Цены' },
    { key: 'settings', label: 'Настройки' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
      <Header 
        user={user} 
        companies={companies} 
        selectedCompanyId={effectiveCompanyId} 
        setSelectedCompanyId={setSelectedCompanyId} 
        onLogout={onLogout} 
      />
      {/* Main content */}
      <div style={{ display: 'flex', marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        {!isMobile && (
          <nav className="admin-sidebar" style={{ minWidth: 200, background: '#fff', borderRight: '1px solid #eee', padding: '24px 0', height: '100%' }}>
            {sections.map((s) => (
              <div
                key={s.key}
                onClick={() => {
                  if (window.adminSetSection) {
                    window.adminSetSection(s.key);
                  } else {
                    setSection(s.key);
                  }
                }}
                style={{
                  padding: '14px 32px',
                  cursor: 'pointer',
                  background: section === s.key ? '#f6f8ff' : 'none',
                  fontWeight: section === s.key ? 700 : 400,
                  color: section === s.key ? '#646cff' : '#333',
                  borderLeft: section === s.key ? '4px solid #646cff' : '4px solid transparent',
                  transition: 'background 0.2s',
                  marginBottom: 2,
                  pointerEvents: 'auto',
                  opacity: 1,
                }}
              >
                {s.label}
              </div>
            ))}
          </nav>
        )}
        {/* Content */}
        <div className="admin-content" style={{ flex: 1, padding: isMobile ? 0 : 32, background: isMobile ? '#fff' : '#f6f8fa', minHeight: 'calc(100vh - 56px)' }}>
          {/* Загрузка компаний */}
          {companies == null ? (
            <div style={{ padding: 32 }}>Загрузка...</div>
          ) : section === 'companies' ? (
            <>
              {user.role === 'superadmin' && companies.length === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <button
                    onClick={() => setShowAddCompany(true)}
                    style={{
                      padding: '16px 24px',
                      borderRadius: 8,
                      fontSize: 18,
                      background: '#646cff',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Добавить компанию
                  </button>
                </div>
              )}
              <CompaniesTab
                companies={companies}
                selectedCompanyId={effectiveCompanyId}
                setSelectedCompanyId={setSelectedCompanyId}
                setCompanies={setCompanies}
                user={user}
                fetchWithAuth={fetchWithAuth}
                onLogout={onLogout}
                showAddCompany={showAddCompany}
                setShowAddCompany={setShowAddCompany}
              />
            </>
          ) : section === 'users' ? (
            <UsersTab
              users={users}
              setUsers={setUsers}
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              userRole={user.role}
              fetchWithAuth={fetchWithAuth}
            />
          ) : section === 'hardware' ? (
            <HardwareTab
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              hardwareByCompany={hardwareByCompany}
              user={user}
              onLogout={onLogout}
              activeSubTab={new URLSearchParams(location.search).get('sub') || ''}
              onChangeSubTab={(sub: string) => {
                const params = new URLSearchParams(location.search);
                params.set('section', 'hardware');
                params.set('sub', sub);
                navigate(`/admin?${params.toString()}`);
              }}
            />
          ) : section === 'settings' ? (
            <SettingsTab
              currencyOptions={currencyOptions}
              company={companies.find(c => c._id === selectedCompanyId) || null}
            />
          ) : null}
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .admin-content {
            padding: 0 !important;
            background: #fff !important;
            overflow-x: auto !important;
            width: 100vw !important;
            min-width: 0 !important;
          }
          .admin-sidebar {
            display: none !important;
          }
          body, html, #root, .App, .admin-panel-root {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminPanel; 