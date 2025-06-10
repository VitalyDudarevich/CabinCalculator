import React from 'react';
import { FaUserEdit, FaRegTrashAlt } from 'react-icons/fa';
import type { User } from '../types/User';

interface Company {
  _id: string;
  name: string;
}
interface UsersTabProps {
  users: User[];
  companies: Company[];
  selectedCompanyId: string | null;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  onAdd: () => void;
  userRole: string;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, companies, selectedCompanyId, onEdit, onDelete, onAdd, userRole }) => {
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Пользователи {companyName}
        </h2>
        <button onClick={onAdd} style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}>
          Добавить
        </button>
      </div>
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
                        <span title="Редактировать" onClick={() => onEdit(u)} style={{ display: 'inline-block', marginRight: 10, width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                          <FaUserEdit color="#888" size={16} />
                        </span>
                        <span title="Удалить" onClick={() => onDelete(u)} style={{ display: 'inline-block', width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                          <FaRegTrashAlt color="#888" size={16} />
                        </span>
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
                      <span title="Редактировать" onClick={() => onEdit(u)} style={{ display: 'inline-block', marginRight: 10, width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                        <FaUserEdit color="#888" size={16} />
                      </span>
                      <span title="Удалить" onClick={() => onDelete(u)} style={{ display: 'inline-block', width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                        <FaRegTrashAlt color="#888" size={16} />
                      </span>
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