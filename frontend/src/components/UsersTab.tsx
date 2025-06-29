import React from 'react';
import ModalForm from './ModalForm';
import type { User } from '../types/User';
import { FaUserEdit, FaRegTrashAlt } from 'react-icons/fa';
import { API_URL } from '../utils/api';

interface Company {
  _id: string;
  name: string;
}
interface UsersTabProps {
  users: User[];
  companies: Company[];
  selectedCompanyId: string | null;
  userRole: string;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit, retry?: boolean) => Promise<Response>;
  onRefreshUsers?: () => Promise<void>;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, companies, selectedCompanyId, userRole, fetchWithAuth, onRefreshUsers }) => {
  const [showAddUser, setShowAddUser] = React.useState(false);
  const [userForm, setUserForm] = React.useState({ username: '', email: '', password: '', role: 'user', phone: '' });
  const [userFormError, setUserFormError] = React.useState('');
  const [userFormFieldNames, setUserFormFieldNames] = React.useState({ username: 'username', password: 'password' });
  const [showEditUser, setShowEditUser] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);

  const companyName = selectedCompanyId === 'all'
    ? 'Все компании'
    : (companies.find(c => c._id === selectedCompanyId)?.name || '');

  // Универсальная фильтрация пользователей по выбранной компании и исключение суперадминов
  console.log('UsersTab filtering users:', { 
    selectedCompanyId, 
    usersCount: users.length, 
    users: users.map(u => ({ id: u._id, username: u.username, companyId: u.companyId, role: u.role }))
  });
  
  const filteredUsers = (selectedCompanyId && selectedCompanyId !== 'all'
    ? users.filter(u =>
        ((typeof u.companyId === 'object' && u.companyId?._id?.toString() === selectedCompanyId?.toString()) ||
        (typeof u.companyId === 'string' && u.companyId === selectedCompanyId))
      )
    : users
  ).filter(u => u.role !== 'superadmin');
  
  console.log('UsersTab filtered users:', { 
    filteredCount: filteredUsers.length, 
    filteredUsers: filteredUsers.map(u => ({ id: u._id, username: u.username, companyId: u.companyId, role: u.role }))
  });

  const handleAddUser = () => {
    setShowAddUser(true);
    setUserForm({ username: '', email: '', password: '', role: 'user', phone: '' });
    setUserFormError('');
    setUserFormFieldNames({
      username: 'username_' + Date.now(),
      password: 'password_' + Date.now(),
    });
  };

  const handleSubmitAddUser = async () => {
    if (!userForm.username || !userForm.email || !userForm.password) {
      setUserFormError('Все обязательные поля должны быть заполнены');
      return;
    }
    const body: Record<string, string> = { ...userForm };
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      body.companyId = selectedCompanyId;
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error && /duplicate key/i.test(data.error) && /username/i.test(data.error)) {
          setUserFormError('Пользователь с таким именем уже существует');
        } else {
          setUserFormError(data?.error || 'Ошибка при добавлении пользователя');
        }
        return;
      }
      setShowAddUser(false);
      setUserForm({ username: '', email: '', password: '', role: 'user', phone: '' });
      setUserFormError('');
      // Обновляем список пользователей
      if (onRefreshUsers) {
        onRefreshUsers();
      }
    } catch {
      setUserFormError('Ошибка сети');
    }
  };

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setUserForm({
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      phone: (typeof user === 'object' && 'phone' in user && typeof user['phone'] === 'string' ? user['phone'] : '')
    });
    setShowEditUser(true);
    setUserFormError('');
    setUserFormFieldNames({
      username: 'username_' + Date.now(),
      password: 'password_' + Date.now(),
    });
  };

  const handleSubmitEditUser = async () => {
    if (!editUser) return;
    if (!userForm.username || !userForm.email) {
      setUserFormError('Все обязательные поля должны быть заполнены');
      return;
    }
    const body: Record<string, string> = {
      username: userForm.username,
      email: userForm.email,
      role: userForm.role,
      phone: userForm.phone,
    };
    if (userForm.password) body.password = userForm.password;
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      body.companyId = selectedCompanyId;
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/users/${editUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserFormError(data?.error || 'Ошибка при редактировании пользователя');
        return;
      }
      setShowEditUser(false);
      setEditUser(null);
      setUserForm({ username: '', email: '', password: '', role: 'user', phone: '' });
      setUserFormError('');
      // Обновляем список пользователей
      if (onRefreshUsers) {
        onRefreshUsers();
      }
    } catch {
      setUserFormError('Ошибка сети');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm('Удалить пользователя?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/users/${user._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      // Обновляем список пользователей
      if (onRefreshUsers) {
        onRefreshUsers();
      }
    } catch {
      alert('Ошибка удаления пользователя');
    }
  };

  return (
    <div style={{
      minHeight: 500,
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Пользователи {companyName}
        </h2>
        <button onClick={handleAddUser} style={{ padding: '8px 18px', borderRadius: 8, background: '#fff', color: '#646cff', border: '2px solid #646cff', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}>
          Добавить
        </button>
      </div>
      <ModalForm
        isOpen={showAddUser}
        title="Добавить пользователя"
        fields={[
          { name: userFormFieldNames.username, label: 'Имя пользователя', type: 'text', required: true, value: userForm.username, onChange: v => setUserForm(f => ({ ...f, username: String(v) })), autoComplete: 'off' },
          { name: 'email', label: 'Email', type: 'email', required: true, value: userForm.email, onChange: v => setUserForm(f => ({ ...f, email: String(v) })), autoComplete: 'off' },
          { name: userFormFieldNames.password, label: 'Пароль', type: 'password', required: true, value: userForm.password, onChange: v => setUserForm(f => ({ ...f, password: String(v) })), autoComplete: 'off' },
          { name: 'role', label: 'Роль', type: 'select', required: true, value: userForm.role, onChange: v => setUserForm(f => ({ ...f, role: String(v) })), options: [
            { value: 'user', label: 'Пользователь' },
            { value: 'admin', label: 'Админ' },
          ], autoComplete: 'off' },
          { name: 'phone', label: 'Телефон', type: 'text', value: userForm.phone, onChange: v => setUserForm(f => ({ ...f, phone: String(v) })), autoComplete: 'off' },
        ]}
        onSubmit={handleSubmitAddUser}
        onCancel={() => { setShowAddUser(false); setUserFormError(''); }}
        submitText="Добавить"
        companyNameError={userFormError}
      />
      {userRole === 'superadmin' && !selectedCompanyId ? (
        companies.map(comp => {
          const companyUsers = users.filter(u => u.companyId === comp._id);
          if (companyUsers.length === 0) return null;
          return (
            <div key={comp._id} style={{ marginBottom: 32 }}>
              <div style={{ fontWeight: 600, fontSize: 18, margin: '16px 0 12px 0' }}>{comp.name}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8ff' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Имя</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Роль</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Компания</th>
                    <th style={{ textAlign: 'center', padding: 8 }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {companyUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{u.username}</td>
                      <td style={{ padding: 8 }}>{u.email}</td>
                      <td style={{ padding: 8 }}>{u.role}</td>
                      <td style={{ padding: 8 }}>{companies.find(c => c._id === u.companyId)?.name || '-'}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {/* TODO: реализовать редактирование/удаление */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
          {filteredUsers.length === 0 ? (
            <div style={{ color: '#888' }}>
              Нет пользователей
              {users.length > 0 && (
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  (Всего пользователей: {users.length}, отфильтровано для компании: {selectedCompanyId})
                </div>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f6f8ff' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Имя</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Роль</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Компания</th>
                  <th style={{ textAlign: 'center', padding: 8 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{u.username}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{u.role}</td>
                    <td style={{ padding: 8 }}>
                      {typeof u.companyId === 'object'
                        ? u.companyId?.name
                        : (companies.find(c => c._id === u.companyId)?.name || '-')}
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                        <span title="Редактировать" onClick={() => handleEditUser(u)} style={{ display: 'inline-block', width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                          <FaUserEdit color="#888" size={16} />
                        </span>
                        <span title="Удалить" onClick={() => handleDeleteUser(u)} style={{ display: 'inline-block', width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                          <FaRegTrashAlt color="#888" size={16} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <ModalForm
        isOpen={showEditUser}
        title="Редактировать пользователя"
        fields={[
          { name: userFormFieldNames.username, label: 'Имя пользователя', type: 'text', required: true, value: userForm.username, onChange: v => setUserForm(f => ({ ...f, username: String(v) })), autoComplete: 'off' },
          { name: 'email', label: 'Email', type: 'email', required: true, value: userForm.email, onChange: v => setUserForm(f => ({ ...f, email: String(v) })), autoComplete: 'off' },
          { name: userFormFieldNames.password, label: 'Пароль', type: 'password', required: false, value: userForm.password, onChange: v => setUserForm(f => ({ ...f, password: String(v) })), autoComplete: 'off' },
          { name: 'role', label: 'Роль', type: 'select', required: true, value: userForm.role, onChange: v => setUserForm(f => ({ ...f, role: String(v) })), options: [
            { value: 'user', label: 'Пользователь' },
            { value: 'admin', label: 'Админ' },
          ], autoComplete: 'off' },
          { name: 'phone', label: 'Телефон', type: 'text', value: userForm.phone, onChange: v => setUserForm(f => ({ ...f, phone: String(v) })), autoComplete: 'off' },
        ]}
        onSubmit={handleSubmitEditUser}
        onCancel={() => { setShowEditUser(false); setEditUser(null); setUserFormError(''); }}
        submitText="Сохранить"
        companyNameError={userFormError}
      />
      <style>{`
        @media (max-width: 600px) {
          .users-table {
            width: 100vw !important;
            min-width: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            table-layout: fixed !important;
            color: #333 !important;
          }
          .users-table th, .users-table td {
            padding: 8px 4px !important;
            border: none !important;
            background: #fff !important;
            color: #333 !important;
            word-break: break-word !important;
          }
          .users-table tr {
            border-bottom: 1px solid #e0e0e0 !important;
          }
          .users-table tr:last-child {
            border-bottom: none !important;
          }
          .users-table th {
            font-size: 15px !important;
            color: #333 !important;
          }
          table th, table td {
            color: #333 !important;
          }
          div, span, h1, h2, h3, p {
            color: #333 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UsersTab; 