import React, { useState } from 'react';
import ModalForm from './ModalForm';
import ServicesTab from './ServicesTab';
import type { ModalFormField } from './ModalForm';
import type { User } from '../types/User';
import BaseCostsTab from './BaseCostsTab';

interface Company {
  _id: string;
  name: string;
}

export type HardwareItem = {
  _id?: string;
  section: string;
  name: string;
  price: number | null;
};

interface HardwareTabProps {
  companies: Company[];
  selectedCompanyId: string;
  hardwareByCompany: Record<string, HardwareItem[]>;
  user: User;
  onLogout: () => void;
  onCalculator: () => void;
}

const MAIN_SECTIONS = ['Стекло', 'Профили', 'Крепления'];
const COLUMNS = 3;
const API_URL = 'http://localhost:5000/api';

const HardwareTab: React.FC<HardwareTabProps> = ({ companies, selectedCompanyId, hardwareByCompany, user, onLogout, onCalculator }) => {
  const company = companies.find(c => c._id === selectedCompanyId);
  const [editList, setEditList] = useState<HardwareItem[]>(hardwareByCompany[selectedCompanyId] || []);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hardware' | 'services' | 'basecosts'>('hardware');

  // Для формы добавления
  const allSections = Array.from(new Set([
    ...MAIN_SECTIONS,
    ...editList.map(i => i.section).filter(s => !MAIN_SECTIONS.includes(s)),
  ]));
  const [addSection, setAddSection] = useState<string>(allSections[0] || '');
  const [addNewSection, setAddNewSection] = useState('');
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState<number | ''>('');

  React.useEffect(() => {
    setEditList(hardwareByCompany[selectedCompanyId] || []);
  }, [hardwareByCompany, selectedCompanyId]);

  if (!company) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  // Получаем секции для колонок
  let allSectionsForColumns = Array.from(new Set(editList.map(i => i.section)));
  // 'Стекло' всегда первая
  allSectionsForColumns = allSectionsForColumns.sort((a, b) => {
    if (a === 'Стекло') return -1;
    if (b === 'Стекло') return 1;
    return 0;
  });
  const grouped: Record<string, HardwareItem[]> = {};
  allSectionsForColumns.forEach(section => {
    grouped[section] = editList.filter(item => item.section === section);
  });
  // Балансировка по количеству позиций в колонке
  const columns: string[][] = Array.from({ length: COLUMNS }, () => []);
  const columnCounts = Array(COLUMNS).fill(0);
  for (const section of allSectionsForColumns) {
    // 'Стекло' всегда первая секция в первой колонке
    if (section === 'Стекло') {
      columns[0].push(section);
      columnCounts[0] += grouped[section].length;
      continue;
    }
    // Ищем колонку с минимальным количеством позиций
    let minIdx = 0;
    for (let i = 1; i < COLUMNS; i++) {
      if (columnCounts[i] < columnCounts[minIdx]) minIdx = i;
    }
    columns[minIdx].push(section);
    columnCounts[minIdx] += grouped[section].length;
  }

  const handleAdd = async () => {
    const section = addNewSection.trim() ? addNewSection.trim() : addSection;
    if (!section || !addName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const priceToSave = addPrice === '' ? null : Number(addPrice);
      const res = await fetch(`${API_URL}/hardware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({
          section,
          name: addName.trim(),
          price: priceToSave,
          companyId: company._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && /duplicate/i.test(data.error)) {
          setError('Такая фурнитура уже существует в этой секции');
        } else {
          setError(data.error || 'Ошибка добавления');
        }
        return;
      }
      // После успешного добавления — обновить список
      const updated = await fetch(`${API_URL}/hardware?companyId=${company._id}`);
      const updatedList = await updated.json();
      setEditList(Array.isArray(updatedList) ? updatedList : []);
      setAddSection(allSections[0] || '');
      setAddNewSection('');
      setAddName('');
      setAddPrice('');
      setShowAdd(false);
    } catch {
      setError('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: HardwareItem) => {
    if (!item._id) return;
    setDeleteLoading(item.section + '|' + item.name);
    setError('');
    try {
      const res = await fetch(`${API_URL}/hardware/${item._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      // После успешного удаления — обновить hardware из базы
      const updated = await fetch(`${API_URL}/hardware?companyId=${company._id}`);
      const updatedList = await updated.json();
      setEditList(Array.isArray(updatedList) ? updatedList : []);
    } catch {
      setError('Ошибка удаления');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      // price всегда number или null, преобразование не нужно
      const toSave = editList;
      const res = await fetch(`${API_URL}/hardware?companyId=${company._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify(toSave),
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
  const fields: ModalFormField[] = [
    {
      name: 'section',
      label: 'Секция',
      type: 'select',
      value: addSection,
      onChange: v => { setAddSection(String(v)); setAddNewSection(''); },
      required: !addNewSection,
      options: allSections.map(s => ({ value: s, label: s })).concat({ value: '__new__', label: 'Новая секция...' }),
    },
    ...(addSection === '__new__' ? [{
      name: 'newSection',
      label: 'Новая секция',
      type: 'text' as const,
      value: addNewSection,
      onChange: (v: string | number) => setAddNewSection(String(v)),
      required: true,
      placeholder: 'Введите название секции',
    }] : []),
    {
      name: 'name',
      label: 'Название фурнитуры',
      type: 'text',
      value: addName,
      onChange: v => setAddName(String(v)),
      required: true,
      placeholder: 'Введите название',
    },
    {
      name: 'price',
      label: 'Цена',
      type: 'number',
      value: addPrice === '' ? '' : addPrice,
      onChange: (v: string | number) => setAddPrice(v === '' ? '' : Number(v)),
      required: false,
      placeholder: 'Введите цену',
    },
  ];

  return (
    <div style={{ padding: '0 48px' }}>
      {/* Табы и кнопки в одной строке */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, borderBottom: '2px solid #e0e7ef' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            onClick={() => setActiveTab('hardware')}
            style={{
              padding: '12px 36px',
              border: 'none',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              background: activeTab === 'hardware' ? '#646cff' : '#f6f8fa',
              color: activeTab === 'hardware' ? '#fff' : '#646cff',
              fontWeight: 600,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: activeTab === 'hardware' ? '0 2px 8px #646cff22' : 'none',
              borderBottom: activeTab === 'hardware' ? '2px solid #646cff' : '2px solid transparent',
              transition: 'background 0.18s, color 0.18s',
              marginRight: 2,
            }}
            onMouseOver={e => { if (activeTab !== 'hardware') e.currentTarget.style.background = '#e0e7ef'; }}
            onMouseOut={e => { if (activeTab !== 'hardware') e.currentTarget.style.background = '#f6f8fa'; }}
          >
            Фурнитура
          </button>
          <button
            onClick={() => setActiveTab('services')}
            style={{
              padding: '12px 36px',
              border: 'none',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              background: activeTab === 'services' ? '#646cff' : '#f6f8fa',
              color: activeTab === 'services' ? '#fff' : '#646cff',
              fontWeight: 600,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: activeTab === 'services' ? '0 2px 8px #646cff22' : 'none',
              borderBottom: activeTab === 'services' ? '2px solid #646cff' : '2px solid transparent',
              transition: 'background 0.18s, color 0.18s',
              marginRight: 2,
            }}
            onMouseOver={e => { if (activeTab !== 'services') e.currentTarget.style.background = '#e0e7ef'; }}
            onMouseOut={e => { if (activeTab !== 'services') e.currentTarget.style.background = '#f6f8fa'; }}
          >
            Услуги
          </button>
          <button
            onClick={() => setActiveTab('basecosts')}
            style={{
              padding: '12px 36px',
              border: 'none',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              background: activeTab === 'basecosts' ? '#646cff' : '#f6f8fa',
              color: activeTab === 'basecosts' ? '#fff' : '#646cff',
              fontWeight: 600,
              fontSize: 17,
              cursor: 'pointer',
              boxShadow: activeTab === 'basecosts' ? '0 2px 8px #646cff22' : 'none',
              borderBottom: activeTab === 'basecosts' ? '2px solid #646cff' : '2px solid transparent',
              transition: 'background 0.18s, color 0.18s',
            }}
            onMouseOver={e => { if (activeTab !== 'basecosts') e.currentTarget.style.background = '#e0e7ef'; }}
            onMouseOut={e => { if (activeTab !== 'basecosts') e.currentTarget.style.background = '#f6f8fa'; }}
          >
            Базовая стоимость
          </button>
        </div>
        {/* Кнопки справа */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {activeTab === 'hardware' && (
            <>
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
                onMouseOver={e => { if (!editMode) (e.currentTarget as HTMLButtonElement).style.background = '#f6f8ff'; }}
                onMouseOut={e => { if (!editMode) (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
              >
                {editMode ? (loading ? 'Сохранение...' : 'Сохранить') : 'Изменить'}
              </button>
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
                  cursor: 'pointer',
                  height: '40px',
                  lineHeight: 1.25,
                }}
              >
                Добавить фурнитуру
              </button>
            </>
          )}
          {/* Для basecosts не показываем никаких кнопок */}
        </div>
      </div>
      {/* Содержимое вкладок */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 32, minHeight: 320, marginTop: -2 }}>
        {activeTab === 'hardware' && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>Фурнитура {company.name}</h2>
          </div>
        )}
        {activeTab === 'hardware' && error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
        {activeTab === 'hardware' && success && <div style={{ color: 'green', marginBottom: 12 }}>Сохранено!</div>}
        {activeTab === 'hardware' && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
            {columns.map((sectionList, colIdx) => (
              <div key={colIdx} style={{ background: 'none', minWidth: 260, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 24 }}>
                {sectionList.map(section => (
                  <div key={section} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'stretch', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 20, flex: 1 }}>{section}</div>
                    </div>
                    {grouped[section].length === 0 && <div style={{ color: '#bbb', fontStyle: 'italic', marginBottom: 8 }}>Нет позиций</div>}
                    {grouped[section].map((item, idx) => (
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
                                lineHeight: 1,
                                padding: 0,
                                height: 24,
                                width: 28,
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                              }}
                              title="Удалить элемент"
                              disabled={deleteLoading === item.section + '|' + item.name}
                            >
                              {deleteLoading === item.section + '|' + item.name ? '...' : '✕'}
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          value={item.price === null || item.price === undefined ? '' : item.price}
                          onChange={e => {
                            const val = e.target.value;
                            setEditList(list => {
                              let count = -1;
                              return list.map(it => {
                                if (it.section === section) count++;
                                if (it.section === section && count === idx) {
                                  return { ...it, price: val === '' ? null : Number(val) };
                                }
                                return it;
                              });
                            });
                          }}
                          style={{ width: '100%', padding: '8px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16, boxSizing: 'border-box' }}
                          placeholder="Цена"
                          disabled={!editMode}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'hardware' && (
          <ModalForm
            isOpen={showAdd}
            title="Добавить фурнитуру"
            fields={fields}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            submitText={loading ? 'Добавление...' : 'Добавить'}
          />
        )}
        {activeTab === 'services' && (
          <ServicesTab
            user={user}
            company={companies.find(c => c._id === selectedCompanyId) || null}
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            onLogout={onLogout}
            onCalculator={onCalculator}
          />
        )}
        {activeTab === 'basecosts' && (
          <BaseCostsTab company={company} />
        )}
      </div>
    </div>
  );
};

export default HardwareTab; 