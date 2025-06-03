import React from 'react';
import { FaRegTrashAlt, FaUserEdit } from 'react-icons/fa';

export type Company = {
  _id: string;
  name: string;
  ownerName?: string;
  ownerContact?: string;
  city?: string;
  // ...другие поля по необходимости
};

interface CompaniesTabProps {
  companies: Company[];
  selectedCompanyId: string;
  onAdd: () => void;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
}

const CompaniesTab: React.FC<CompaniesTabProps> = ({ companies, selectedCompanyId, onAdd, onEdit, onDelete }) => {
  let displayCompanies = companies;
  if (selectedCompanyId && selectedCompanyId !== 'all') {
    displayCompanies = companies.filter(c => c._id === selectedCompanyId);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Компании
        </h2>
        <button onClick={onAdd} style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}>
          Добавить
        </button>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
        {displayCompanies.length === 0 ? (
          <div style={{ color: '#888' }}>Нет компаний</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f6f8ff' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Название</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Город</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Имя владельца</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Контакт владельца</th>
                <th style={{ textAlign: 'center', padding: 8 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {displayCompanies.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{c.name}</td>
                  <td style={{ padding: 8 }}>{c.city || '-'}</td>
                  <td style={{ padding: 8 }}>{c.ownerName || '-'}</td>
                  <td style={{ padding: 8 }}>{c.ownerContact || '-'}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <span title="Изменить" onClick={() => onEdit(c)} style={{ marginRight: 10, cursor: 'pointer' }}>
                      <FaUserEdit color="#888" size={16} />
                    </span>
                    <span title="Удалить" onClick={() => onDelete(c._id)} style={{ cursor: 'pointer' }}>
                      <FaRegTrashAlt color="#e53e3e" size={16} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CompaniesTab; 