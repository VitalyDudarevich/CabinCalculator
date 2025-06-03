import React, { useState, useEffect } from 'react';
import ModalForm from './ModalForm';

interface User {
  _id: string;
  role: string;
  username: string;
  email: string;
  companyId?: string;
}

interface Company {
  _id: string;
  name: string;
  // ... другие поля, если нужны
}

interface ServiceItem {
  name: string;
  price: number | null;
}

export interface ServicesTabProps {
  user: User;
  company: Company | null;
  companies: Company[];
  selectedCompanyId: string;
  onLogout: () => void;
  onCalculator: () => void;
}

const API_URL = 'http://localhost:5000/api';

const ServicesTab: React.FC<ServicesTabProps> = ({
  company,
  selectedCompanyId,
  companies,
}) => {
  const [editList, setEditList] = useState<ServiceItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState<number | ''>('');
  const [addLoading, setAddLoading] = useState(false);

  const companyName = selectedCompanyId === 'all'
    ? 'Все компании'
    : (companies.find(c => c._id === selectedCompanyId)?.name || '');

  // Загрузка услуг для выбранной компании
  useEffect(() => {
    const companyId = selectedCompanyId || company?._id;
    if (!companyId) return setEditList([]);
    setLoading(true);
    setError('');
    fetch(`${API_URL}/services?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => setEditList(Array.isArray(data) ? data : []))
      .catch(() => setEditList([]))
      .finally(() => setLoading(false));
  }, [selectedCompanyId, company?._id]);

  if (!company) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  // Добавить услугу
  const handleAdd = async () => {
    if (!addName.trim()) return;
    setAddLoading(true);
    setError('');
    try {
      const newItem = { name: addName.trim(), price: addPrice === '' ? null : Number(addPrice) };
      const res = await fetch(`${API_URL}/services?companyId=${company._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error('Ошибка добавления');
      // После успешного добавления — обновить список
      const updated = await fetch(`${API_URL}/services?companyId=${company._id}`);
      const updatedList = await updated.json();
      setEditList(Array.isArray(updatedList) ? updatedList : []);
      setAddName('');
      setAddPrice('');
      setShowAdd(false);
    } catch {
      setError('Ошибка добавления');
    } finally {
      setAddLoading(false);
    }
  };

  // Удалить услугу
  const handleDeleteItem = async (item: ServiceItem) => {
    setDeleteLoading(item.name);
    setError('');
    try {
      const res = await fetch(`${API_URL}/services/item?companyId=${company._id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify({ name: item.name })
        });
      if (!res.ok) throw new Error('Ошибка удаления');
      // После успешного удаления — обновить список
      const updated = await fetch(`${API_URL}/services?companyId=${company._id}`);
      const updatedList = await updated.json();
      setEditList(Array.isArray(updatedList) ? updatedList : []);
    } catch {
      setError('Ошибка удаления');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Сохранить услуги
  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch(`${API_URL}/services?companyId=${company._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify(editList),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setEditMode(false);
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  // Поля для ModalForm
  const fields = [
    {
      name: 'name',
      label: 'Название услуги',
      type: 'text' as const,
      value: addName,
      onChange: (v: string | number) => setAddName(String(v)),
      required: true,
      placeholder: 'Введите название',
    },
    {
      name: 'price',
      label: 'Цена',
      type: 'number' as const,
      value: addPrice === '' ? '' : Number(addPrice),
      onChange: (v: string | number) => setAddPrice(typeof v === 'number' ? v : Number(v)),
      required: true,
      placeholder: 'Введите цену',
    },
  ];

  return (
    <div style={{ padding: '0 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Услуги {companyName}
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: '#646cff',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 16,
            marginRight: 8,
            cursor: 'pointer',
            height: '40px',
            lineHeight: 1.25,
          }}
        >
          Добавить
        </button>
      </div>
      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 12 }}>Сохранено!</div>}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, flex: 1, minWidth: 260 }}>
          {editList.length === 0 && <div style={{ color: '#bbb', fontStyle: 'italic', marginBottom: 8 }}>Нет услуг</div>}
          {editList.map((item, idx) => (
            <div key={idx} style={{ marginBottom: 16, position: 'relative' }}>
              <div style={{ display: 'block', fontWeight: 500, marginBottom: 4, paddingRight: 36, position: 'relative' }}>
                {item.name}
                {editMode && (
                  <button
                    onClick={() => handleDeleteItem(item)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      color: '#e53e3e',
                      background: 'none',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 22,
                      cursor: 'pointer',
                      padding: 0,
                      height: 24,
                      width: 28,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                    }}
                    title="Удалить услугу"
                    disabled={deleteLoading === item.name}
                  >
                    {deleteLoading === item.name ? '...' : '✕'}
                  </button>
                )}
              </div>
              <input
                type="number"
                value={item.price === null ? '' : item.price}
                onChange={e => {
                  const val = e.target.value;
                  setEditList(list => list.map((it, i) => i === idx ? { ...it, price: val === '' ? null : Number(val) } : it));
                }}
                style={{ width: '100%', padding: '8px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box' }}
                placeholder="Цена"
                disabled={!editMode}
              />
            </div>
          ))}
        </div>
      </div>
      <ModalForm
        isOpen={showAdd}
        title="Добавить услугу"
        fields={fields}
        onSubmit={handleAdd}
        onCancel={() => setShowAdd(false)}
        submitText={addLoading ? 'Добавление...' : 'Добавить'}
      />
    </div>
  );
};

export default ServicesTab; 