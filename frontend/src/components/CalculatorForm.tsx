import React, { useState, useEffect } from 'react';
import AddHardwareButton from './AddHardwareButton';
import AddHardwareDialog, { type HardwareDialogItem, type HardwareItem } from './AddHardwareDialog';
import { QuantityControl } from './AddHardwareDialog';
import type { User } from '../types/User';
import type { DraftProjectData } from './CalculationDetails';
import type { Project } from './ProjectHistory';
import { API_URL as BASE_API_URL } from '../utils/api';
const API_URL = `${BASE_API_URL}/api`;

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
  onNewProject?: (project?: Project) => void;
  totalPrice?: number;
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

const CalculatorForm: React.FC<CalculatorFormProps> = ({ companyId, user, selectedCompanyId = '', onChangeDraft, selectedProject, onNewProject, totalPrice }) => {
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
  const [exactHeight, setExactHeight] = useState(false);
  const [uniqueGlasses, setUniqueGlasses] = useState([
    { name: 'Стекло 1', color: glassColors[0] || '', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
  ]);
  const [uniqueGlassErrors, setUniqueGlassErrors] = useState<{ [idx: number]: { [field: string]: string } }>({});
  const [dismantling, setDismantling] = useState(false);
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
      setLength(selectedProject.data?.length || '');
      setComment(selectedProject.data?.comment || '');
      setDelivery(selectedProject.data?.delivery !== undefined ? selectedProject.data.delivery : true);
      setInstallation(selectedProject.data?.installation !== undefined ? selectedProject.data.installation : true);
      setDismantling(selectedProject.data?.dismantling || false);
      setProjectHardware(Array.isArray(selectedProject.data?.projectHardware) ? selectedProject.data.projectHardware : []);
      setStatus(selectedProject.status || 'Рассчет');
      setStationarySize(selectedProject.data?.stationarySize || '');
      setDoorSize(selectedProject.data?.doorSize || '');
      setExactHeight(selectedProject.data?.exactHeight || false);
      setManualPrice(undefined);
      // Для уникальной конфигурации — заполняем uniqueGlasses
      if (selectedProject.data?.uniqueGlasses && Array.isArray(selectedProject.data.uniqueGlasses)) {
        setUniqueGlasses(selectedProject.data.uniqueGlasses);
      } else {
        setUniqueGlasses([
          { name: 'Стекло 1', color: glassColors[0] || '', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
        ]);
      }
      setUniqueGlassErrors({});
      // Сначала выставляем showGlassSizes, затем подставляем размеры через setTimeout
      setShowGlassSizes(selectedProject.data?.showGlassSizes || false);
      setTimeout(() => {
        if (selectedProject.data?.showGlassSizes) {
          setStationaryWidth(selectedProject.data?.stationaryWidth || '');
          setDoorWidth(selectedProject.data?.doorWidth || '');
          setHeight(selectedProject.data?.height || '');
        } else {
          setWidth(selectedProject.data?.width || '');
          setHeight(selectedProject.data?.height || '');
        }
        setChangedFields(new Set());
      }, 0);
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
        dismantling,
        projectHardware,
        showGlassSizes,
        stationarySize,
        doorSize,
        stationaryWidth,
        doorWidth,
        exactHeight,
        uniqueGlasses: draftConfig === 'unique' ? uniqueGlasses : undefined,
      });
    }
  }, [onChangeDraft, draftConfig, projectName, glassColor, glassThickness, hardwareColor, width, height, length, comment, delivery, installation, dismantling, projectHardware, showGlassSizes, stationarySize, doorSize, stationaryWidth, doorWidth, exactHeight, uniqueGlasses]);

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
      ['dismantling', dismantling, selectedProject.data?.dismantling || false],
      ['status', status, selectedProject.status || 'Рассчет'],
      ['manualPrice', manualPrice, selectedProject.price],
    ];
    const changed = new Set<string>();
    fields.forEach(([key, val, orig]) => {
      if (val !== orig) changed.add(key as string);
    });
    setChangedFields(changed);
  }, [projectName, config, glassColor, glassThickness, hardwareColor, width, height, length, comment, delivery, installation, dismantling, status, manualPrice, selectedProject]);

  // 1. Универсальный сброс всех полей к дефолтным значениям
  const resetAllFields = (preserveName = false) => {
    if (!preserveName) setProjectName('');
    setConfig('');
    setDraftConfig('');
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
    setStatus('Рассчет');
    setErrors({});
    setSaveStatus('idle');
    setShowGlassSizes(false);
    setStationarySize('');
    setDoorSize('');
    setStationaryWidth('');
    setDoorWidth('');
    setManualPrice(undefined);
    setChangedFields(new Set());
    setExactHeight(false);
    setUniqueGlasses([
      { name: 'Стекло 1', color: glassColors[0] || '', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
    ]);
    setUniqueGlassErrors({});
    setDismantling(false);
  };

  // 2. При смене конфигурации — сброс всех полей, кроме projectName
  const handleConfigChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    resetAllFields(true); // сохраняем projectName
    setConfig(value);
    setDraftConfig(value);

    if (value === 'glass') {
      setProjectHardware([
        { hardwareId: '', name: 'Профиль', quantity: 1 },
        { hardwareId: '', name: 'Палка стена-стекло прямоугольная', quantity: 1 }
      ]);
    } else if (["straight", "straight-glass", "straight-opening"].includes(value)) {
      setProjectHardware([
        { hardwareId: '', name: 'Профиль', quantity: 1 },
        { hardwareId: '', name: 'Раздвижная система', quantity: 1 },
        { hardwareId: '', name: 'Профильная труба (рельса)', quantity: 1 },
        { hardwareId: '', name: 'Уплотнитель F', quantity: 2 },
        { hardwareId: '', name: 'Уплотнитель A', quantity: 1 }
      ]);
    } else if (value === 'corner') {
      setProjectHardware([
        { hardwareId: '', name: 'Профиль', quantity: 2 },
        { hardwareId: '', name: 'Раздвижная система', quantity: 2 },
        { hardwareId: '', name: 'Профильная труба (рельса)', quantity: 1 },
        { hardwareId: '', name: 'уголок турба-труба прямоугольное', quantity: 1 },
        { hardwareId: '', name: 'Уплотнитель F', quantity: 4 }
      ]);
    }
    setUniqueGlassErrors({});
  };

  // 3. При смене опции 'размеры проёма/размеры стекла' — сброс всех размеров
  useEffect(() => {
    if (!selectedProject && config === 'straight') {
      setDraftConfig(showGlassSizes ? 'straight-glass' : 'straight-opening');
      setWidth('');
      setHeight('');
      setLength('');
      setStationaryWidth('');
      setDoorWidth('');
      setStationarySize('');
      setDoorSize('');
    } else if (!selectedProject) {
      setDraftConfig(config);
    }
  }, [config, showGlassSizes, selectedProject]);

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

  // 4. При нажатии 'Новый проект' — сброс всех полей
  const handleNewProject = () => {
    resetAllFields();
    setGlassColor(glassColors[0] || '');
    if (onChangeDraft) onChangeDraft({});
    if (onNewProject) onNewProject();
    setExactHeight(false);
  };

  // Валидация формы
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!projectName.trim()) newErrors.projectName = 'Укажите имя проекта';
    if (!config) newErrors.config = 'Выберите конфигурацию';
    if (!glassColor) newErrors.glassColor = 'Выберите цвет стекла';
    if (!glassThickness) newErrors.glassThickness = 'Выберите толщину стекла';
    // Размеры
    if (config === 'glass' || config === 'unique' || config === 'corner') {
      if (!width) newErrors.width = 'Укажите ширину';
      if (!height) newErrors.height = 'Укажите высоту';
    }
    if (["straight", "straight-glass", "straight-opening"].includes(config)) {
      if (showGlassSizes) {
        if (!stationaryWidth) newErrors.stationaryWidth = 'Укажите ширину стационара';
        if (!doorWidth) newErrors.doorWidth = 'Укажите ширину двери';
        if (!height) newErrors.height = 'Укажите высоту';
      } else {
        if (!width) newErrors.width = 'Укажите ширину';
        if (!height) newErrors.height = 'Укажите высоту';
      }
    }
    if (!hardwareColor) newErrors.hardwareColor = 'Выберите цвет фурнитуры';
    if (config === 'unique') {
      const glassErrs: { [idx: number]: { [field: string]: string } } = {};
      uniqueGlasses.forEach((glass, idx) => {
        const errs: { [field: string]: string } = {};
        if (!glass.name.trim()) errs.name = 'Укажите название стекла';
        if (!glass.color) errs.color = 'Выберите цвет стекла';
        if (!glass.thickness) errs.thickness = 'Выберите толщину стекла';
        // Ширина
        if (!glass.width) {
          errs.width = 'Укажите ширину';
        } else if (isNaN(Number(glass.width)) || Number(glass.width) < 1 || Number(glass.width) > 10000) {
          errs.width = 'Введите число от 1 до 10000';
        }
        // Высота
        if (!glass.height) {
          errs.height = 'Укажите высоту';
        } else if (isNaN(Number(glass.height)) || Number(glass.height) < 1 || Number(glass.height) > 10000) {
          errs.height = 'Введите число от 1 до 10000';
        }
        if (Object.keys(errs).length > 0) glassErrs[idx] = errs;
      });
      setUniqueGlassErrors(glassErrs);
      if (Object.keys(glassErrs).length > 0) return false;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProject = async () => {
    if (!validateForm()) return;
    setSaveStatus('idle');
    setErrors({});
    const now = new Date().toISOString();
    // Корректно определяем итоговую цену
    let finalPrice;
    if (manualPrice !== undefined) {
      finalPrice = manualPrice;
    } else if (selectedProject && selectedProject.price !== undefined) {
      finalPrice = selectedProject.price;
    } else {
      finalPrice = totalPrice ?? 0;
    }
    // Собираем данные проекта
    const projectData = {
      name: projectName,
      data: {
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
        dismantling,
        projectHardware,
        showGlassSizes,
        stationarySize,
        doorSize,
        stationaryWidth,
        doorWidth,
        exactHeight,
        uniqueGlasses: config === 'unique' ? uniqueGlasses : undefined,
      },
      companyId: effectiveCompanyId,
      status,
      price: finalPrice,
      priceHistory: [
        { price: finalPrice, date: now }
      ],
    };

    let res, savedProject;
    try {
      if (selectedProject && selectedProject._id) {
        // Редактирование: PUT
        res = await fetch(`${API_URL}/projects/${selectedProject._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        if (!res.ok) throw new Error('Ошибка при сохранении изменений');
        savedProject = await res.json();
        if (typeof onNewProject === 'function') onNewProject(savedProject);
        // Сбросить все поля к дефолтным значениям, как при создании нового проекта
        resetAllFields();
        setSaveStatus('success');
        setChangedFields(new Set());
        if (savedProject) {
          setProjectName(savedProject.name || '');
          setConfig(savedProject.data?.config === 'straight-opening' || savedProject.data?.config === 'straight-glass' ? 'straight' : (savedProject.data?.config || ''));
          setDraftConfig(savedProject.data?.config || '');
          setGlassColor(savedProject.data?.glassColor || '');
          setGlassThickness(savedProject.data?.glassThickness || '8');
          setHardwareColor(savedProject.data?.hardwareColor || '');
          setWidth(savedProject.data?.width || '');
          setHeight(savedProject.data?.height || '');
          setLength(savedProject.data?.length || '');
          setComment(savedProject.data?.comment || '');
          setDelivery(savedProject.data?.delivery !== undefined ? savedProject.data.delivery : true);
          setInstallation(savedProject.data?.installation !== undefined ? savedProject.data.installation : true);
          setDismantling(savedProject.data?.dismantling || false);
          setProjectHardware(Array.isArray(savedProject.data?.projectHardware) ? savedProject.data.projectHardware : []);
          setStatus(savedProject.status || 'Рассчет');
          setShowGlassSizes(savedProject.data?.showGlassSizes || false);
          setStationarySize(savedProject.data?.stationarySize || '');
          setDoorSize(savedProject.data?.doorSize || '');
          setStationaryWidth(savedProject.data?.stationaryWidth || '');
          setDoorWidth(savedProject.data?.doorWidth || '');
          setManualPrice(undefined);
          setExactHeight(savedProject.data?.exactHeight || false);
          if (savedProject.data?.uniqueGlasses && Array.isArray(savedProject.data.uniqueGlasses)) {
            setUniqueGlasses(savedProject.data.uniqueGlasses);
          } else {
            setUniqueGlasses([
              { name: 'Стекло 1', color: glassColors[0] || '', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
            ]);
          }
          setUniqueGlassErrors({});
        }
      } else {
        // Новый проект: POST
        res = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        if (!res.ok) throw new Error('Ошибка при сохранении проекта');
        savedProject = await res.json();
        if (typeof onNewProject === 'function') onNewProject(savedProject);
        resetAllFields(); // Только для нового проекта
        setSaveStatus('success');
      }
    } catch (e) {
      setSaveStatus('error');
      const errMsg = e instanceof Error ? e.message : 'Ошибка сохранения';
      setErrors({ global: errMsg });
    }
    // Сбросить выбранный проект и draftProjectData после сохранения
    if (typeof onNewProject === 'function') onNewProject(undefined);
    resetAllFields();
    setSaveStatus('success');
    setChangedFields(new Set());
  };

  const handleAddGlass = () => {
    if (uniqueGlasses.length < 10) {
      setUniqueGlasses(list => [...list, {
        name: `Стекло ${list.length + 1}`,
        color: glassColors[0] || '',
        thickness: GLASS_THICKNESS[0]?.value || '',
        width: '',
        height: ''
      }]);
    }
  };

  const handleRemoveGlass = (idx: number) => {
    if (uniqueGlasses.length > 1) setUniqueGlasses(list => list.filter((_, i) => i !== idx));
  };

  const handleGlassChange = (idx: number, field: string, value: string) => {
    setUniqueGlasses(list => list.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    setUniqueGlassErrors(prev => {
      if (!prev[idx] || !prev[idx][field]) return prev;
      const newErrs = { ...prev };
      const fieldErrs = { ...newErrs[idx] };
      delete fieldErrs[field];
      if (Object.keys(fieldErrs).length === 0) {
        delete newErrs[idx];
      } else {
        newErrs[idx] = fieldErrs;
      }
      return newErrs;
    });
  };

  // Проверка на незаполненные поля хотя бы в одном стекле
  const hasEmptyGlassField = draftConfig === 'unique' && uniqueGlasses.some(g => !g.name || !g.color || !g.thickness || !g.width || !g.height);

  return (
    <div className="calculator-form-root" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, width: '100%', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' }}>
      <h2 style={{ fontWeight: 700, fontSize: 24, margin: '0 0 12px 0' }}>
        {selectedProject ? `Редактирование ${selectedProject.name || ''}` : 'Новый проект'}
      </h2>
      <div className="form-fields" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
        {/* Если редактирование — статус и цена первыми */}
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
        {/* Название проекта */}
        <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
          <input
            type="text"
            id="project-name"
            autoComplete="off"
            placeholder=" "
            value={projectName}
            onChange={e => {
              setProjectName(e.target.value);
              const rest = { ...errors };
              delete rest.projectName;
              setErrors(rest);
            }}
            required
            style={{ width: '100%', paddingRight: 12, background: changedFields.has('name') ? '#fffbe6' : undefined }}
          />
          <label htmlFor="project-name" style={{ left: 12 }}>Название проекта *</label>
          {errors.projectName && <div style={{ color: 'red', fontSize: 13 }}>{errors.projectName}</div>}
        </div>
        {/* Конфигурация */}
        <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
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
                onChange={e => {
                  setGlassColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassColor;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setGlassThickness(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassThickness;
                  setErrors(rest);
                }}
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
                className={`glass-size-input ${width ? 'filled' : ''}`}
                placeholder=" "
                value={width}
                onChange={e => {
                  setWidth(e.target.value);
                  const rest = { ...errors };
                  delete rest.width;
                  setErrors(rest);
                }}
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
                className={`glass-size-input ${height ? 'filled' : ''}`}
                placeholder=" "
                value={height}
                onChange={e => {
                  setHeight(e.target.value);
                  const rest = { ...errors };
                  delete rest.height;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setHardwareColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.hardwareColor;
                  setErrors(rest);
                }}
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
                {projectHardware.map((hw, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      <QuantityControl
                        value={hw.quantity}
                        onChange={v => setProjectHardware(list => list.map((item, i) => i === idx ? { ...item, quantity: v } : item))}
                      />
                      <button
                        onClick={() => setProjectHardware(list => list.filter((_, i) => i !== idx))}
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
                onChange={e => {
                  setGlassColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassColor;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setGlassThickness(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassThickness;
                  setErrors(rest);
                }}
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
          {/* Радиокнопки: Размеры проёма / Размеры стекла (в одну строку) */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', margin: '8px 0 0 0' }}>
            <label style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="sizeType" value="opening" checked={!showGlassSizes} onChange={() => setShowGlassSizes(false)} /> Размеры проёма
            </label>
            <label style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="sizeType" value="glass" checked={showGlassSizes} onChange={() => setShowGlassSizes(true)} /> Нестандартная дверь
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
                  onChange={e => {
                    setStationaryWidth(e.target.value);
                    const rest = { ...errors };
                    delete rest.stationaryWidth;
                    setErrors(rest);
                  }}
                  required
                  style={{ width: '100%', background: changedFields.has('stationaryWidth') ? '#fffbe6' : undefined }}
                />
                <label htmlFor="stat-width" style={{ fontSize: 11 }}>Ширина проема (мм)</label>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="door-width"
                  placeholder=" "
                  value={doorWidth}
                  onChange={e => {
                    setDoorWidth(e.target.value);
                    const rest = { ...errors };
                    delete rest.doorWidth;
                    setErrors(rest);
                  }}
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
                  onChange={e => {
                    setHeight(e.target.value);
                    const rest = { ...errors };
                    delete rest.height;
                    setErrors(rest);
                  }}
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
                  onChange={e => {
                    setWidth(e.target.value);
                    const rest = { ...errors };
                    delete rest.width;
                    setErrors(rest);
                  }}
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
                  onChange={e => {
                    setHeight(e.target.value);
                    const rest = { ...errors };
                    delete rest.height;
                    setErrors(rest);
                  }}
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
                onChange={e => {
                  setHardwareColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.hardwareColor;
                  setErrors(rest);
                }}
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
                {projectHardware.map((hw, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      <QuantityControl
                        value={hw.quantity}
                        onChange={v => setProjectHardware(list => list.map((item, i) => i === idx ? { ...item, quantity: v } : item))}
                      />
                      <button
                        onClick={() => setProjectHardware(list => list.filter((_, i) => i !== idx))}
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
                onChange={e => {
                  setWidth(e.target.value);
                  const rest = { ...errors };
                  delete rest.width;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setLength(e.target.value);
                  const rest = { ...errors };
                  delete rest.length;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setHeight(e.target.value);
                  const rest = { ...errors };
                  delete rest.height;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setGlassColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassColor;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setGlassThickness(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassThickness;
                  setErrors(rest);
                }}
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
                onChange={e => {
                  setHardwareColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.hardwareColor;
                  setErrors(rest);
                }}
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
                {projectHardware.map((hw, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      <QuantityControl
                        value={hw.quantity}
                        onChange={v => setProjectHardware(list => list.map((item, i) => i === idx ? { ...item, quantity: v } : item))}
                      />
                      <button
                        onClick={() => setProjectHardware(list => list.filter((_, i) => i !== idx))}
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
          {uniqueGlasses.map((glass, idx) => (
            <div key={idx} style={{ marginBottom: 20, position: 'relative', background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input
                    type="text"
                    id={`glass-name-${idx}`}
                    className={glass.name ? 'filled' : ''}
                    value={glass.name}
                    placeholder=" "
                    onChange={e => handleGlassChange(idx, 'name', e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <label htmlFor={`glass-name-${idx}`}>Название стекла</label>
                </div>
                {uniqueGlasses.length > 1 && (
                  <button type="button" onClick={() => handleRemoveGlass(idx)} style={{ color: '#e53935', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginLeft: 4, marginTop: 8 }} title="Удалить стекло">×</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 0 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <select
                    id={`glass-color-${idx}`}
                    className={glass.color ? 'filled' : ''}
                    value={glass.color}
                    onChange={e => handleGlassChange(idx, 'color', e.target.value)}
                    style={{ width: '100%' }}>
                    <option value="" disabled hidden></option>
                    {glassColors.map(color => <option key={color} value={color}>{color}</option>)}
                  </select>
                  <label htmlFor={`glass-color-${idx}`}>Цвет стекла</label>
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <select
                    id={`glass-thickness-${idx}`}
                    className={glass.thickness ? 'filled' : ''}
                    value={glass.thickness}
                    onChange={e => handleGlassChange(idx, 'thickness', e.target.value)}
                    style={{ width: '100%' }}>
                    <option value="" disabled hidden></option>
                    {GLASS_THICKNESS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <label htmlFor={`glass-thickness-${idx}`}>Толщина стекла</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 0 }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input
                    type="number"
                    id={`glass-width-${idx}`}
                    className={`glass-size-input ${glass.width ? 'filled' : ''}`}
                    value={glass.width}
                    placeholder=" "
                    onChange={e => handleGlassChange(idx, 'width', e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <label htmlFor={`glass-width-${idx}`}>Ширина (мм)</label>
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input
                    type="number"
                    id={`glass-height-${idx}`}
                    className={`glass-size-input ${glass.height ? 'filled' : ''}`}
                    value={glass.height}
                    placeholder=" "
                    onChange={e => handleGlassChange(idx, 'height', e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <label htmlFor={`glass-height-${idx}`}>Высота (мм)</label>
                </div>
              </div>
              {uniqueGlassErrors[idx]?.name && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].name}</div>}
              {uniqueGlassErrors[idx]?.color && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].color}</div>}
              {uniqueGlassErrors[idx]?.thickness && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].thickness}</div>}
              {uniqueGlassErrors[idx]?.width && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].width}</div>}
              {uniqueGlassErrors[idx]?.height && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].height}</div>}
            </div>
          ))}
          <button
            type="button"
            style={{
              background: '#fff',
              color: '#646cff',
              border: '2px solid #646cff',
              borderRadius: 8,
              padding: '10px 12px',
              fontWeight: 600,
              fontSize: 16,
              marginTop: 4,
              width: '100%',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              display: 'block'
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#f5f6ff')}
            onMouseOut={e => (e.currentTarget.style.background = '#fff')}
            onClick={handleAddGlass}
            disabled={
              uniqueGlasses.length >= 10 ||
              uniqueGlasses.some(glass =>
                !glass.name?.trim() ||
                !glass.color?.trim() ||
                !glass.thickness?.trim() ||
                !glass.width?.toString().trim() ||
                !glass.height?.toString().trim()
              )
            }
          >ДОБАВИТЬ СТЕКЛО</button>
          <div style={{ marginTop: 20 }}>
            <AddHardwareButton
              onClick={() => setShowAddHardwareDialog(true)}
              disabled={false}
            />
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
          Монтаж
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: changedFields.has('dismantling') ? '#fffbe6' : undefined, borderRadius: 4, padding: '2px 4px' }}>
          <input type="checkbox" checked={dismantling} onChange={e => setDismantling(e.target.checked)} />
          Демонтаж
        </label>
      </div>
      {/* Комментарий */}
      <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
        <textarea
          id="comment"
          placeholder="Комментарий"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ width: '100%', minHeight: 48, resize: 'vertical', borderRadius: 8, border: '1px solid #ccc', padding: 8, fontSize: 15, marginTop: 8 }}
        />
      </div>
      {/* Кнопки действий */}
      <div className="form-actions" style={{ display: 'flex', gap: 16, margin: '12px 0 0 0' }}>
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
          disabled={!!selectedProject && changedFields.size === 0}
          onClick={handleSaveProject}
        >
          СОХРАНИТЬ
        </button>
      </div>
      {/* История изменения статусов */}
      {selectedProject && Array.isArray(selectedProject.statusHistory) && selectedProject.statusHistory.length > 0 && (() => {
        const statusHistory = selectedProject.statusHistory || [];
        return (
          <div style={{ marginTop: 18, background: '#f8f8f8', borderRadius: 8, padding: 12, border: '1px solid #e0e0e0' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>История изменения статусов:</div>
            {statusHistory.map((sh, idx) => (
              <div key={idx} style={{ color: idx === statusHistory.length - 1 ? '#1976d2' : '#888', fontSize: 15, marginBottom: 2, fontWeight: idx === statusHistory.length - 1 ? 600 : 400 }}>
                {sh.status} <span style={{ fontSize: 13, marginLeft: 8 }}>{new Date(sh.date).toLocaleString()}</span>
                {idx === 0 && <span style={{ color: '#aaa', fontSize: 13, marginLeft: 8 }}>(первоначальный)</span>}
                {idx === statusHistory.length - 1 && <span style={{ color: '#1976d2', fontSize: 13, marginLeft: 8 }}>(текущий)</span>}
              </div>
            ))}
          </div>
        );
      })()}
      {showAddHardwareDialog && (
        <AddHardwareDialog
          hardwareList={hardwareList}
          onSave={selected => {
            setProjectHardware(list => [...list, ...selected]);
            setShowAddHardwareDialog(false);
          }}
          onClose={() => setShowAddHardwareDialog(false)}
          projectHardware={projectHardware}
        />
      )}
      {/* Сообщение о незаполненных полях стекла */}
      {hasEmptyGlassField && (
        <div style={{ color: 'red', fontWeight: 600, marginBottom: 8 }}>
          Заполните все поля стекла
        </div>
      )}
      <style>{`
        .calculator-form-root {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 4px #0001;
          padding: 24px;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .calculator-form-root .form-group,
        .calculator-form-root input,
        .calculator-form-root select,
        .calculator-form-root textarea {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .calculator-form-root {
            padding: 8px !important;
            max-width: 100% !important;
            border-radius: 8px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          }
          .form-actions {
            order: 99;
            margin-top: 12px !important;
            margin-bottom: 0 !important;
          }
        }
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
        /* Скрыть стрелки у размеров стекла */
        .glass-size-input::-webkit-outer-spin-button,
        .glass-size-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .glass-size-input {
          -moz-appearance: textfield;
        }
        .calculator-form-root h2 {
          margin: 0 0 12px 0 !important;
        }
        .form-actions {
          margin-top: 12px !important;
        }
      `}</style>
      {saveStatus === 'success' && <div style={{ color: 'green', marginBottom: 8 }}>Проект успешно сохранён!</div>}
      {saveStatus === 'error' && <div style={{ color: 'red', marginBottom: 8 }}>Ошибка при сохранении проекта</div>}
      {errors.company && <div style={{ color: 'red', fontSize: 13, marginTop: 8 }}>{errors.company}</div>}
    </div>
  );
};

export default CalculatorForm; 