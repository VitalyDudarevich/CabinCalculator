import React, { useState, useEffect } from 'react';
import { API_URL as BASE_API_URL } from '../utils/api';
import { fetchWithAuth } from '../utils/auth';
const API_URL = BASE_API_URL;

interface Company {
  _id: string;
  name: string;
}

interface BaseCostItem {
  id: string;
  name: string;
  value: number | null;
}

interface BaseCostResponse {
  _id: string;
  name: string;
  value: number;
  companyId: string;
}

interface BaseCostsTabProps {
  companies: Company[];
  selectedCompanyId: string;
}

const DEFAULT_BASE_COSTS: BaseCostItem[] = [
  { id: 'glass', name: 'Базовая стоимость стационарного стекла', value: 0 },
  { id: 'straight', name: 'Базовая стоимость прямой раздвижной', value: 0 },
  { id: 'corner', name: 'Базовая стоимость угловой раздвижной', value: 0 },
  { id: 'unique', name: 'Базовая стоимость уникальной конфигурации', value: 0 },
  { id: 'partition', name: 'Базовая стоимость перегородки', value: 0 },
];

const BaseCostsTab: React.FC<BaseCostsTabProps> = ({ companies, selectedCompanyId }) => {
  // Ищем компанию в списке или создаем фиктивную для админов
  const company = companies.find(c => c._id === selectedCompanyId) || 
    (selectedCompanyId ? { _id: selectedCompanyId, name: 'Ваша компания' } : { _id: '', name: '' });
  const [baseCosts, setBaseCosts] = useState<BaseCostItem[]>(DEFAULT_BASE_COSTS);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [addBaseName, setAddBaseName] = useState('');
  const [addBaseValue, setAddBaseValue] = useState<number | ''>('');

  const [originalBaseCosts, setOriginalBaseCosts] = useState<BaseCostItem[]>(DEFAULT_BASE_COSTS);
  const [addError, setAddError] = useState('');

  // Функция для создания базовых стоимостей по умолчанию
  const createDefaultBaseCosts = async () => {
    try {
      const payload = DEFAULT_BASE_COSTS.map(item => ({
        name: item.name,
        value: item.value || 0
      }));
      
      const res = await fetchWithAuth(`${API_URL}/basecosts?companyId=${company._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok) {
        console.error('Ошибка создания базовых стоимостей по умолчанию:', data.error);
        setBaseCosts(DEFAULT_BASE_COSTS);
        setOriginalBaseCosts(DEFAULT_BASE_COSTS);
        return;
      }
      
      // Обновляем состояние с созданными данными
      const convertedBaseCosts = data.map((item: BaseCostResponse) => ({
        id: item._id,
        name: item.name,
        value: item.value
      }));
      setBaseCosts(convertedBaseCosts);
      setOriginalBaseCosts(convertedBaseCosts);
      
      console.log('✅ Базовые стоимости по умолчанию созданы для компании:', company.name);
    } catch (error) {
      console.error('Ошибка создания базовых стоимостей по умолчанию:', error);
      setBaseCosts(DEFAULT_BASE_COSTS);
      setOriginalBaseCosts(DEFAULT_BASE_COSTS);
    }
  };

  useEffect(() => {
    if (!selectedCompanyId) return;
    setLoading(true);
    setError('');
    fetchWithAuth(`${API_URL}/basecosts?companyId=${company._id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Преобразуем данные из нового формата
          const convertedBaseCosts = data.map((item: BaseCostResponse) => ({
            id: item._id,
            name: item.name,
            value: item.value
          }));
          setBaseCosts(convertedBaseCosts);
          setOriginalBaseCosts(convertedBaseCosts);
        } else {
          // Если нет данных, создаем базовые стоимости по умолчанию
          console.log('Создаем базовые стоимости по умолчанию для компании:', company.name);
          createDefaultBaseCosts();
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки базовых стоимостей');
        setLoading(false);
      });
  }, [selectedCompanyId, company._id]);

  const handleChangeBaseCost = (idx: number, value: number | string) => {
    setBaseCosts(prev => prev.map((item, i) => i === idx ? { ...item, value: value === '' ? null : Number(value) } : item));
  };
  const handleDeleteBaseCost = (idx: number) => {
    setBaseCosts(prev => prev.filter((_, i) => i !== idx));
  };
  const handleAddBaseCost = () => {
    if (!addBaseName.trim()) return;
    const exists = baseCosts.some(item => item.name.trim().toLowerCase() === addBaseName.trim().toLowerCase());
    if (exists) {
      setAddError('Базовая конструкция с таким названием уже существует');
      return;
    }
    setBaseCosts(prev => ([
      ...prev,
      { id: Date.now().toString(), name: addBaseName.trim(), value: addBaseValue === '' ? null : Number(addBaseValue) }
    ]));
    setAddBaseName('');
    setAddBaseValue('');
    setAddError('');
  };
  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const payload = baseCosts.map(item => ({
        name: item.name,
        value: typeof item.value === 'number' ? item.value : (item.value === '' || item.value === null ? 0 : Number(item.value))
      }));
      
      const res = await fetchWithAuth(`${API_URL}/basecosts?companyId=${company._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
      
      // Обновляем локальное состояние с новыми данными
      const convertedBaseCosts = data.map((item: BaseCostResponse) => ({
        id: item._id,
        name: item.name,
        value: item.value
      }));
      setBaseCosts(convertedBaseCosts);
      setOriginalBaseCosts(convertedBaseCosts);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setBaseCosts(originalBaseCosts);
    setEditMode(false);
    setError('');
    setAddBaseName('');
    setAddBaseValue('');
  };

  if (!selectedCompanyId) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  return (
    <div className="base-costs-tab-root" style={{
      maxWidth: 900,
      margin: '0 auto',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 1px 4px #0001',
      padding: 24,
      minHeight: 500,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>Базовая стоимость конструкций</h2>
        <button
          onClick={editMode ? handleSave : () => { setEditMode(true); setOriginalBaseCosts(baseCosts); }}
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
      <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
        {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 12 }}>Сохранено!</div>}
        {baseCosts.length === 0 && <div style={{ color: '#bbb', fontStyle: 'italic', marginBottom: 8 }}>Нет базовых стоимостей</div>}
      {baseCosts.map((item, idx) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative', minHeight: 60 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15, fontWeight: 500 }}>
            {item.name}:
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.value === null ? '' : item.value}
              onChange={e => handleChangeBaseCost(idx, e.target.value)}
              disabled={!editMode}
              style={{ width: 200, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, marginTop: 2, background: !editMode ? '#f5f5f5' : '#fff', boxSizing: 'border-box', color: !editMode ? '#888' : undefined }}
            />
          </label>
          {editMode && (
            <button type="button" onClick={() => handleDeleteBaseCost(idx)} style={{ color: '#e53e3e', background: 'none', border: 'none', fontWeight: 700, fontSize: 20, cursor: 'pointer', marginTop: 18 }} title="Удалить">
              ✕
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Название базовой стоимости"
              value={addBaseName}
              onChange={e => { setAddBaseName(e.target.value); setAddError(''); }}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, width: 300, boxSizing: 'border-box' }}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Значение"
              value={addBaseValue}
              onChange={e => setAddBaseValue(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15, width: 150, boxSizing: 'border-box' }}
            />
            <button type="button" onClick={handleAddBaseCost} style={{ padding: '8px 16px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Добавить</button>
          </div>
          {addError && <div style={{ color: 'crimson', marginTop: 4 }}>{addError}</div>}
        </>
      )}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .base-costs-tab-root {
            max-width: 100% !important;
            margin: 0 8px !important;
            padding: 16px !important;
          }
          .base-costs-tab-root > div:first-child {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .base-costs-tab-root > div:first-child > div {
            display: flex !important;
            gap: 8px !important;
          }
        }
        @media (max-width: 600px) {
          /* Мобильные стили для видимости текста */
          .base-costs-tab-root,
          .base-costs-tab-root div,
          .base-costs-tab-root h1, .base-costs-tab-root h2, .base-costs-tab-root h3,
          .base-costs-tab-root span, .base-costs-tab-root label {
            color: #333 !important;
          }
          .base-costs-tab-root input[type="number"] {
            width: 200px !important;
            padding: 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 15px !important;
            margin-top: 2px !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #333 !important;
          }
          .base-costs-tab-root input[type="number"]:disabled {
            background: #f5f5f5 !important;
            color: #888 !important;
          }
          .base-costs-tab-root input[type="text"] {
            padding: 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 15px !important;
            background: #fff !important;
            color: #333 !important;
            box-sizing: border-box !important;
            width: 280px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BaseCostsTab; 