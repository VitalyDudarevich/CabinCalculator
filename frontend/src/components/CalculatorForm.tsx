import React, { useState, useEffect } from 'react';
import AddHardwareButton from './AddHardwareButton';
import AddHardwareDialog, { type HardwareDialogItem, type HardwareItem } from './AddHardwareDialog';
import { QuantityControl } from './AddHardwareDialog';
import type { User } from '../types/User';
import type { DraftProjectData } from './CalculationDetails';
import type { Project } from './ProjectHistory';

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

interface CalculatorFormProps {
  companyId?: string;
  user?: User | null;
  selectedCompanyId?: string;
  onChangeDraft?: (draft: DraftProjectData) => void;
  selectedProject?: Project;
  onProjectSaved?: () => void;
  onNewProject?: () => void;
  exactHeight: boolean;
  onExactHeightChange: (checked: boolean) => void;
}

const STATUS_OPTIONS = [
  'Рассчет',
  'Согласован',
  'Заказан',
  'Стекло Доставлено',
  'Установка',
  'Установлено',
  'Оплачено',
];

const CalculatorForm: React.FC<CalculatorFormProps> = ({ companyId, user, selectedCompanyId = '', onChangeDraft, selectedProject, onProjectSaved, onNewProject, exactHeight, onExactHeightChange }) => {
  const [projectName, setProjectName] = useState('');
  const [config, setConfig] = useState('');
  const [draftConfig, setDraftConfig] = useState(config);
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
  const [showAddHardwareDialog, setShowAddHardwareDialog] = useState(false);
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);
  const [projectHardware, setProjectHardware] = useState<HardwareDialogItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [status, setStatus] = useState('Рассчет');
  const [manualPrice, setManualPrice] = useState<number | undefined>(undefined);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [stationarySize, setStationarySize] = useState('');
  const [doorSize, setDoorSize] = useState('');
  const [stationaryWidth, setStationaryWidth] = useState('');
  const [doorWidth, setDoorWidth] = useState('');
  const [total, setTotal] = useState(0);
  // resolvedCompanyId больше не нужен, используем selectedCompanyId
  const effectiveCompanyId = user?.role === 'superadmin' ? selectedCompanyId : (companyId || localStorage.getItem('companyId') || '');

  // При выборе проекта для редактирования — заполняем поля
  useEffect(() => {
    if (selectedProject) {
      setProjectName(selectedProject.name || '');
      setConfig(selectedProject.data?.config === 'straight-opening' || selectedProject.data?.config === 'straight-glass' ? 'straight' : (selectedProject.data?.config || ''));
      setDraftConfig(selectedProject.data?.config || '');
      setGlassColor(selectedProject.data?.glassColor || '');
      setGlassThickness(selectedProject.data?.glassThickness || '8');
      setHardwareColor(selectedProject.data?.hardwareColor || '');
      setWidth(selectedProject.data?.width || '');
      setHeight(selectedProject.data?.height || '');
      setLength(selectedProject.data?.length || '');
      setComment(selectedProject.data?.comment || '');
      setDelivery(selectedProject.data?.delivery !== undefined ? selectedProject.data.delivery : true);
      setInstallation(selectedProject.data?.installation !== undefined ? selectedProject.data.installation : true);
      setProjectHardware(Array.isArray(selectedProject.data?.projectHardware) ? selectedProject.data.projectHardware : []);
      setStatus(selectedProject.status || 'Рассчет');
      setShowGlassSizes(selectedProject.data?.showGlassSizes || false);
      setStationarySize(selectedProject.data?.stationarySize || '');
      setDoorSize(selectedProject.data?.doorSize || '');
      setStationaryWidth(selectedProject.data?.stationaryWidth || '');
      setDoorWidth(selectedProject.data?.doorWidth || '');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!effectiveCompanyId) return;
    const fetchAll = async () => {
      try {
        const [, glassRes, hardwareRes] = await Promise.all([
          fetch(`${API_URL}/settings?companyId=${effectiveCompanyId}`),
          fetch(`${API_URL}/glass?companyId=${effectiveCompanyId}`),
          fetch(`${API_URL}/hardware?companyId=${effectiveCompanyId}`),
        ]);
        const [glassListData, hardwareListData] = await Promise.all([
          glassRes.json(),
          hardwareRes.json(),
        ]);
        setHardwareList(Array.isArray(hardwareListData) ? hardwareListData : []);
        // Собираем уникальные цвета стекла для выпадающего списка
        const uniqueColors = Array.from(new Set((Array.isArray(glassListData) ? glassListData : []).map((g: unknown) => (g as { color?: string }).color).filter((c: unknown): c is string => Boolean(c))));
        setGlassColors(uniqueColors);
        setGlassColor(uniqueColors[0] || '');
      } catch {
        setHardwareList([]);
        setGlassColors([]);
        setGlassColor('');
      }
    };
    fetchAll();
  }, [effectiveCompanyId]);

  // Хелпер для обновления draft
  const updateDraft = React.useCallback(() => {
    if (onChangeDraft) {
      onChangeDraft({
        projectName,
        config: draftConfig,
        glassColor,
        glassThickness,
        hardwareColor,
        width,
        height,
        length,
        comment,
        delivery,
        installation,
        projectHardware,
        exactHeight,
        stationarySize,
        doorSize,
        stationaryWidth,
        doorWidth,
      });
    }
  }, [onChangeDraft, draftConfig, projectName, glassColor, glassThickness, hardwareColor, width, height, length, comment, delivery, installation, projectHardware, exactHeight, stationarySize, doorSize, stationaryWidth, doorWidth]);

  // useEffect для синхронизации draft
  React.useEffect(() => {
    updateDraft();
  }, [updateDraft]);

  useEffect(() => {
    if (!selectedProject) return;
    const fields = [
      ['name', projectName, selectedProject.name || ''],
      ['config', config, selectedProject.data?.config || ''],
      ['glassColor', glassColor, selectedProject.data?.glassColor || ''],
      ['glassThickness', glassThickness, selectedProject.data?.glassThickness || '8'],
      ['hardwareColor', hardwareColor, selectedProject.data?.hardwareColor || ''],
      ['width', width, selectedProject.data?.width || ''],
      ['height', height, selectedProject.data?.height || ''],
      ['length', length, selectedProject.data?.length || ''],
      ['comment', comment, selectedProject.data?.comment || ''],
      ['delivery', delivery, selectedProject.data?.delivery !== undefined ? selectedProject.data.delivery : true],
      ['installation', installation, selectedProject.data?.installation !== undefined ? selectedProject.data.installation : true],
      ['status', status, selectedProject.status || 'Рассчет'],
      ['manualPrice', manualPrice, selectedProject.price],
    ];
    const changed = new Set<string>();
    fields.forEach(([key, val, orig]) => {
      if (val !== orig) changed.add(key as string);
    });
    setChangedFields(changed);
  }, [projectName, config, glassColor, glassThickness, hardwareColor, width, height, length, comment, delivery, installation, status, manualPrice, selectedProject]);

  const resetForm = () => {
    setProjectName('');
    setConfig('');
    setGlassColor('');
    setGlassThickness('8');
    setHardwareColor('');
    setWidth('');
    setHeight('');
    setLength('');
    setComment('');
    setDelivery(true);
    setInstallation(true);
    setProjectHardware([]);
    setStatus('Рассчет');
    setErrors({});
    setSaveStatus('idle');
  };

  const handleSaveProject = async () => {
    if (selectedProject && changedFields.size > 0) {
      const confirmed = window.confirm('Вы уверены, что хотите обновить проект?');
      if (!confirmed) return;
    }
    const newErrors: { [key: string]: string } = {};
    if (!projectName.trim()) newErrors.projectName = 'Заполните название проекта';
    if (!config) newErrors.config = 'Выберите конфигурацию';
    if (!glassColor) newErrors.glassColor = 'Выберите цвет стекла';
    if (!glassThickness) newErrors.glassThickness = 'Выберите толщину стекла';
    if (!hardwareColor) newErrors.hardwareColor = 'Выберите цвет фурнитуры';
    if (!width || isNaN(Number(width)) || Number(width) <= 0) newErrors.width = 'Укажите ширину';
    if (!height || isNaN(Number(height)) || Number(height) <= 0) newErrors.height = 'Укажите высоту';
    if (user?.role === 'superadmin' && !selectedCompanyId) {
      newErrors.company = 'Выберите компанию';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setErrors({});
    setSaveStatus('idle');
    const data = {
      config,
      glassColor,
      glassThickness,
      hardwareColor,
      width,
      height,
      length,
      comment,
      delivery,
      installation,
      projectHardware,
    };
    try {
      let res;
      if (selectedProject && selectedProject._id) {
        res = await fetch(`${API_URL}/projects/${selectedProject._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: effectiveCompanyId,
            name: projectName,
            data,
            status,
            price: changedFields.has('manualPrice')
              ? (manualPrice !== undefined ? manualPrice : (selectedProject.price ?? 0))
              : (selectedProject.price ?? 0),
          }),
        });
      } else {
        res = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: effectiveCompanyId,
            name: projectName,
            data,
            status: 'Рассчет',
            price: manualPrice !== undefined ? manualPrice : total,
          }),
        });
      }
      if (res.ok) {
        setSaveStatus('success');
        if (onProjectSaved) onProjectSaved();
        resetForm();
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const handleConfigChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setConfig(value);
    if (value === 'glass') {
      // Найти точное название профиля в hardwareList
      let profileName = '';
      if (Array.isArray(hardwareList)) {
        const found = hardwareList.find(h => h.name.toLowerCase().includes('профиль') && h.name.includes(glassThickness + ' мм'));
        profileName = found ? found.name : (glassThickness === '10' ? 'Профиль 10 мм' : 'Профиль 8 мм');
      } else {
        profileName = glassThickness === '10' ? 'Профиль 10 мм' : 'Профиль 8 мм';
      }
      setProjectHardware([
        { hardwareId: `${Date.now()}_${Math.random()}`, name: profileName, quantity: 1 },
        { hardwareId: `${Date.now()}_${Math.random()}`, name: 'Палка стена-стекло прямоугольная', quantity: 1 },
      ]);
    } else if (value === 'straight') {
      // Добавляем нужную фурнитуру для прямой раздвижной
      const color = hardwareColor || '';
      const thickness = glassThickness || '';
      setProjectHardware([
        { hardwareId: `${Date.now()}_${Math.random()}`, name: `Профиль ${color} ${thickness === '8' ? '8 мм' : thickness}`, quantity: 1 },
        { hardwareId: `${Date.now()}_${Math.random()}`, name: `Раздвижная система ${color}`, quantity: 1 },
        { hardwareId: `${Date.now()}_${Math.random()}`, name: `Профильная труба (рельса) ${color}`, quantity: 1 },
        { hardwareId: `${Date.now()}_${Math.random()}`, name: `Уплотнитель F`, quantity: 2 },
      ]);
    }
    // Если выбрана "прямая раздвижная" — сбрасываем размеры стекла при смене опции размеров
    if (value === 'straight') {
      setWidth('');
      setHeight('');
      setLength('');
    }
  };

  // Сброс размеров при смене опции "размеры проёма/размеры стекла" для "прямая раздвижная"
  useEffect(() => {
    if (config === 'straight') {
      setDraftConfig(showGlassSizes ? 'straight-glass' : 'straight-opening');
    } else {
      setDraftConfig(config);
    }
  }, [config, showGlassSizes]);

  // Вычисление размеров стекла для сохранения
  useEffect(() => {
    if (config === 'straight' && width && height && !showGlassSizes) {
      const w = Number(width);
      const h = Number(height);
      const partWidth = (w + 30) / 2;
      if (exactHeight) {
        setStationarySize(`${Math.round(partWidth)} × ${Math.round(h - 3)} мм`);
        setDoorSize(`${Math.round(partWidth)} × ${Math.round(h - 11)} мм`);
      } else {
        setStationarySize(`${Math.round(partWidth)} × ${Math.round(h)} мм`);
        setDoorSize(`${Math.round(partWidth)} × ${Math.round(h - 8)} мм`);
      }
    } else {
      setStationarySize('');
      setDoorSize('');
    }
  }, [config, width, height, showGlassSizes, exactHeight]);

  // Перенос значений между режимами при переключении showGlassSizes
  useEffect(() => {
    if (showGlassSizes) {
      setWidth('');
    } else {
      setStationaryWidth('');
      setDoorWidth('');
    }
    // height не сбрасываем
  }, [showGlassSizes]);

  const handleNewProject = () => {
    setConfig('');
    setProjectName('');
    setGlassColor(glassColors[0] || '');
    setGlassThickness('8');
    setHardwareColor('');
    setWidth('');
    setHeight('');
    setLength('');
    setComment('');
    setDelivery(true);
    setInstallation(true);
    setProjectHardware([]);
    setErrors({});
    if (onChangeDraft) onChangeDraft({});
    if (onNewProject) onNewProject();
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, width: 480, margin: '0 32px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 20 }}>
        {selectedProject ? `Редактирование ${selectedProject.name || ''}` : 'Новый проект'}
      </h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={handleNewProject}>НОВЫЙ ПРОЕКТ</button>
        <button
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 8,
            background: !selectedProject || changedFields.size > 0 ? '#646cff' : '#ccc',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 16,
            cursor: !selectedProject || changedFields.size > 0 ? 'pointer' : 'not-allowed',
            opacity: !selectedProject || changedFields.size > 0 ? 1 : 0.7,
          }}
          onClick={handleSaveProject}
          disabled={!!selectedProject && changedFields.size === 0}
        >
          СОХРАНИТЬ
        </button>
      </div>
      {/* Статус только при редактировании, стилизован как остальные поля */}
      {selectedProject && (
        <>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={status ? 'filled' : ''}
              style={{ fontWeight: 500, fontSize: 16, background: changedFields.has('status') ? '#fffbe6' : undefined }}
            >
              <option value="" disabled hidden></option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <label>Статус</label>
          </div>
          {/* Поле для ручного изменения итоговой цены */}
          <div className="form-group" style={{ marginBottom: 8 }}>
            <input
              type="number"
              value={manualPrice === undefined ? '' : manualPrice}
              onChange={e => {
                const val = e.target.value;
                setManualPrice(val === '' ? undefined : Math.max(0, Math.floor(Number(val))));
              }}
              min={0}
              step={1}
              style={{
                fontWeight: 500,
                fontSize: 16,
                background: selectedProject && manualPrice !== undefined && manualPrice !== selectedProject.price ? '#fffbe6' : undefined
              }}
              placeholder=""
            />
            <label>Изменить цену</label>
          </div>
        </>
      )}
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
        .form-group input:not(:placeholder-shown) + label,
        .form-group textarea.filled + label,
        .form-group textarea:focus + label {
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
      `}</style>
      {saveStatus === 'success' && <div style={{ color: 'green', marginBottom: 8 }}>Проект успешно сохранён!</div>}
      {saveStatus === 'error' && <div style={{ color: 'red', marginBottom: 8 }}>Ошибка при сохранении проекта</div>}
      {errors.company && <div style={{ color: 'red', fontSize: 13, marginTop: 8 }}>{errors.company}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
        {/* Название проекта */}
        <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
          <input
            type="text"
            id="project-name"
            autoComplete="off"
            placeholder=" "
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            required
            style={{ width: '100%', paddingRight: 12, background: changedFields.has('name') ? '#fffbe6' : undefined }}
          />
          <label htmlFor="project-name" style={{ left: 12 }}>Название проекта *</label>
          {errors.projectName && <div style={{ color: 'red', fontSize: 13 }}>{errors.projectName}</div>}
        </div>
        {/* Конфигурация */}
        <div className="form-group" style={{ width: '100%' }}>
          <select
            id="config"
            className={config ? 'filled' : ''}
            value={config}
            onChange={handleConfigChange}
            required
            style={{ width: '100%', background: selectedProject && changedFields.has('config') ? '#fffbe6' : undefined }}
          >
            <option value="" disabled hidden></option>
            <option value="glass">Стекляшка</option>
            <option value="straight">Прямая раздвижная</option>
            <option value="corner">Угловая раздвижная</option>
            <option value="unique">Уникальная конфигурация</option>
          </select>
          <label htmlFor="config">Конфигурация *</label>
          {errors.config && <div style={{ color: 'red', fontSize: 13 }}>{errors.config}</div>}
        </div>
        {/* Динамические поля по конфигурации */}
        {config === 'glass' && (
          <>
            {/* Цвет стекла и толщина в одну строку */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-color"
                  className={glassColor ? 'filled' : ''}
                  value={glassColor}
                  onChange={e => setGlassColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassColor') ? '#fffbe6' : undefined }}
                >
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
                {errors.glassColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassColor}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-thickness"
                  className={glassThickness ? 'filled' : ''}
                  value={glassThickness}
                  onChange={e => setGlassThickness(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassThickness') ? '#fffbe6' : undefined }}
                >
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
                {errors.glassThickness && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassThickness}</div>}
              </div>
            </div>
            {/* Ширина и высота */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0, width: '100%' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="width"
                  className={width ? 'filled' : ''}
                  placeholder=" "
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('width') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="width">Ширина (мм) *</label>
                {errors.width && <div style={{ color: 'red', fontSize: 13 }}>{errors.width}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="height"
                  className={height ? 'filled' : ''}
                  placeholder=" "
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('height') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="height">Высота (мм) *</label>
                {errors.height && <div style={{ color: 'red', fontSize: 13 }}>{errors.height}</div>}
              </div>
            </div>
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={e => setHardwareColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('hardwareColor') ? '#fffbe6' : undefined }}
                >
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
                {errors.hardwareColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.hardwareColor}</div>}
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton onClick={() => setShowAddHardwareDialog(true)} />
              </div>
              {projectHardware.length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 8 }}>
                  {projectHardware.map(hw => (
                    <div key={hw.hardwareId} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <QuantityControl
                          value={hw.quantity}
                          onChange={v => setProjectHardware(list => list.map(item => item.hardwareId === hw.hardwareId ? { ...item, quantity: v } : item))}
                        />
                        <button
                          onClick={() => setProjectHardware(list => list.filter(item => item.hardwareId !== hw.hardwareId))}
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
              {errors.projectHardware && <div style={{ color: 'red', fontSize: 13 }}>{errors.projectHardware}</div>}
            </div>
          </>
        )}
        {config === 'straight' && (
          <>
            {/* Цвет стекла и толщина стекла для straight */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-color"
                  className={glassColor ? 'filled' : ''}
                  value={glassColor}
                  onChange={e => setGlassColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassColor') ? '#fffbe6' : undefined }}
                >
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
                {errors.glassColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassColor}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-thickness"
                  className={glassThickness ? 'filled' : ''}
                  value={glassThickness}
                  onChange={e => setGlassThickness(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassThickness') ? '#fffbe6' : undefined }}
                >
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
                {errors.glassThickness && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassThickness}</div>}
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
                  <input
                    type="number"
                    id="stat-width"
                    placeholder=" "
                    value={stationaryWidth}
                    onChange={e => setStationaryWidth(e.target.value)}
                    required
                    style={{ width: '100%', background: changedFields.has('stationaryWidth') ? '#fffbe6' : undefined }}
                  />
                  <label htmlFor="stat-width" style={{ fontSize: 11 }}>Ширина стационара (мм)</label>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="number"
                    id="door-width"
                    placeholder=" "
                    value={doorWidth}
                    onChange={e => setDoorWidth(e.target.value)}
                    required
                    style={{ width: '100%', background: changedFields.has('doorWidth') ? '#fffbe6' : undefined }}
                  />
                  <label htmlFor="door-width" style={{ fontSize: 11 }}>Ширина двери (мм)</label>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="number"
                    id="height2"
                    placeholder=" "
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    required
                    style={{ width: '100%', background: changedFields.has('height') ? '#fffbe6' : undefined }}
                  />
                  <label htmlFor="height2" style={{ fontSize: 11 }}>Высота (мм)</label>
                </div>
              </div>
            )}
            {/* Если выбран 'Размеры проёма' — показываем поля для размеров проёма с тем же отступом, что и для стекла */}
            {!showGlassSizes && (
              <div style={{ display: 'flex', gap: 12, margin: 0, width: '100%' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="number"
                    id="width"
                    placeholder=" "
                    value={width}
                    onChange={e => setWidth(e.target.value)}
                    required
                    style={{ width: '100%', background: changedFields.has('width') ? '#fffbe6' : undefined }}
                  />
                  <label htmlFor="width">Ширина (мм) *</label>
                  {errors.width && <div style={{ color: 'red', fontSize: 13 }}>{errors.width}</div>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="number"
                    id="height"
                    placeholder=" "
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    required
                    style={{ width: '100%', background: changedFields.has('height') ? '#fffbe6' : undefined }}
                  />
                  <label htmlFor="height">Высота (мм) *</label>
                  {errors.height && <div style={{ color: 'red', fontSize: 13 }}>{errors.height}</div>}
                </div>
              </div>
            )}
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={e => setHardwareColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('hardwareColor') ? '#fffbe6' : undefined }}
                >
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
                {errors.hardwareColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.hardwareColor}</div>}
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton onClick={() => setShowAddHardwareDialog(true)} />
              </div>
              {projectHardware.length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 8 }}>
                  {projectHardware.map(hw => (
                    <div key={hw.hardwareId} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <QuantityControl
                          value={hw.quantity}
                          onChange={v => setProjectHardware(list => list.map(item => item.hardwareId === hw.hardwareId ? { ...item, quantity: v } : item))}
                        />
                        <button
                          onClick={() => setProjectHardware(list => list.filter(item => item.hardwareId !== hw.hardwareId))}
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
              {errors.projectHardware && <div style={{ color: 'red', fontSize: 13 }}>{errors.projectHardware}</div>}
            </div>
          </>
        )}
        {config === 'corner' && (
          <>
            {/* Ширина, длина, высота */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0, width: '100%' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="width"
                  placeholder=" "
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('width') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="width">Ширина (мм) *</label>
                {errors.width && <div style={{ color: 'red', fontSize: 13 }}>{errors.width}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="length"
                  placeholder=" "
                  value={length}
                  onChange={e => setLength(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('length') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="length">Длина (мм)</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="height"
                  placeholder=" "
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('height') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="height">Высота (мм) *</label>
                {errors.height && <div style={{ color: 'red', fontSize: 13 }}>{errors.height}</div>}
              </div>
            </div>
            {/* Цвет стекла и толщина стекла для corner */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-color"
                  className={glassColor ? 'filled' : ''}
                  value={glassColor}
                  onChange={e => setGlassColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassColor') ? '#fffbe6' : undefined }}
                >
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
                {errors.glassColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassColor}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-thickness"
                  className={glassThickness ? 'filled' : ''}
                  value={glassThickness}
                  onChange={e => setGlassThickness(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassThickness') ? '#fffbe6' : undefined }}
                >
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
                {errors.glassThickness && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassThickness}</div>}
              </div>
            </div>
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={e => setHardwareColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('hardwareColor') ? '#fffbe6' : undefined }}
                >
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
                {errors.hardwareColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.hardwareColor}</div>}
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton onClick={() => setShowAddHardwareDialog(true)} />
              </div>
              {projectHardware.length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 8 }}>
                  {projectHardware.map(hw => (
                    <div key={hw.hardwareId} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <QuantityControl
                          value={hw.quantity}
                          onChange={v => setProjectHardware(list => list.map(item => item.hardwareId === hw.hardwareId ? { ...item, quantity: v } : item))}
                        />
                        <button
                          onClick={() => setProjectHardware(list => list.filter(item => item.hardwareId !== hw.hardwareId))}
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
            </div>
          </>
        )}
        {config === 'unique' && (
          <>
            {/* Секция название стекла */}
            <div className="form-group" style={{ width: '100%' }}>
              <input
                type="text"
                id="glass-name"
                placeholder=" "
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                required
                style={{ width: '100%', background: changedFields.has('name') ? '#fffbe6' : undefined }}
              />
              <label htmlFor="glass-name">Название стекла</label>
            </div>
            {/* Цвет стекла и толщина в одну строку */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-color"
                  className={glassColor ? 'filled' : ''}
                  value={glassColor}
                  onChange={e => setGlassColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassColor') ? '#fffbe6' : undefined }}
                >
                  {glassColors.length > 0 && glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <label htmlFor="glass-color">Цвет стекла *</label>
                {errors.glassColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassColor}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="glass-thickness"
                  className={glassThickness ? 'filled' : ''}
                  value={glassThickness}
                  onChange={e => setGlassThickness(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('glassThickness') ? '#fffbe6' : undefined }}
                >
                  {GLASS_THICKNESS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="glass-thickness">Толщина стекла *</label>
                {errors.glassThickness && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassThickness}</div>}
              </div>
            </div>
            {/* Ширина и высота */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 0, width: '100%' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="width"
                  placeholder=" "
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('width') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="width">Ширина (мм) *</label>
                {errors.width && <div style={{ color: 'red', fontSize: 13 }}>{errors.width}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="height"
                  placeholder=" "
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('height') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="height">Высота (мм) *</label>
                {errors.height && <div style={{ color: 'red', fontSize: 13 }}>{errors.height}</div>}
              </div>
            </div>
            {/* Кнопка добавить стекло */}
            <button style={{ padding: '10px 12px', borderRadius: 8, background: '#fff', color: '#646cff', border: '2px solid #646cff', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 12, width: '100%' }}>ДОБАВИТЬ СТЕКЛО</button>
            {/* Цвет фурнитуры */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={e => setHardwareColor(e.target.value)}
                  required
                  style={{ width: '100%', background: changedFields.has('hardwareColor') ? '#fffbe6' : undefined }}
                >
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="hardware-color">Цвет фурнитуры *</label>
                {errors.hardwareColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.hardwareColor}</div>}
              </div>
              <div style={{ marginTop: 0, marginBottom: 0 }}>
                <AddHardwareButton onClick={() => setShowAddHardwareDialog(true)} />
              </div>
              {projectHardware.length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 8 }}>
                  {projectHardware.map(hw => (
                    <div key={hw.hardwareId} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <QuantityControl
                          value={hw.quantity}
                          onChange={v => setProjectHardware(list => list.map(item => item.hardwareId === hw.hardwareId ? { ...item, quantity: v } : item))}
                        />
                        <button
                          onClick={() => setProjectHardware(list => list.filter(item => item.hardwareId !== hw.hardwareId))}
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
            </div>
          </>
        )}
        {/* Чекбоксы "Доставка" и "Установка" всегда перед комментарием */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '32px 0 0 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: changedFields.has('delivery') ? '#fffbe6' : undefined, borderRadius: 4, padding: '2px 4px' }}>
            <input type="checkbox" checked={delivery} onChange={e => setDelivery(e.target.checked)} />
            Доставка
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: changedFields.has('installation') ? '#fffbe6' : undefined, borderRadius: 4, padding: '2px 4px' }}>
            <input type="checkbox" checked={installation} onChange={e => setInstallation(e.target.checked)} />
            Установка
          </label>
        </div>
        {/* Комментарий всегда последнее поле */}
        <div className="form-group" style={{ width: '100%' }}>
          <textarea
            id="comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className={comment ? 'filled' : ''}
            style={{ width: '100%', minHeight: 48, fontSize: 16, borderRadius: 8, border: '1px solid #ccc', padding: 12, marginBottom: 4, background: changedFields.has('comment') ? '#fffbe6' : undefined }}
          />
          <label htmlFor="comment">Комментарий</label>
        </div>
        {/* История изменения статусов */}
        {selectedProject && Array.isArray(selectedProject.statusHistory) && selectedProject.statusHistory.length > 0 && (
          <div style={{ margin: '12px 0 0 0', padding: '12px 10px', background: '#f8f8f8', borderRadius: 8, border: '1px solid #e0e0e0' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>История статусов:</div>
            {selectedProject.statusHistory && selectedProject.statusHistory.map((sh, idx) => (
              <div key={idx} style={{ color: idx === (selectedProject.statusHistory?.length ?? 0) - 1 ? '#1976d2' : '#888', fontSize: 15, marginBottom: 2, fontWeight: idx === (selectedProject.statusHistory?.length ?? 0) - 1 ? 600 : 400 }}>
                {sh.status} <span style={{ fontSize: 13, marginLeft: 8 }}>{new Date(sh.date).toLocaleString()}</span>
                {idx === 0 && <span style={{ color: '#aaa', fontSize: 13 }}> (первоначальный)</span>}
                {idx === (selectedProject.statusHistory?.length ?? 0) - 1 && <span style={{ color: '#1976d2', fontSize: 13 }}> (текущий)</span>}
              </div>
            ))}
          </div>
        )}
        {showAddHardwareDialog && (
          <AddHardwareDialog
            hardwareList={hardwareList}
            onSave={(selected) => {
              setProjectHardware(prev => [...prev, ...selected]);
              setShowAddHardwareDialog(false);
            }}
            onClose={() => setShowAddHardwareDialog(false)}
            projectHardware={projectHardware}
          />
        )}
      </div>
    </div>
  );
};

export default CalculatorForm; 