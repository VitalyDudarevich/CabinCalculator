import React from 'react';
import ModalForm from './ModalForm';
import type { User } from '../types/User';

interface Company {
  _id: string;
  name: string;
}
interface UsersTabProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  companies: Company[];
  selectedCompanyId: string | null;
  userRole: string;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit, retry?: boolean) => Promise<Response>;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, setUsers, companies, selectedCompanyId, userRole, fetchWithAuth }) => {
  const [showAddUser, setShowAddUser] = React.useState(false);
  const [userForm, setUserForm] = React.useState({ username: '', email: '', password: '', role: 'user', phone: '' });
  const [userFormError, setUserFormError] = React.useState('');
  const [userFormFieldNames, setUserFormFieldNames] = React.useState({ username: 'username', password: 'password' });

  const companyName = selectedCompanyId === 'all'
    ? 'Все компании'
    : (companies.find(c => c._id === selectedCompanyId)?.name || '');

  // Универсальная фильтрация пользователей по выбранной компании и исключение суперадминов
  const filteredUsers = (selectedCompanyId && selectedCompanyId !== 'all'
    ? users.filter(u =>
        ((typeof u.companyId === 'object' && u.companyId?._id?.toString() === selectedCompanyId?.toString()) ||
        (typeof u.companyId === 'string' && u.companyId === selectedCompanyId))
      )
    : users
  ).filter(u => u.role !== 'superadmin');

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
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserFormError(data?.error || 'Ошибка при добавлении пользователя');
        return;
      }
      setShowAddUser(false);
      setUserForm({ username: '', email: '', password: '', role: 'user', phone: '' });
      setUserFormError('');
      // Обновляем список пользователей
      let url = '/api/users';
      if (selectedCompanyId && selectedCompanyId !== 'all') {
        url += `?companyId=${selectedCompanyId}`;
      }
      fetchWithAuth(url)
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []));
    } catch {
      setUserFormError('Ошибка сети');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Пользователи {companyName}
        </h2>
        <button onClick={handleAddUser} style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}>
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
          {users.length === 0 ? (
            <div style={{ color: '#888' }}>Нет пользователей</div>
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
                      {/* TODO: реализовать редактирование/удаление */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersTab; 