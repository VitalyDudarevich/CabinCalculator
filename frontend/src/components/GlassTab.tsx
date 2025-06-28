import React, { useState, useEffect } from 'react';
import { API_URL as BASE_API_URL } from '../utils/api';
const API_URL = BASE_API_URL;

interface Company {
  _id: string;
  name: string;
}

interface GlassItem {
  _id?: string;
  name: string;
  thickness?: string;
  color?: string;
  price: number | null;
  companyId?: string;
}

interface GlassTabProps {
  companies: Company[];
  selectedCompanyId: string;
}

const GlassTab: React.FC<GlassTabProps> = ({ companies, selectedCompanyId }) => {
  const company = companies.find(c => c._id === selectedCompanyId);
  const [editMode, setEditMode] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState<number | ''>('');
  const [addThickness, setAddThickness] = useState('');
  const [addColor, setAddColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editList, setEditList] = useState<GlassItem[]>([]);
  const [originalList, setOriginalList] = useState<GlassItem[]>([]);
  const [error, setError] = useState('');
  const [addError, setAddError] = useState('');

  const companyName = company?.name || '';

  useEffect(() => {
    if (!company) return setEditList([]);
    setError('');
    setLoading(true);
    fetch(`${API_URL}/glass?companyId=${company._id}`)
      .then(res => res.json())
      .then(data => {
        setEditList(Array.isArray(data) ? data : []);
        setOriginalList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setEditList([]);
        setOriginalList([]);
        setLoading(false);
      });
  }, [selectedCompanyId, company?._id]);

  if (!company) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  const handleAdd = () => {
    if (!addName.trim()) return;
    const exists = editList.some(s => s.name.trim().toLowerCase() === addName.trim().toLowerCase());
    if (exists) {
      setAddError('Такое стекло уже существует');
      return;
    }
    setEditList(prev => ([
      ...prev,
      {
        name: addName.trim(),
        price: addPrice === '' || addPrice == null ? null : Number(addPrice),
        thickness: addThickness.trim(),
        color: addColor.trim(),
      }
    ]));
    setAddName('');
    setAddPrice('');
    setAddThickness('');
    setAddColor('');
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
        price: typeof s.price === 'number' ? s.price : (s.price === '' || s.price == null ? null : Number(s.price)),
        thickness: s.thickness,
        color: s.color,
      }));
      const res = await fetch(`${API_URL}/glass?companyId=${company._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
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
  };

  return (
    <div className="glass-tab-root" style={{ maxWidth: 540, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, flex: 1 }}>Стекло {companyName}</h2>
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
      {editList.length === 0 && <div style={{ color: '#bbb', fontStyle: 'italic', marginBottom: 8 }}>Нет стекла</div>}
      {editList.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative' }}>
          <label style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {item.name}:
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
                width: 160,
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
      ))}
      {editMode && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Название стекла"
              style={{ flex: 2, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
            />
            <input
              type="number"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Цена"
              style={{ width: 100, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
            />
            <input
              type="text"
              value={addThickness}
              onChange={e => setAddThickness(e.target.value)}
              placeholder="Толщина"
              style={{ width: 90, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
            />
            <input
              type="text"
              value={addColor}
              onChange={e => setAddColor(e.target.value)}
              placeholder="Цвет/тип"
              style={{ width: 120, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
            />
            <button type="button" onClick={handleAdd} style={{ padding: '8px 14px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Добавить</button>
          </div>
          {addError && <div style={{ color: 'crimson', marginTop: 6 }}>{addError}</div>}
        </>
      )}
      <style>{`
        @media (max-width: 600px) {
          .glass-tab-root {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            padding: 8px !important;
            color: #333 !important;
          }
          .glass-tab-root * {
            color: #333 !important;
          }
          .glass-tab-root h1, .glass-tab-root h2, .glass-tab-root h3 {
            color: #333 !important;
          }
          .glass-tab-root div, .glass-tab-root span, .glass-tab-root label {
            color: #333 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GlassTab; 