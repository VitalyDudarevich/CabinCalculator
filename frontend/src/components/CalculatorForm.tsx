import React, { useState, useEffect } from 'react';
import AddHardwareButton from './AddHardwareButton';

const API_URL = 'http://localhost:5000/api';

const HARDWARE_COLORS = [
  { value: '', label: '' },
  { value: 'chrome', label: 'Хром' },
  { value: 'black', label: 'Черный' },
  { value: 'matte', label: 'Матовый' },
  { value: 'gold', label: 'Золотой' },
  { value: 'painted', label: 'Крашенный' },
];

const GLASS_THICKNESS = [
  { value: '8', label: '8 мм' },
  { value: '10', label: '10 мм' },
];

const CalculatorForm: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const [projectName, setProjectName] = useState('');
  const [config, setConfig] = useState('');
  const [glassColors, setGlassColors] = useState<string[]>([]);
  const [glassColor, setGlassColor] = useState('');
  const [glassThickness, setGlassThickness] = useState('8');
  const [hardwareColor, setHardwareColor] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [length, setLength] = useState('');
  const [comment, setComment] = useState('');
  const [delivery, setDelivery] = useState(true);
  const [installation, setInstallation] = useState(true);
  const [showGlassSizes, setShowGlassSizes] = useState(false);

  // Получаем companyId (в реальном проекте — из auth/user context)
  const resolvedCompanyId = companyId || localStorage.getItem('companyId') || '';

  useEffect(() => {
    if (!resolvedCompanyId) return;
    fetch(`${API_URL}/glass?companyId=${resolvedCompanyId}`)
      .then(res => res.json())
      .then((data: { _id: string; name: string; color?: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Собираем уникальные цвета, фильтруем undefined
          const uniqueColors = Array.from(new Set(data.map(g => g.color).filter((c): c is string => Boolean(c))));
          setGlassColors(uniqueColors);
          setGlassColor(uniqueColors[0] || '');
        } else {
          setGlassColors([]);
          setGlassColor('');
        }
      })
      .catch(() => {
        setGlassColors([]);
        setGlassColor('');
      });
  }, [resolvedCompanyId]);

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, width: 480, margin: '0 32px' }}>
      {/* Встраиваем CSS для плавающих лейблов */}
      <style>{`
        .form-group { position: relative; margin: 12px 0; width: 100%; max-width: 480px; }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 16px 12px 8px 12px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background: #fff;
          transition: border-color 0.2s;
        }
        .form-group select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 32px;
          background: url('data:image/svg+xml;utf8,<svg fill="#646cff" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7.293 7.293a1 1 0 011.414 0L10 8.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z"/></svg>') no-repeat right 12px center, #fff;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #646cff;
          outline: none;
        }
        .form-group label {
          position: absolute;
          top: 50%;
          left: 12px;
          color: #888;
          background: #fff;
          padding: 0 4px;
          font-size: 15px;
          pointer-events: none;
          transition: 0.2s ease all;
          transform: translateY(-50%);
        }
        .form-group input:focus + label,
        .form-group input:not(:placeholder-shown) + label {
          top: -10px;
          left: 8px;
          font-size: 12px;
          color: #888;
          transform: none;
        }
        .form-group select.filled + label,
        .form-group select:focus + label {
          top: -10px;
          left: 8px;
          font-size: 12px;
          color: #888;
          transform: none;
        }
        .form-group textarea:focus + label,
        .form-group textarea.filled + label {
          top: -10px;
          left: 8px;
          font-size: 12px;
          color: #888;
          transform: none;
        }
      `}</style>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>НОВЫЙ ПРОЕКТ</button>
        <button style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>СОХРАНИТЬ</button>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Новый проект</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
        {/* Название проекта */}
        <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
          <input type="text" id="project-name" autoComplete="off" placeholder=" " value={projectName} onChange={e => setProjectName(e.target.value)} required style={{ width: '100%', paddingRight: 12 }} />
          <label htmlFor="project-name" style={{ left: 12 }}>Название проекта *</label>
        </div>
        {/* Конфигурация */}
        <div className="form-group" style={{ width: '100%' }}>
          <select id="config" className={config ? 'filled' : ''} value={config} onChange={e => setConfig(e.target.value)} required style={{ width: '100%' }}>
            <option value="" disabled hidden></option>
            <option value="glass">Стекляшка</option>
            <option value="straight">Прямая раздвижная</option>
            <option value="corner">Угловая раздвижная</option>
            <option value="unique">Уникальная конфигурация</option>
          </select>
          <label htmlFor="config">Конфигурация *</label>
        </div>
        {/* Динамические поля по конфигурации */}
        {config === 'glass' && (
          <>
            {/* Цвет стекла и толщина в одну строку */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-color" className={glassColor ? 'filled' : ''} value={glassColor} onChange={e => setGlassColor(e.target.value)} required style={{ width: '100%' }}>
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-thickness" className={glassThickness ? 'filled' : ''} value={glassThickness} onChange={e => setGlassThickness(e.target.value)} required style={{ width: '100%' }}>
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
              </div>
            </div>
            {/* Ширина и высота */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0, width: '100%' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="width" placeholder=" " value={width} onChange={e => setWidth(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="width">Ширина (мм) *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="height" placeholder=" " value={height} onChange={e => setHeight(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="height">Высота (мм) *</label>
              </div>
            </div>
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select id="hardware-color" className={hardwareColor ? 'filled' : ''} value={hardwareColor} onChange={e => setHardwareColor(e.target.value)} required style={{ width: '100%' }}>
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton />
              </div>
            </div>
          </>
        )}
        {config === 'straight' && (
          <>
            {/* Цвет стекла и толщина стекла для straight */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-color" className={glassColor ? 'filled' : ''} value={glassColor} onChange={e => setGlassColor(e.target.value)} required style={{ width: '100%' }}>
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-thickness" className={glassThickness ? 'filled' : ''} value={glassThickness} onChange={e => setGlassThickness(e.target.value)} required style={{ width: '100%' }}>
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
              </div>
            </div>
            {/* Радиокнопки: Размеры проёма / Размеры стекла */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', margin: '8px 0 0 0' }}>
              <label style={{ fontWeight: 500, fontSize: 15 }}>
                <input type="radio" name="sizeType" value="opening" checked={!showGlassSizes} onChange={() => setShowGlassSizes(false)} style={{ marginRight: 6 }} /> Размеры проёма
              </label>
              <label style={{ fontWeight: 500, fontSize: 15 }}>
                <input type="radio" name="sizeType" value="glass" checked={showGlassSizes} onChange={() => setShowGlassSizes(true)} style={{ marginRight: 6 }} /> Размеры стекла
              </label>
            </div>
            {/* Если выбран 'Размеры стекла' — показываем поля для размеров стекла */}
            {showGlassSizes && (
              <div style={{ display: 'flex', gap: 12, margin: 0, width: '100%' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="number" id="stat-width" placeholder=" " value={width} onChange={e => setWidth(e.target.value)} required style={{ width: '100%' }} />
                  <label htmlFor="stat-width" style={{ fontSize: 11 }}>Ширина стационара (мм)</label>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="number" id="door-width" placeholder=" " value={length} onChange={e => setLength(e.target.value)} required style={{ width: '100%' }} />
                  <label htmlFor="door-width" style={{ fontSize: 11 }}>Ширина двери (мм)</label>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="number" id="height2" placeholder=" " value={height} onChange={e => setHeight(e.target.value)} required style={{ width: '100%' }} />
                  <label htmlFor="height2" style={{ fontSize: 11 }}>Высота (мм)</label>
                </div>
              </div>
            )}
            {/* Ширина проема и высота проема */}
            {!showGlassSizes && (
              <div style={{ display: 'flex', gap: 12, margin: '16px 0 0 0', width: '100%' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="number" id="width" placeholder=" " value={width} onChange={e => setWidth(e.target.value)} required style={{ width: '100%' }} />
                  <label htmlFor="width">Ширина проема (мм) *</label>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="number" id="height" placeholder=" " value={height} onChange={e => setHeight(e.target.value)} required style={{ width: '100%' }} />
                  <label htmlFor="height">Высота проема (мм) *</label>
                </div>
              </div>
            )}
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select id="hardware-color" className={hardwareColor ? 'filled' : ''} value={hardwareColor} onChange={e => setHardwareColor(e.target.value)} required style={{ width: '100%' }}>
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton />
              </div>
            </div>
          </>
        )}
        {config === 'corner' && (
          <>
            {/* Ширина, длина, высота */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0, width: '100%' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="width" placeholder=" " value={width} onChange={e => setWidth(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="width">Ширина (мм) *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="length" placeholder=" " value={length} onChange={e => setLength(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="length">Длина (мм)</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="height" placeholder=" " value={height} onChange={e => setHeight(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="height">Высота (мм) *</label>
              </div>
            </div>
            {/* Цвет стекла и толщина стекла для corner */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-color" className={glassColor ? 'filled' : ''} value={glassColor} onChange={e => setGlassColor(e.target.value)} required style={{ width: '100%' }}>
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-thickness" className={glassThickness ? 'filled' : ''} value={glassThickness} onChange={e => setGlassThickness(e.target.value)} required style={{ width: '100%' }}>
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
              </div>
            </div>
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select id="hardware-color" className={hardwareColor ? 'filled' : ''} value={hardwareColor} onChange={e => setHardwareColor(e.target.value)} required style={{ width: '100%' }}>
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton />
              </div>
            </div>
          </>
        )}
        {config === 'unique' && (
          <>
            {/* Секция название стекла */}
            <div className="form-group" style={{ width: '100%' }}>
              <input type="text" id="glass-name" placeholder=" " value={projectName} onChange={e => setProjectName(e.target.value)} required style={{ width: '100%' }} />
              <label htmlFor="glass-name">Название стекла</label>
            </div>
            {/* Цвет стекла и толщина в одну строку */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-color" className={glassColor ? 'filled' : ''} value={glassColor} onChange={e => setGlassColor(e.target.value)} required style={{ width: '100%' }}>
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select id="glass-thickness" className={glassThickness ? 'filled' : ''} value={glassThickness} onChange={e => setGlassThickness(e.target.value)} required style={{ width: '100%' }}>
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
              </div>
            </div>
            {/* Ширина и высота */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0, width: '100%' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="width" placeholder=" " value={width} onChange={e => setWidth(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="width">Ширина (мм) *</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input type="number" id="height" placeholder=" " value={height} onChange={e => setHeight(e.target.value)} required style={{ width: '100%' }} />
                <label htmlFor="height">Высота (мм) *</label>
              </div>
            </div>
            {/* Кнопка добавить стекло */}
            <button style={{ padding: '10px 12px', borderRadius: 8, background: '#fff', color: '#646cff', border: '2px solid #646cff', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 12, width: '100%' }}>ДОБАВИТЬ СТЕКЛО</button>
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select id="hardware-color" className={hardwareColor ? 'filled' : ''} value={hardwareColor} onChange={e => setHardwareColor(e.target.value)} required style={{ width: '100%' }}>
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton />
              </div>
            </div>
          </>
        )}
        {/* Чекбоксы "Доставка" и "Установка" всегда перед комментарием */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '32px 0 0 0' }}>
          <label style={{ fontWeight: 500, fontSize: 15 }}><input type="checkbox" checked={delivery} onChange={e => setDelivery(e.target.checked)} style={{ marginRight: 6 }} /> Доставка</label>
          <label style={{ fontWeight: 500, fontSize: 15 }}><input type="checkbox" checked={installation} onChange={e => setInstallation(e.target.checked)} style={{ marginRight: 6 }} /> Установка</label>
        </div>
        {/* Комментарий всегда последнее поле */}
        <div className="form-group" style={{ width: '100%', marginLeft: 0, marginTop: 16 }}>
          <textarea id="comment" className={comment ? 'filled' : ''} placeholder=" " value={comment} onChange={e => setComment(e.target.value)} style={{ minHeight: 60, width: '100%', paddingRight: 12 }} />
          <label htmlFor="comment" style={{ left: 12 }}>Комментарий</label>
        </div>
      </div>
    </div>
  );
};

export default CalculatorForm; 