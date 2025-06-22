import React, { useState, useEffect } from 'react';

export interface ServiceItem {
  serviceId: string;
  name: string;
  price: number;
}

interface AddServiceDialogProps {
  serviceList: ServiceItem[];
  projectServices: ServiceItem[];
  onSave: (selected: ServiceItem[]) => void;
  onClose: () => void;
}

const AddServiceDialog: React.FC<AddServiceDialogProps> = ({
  serviceList,
  projectServices,
  onSave,
  onClose,
}) => {
  // Локальный список выбранных услуг (только новые, не из projectServices)
  const [selected, setSelected] = useState<ServiceItem[]>([]);
  // id выбранной услуги в select
  const [selectedServiceId, setSelectedServiceId] = useState('');
  // Строка поиска
  const [search, setSearch] = useState('');
  // Показывать выпадающий список
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Очищаем выбранные услуги при каждом открытии диалога
  useEffect(() => {
    setSelected([]);
  }, []);

  // Уже выбранные id (строкой) — это и новые, и уже добавленные в проект
  const alreadySelectedIds = [
    ...selected.map(s => String(s.serviceId)),
    ...(projectServices || []).map(s => String(s.serviceId)),
  ];
  // Можно ли добавить выбранную услугу
  const canAdd = !!selectedServiceId && !alreadySelectedIds.includes(String(selectedServiceId));

  // Фильтрованный список услуг (не показываем уже добавленные в проект и выбранные)
  const filteredList = serviceList.filter(s =>
    s.serviceId && s.name && s.name.toLowerCase().includes(search.toLowerCase()) &&
    !selected.some(sel => String(sel.serviceId) === String(s.serviceId)) &&
    !(projectServices || []).some(sel => String(sel.serviceId) === String(s.serviceId))
  );

  // Добавить услугу
  const handleAdd = () => {
    const service = serviceList.find(s => String(s.serviceId) === String(selectedServiceId));
    if (!service || alreadySelectedIds.includes(String(service.serviceId))) return;
    setSelected([...selected, service]);
    setSelectedServiceId('');
    setSearch(''); // Очищаем поле поиска
    setDropdownOpen(false); // Закрываем dropdown
  };

  // Удалить услугу из выбранных (только из новых, не из projectServices)
  const handleRemove = (serviceId: string) => {
    setSelected(selected.filter(s => String(s.serviceId) !== String(serviceId)));
  };

  // Сохранить выбранные услуги (только новые)
  const handleSave = () => {
    onSave([...(projectServices || []), ...selected]);
  };

  return (
    <div className="dialog-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#0006', zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="dialog-content" style={{
        background: '#fff', borderRadius: 12, padding: 24,
        width: 480, boxShadow: '0 2px 16px #0002',
        position: 'relative'
      }}>
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 28,
            color: '#888',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            transition: 'color 0.15s',
          }}
          title="Закрыть"
          onMouseOver={e => (e.currentTarget.style.color = '#e53935')}
          onMouseOut={e => (e.currentTarget.style.color = '#888')}
        >×</button>
        <h3 style={{ margin: 0, marginBottom: 8, fontWeight: 700, fontSize: 20 }}>
          Добавить услуги
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#666' }}>
          Выберите одну или несколько услуг для добавления
        </p>
        {/* Список выбранных */}
        {selected.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {selected.map((s) => (
              <div key={String(s.serviceId)} style={{
                display: 'flex', alignItems: 'center', background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 6, padding: '6px 10px', marginBottom: 6
              }}>
                <span style={{ flex: 1 }}>{s.name}</span>
                <button
                  onClick={() => handleRemove(String(s.serviceId))}
                  style={{
                    color: '#e53935', background: 'none', border: 'none',
                    fontSize: 22, cursor: 'pointer', marginLeft: 8
                  }}
                  title="Удалить"
                >×</button>
              </div>
            ))}
          </div>
        )}
        {/* Форма добавления */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Поиск услуги..."
              value={search}
              onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              style={{ width: '100%', padding: 8, borderRadius: 8, fontSize: 16 }}
            />
            {dropdownOpen && filteredList.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 38,
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: 8,
                zIndex: 10,
                maxHeight: 180,
                overflowY: 'auto',
                boxShadow: '0 2px 8px #0002',
              }}>
                {filteredList.map(s => (
                  <div
                    key={String(s.serviceId)}
                    onClick={() => {
                      setSelectedServiceId(String(s.serviceId));
                      setSearch(s.name);
                      setDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: selectedServiceId === String(s.serviceId) ? '#f0f4ff' : '#fff',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              marginLeft: 8,
              background: canAdd ? '#646cff' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 16,
              cursor: canAdd ? 'pointer' : 'not-allowed'
            }}
          >
            Добавить
          </button>
        </div>
        {/* Кнопки управления */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              background: '#eee',
              color: '#333',
              border: 'none',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >Отмена</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={selected.length === 0}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              background: selected.length > 0 ? '#646cff' : '#ccc',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 16,
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              marginLeft: 0
            }}
          >
            Сохранить {selected.length > 0 && `(${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceDialog; 