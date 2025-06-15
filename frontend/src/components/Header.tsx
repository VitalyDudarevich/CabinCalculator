import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../types/User';

interface HeaderProps {
  user: User | null;
  companies?: { _id: string; name: string }[];
  selectedCompanyId?: string;
  setSelectedCompanyId?: (id: string) => void;
  onLogout?: () => void;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  user,
  companies = [],
  selectedCompanyId = '',
  setSelectedCompanyId,
  onLogout,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Для админки: если не выбрано, выставить 'all' по умолчанию
  useEffect(() => {
    if (
      user && user.role === 'superadmin' &&
      location.pathname === '/admin' &&
      companies.length > 0 &&
      !selectedCompanyId &&
      setSelectedCompanyId
    ) {
      setSelectedCompanyId('all');
    }
  }, [user, companies, selectedCompanyId, setSelectedCompanyId, location.pathname]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (setSelectedCompanyId) {
      setSelectedCompanyId(e.target.value);
    }
  };

  // Определяем, мобильный ли экран
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Вкладки для меню
  const tabs = [];
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    tabs.push({ label: 'Калькулятор', path: '/calculator' });
    tabs.push({ label: 'Админ-панель', path: '/admin' });
  } else if (user && user.role === 'user') {
    tabs.push({ label: 'Калькулятор', path: '/calculator' });
  }

  // --- Админские секции для бургер-меню ---
  let adminSections: { key: string; label: string }[] = [];
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    adminSections = [
      ...(user.role === 'superadmin' ? [{ key: 'companies', label: 'Компании' }] : []),
      { key: 'users', label: 'Пользователи' },
      { key: 'hardware', label: 'Цены' },
      { key: 'settings', label: 'Настройки' },
    ];
  }

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#fff', boxShadow: '0 2px 8px #0001', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', zIndex: 100 }}>
      {/* Дропдаун выбора компании для суперадмина (оставляем всегда) */}
      {user && user.role === 'superadmin' && setSelectedCompanyId && !isMobile && companies.length > 0 && (
        <select
          value={selectedCompanyId}
          onChange={handleCompanyChange}
          style={{ marginRight: 16, padding: 8, borderRadius: 8, fontSize: 16 }}
        >
          {location.pathname === '/admin' && (
            <option value="all">Все компании</option>
          )}
          {location.pathname === '/calculator' && (
            <option value="">Выберите компанию...</option>
          )}
          {companies.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Мобильный бургер-меню */}
      {isMobile ? (
        <>
          <button
            aria-label="Открыть меню"
            onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: 'none', padding: 8, marginLeft: 8, cursor: 'pointer', zIndex: 102 }}
          >
            {/* SVG бургер */}
            <svg width="28" height="28" viewBox="0 0 28 28"><rect y="5" width="28" height="3" rx="1.5" fill="#646cff"/><rect y="12.5" width="28" height="3" rx="1.5" fill="#646cff"/><rect y="20" width="28" height="3" rx="1.5" fill="#646cff"/></svg>
          </button>
          {menuOpen && (
            <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)} />
          )}
          <nav className={`mobile-menu${menuOpen ? ' open' : ''}`}>
            <button
              aria-label="Закрыть меню"
              onClick={() => setMenuOpen(false)}
              style={{ background: 'none', border: 'none', position: 'absolute', top: 16, right: 16, cursor: 'pointer' }}
            >
              {/* SVG крестик */}
              <svg width="28" height="28" viewBox="0 0 28 28"><line x1="6" y1="6" x2="22" y2="22" stroke="#646cff" strokeWidth="3" strokeLinecap="round"/><line x1="22" y1="6" x2="6" y2="22" stroke="#646cff" strokeWidth="3" strokeLinecap="round"/></svg>
            </button>
            <div style={{ padding: '56px 0 0 0', display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 12, paddingRight: 12 }}>
              {tabs.map(tab => (
                <button
                  key={tab.path}
                  onClick={() => { setMenuOpen(false); navigate(tab.path); }}
                  className={location.pathname === tab.path ? 'active' : ''}
                  style={{
                    width: '100%',
                    padding: '18px 0 18px 20px',
                    fontSize: 20,
                    fontWeight: 600,
                    background: location.pathname === tab.path ? '#646cff' : 'transparent',
                    color: location.pathname === tab.path ? '#fff' : '#222',
                    border: 'none',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                    textAlign: 'left',
                  }}
                >
                  {tab.label}
                </button>
              ))}
              {/* --- Админка --- */}
              {adminSections.length > 0 && (
                <div style={{
                  background: location.pathname.startsWith('/admin') ? '#e0e7ff' : 'transparent',
                  borderRadius: 10,
                  margin: 0,
                  padding: '0 4px',
                }}>
                  {adminSections.map((s, idx) => {
                    const params = new URLSearchParams(location.search);
                    const sectionParam = params.get('section');
                    const isAdminPage = location.pathname.startsWith('/admin');
                    const isActive = s.key === 'companies'
                      ? (!sectionParam || sectionParam === 'companies')
                      : sectionParam === s.key;
                    let adminBg = isAdminPage ? (isActive && s.key === 'companies' ? '#646cff' : '#e0e7ff') : 'transparent';
                    const adminColor = isAdminPage ? (isActive && s.key === 'companies' ? '#fff' : isActive ? '#646cff' : '#222') : '#222';
                    let adminBorder = 'none';
                    if (isActive && isAdminPage && s.key !== 'companies') {
                      adminBg = '#fff';
                      adminBorder = '2px solid #646cff';
                    }
                    return (
                      <button
                        key={s.key}
                        onClick={() => {
                          setMenuOpen(false);
                          let url = '/admin';
                          if (s.key !== 'companies') {
                            url = `/admin?section=${s.key}`;
                          }
                          // Явное расширение window для adminSetSection
                          type WindowWithAdminSection = Window & { adminSetSection?: (key: string) => void };
                          const win = window as WindowWithAdminSection;
                          if (win.adminSetSection) {
                            win.adminSetSection(s.key);
                          }
                          navigate(url);
                        }}
                        className={isActive && isAdminPage ? 'active' : ''}
                        style={{
                          width: '100%',
                          padding: '16px 0 16px 36px',
                          fontSize: 18,
                          fontWeight: 500,
                          background: adminBg,
                          color: adminColor,
                          border: adminBorder,
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                          transition: 'background 0.15s, color 0.15s, border 0.15s',
                          textAlign: 'left',
                          borderRadius: isActive && isAdminPage ? 8 : (idx === 0 ? '10px 10px 0 0' : (idx === adminSections.length - 1 ? '0 0 10px 10px' : 0)),
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* --- конец админки --- */}
              <div style={{ borderTop: '1px solid #eee', margin: '24px 0 0 0', padding: '16px 0 0 0', display: 'flex', justifyContent: 'center' }}>
                {user && (
                  <button
                    onClick={() => { setMenuOpen(false); if (onLogout) onLogout(); }}
                    style={{
                      width: 180,
                      padding: '14px 0',
                      fontSize: 18,
                      fontWeight: 600,
                      background: '#fff',
                      color: '#646cff',
                      border: '2px solid #646cff',
                      borderRadius: 8,
                      cursor: 'pointer',
                      boxShadow: 'none',
                      marginTop: 0,
                      marginBottom: 0,
                      textAlign: 'center',
                      display: 'block',
                    }}
                  >
                    Выйти
                  </button>
                )}
              </div>
            </div>
          </nav>
          <style>{`
            .mobile-menu-overlay {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.15);
              z-index: 101;
            }
            .mobile-menu {
              position: fixed;
              top: 0; left: 0; right: 0;
              background: #fff;
              min-height: 100vh;
              z-index: 102;
              box-shadow: 0 2px 16px #0002;
              transform: translateY(-100%);
              transition: transform 0.25s cubic-bezier(.4,0,.2,1);
              will-change: transform;
              padding-bottom: 32px;
            }
            .mobile-menu.open {
              transform: translateY(0);
            }
            .mobile-menu button.active {
              background: #646cff !important;
              color: #fff !important;
            }
            @media (min-width: 600px) {
              .mobile-menu, .mobile-menu-overlay {
                display: none !important;
              }
            }
          `}</style>
        </>
      ) : (
        <>
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
        </>
      )}
      {children}
    </header>
  );
};

export default Header; 