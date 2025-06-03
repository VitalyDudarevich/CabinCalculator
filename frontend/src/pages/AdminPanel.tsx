import React, { useState, useEffect } from 'react';
import ServicesTab from '../components/ServicesTab';
import SettingsTab from '../components/SettingsTab';
import CompaniesTab from '../components/CompaniesTab';
import UsersTab from '../components/UsersTab';
import ModalForm from '../components/ModalForm';
import HardwareTab from '../components/HardwareTab';
import type { User } from '../types/User';
import type { Company } from '../types/Company';
import type { HardwareItem } from '../types/HardwareItem';
// import HardwareTab from '../components/HardwareTab'; // если понадобится

const sections = [
  { key: 'companies', label: 'Компании' },
  { key: 'users', label: 'Пользователи' },
  { key: 'hardware', label: 'Фурнитура' },
  { key: 'services', label: 'Услуги' },
  { key: 'settings', label: 'Настройки' },
];

const currencyOptions = ['GEL', 'USD', 'EUR', 'RR'];

export default function AdminPanel({ user, onLogout, onCalculator }: { user: User; onLogout: () => void; onCalculator: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState('');
  const [section, setSection] = useState('companies');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    city: '',
    ownerName: '',
    ownerContact: '',
  });
  const [companyNameError, setCompanyNameError] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    companyId: '',
  });
  const [userFormErrors, setUserFormErrors] = useState<{ email?: string; username?: string }>({});
  const [hardwareByCompany, setHardwareByCompany] = useState<Record<string, HardwareItem[]>>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    username: '',
    email: '',
    role: 'user',
    companyId: '',
  });
  const [editUserFormErrors, setEditUserFormErrors] = useState<{ email?: string; username?: string }>({});

  // Универсальная функция fetch с авто-рефрешем токена
  async function fetchWithAuth(input: RequestInfo, init?: RequestInit, retry = true): Promise<Response> {
    const token = localStorage.getItem('token');
    const headers = { ...(init?.headers || {}), Authorization: `Bearer ${token || ''}` };
    const res = await fetch(input, { ...init, headers });

    if ((res.status === 401 || res.status === 400) && retry) {
      // Попытка обновить токен
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const { token: newToken } = await refreshRes.json();
        if (newToken) {
          localStorage.setItem('token', newToken);
          // Повторяем исходный запрос с новым токеном
          return fetchWithAuth(input, init, false);
        }
      }
      // Не удалось обновить — разлогин
      localStorage.removeItem('token');
      onLogout();
      throw new Error('Не удалось обновить токен');
    }

    return res;
  }

  useEffect(() => {
    setCompaniesLoading(true);
    setCompaniesError('');
    fetchWithAuth('/api/companies')
      .then(res => res.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompaniesError('Ошибка загрузки компаний'))
      .finally(() => setCompaniesLoading(false));
  }, []);

  const company = companies.find(c => c._id === selectedCompanyId) || null;

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId('all');
    }
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    if (section !== 'users') return;
    setUsersLoading(true);
    setUsersError('');
    let url = '/api/users';
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      url += `?companyId=${selectedCompanyId}`;
    }
    fetchWithAuth(url)
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsersError('Ошибка загрузки пользователей'))
      .finally(() => setUsersLoading(false));
  }, [section, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId || selectedCompanyId === 'all') return;
    fetchWithAuth(`/api/hardware?companyId=${selectedCompanyId}`)
      .then(res => res.json())
      .then(data => setHardwareByCompany(prev => ({ ...prev, [selectedCompanyId]: Array.isArray(data) ? data : [] })))
      .catch(() => setHardwareByCompany(prev => ({ ...prev, [selectedCompanyId]: [] })));
  }, [selectedCompanyId]);

  const handleEditUser = (u: User) => {
    setEditUser(u);
    setEditUserForm({
      username: u.username,
      email: u.email,
      role: u.role,
      companyId: typeof u.companyId === 'object' ? u.companyId._id : (u.companyId || ''),
    });
    setEditUserFormErrors({});
    setShowEditUser(true);
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Удалить пользователя "${u.username}"?`)) return;
    const res = await fetchWithAuth(`/api/users/${u._id}`, { method: 'DELETE' });
    const data = await res.json();
    handleApiError(data);
    setUsers(users => users.filter(user => user._id !== u._id));
  };

  const handleEditCompany = (company: Company) => {
    setCompanyForm({
      name: company.name || '',
      city: company.city || '',
      ownerName: company.ownerName || '',
      ownerContact: company.ownerContact || '',
    });
    setEditCompanyId(company._id);
    setShowEditCompany(true);
  };

  const handleApiError = (data: { error?: string }) => {
    if (data?.error && /access token/i.test(data.error)) {
      localStorage.removeItem('token');
      onLogout(); // корректно разлогиниваем
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!window.confirm('Удалить компанию?')) return;
    const res = await fetchWithAuth(`/api/companies/${id}`, { method: 'DELETE' });
    const data = await res.json();
    handleApiError(data);
    setCompanies(companies => companies.filter(c => c._id !== id));
  };

  const handleAddCompany = async () => {
    // Проверка уникальности имени (без учёта регистра)
    const exists = companies.some(c => c.name.trim().toLowerCase() === companyForm.name.trim().toLowerCase());
    if (exists) {
      setCompanyNameError('Компания с таким именем уже существует');
      return;
    }
    const res = await fetchWithAuth('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyForm),
    });
    const data = await res.json();
    handleApiError(data);
    setShowAddCompany(false);
    setCompanyForm({ name: '', city: '', ownerName: '', ownerContact: '' });
    setCompanyNameError('');
    setCompaniesLoading(true);
    fetchWithAuth('/api/companies')
      .then(res => res.json())
      .then(data => {
        handleApiError(data);
        setCompanies(Array.isArray(data) ? data : []);
        // Найти только что созданную компанию по имени и городу (или по id, если возвращается)
        if (Array.isArray(data)) {
          const newCompany = data.find(c => c.name.trim().toLowerCase() === companyForm.name.trim().toLowerCase() && c.city.trim().toLowerCase() === companyForm.city.trim().toLowerCase());
          if (newCompany) setSelectedCompanyId(newCompany._id);
        }
      })
      .catch(() => setCompaniesError('Ошибка загрузки компаний'))
      .finally(() => setCompaniesLoading(false));
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'crimson', fontSize: 20 }}>Нет доступа к админ-панели</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#fff', boxShadow: '0 2px 8px #0001', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', zIndex: 100 }}>
        {/* Дропдаун выбора компании */}
        {companies.length > 0 && (
          <select
            value={selectedCompanyId}
            onChange={e => setSelectedCompanyId(e.target.value)}
            style={{
              marginRight: 16,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 16,
              background: '#f6f8fa',
              color: '#333',
              minWidth: 160,
              cursor: 'pointer',
            }}
          >
            <option value="all">Все компании</option>
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={onCalculator}
          style={{ padding: '8px 24px', borderRadius: 8, background: '#f1f1f1', color: '#888', border: 'none', fontWeight: 500, cursor: 'pointer', marginRight: 8 }}
        >
          Калькулятор
        </button>
        <button
          style={{ padding: '8px 24px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, marginRight: 16, cursor: 'default', boxShadow: '0 1px 4px #646cff22' }}
          disabled
        >
          Админ-панель
        </button>
        <div style={{ position: 'relative' }}>
          <div
            style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#333', cursor: 'pointer', userSelect: 'none' }}
            title={user.username}
            onClick={() => setShowUserMenu(v => !v)}
          >
            {user.username ? user.username[0].toUpperCase() : '?'}
          </div>
          {showUserMenu && (
            <div style={{ position: 'absolute', right: 0, top: 48, background: '#fff', boxShadow: '0 2px 8px #0002', borderRadius: 8, minWidth: 140, zIndex: 10 }}>
              <button onClick={onLogout} style={{ width: '100%', padding: '12px 0', border: 'none', background: 'none', color: '#d00', fontWeight: 500, borderRadius: 8, cursor: 'pointer' }}>Выйти</button>
            </div>
          )}
        </div>
      </header>
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
          {companiesLoading && <div style={{ color: '#888', margin: 32 }}>Загрузка компаний...</div>}
          {companiesError && <div style={{ color: 'crimson', margin: 32 }}>{companiesError}</div>}
          {!companiesLoading && !companiesError && (
            <>
              {section === 'companies' && (
                <>
                  <CompaniesTab
                    companies={companies}
                    selectedCompanyId={selectedCompanyId}
                    onAdd={() => setShowAddCompany(true)}
                    onEdit={handleEditCompany}
                    onDelete={handleDeleteCompany}
                  />
                  <ModalForm
                    isOpen={showAddCompany}
                    title="Добавить компанию"
                    fields={[
                      {
                        name: 'name',
                        label: 'Название компании',
                        type: 'text',
                        required: true,
                        value: companyForm.name,
                        onChange: v => {
                          setCompanyForm(f => ({ ...f, name: String(v) }));
                          setCompanyNameError('');
                        },
                      },
                      { name: 'city', label: 'Город', type: 'text', value: companyForm.city, onChange: v => setCompanyForm(f => ({ ...f, city: String(v) })) },
                      { name: 'ownerName', label: 'Имя владельца', type: 'text', value: companyForm.ownerName, onChange: v => setCompanyForm(f => ({ ...f, ownerName: String(v) })) },
                      { name: 'ownerContact', label: 'Контакт владельца', type: 'text', value: companyForm.ownerContact, onChange: v => setCompanyForm(f => ({ ...f, ownerContact: String(v) })) },
                    ]}
                    companyNameError={companyNameError}
                    onSubmit={handleAddCompany}
                    onCancel={() => {
                      setShowAddCompany(false);
                      setCompanyForm({ name: '', city: '', ownerName: '', ownerContact: '' });
                      setCompanyNameError('');
                    }}
                    submitText="Добавить"
                  />
                  <ModalForm
                    isOpen={showEditCompany}
                    title="Редактировать компанию"
                    fields={[
                      {
                        name: 'name',
                        label: 'Название компании',
                        type: 'text',
                        required: true,
                        value: companyForm.name,
                        onChange: v => setCompanyForm(f => ({ ...f, name: String(v) })),
                      },
                      { name: 'city', label: 'Город', type: 'text', value: companyForm.city, onChange: v => setCompanyForm(f => ({ ...f, city: String(v) })) },
                      { name: 'ownerName', label: 'Имя владельца', type: 'text', value: companyForm.ownerName, onChange: v => setCompanyForm(f => ({ ...f, ownerName: String(v) })) },
                      { name: 'ownerContact', label: 'Контакт владельца', type: 'text', value: companyForm.ownerContact, onChange: v => setCompanyForm(f => ({ ...f, ownerContact: String(v) })) },
                    ]}
                    onSubmit={async () => {
                      if (!editCompanyId) return;
                      const res = await fetchWithAuth(`/api/companies/${editCompanyId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(companyForm),
                      });
                      const data = await res.json();
                      handleApiError(data);
                      setShowEditCompany(false);
                      setEditCompanyId(null);
                      setCompanyForm({ name: '', city: '', ownerName: '', ownerContact: '' });
                      setCompaniesLoading(true);
                      fetchWithAuth('/api/companies')
                        .then(res => res.json())
                        .then(data => { handleApiError(data); setCompanies(Array.isArray(data) ? data : []); })
                        .catch(() => setCompaniesError('Ошибка загрузки компаний'))
                        .finally(() => setCompaniesLoading(false));
                    }}
                    onCancel={() => {
                      setShowEditCompany(false);
                      setEditCompanyId(null);
                      setCompanyForm({ name: '', city: '', ownerName: '', ownerContact: '' });
                    }}
                    submitText="Сохранить"
                  />
                </>
              )}
              {section === 'users' && companies.length > 0 && (
                <>
                  <UsersTab
                    users={users}
                    companies={companies}
                    selectedCompanyId={selectedCompanyId}
                    loading={usersLoading}
                    error={usersError}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                    onAdd={() => setShowAddUser(true)}
                    userRole={user.role}
                  />
                  <ModalForm
                    isOpen={showAddUser}
                    title="Добавить пользователя"
                    fields={[
                      {
                        name: 'username',
                        label: 'Имя пользователя',
                        type: 'text',
                        required: true,
                        value: userForm.username,
                        onChange: v => {
                          setUserForm(f => ({ ...f, username: String(v) }));
                          setUserFormErrors(e => ({ ...e, username: undefined }));
                        },
                        error: userFormErrors.username,
                      },
                      {
                        name: 'email',
                        label: 'Email',
                        type: 'email',
                        required: true,
                        value: userForm.email,
                        onChange: v => {
                          setUserForm(f => ({ ...f, email: String(v) }));
                          setUserFormErrors(e => ({ ...e, email: undefined }));
                        },
                        error: userFormErrors.email,
                        autoComplete: 'off',
                      },
                      { name: 'password', label: 'Пароль', type: 'password', required: true, value: userForm.password, onChange: v => setUserForm(f => ({ ...f, password: String(v) })), autoComplete: 'new-password' },
                      { name: 'role', label: 'Роль', type: 'select', required: true, value: userForm.role, onChange: v => setUserForm(f => ({ ...f, role: String(v) })), options: [ { value: 'user', label: 'Пользователь' }, { value: 'admin', label: 'Админ' } ] },
                      { name: 'companyId', label: 'Компания', type: 'select', required: true, value: userForm.companyId, onChange: v => setUserForm(f => ({ ...f, companyId: String(v) })), options: companies.map(c => ({ value: c._id, label: c.name })) },
                    ]}
                    onSubmit={async () => {
                      setUserFormErrors({});
                      const res = await fetchWithAuth('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userForm),
                      });
                      const data = await res.json();
                      handleApiError(data);
                      if (!res.ok && data.error) {
                        // Проверка на email
                        if (/email/i.test(data.error) && /duplicate/i.test(data.error)) {
                          setUserFormErrors({ email: 'Пользователь с таким email уже существует' });
                          return;
                        }
                        // Проверка на username
                        if (/username/i.test(data.error) && /duplicate/i.test(data.error)) {
                          setUserFormErrors({ username: 'Пользователь с таким именем уже существует' });
                          return;
                        }
                        // Если ошибка нераспознана — можно вывести общую ошибку (опционально)
                        return;
                      }
                      setShowAddUser(false);
                      setUserForm({ username: '', email: '', password: '', role: 'user', companyId: '' });
                      setUserFormErrors({});
                      setUsersLoading(true);
                      fetchWithAuth('/api/users')
                        .then(res => res.json())
                        .then(data => { handleApiError(data); setUsers(Array.isArray(data) ? data : []); })
                        .catch(() => setUsersError('Ошибка загрузки пользователей'))
                        .finally(() => setUsersLoading(false));
                    }}
                    onCancel={() => {
                      setShowAddUser(false);
                      setUserForm({ username: '', email: '', password: '', role: 'user', companyId: '' });
                      setUserFormErrors({});
                    }}
                    submitText="Добавить"
                  />
                  <ModalForm
                    isOpen={showEditUser}
                    title="Редактировать пользователя"
                    fields={[
                      {
                        name: 'username',
                        label: 'Имя пользователя',
                        type: 'text',
                        required: true,
                        value: editUserForm.username,
                        onChange: v => setEditUserForm(f => ({ ...f, username: String(v) })),
                        error: editUserFormErrors.username,
                      },
                      {
                        name: 'email',
                        label: 'Email',
                        type: 'email',
                        required: true,
                        value: editUserForm.email,
                        onChange: v => setEditUserForm(f => ({ ...f, email: String(v) })),
                        error: editUserFormErrors.email,
                      },
                      { name: 'role', label: 'Роль', type: 'select', required: true, value: editUserForm.role, onChange: v => setEditUserForm(f => ({ ...f, role: String(v) })), options: [ { value: 'user', label: 'Пользователь' }, { value: 'admin', label: 'Админ' } ] },
                      { name: 'companyId', label: 'Компания', type: 'select', required: true, value: editUserForm.companyId, onChange: v => setEditUserForm(f => ({ ...f, companyId: String(v) })), options: companies.map(c => ({ value: c._id, label: c.name })) },
                    ]}
                    onSubmit={async () => {
                      if (!editUser) return;
                      setEditUserFormErrors({});
                      const res = await fetchWithAuth(`/api/users/${editUser._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editUserForm),
                      });
                      const data = await res.json();
                      handleApiError(data);
                      if (!res.ok && data.error) {
                        if (/email/i.test(data.error) && /duplicate/i.test(data.error)) {
                          setEditUserFormErrors({ email: 'Пользователь с таким email уже существует' });
                          return;
                        }
                        if (/username/i.test(data.error) && /duplicate/i.test(data.error)) {
                          setEditUserFormErrors({ username: 'Пользователь с таким именем уже существует' });
                          return;
                        }
                        return;
                      }
                      setShowEditUser(false);
                      setEditUser(null);
                      setUsersLoading(true);
                      fetchWithAuth('/api/users')
                        .then(res => res.json())
                        .then(data => { handleApiError(data); setUsers(Array.isArray(data) ? data : []); })
                        .catch(() => setUsersError('Ошибка загрузки пользователей'))
                        .finally(() => setUsersLoading(false));
                    }}
                    onCancel={() => {
                      setShowEditUser(false);
                      setEditUser(null);
                    }}
                    submitText="Сохранить"
                  />
                </>
              )}
              {section === 'hardware' && companies.length > 0 && (
                <HardwareTab
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  hardwareByCompany={hardwareByCompany}
                />
              )}
              {section === 'services' && companies.length > 0 && (
            <ServicesTab
              user={user}
              company={company}
              companies={companies}
                  selectedCompanyId={selectedCompanyId}
              onLogout={onLogout}
              onCalculator={onCalculator}
            />
          )}
              {section === 'settings' && companies.length > 0 && (
            <SettingsTab
              currencyOptions={currencyOptions}
              company={company}
            />
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 