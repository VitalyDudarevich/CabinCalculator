import React, { useState, useEffect } from 'react';
import SettingsTab from '../components/SettingsTab';
import CompaniesTab from '../components/CompaniesTab';
import UsersTab from '../components/UsersTab';
import HardwareTab from '../components/HardwareTab';
import TemplatesTab from '../components/TemplatesTab';
import StatusesTab from '../components/StatusesTab';
// import HardwareTab from '../components/HardwareTab'; // если понадобится
import type { User } from '../types/User';
import type { Company } from '../types/Company';
import type { HardwareItem } from '../types/HardwareItem';
import Header from '../components/Header';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/auth';
import { API_URL } from '../utils/api';

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



const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  setCompanies,
  onLogout,
}) => {
  const [section, setSection] = useState('companies');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [hardwareByCompany, setHardwareByCompany] = useState<Record<string, HardwareItem[]>>({});
  const [showAddCompany, setShowAddCompany] = useState(false);
  
  // Состояния для отслеживания загрузки данных
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Debounce для предотвращения быстрых переключений
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

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

  console.log('AdminPanel effectiveCompanyId:', { 
    role: user?.role, 
    effectiveCompanyId, 
    selectedCompanyId, 
    companiesCount: companies.length,
    userCompanyId: user?.companyId,
    allCompanies: companies.map(c => ({ id: c._id, name: c.name }))
  });

  // --- Синхронизация секции с query-параметрами ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get('section') || 'companies';
    if (sectionParam !== section) {
      setSection(sectionParam);
    }
  }, [location.search]);

  // --- Экспорт функций управления для Header (отдельный useEffect) ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subParam = params.get('sub');
    
    window.adminSetSection = (key: string) => {
      if (key === section || isTransitioning) return; // Предотвращаем лишние обновления
      
      // Очищаем предыдущий таймер
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      setIsTransitioning(true);
      const timer = window.setTimeout(() => {
        setSection(key);
        setIsTransitioning(false);
        setDebounceTimer(null);
        if (key === 'companies') {
          navigate('/admin', { replace: true });
        } else {
          navigate(`/admin?section=${key}`, { replace: true });
        }
      }, 100); // Небольшая задержка для плавности
      
      setDebounceTimer(timer);
    };
    window.adminCurrentSection = section;
    
    // Для подвкладок hardware
    window.adminSetSubTab = (sub: string) => {
      const params = new URLSearchParams(location.search);
      params.set('section', 'hardware');
      params.set('sub', sub);
      navigate(`/admin?${params.toString()}`, { replace: true });
    };
    window.adminCurrentSubTab = subParam;
  }, [section, navigate, location.search]);

  // Функция для загрузки всех данных админ-панели
  const loadAllAdminData = async () => {
    console.log('loadAllAdminData called:', { isLoadingData, isDataLoaded, effectiveCompanyId, companiesCount: companies.length });
    if (isLoadingData || isDataLoaded) {
      console.log('Skipping loadAllAdminData - already loading or loaded');
      return;
    }
    
    console.log('Starting loadAllAdminData...');
    setIsLoadingData(true);
    try {
      // Загружаем пользователей
      let usersUrl = `${API_URL}/users`;
      // Для superadmin передаем companyId в query, для admin/user сервер использует данные из токена
      if (user.role === 'superadmin' && effectiveCompanyId && effectiveCompanyId !== 'all') {
        usersUrl += `?companyId=${effectiveCompanyId}`;
      }
      
      console.log('Loading users:', { usersUrl, effectiveCompanyId, userRole: user.role });
      
      const usersPromise = fetchWithAuth(usersUrl, undefined, true)
        .then((res: unknown) => {
          console.log('Users response:', res);
          const response = res as Response;
          if (response.status === 401) {
            console.error('Unauthorized - redirecting to login');
            onLogout();
            return [];
          }
          return response.json();
        })
        .then((data: unknown) => {
          console.log('Users data received:', data);
          if (Array.isArray(data)) {
            console.log('Users detailed:', data.map(u => ({ 
              id: u._id, 
              username: u.username, 
              email: u.email, 
              role: u.role,
              companyId: u.companyId 
            })));
            setUsers(data);
            console.log('Users set:', data.length, 'users');
          } else {
            console.log('Users data is not array:', data);
            setUsers([]);
          }
        })
        .catch((error) => {
          console.error('Error loading users:', error);
          setUsers([]);
        });

      // Загружаем фурнитуру только для нужных компаний
      let companiesToLoad: Company[] = [];
      if (user.role === 'superadmin') {
        // Superadmin - загружаем для всех компаний
        companiesToLoad = companies;
      } else {
        // Admin/User - загружаем только для своей компании
        const userCompany = companies.find(c => c._id === effectiveCompanyId);
        if (userCompany) {
          companiesToLoad = [userCompany];
        }
      }
      
      console.log('Loading hardware for companies:', companiesToLoad.map(c => ({ id: c._id, name: c.name })));
      const hardwarePromises = companiesToLoad.map(async (company) => {
        try {
          console.log(`Loading hardware for company ${company.name} (${company._id})`);
          const res = await fetchWithAuth(`${API_URL}/hardware?companyId=${company._id}`, undefined, true);
          if (res.status === 401) {
            console.error('Unauthorized - redirecting to login');
            onLogout();
            return { companyId: company._id, data: [] };
          }
          const data = await res.json();
          console.log(`Hardware loaded for ${company.name}:`, data);
          return { companyId: company._id, data: Array.isArray(data) ? data : [] };
        } catch (error) {
          console.error(`Failed to load hardware for ${company.name}:`, error);
          return { companyId: company._id, data: [] };
        }
      });

      // Ждем завершения всех запросов
      await Promise.all([usersPromise, ...hardwarePromises.map(async (promise) => {
        const result = await promise;
        console.log('Setting hardware for company:', result.companyId, result.data);
        setHardwareByCompany(prev => ({ ...prev, [result.companyId]: result.data }));
      })]);

      console.log('All admin data loaded successfully');
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Ошибка загрузки данных админ-панели:', error);
    } finally {
      setIsLoadingData(false);
      console.log('loadAllAdminData finished, current hardwareByCompany state will be updated');
    }
  };

  // Загружаем данные один раз при монтировании или изменении effectiveCompanyId
  useEffect(() => {
    console.log('AdminPanel data loading useEffect:', { effectiveCompanyId, companiesLength: companies.length });
    
    if (effectiveCompanyId && companies.length > 0) {
      console.log('Calling loadAllAdminData from useEffect');
      // Сбрасываем состояние загрузки перед новой загрузкой
      setIsDataLoaded(false);
      setIsLoadingData(false);
      loadAllAdminData();
    } else {
      console.log('Not calling loadAllAdminData:', { hasCompanyId: !!effectiveCompanyId, hasCompanies: companies.length > 0 });
    }
  }, [effectiveCompanyId, companies.length]);

  // Логирование изменений hardwareByCompany для диагностики
  useEffect(() => {
    console.log('hardwareByCompany updated:', hardwareByCompany);
  }, [hardwareByCompany]);

  // Функции для обновления данных при необходимости
  const refreshUsers = async () => {
    let usersUrl = `${API_URL}/users`;
    // Для superadmin передаем companyId в query, для admin/user сервер использует данные из токена
    if (user.role === 'superadmin' && effectiveCompanyId && effectiveCompanyId !== 'all') {
      usersUrl += `?companyId=${effectiveCompanyId}`;
    }
    console.log('Refreshing users:', { usersUrl, effectiveCompanyId, userRole: user.role });
    try {
      const res = await fetchWithAuth(usersUrl, undefined, true);
      if (res.status === 401) {
        console.error('Unauthorized - redirecting to login');
        onLogout();
        return;
      }
      const data = await res.json();
      console.log('Refresh users data received:', data);
      if (Array.isArray(data)) {
        setUsers(data);
        console.log('Users refreshed:', data.length, 'users');
      } else {
        console.log('Refresh users data is not array:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Ошибка обновления пользователей:', error);
    }
  };

  const refreshHardware = async (companyId: string) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/hardware?companyId=${companyId}`, undefined, true);
      if (res.status === 401) {
        console.error('Unauthorized - redirecting to login');
        onLogout();
        return;
      }
      const data = await res.json();
      setHardwareByCompany(prev => ({ 
        ...prev, 
        [companyId]: Array.isArray(data) ? data : [] 
      }));
    } catch (error) {
      console.error('Ошибка обновления фурнитуры:', error);
    }
  };



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

  // --- Cleanup таймеров при размонтировании ---
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'crimson', fontSize: 20 }}>Нет доступа к админ-панели</div>;
  }

  // Формируем вкладки динамически по роли
  const sections = [
    ...(user && user.role === 'superadmin' ? [{ key: 'companies', label: 'Компании' }] : []),
    { key: 'users', label: 'Пользователи' },
    { key: 'statuses', label: 'Статусы' },
    { key: 'hardware', label: 'Цены' },
    { key: 'templates', label: 'Шаблоны' },
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
          <nav className="admin-sidebar" style={{ 
            width: 200, 
            minWidth: 200, 
            maxWidth: 200,
            background: '#fff', 
            borderRight: '1px solid #eee', 
            padding: '24px 0', 
            height: 'calc(100vh - 56px)',
            overflow: 'auto',
            position: 'relative',
            flexShrink: 0
          }}>
            {sections.map((s) => (
              <div
                key={s.key}
                onClick={() => {
                  if (s.key === section || isTransitioning) return; // Предотвращаем клик на уже активную вкладку или во время перехода
                  if (window.adminSetSection) {
                    window.adminSetSection(s.key);
                  } else {
                    // Очищаем предыдущий таймер
                    if (debounceTimer) {
                      clearTimeout(debounceTimer);
                    }
                    
                    setIsTransitioning(true);
                    const timer = window.setTimeout(() => {
                      setSection(s.key);
                      setIsTransitioning(false);
                      setDebounceTimer(null);
                    }, 100);
                    
                    setDebounceTimer(timer);
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
        <div className="admin-content" style={{ 
          flex: 1, 
          padding: isMobile ? 0 : 32, 
          background: isMobile ? '#fff' : '#f6f8fa', 
          minHeight: 'calc(100vh - 56px)',
          height: 'calc(100vh - 56px)',
          overflow: 'auto',
          position: 'relative',
          opacity: isTransitioning ? 0.7 : 1,
          transition: 'opacity 0.1s ease-in-out'
        }}>
          {/* Загрузка компаний */}
          {companies == null || isLoadingData ? (
            <div style={{ padding: 32 }}>
              {companies == null ? 'Загрузка компаний...' : 'Загрузка данных админ-панели...'}
            </div>
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
              companies={companies}
              selectedCompanyId={effectiveCompanyId}
              userRole={user.role}
              fetchWithAuth={fetchWithAuth}
              onRefreshUsers={refreshUsers}
            />
          ) : section === 'statuses' ? (
            <StatusesTab
              selectedCompanyId={effectiveCompanyId}
              fetchWithAuth={fetchWithAuth}
              onRefreshStatuses={() => {
                // Здесь можно добавить дополнительную логику обновления
                console.log('Statuses updated, refreshing related data...');
              }}
            />
          ) : section === 'hardware' ? (
            <HardwareTab
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              user={user}
              onLogout={onLogout}
              activeSubTab={new URLSearchParams(location.search).get('sub') || ''}
              onChangeSubTab={(sub: string) => {
                const params = new URLSearchParams(location.search);
                params.set('section', 'hardware');
                params.set('sub', sub);
                navigate(`/admin?${params.toString()}`);
              }}
              onRefreshHardware={refreshHardware}
            />
          ) : section === 'templates' ? (
            <TemplatesTab
              companies={companies}
              selectedCompanyId={effectiveCompanyId}
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
        /* Предотвращение дрожания при переключении вкладок */
        .admin-content {
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        .admin-content > * {
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        /* Фиксированные размеры для стабильности */
        .admin-sidebar, .admin-content {
          will-change: auto;
        }
        
        /* Предотвращение мигания компонентов */
        .admin-sidebar div {
          transform: translateZ(0);
        }
        
        @media (max-width: 600px) {
          .admin-content {
            padding: 0 !important;
            background: #fff !important;
            color: #333 !important;
            overflow-x: auto !important;
            width: 100vw !important;
            min-width: 0 !important;
            height: calc(100vh - 56px) !important;
          }
          .admin-content * {
            color: #333 !important;
          }
          .admin-content h1, .admin-content h2, .admin-content h3 {
            color: #333 !important;
          }
          .admin-content th, .admin-content td {
            color: #333 !important;
          }
          .admin-content div, .admin-content span, .admin-content p {
            color: #333 !important;
          }
          .admin-sidebar {
            display: none !important;
          }
          body, html, #root, .App, .admin-panel-root {
            background: #fff !important;
            color: #333 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminPanel; 