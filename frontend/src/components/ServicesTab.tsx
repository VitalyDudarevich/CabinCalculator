import React, { useState, useEffect } from 'react';
// import ModalForm from './ModalForm'; // больше не используется
import type { User } from '../types/User';
import { API_URL as BASE_API_URL } from '../utils/api';
import { fetchWithAuth } from '../utils/auth';

interface Company {
  _id: string;
  name: string;
  // ... другие поля, если нужны
}

interface ServiceItem {
  name: string;
  price: number | null;
  type?: string;
}

export interface ServicesTabProps {
  user: User;
  company: Company | null;
  companies: Company[];
  selectedCompanyId: string;
  onLogout: () => void;
  onCalculator?: () => void;
}

const API_URL = BASE_API_URL;

const DEFAULT_SERVICES: ServiceItem[] = [
  { name: 'Демонтаж', price: 0 },
  { name: 'Доставка', price: 0 },
  { name: 'Монтаж стационарного стекла', price: 0 },
  { name: 'Монтаж прямой раздвижной', price: 0 },
  { name: 'Монтаж угловой раздвижной', price: 0 },
  { name: 'Монтаж уникальной конфигурации', price: 0 },
];

const ServicesTab: React.FC<ServicesTabProps> = ({
  company,
  selectedCompanyId,
  companies,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editList, setEditList] = useState<ServiceItem[]>([]);
  const [originalList, setOriginalList] = useState<ServiceItem[]>([]);
  const [error, setError] = useState('');
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState<number | ''>('');
  const [addError, setAddError] = useState('');

  // Определяем компанию для админов
  const effectiveCompany = company || 
    (selectedCompanyId ? companies.find(c => c._id === selectedCompanyId) : null) ||
    (selectedCompanyId ? { _id: selectedCompanyId, name: 'Ваша компания' } : null);

  const companyName = selectedCompanyId === 'all'
    ? 'Все компании'
    : (effectiveCompany?.name || '');

  // Функция для создания услуг по умолчанию
  const createDefaultServices = async (companyId: string) => {
    try {
      const payload = DEFAULT_SERVICES.map(service => ({
        name: service.name,
        price: service.price || 0
      }));
      
      const res = await fetchWithAuth(`${API_URL}/services?companyId=${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        console.error('Ошибка создания услуг по умолчанию');
        setEditList([]);
        setOriginalList([]);
        return;
      }
      
      const data = await res.json();
      const withId: ServiceItem[] = (Array.isArray(data) ? data : []).map((s) => ({
        name: s.name,
        price: s.price,
        type: s.type,
        serviceId: s.serviceId || s.name
      }));
      
      setEditList(withId);
      setOriginalList(withId);
      
      console.log('✅ Услуги по умолчанию созданы для компании:', companyName);
    } catch (error) {
      console.error('Ошибка создания услуг по умолчанию:', error);
      setEditList([]);
      setOriginalList([]);
    }
  };

  useEffect(() => {
    const companyId = selectedCompanyId || effectiveCompany?._id;
    if (!companyId) return setEditList([]);
    setError('');
    setLoading(true);
    fetchWithAuth(`${API_URL}/services?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
        // Преобразуем услуги: добавляем serviceId = name
          const withId: ServiceItem[] = data.map((s) => ({
          name: s.name,
          price: s.price,
          type: s.type,
          serviceId: s.serviceId || s.name
        }));
        setEditList(withId);
        setOriginalList(withId);
        } else {
          // Если нет услуг, создаем их по умолчанию
          console.log('Создаем услуги по умолчанию для компании:', companyName);
          createDefaultServices(companyId);
        }
        setLoading(false);
      })
      .catch(() => {
        setEditList([]);
        setOriginalList([]);
        setLoading(false);
      });
  }, [selectedCompanyId, effectiveCompany?._id]);

  if (!effectiveCompany) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  const handleAdd = () => {
    if (!addName.trim()) return;
    const exists = editList.some(s => s.name.trim().toLowerCase() === addName.trim().toLowerCase());
    if (exists) {
      setAddError('Такая услуга уже существует');
      return;
    }
    setEditList(prev => ([
      ...prev,
      {
        name: addName.trim(),
        price: addPrice === '' || addPrice == null ? null : Number(addPrice),
      }
    ]));
    setAddName('');
    setAddPrice('');
    setAddError('');
  };

  const handleDeleteItem = (idx: number) => {
    setEditList(list => list.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);
    setSuccess(false);
    try {
      const toSave = editList.map(s => ({
        name: s.name,
        price: typeof s.price === 'number' ? s.price : (s.price === '' || s.price == null ? null : Number(s.price))
      }));
      const res = await fetchWithAuth(`${API_URL}/services?companyId=${effectiveCompany._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      setOriginalList(editList);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setEditMode(false);
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditList(originalList);
    setEditMode(false);
    setError('');
    setAddName('');
    setAddPrice('');
    setAddError('');
  };

  return (
    <div className="services-tab-root" style={{ maxWidth: 540, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, flex: 1 }}>Услуги {companyName}</h2>
        <button
          onClick={editMode ? handleSave : () => setEditMode(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: editMode ? '#1cbf73' : '#fff',
            color: editMode ? '#fff' : '#646cff',
            border: editMode ? 'none' : '2px solid #646cff',
            fontWeight: 600,
            fontSize: 16,
            marginRight: 8,
            cursor: 'pointer',
            transition: 'background 0.15s',
            lineHeight: 1.25,
            height: '40px',
            ...(editMode ? {} : { boxShadow: '0 1px 4px #646cff22' }),
          }}
          disabled={loading}
        >
          {editMode ? (loading ? 'Сохранение...' : 'Сохранить') : 'Изменить'}
        </button>
        {editMode && (
          <button
            onClick={handleCancel}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#333', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}
            disabled={loading}
          >
            Отмена
          </button>
        )}
      </div>
      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 12 }}>Сохранено!</div>}
      {editList.length === 0 && <div style={{ color: '#bbb', fontStyle: 'italic', marginBottom: 8 }}>Нет услуг</div>}
      {editList.map((item, idx) => {
        const displayName = item.name.trim().toLowerCase() === 'установка' ? 'Монтаж' : item.name;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative' }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {displayName}:
              <input
                type="number"
                value={item.price === null ? '' : item.price}
                disabled={!editMode}
                readOnly={!editMode}
                onChange={e => {
                  const val = e.target.value;
                  setEditList(list => list.map((it, i) => i === idx ? { ...it, price: val === '' ? null : Number(val) } : it));
                }}
                style={{
                  width: 140,
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  fontSize: 15,
                  marginTop: 2,
                  background: !editMode ? '#f5f5f5' : '#fff',
                  boxSizing: 'border-box',
                  color: !editMode ? '#888' : undefined
                }}
                placeholder="Цена"
              />
            </label>
            {editMode && (
              <button type="button" onClick={() => handleDeleteItem(idx)} style={{ color: '#e53e3e', background: 'none', border: 'none', fontWeight: 700, fontSize: 20, cursor: 'pointer', marginTop: 18 }} title="Удалить">✕</button>
            )}
          </div>
        );
      })}
      {editMode && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Название услуги"
              style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
            />
            <input
              type="number"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Цена"
              style={{ width: 120, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
            />
            <button type="button" onClick={handleAdd} style={{ padding: '8px 14px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Добавить</button>
          </div>
          {addError && <div style={{ color: 'crimson', marginTop: 6 }}>{addError}</div>}
        </>
      )}
      <style>{`
        @media (max-width: 600px) {
          .services-tab-root {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            padding: 8px !important;
            color: #333 !important;
          }
          .services-tab-root * {
            color: #333 !important;
          }
          .services-tab-root h1, .services-tab-root h2, .services-tab-root h3 {
            color: #333 !important;
          }
          .services-tab-root div, .services-tab-root span, .services-tab-root label {
            color: #333 !important;
          }
          .services-tab-root input[type="number"] {
            width: 160px !important;
            padding: 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 15px !important;
            margin-top: 2px !important;
            box-sizing: border-box !important;
          }
          .services-tab-root input[type="number"]:disabled {
            background: #f5f5f5 !important;
            color: #888 !important;
          }
          .services-tab-root input[type="number"]:not(:disabled) {
            background: #fff !important;
            color: #333 !important;
          }
          .services-tab-root input[type="text"] {
            padding: 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 15px !important;
            background: #fff !important;
            color: #333 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ServicesTab; 