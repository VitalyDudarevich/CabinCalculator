import React, { useState, useRef } from 'react';

const CONTROL_HEIGHT = 43;
export const QuantityControl = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    minWidth: 64,
    height: CONTROL_HEIGHT,
    lineHeight: `${CONTROL_HEIGHT}px`,
    padding: 0,
    justifyContent: 'flex-start',
    gap: 0,
    boxSizing: 'border-box',
  }}>
    <button
      type="button"
      onClick={() => onChange(Math.max(1, value - 1))}
      style={{
        width: CONTROL_HEIGHT,
        height: CONTROL_HEIGHT,
        border: 'none',
        background: 'none',
        color: '#888',
        fontSize: 18,
        fontWeight: 400,
        lineHeight: `${CONTROL_HEIGHT}px`,
        cursor: 'pointer',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        verticalAlign: 'middle',
        boxSizing: 'border-box',
      }}
      tabIndex={-1}
    >{String.fromCharCode(0x2212)}</button>
    <span style={{
      minWidth: 18,
      textAlign: 'center',
      fontSize: 15,
      color: '#222',
      background: 'transparent',
      display: 'inline-block',
      padding: '0 2px',
      height: CONTROL_HEIGHT,
      lineHeight: `${CONTROL_HEIGHT}px`,
      verticalAlign: 'middle',
      boxSizing: 'border-box',
    }}>{value}</span>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      style={{
        width: CONTROL_HEIGHT,
        height: CONTROL_HEIGHT,
        border: 'none',
        background: 'none',
        color: '#888',
        fontSize: 18,
        fontWeight: 400,
        lineHeight: `${CONTROL_HEIGHT}px`,
        cursor: 'pointer',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        verticalAlign: 'middle',
        boxSizing: 'border-box',
      }}
      tabIndex={-1}
    >+</button>
  </div>
);

export interface HardwareDialogItem {
  hardwareId: string;
  name: string;
  quantity: number;
}

export interface HardwareItem {
  _id: string;
  name: string;
}

interface AddHardwareDialogProps {
  hardwareList: HardwareItem[];
  onSave: (selected: HardwareDialogItem[]) => void;
  onClose: () => void;
  projectHardware?: HardwareDialogItem[];
}

const AddHardwareDialog: React.FC<AddHardwareDialogProps> = ({ hardwareList, onSave, onClose, projectHardware = [] }) => {
  const [selected, setSelected] = useState<HardwareDialogItem[]>([]);
  const [search, setSearch] = useState('');
  // Количество убрано, всегда 1
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Собираем id уже выбранных и уже добавленных в проект
  const alreadySelectedIds = [
    ...selected.map(s => s.hardwareId),
    ...projectHardware.map(s => s.hardwareId),
  ];

  // Фильтруем список по поиску
  const filtered = hardwareList.filter(
    hw => hw.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (hw: HardwareItem, disabled: boolean) => {
    if (disabled) return;
    setSearch(hw.name);
    setDropdownOpen(false);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleAdd = () => {
    const hw = hardwareList.find(h => h.name === search);
    if (!hw || selected.some(sel => sel.hardwareId === hw._id) || projectHardware.some(sel => sel.hardwareId === hw._id)) return;
    setSelected([...selected, { hardwareId: hw._id, name: hw.name, quantity: 1 }]);
    setSearch('');
    setDropdownOpen(false);
    setHighlighted(0);
  };

  const handleRemove = (id: string) => {
    setSelected(selected.filter(sel => sel.hardwareId !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setDropdownOpen(true);
    setHighlighted(0);
  };

  const handleInputFocus = () => {
    setDropdownOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      const hw = filtered[highlighted];
      if (hw) handleSelect(hw, alreadySelectedIds.includes(hw._id));
    }
  };

  // Проверка, можно ли добавить
  const canAdd =
    !!hardwareList.find(h => h.name === search) &&
    !selected.some(sel => sel.name === search) &&
    !projectHardware.some(sel => sel.name === search);

  // Изменение количества в выбранных
  const handleChangeQty = (id: string, qty: number) => {
    setSelected(selected.map(sel => sel.hardwareId === id ? { ...sel, quantity: Math.max(1, qty) } : sel));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 480, boxShadow: '0 2px 16px #0002', position: 'relative' }}>
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
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Дополнительная фурнитура</h3>
        {/* Список выбранных */}
        {selected.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {selected.map(item => (
              <div key={item.hardwareId} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                <span style={{ flex: 1, minWidth: 0 }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', paddingRight: 0 }}>
                  <QuantityControl value={item.quantity} onChange={v => handleChangeQty(item.hardwareId, v)} />
                  <button
                    onClick={() => handleRemove(item.hardwareId)}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: '50%',
                      background: 'none',
                      color: '#e53935',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      transition: 'color 0.15s',
                      margin: 0,
                    }}
                    title="Удалить"
                    onMouseOver={e => (e.currentTarget.style.color = '#b71c1c')}
                    onMouseOut={e => (e.currentTarget.style.color = '#e53935')}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Форма добавления */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Название фурнитуры"
              value={search}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '8px 8px',
                paddingRight: 28,
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 15,
                appearance: 'none',
                boxSizing: 'border-box',
                height: 43,
              }}
              autoComplete="off"
            />
            {dropdownOpen && filtered.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 36,
                left: 0,
                width: '100%',
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: 6,
                zIndex: 1001,
                maxHeight: 160,
                overflowY: 'auto',
                boxShadow: '0 2px 8px #0001',
                boxSizing: 'border-box',
              }}>
                {filtered.map((hw, idx) => {
                  const disabled = alreadySelectedIds.includes(hw._id);
                  return (
                    <div
                      key={hw._id}
                      onMouseDown={() => handleSelect(hw, disabled)}
                      style={{
                        padding: '7px 10px',
                        background: idx === highlighted ? '#e6eaff' : '#fff',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        color: disabled ? '#bbb' : '#222',
                        opacity: disabled ? 0.7 : 1,
                        userSelect: 'none',
                        pointerEvents: disabled ? 'none' : 'auto',
                      }}
                      onMouseEnter={() => setHighlighted(idx)}
                    >
                      {hw.name}
                      {disabled && <span style={{ fontSize: 12, marginLeft: 8 }}>(уже выбрана)</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: canAdd ? '#646cff' : '#ccc', color: '#fff', fontWeight: 600, cursor: canAdd ? 'pointer' : 'not-allowed' }}
          >Добавить</button>
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
            onClick={() => onSave(selected)}
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
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddHardwareDialog; 