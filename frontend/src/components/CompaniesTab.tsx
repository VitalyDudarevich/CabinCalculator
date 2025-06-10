import React, { useState } from 'react';
import { FaRegTrashAlt, FaUserEdit } from 'react-icons/fa';
import ModalForm from './ModalForm';
import type { User } from '../types/User';
import type { Company } from '../types/Company';

interface CompaniesTabProps {
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  setCompanies: (companies: Company[]) => void;
  user: User;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit, retry?: boolean) => Promise<Response>;
  onLogout: () => void;
}

const CompaniesTab: React.FC<CompaniesTabProps> = ({ companies, selectedCompanyId, setSelectedCompanyId, setCompanies, user, fetchWithAuth, onLogout }) => {
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', city: '', ownerName: '', ownerContact: '' });
  const [companyNameError, setCompanyNameError] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [showEditCompany, setShowEditCompany] = useState(false);

  let displayCompanies = companies;
  if (selectedCompanyId && selectedCompanyId !== 'all') {
    displayCompanies = companies.filter(c => c._id === selectedCompanyId);
  }

  const handleApiError = (data: { error?: string }) => {
    if (data?.error && /access token/i.test(data.error)) {
      localStorage.removeItem('token');
      onLogout();
    }
  };

  const handleAddCompany = async () => {
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
    const companiesRes = await fetchWithAuth('/api/companies');
    const companiesList = await companiesRes.json();
    if (Array.isArray(companiesList)) {
      setCompanies(companiesList);
      let newCompany = null;
      if (data && data._id) {
        newCompany = companiesList.find((c: Company) => c._id === data._id);
      }
      if (!newCompany) {
        newCompany = companiesList.find((c: Company) => c.name.trim().toLowerCase() === companyForm.name.trim().toLowerCase());
      }
      if (newCompany && setSelectedCompanyId) {
        setSelectedCompanyId(newCompany._id);
      }
    }
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

  const handleDeleteCompany = async (id: string) => {
    if (!window.confirm('Удалить компанию?')) return;
    const res = await fetchWithAuth(`/api/companies/${id}`, { method: 'DELETE' });
    const data = await res.json();
    handleApiError(data);
    // После удаления можно обновить список компаний через fetchWithAuth, если нужно
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Компании
        </h2>
        {user.role === 'superadmin' && (
          <button onClick={() => setShowAddCompany(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}>
            Добавить
          </button>
        )}
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
        <>
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
                      <span title="Изменить" onClick={() => handleEditCompany(c)} style={{ marginRight: 10, cursor: 'pointer' }}>
                        <FaUserEdit color="#888" size={16} />
                      </span>
                      <span title="Удалить" onClick={() => handleDeleteCompany(c._id)} style={{ cursor: 'pointer' }}>
                        <FaRegTrashAlt color="#e53e3e" size={16} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
            }}
            onCancel={() => {
              setShowEditCompany(false);
              setEditCompanyId(null);
              setCompanyForm({ name: '', city: '', ownerName: '', ownerContact: '' });
            }}
            submitText="Сохранить"
          />
        </>
      </div>
    </div>
  );
};

export default CompaniesTab; 