import React, { useState, useEffect } from 'react';
import AddHardwareButton from './AddHardwareButton';
import AddHardwareDialog, { type HardwareDialogItem, type HardwareItem } from './AddHardwareDialog';
import { QuantityControl } from './AddHardwareDialog';
import type { User } from '../types/User';
import type { DraftProjectData } from './CalculationDetails';
import type { Project } from './ProjectHistory';
import { API_URL as BASE_API_URL, updateProjectStatus, updateProject } from '../utils/api';
import { fetchWithAuth } from '../utils/auth';
import AddServiceDialog, { type ServiceItem as DialogServiceItem } from './AddServiceDialog';

interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

interface GlassConfig {
  name: string;
  type: 'stationary' | 'swing_door' | 'sliding_door';
}

interface Template {
  _id: string;
  name: string;
  type: string;
  description?: string;
  fields: TemplateField[];
  glassConfig?: GlassConfig[];
  customColorOption: boolean;
  exactHeightOption?: boolean;
  defaultGlassColor?: string;
  defaultGlassThickness?: string;
  defaultHardware: string[];
  defaultServices: string[];
  sizeAdjustments?: {
    doorHeightReduction: number;
    thresholdReduction: number;
  };
  isSystem?: boolean;
}

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

interface Settings {
  currency: string;
  usdRate: string;
  rrRate: string;
  showUSD: boolean;
  showRR: boolean;
  baseCosts: { id: string; name: string; value: number }[];
  baseIsPercent: boolean;
  basePercentValue: number;
  customColorSurcharge?: number;
  baseCostMode?: 'fixed' | 'percentage';
  baseCostPercentage?: number;
  glassList?: { color: string; thickness?: string; thickness_mm?: number; price: number; companyId: string }[];
  hardwareList?: { _id?: string; name: string; price: number; companyId?: string }[];
  statusList?: { _id: string; name: string; color: string; order: number }[]; // Добавляем статусы
}

interface CalculatorFormProps {
  companyId?: string;
  user?: User | null;
  selectedCompanyId?: string;
  settings?: Settings | null; // Добавляем проп для передачи данных
  isLoadingData?: boolean; // Добавляем состояние загрузки
  onChangeDraft?: (draft: DraftProjectData) => void;
  selectedProject?: Project;
  onNewProject?: (project?: Project) => void;
  totalPrice?: number;
}

const CalculatorForm: React.FC<CalculatorFormProps> = ({ companyId, user, selectedCompanyId = '', settings: propsSettings, isLoadingData, onChangeDraft, selectedProject, onNewProject, totalPrice }) => {
  const [projectName, setProjectName] = useState('');
  const [customer, setCustomer] = useState('');
  const [config, setConfig] = useState('');
  const [draftConfig, setDraftConfig] = useState(config);
  const [glassColors, setGlassColors] = useState<string[]>([]);
  const [glassColor, setGlassColor] = useState('');
  const [glassThickness, setGlassThickness] = useState('10');
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
    { name: 'Стекло 1', color: 'прозрачный', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
  ]);
  const [uniqueGlassErrors, setUniqueGlassErrors] = useState<{ [idx: number]: { [field: string]: string } }>({});
  const [dismantling, setDismantling] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [selectedServices, setSelectedServices] = useState<DialogServiceItem[]>([]);
  const [serviceList, setServiceList] = useState<DialogServiceItem[]>([]);
  const [customColor, setCustomColor] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateFields, setTemplateFields] = useState<{ [key: string]: string }>({});
  const [templateGlasses, setTemplateGlasses] = useState<{[glassIndex: number]: {width: string, height: string, hasThreshold?: boolean}}>({});
  // resolvedCompanyId больше не нужен, используем selectedCompanyId
  const effectiveCompanyId = user?.role === 'superadmin' ? selectedCompanyId : (companyId || localStorage.getItem('companyId') || '');

  // При выборе проекта для редактирования — заполняем поля
  useEffect(() => {
    if (selectedProject) {
      setProjectName(selectedProject.name || '');
      setCustomer(selectedProject.customer || '');
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
      const projectStatus = selectedProject.statusId?.name || selectedProject.status || 'Рассчет';
      console.log('🔄 Setting initial status:', { 
        projectStatus, 
        fromStatusId: selectedProject.statusId?.name,
        fromStatus: selectedProject.status,
        availableStatuses: propsSettings?.statusList?.map(s => s.name) || []
      });
      setStatus(projectStatus);
      setCustomColor(selectedProject.data?.customColor || false);
      setStationarySize(selectedProject.data?.stationarySize || '');
      setDoorSize(selectedProject.data?.doorSize || '');
      setExactHeight(selectedProject.data?.exactHeight || false);
      setManualPrice(undefined);
      // Для уникальной конфигурации — заполняем uniqueGlasses
      if (selectedProject.data?.uniqueGlasses && Array.isArray(selectedProject.data.uniqueGlasses)) {
        setUniqueGlasses(selectedProject.data.uniqueGlasses);
      } else {
        setUniqueGlasses([
          { name: 'Стекло 1', color: 'прозрачный', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
        ]);
      }
      setUniqueGlassErrors({});
      // Загружаем услуги проекта
      if (selectedProject.data?.projectServices && Array.isArray(selectedProject.data.projectServices)) {
        setSelectedServices(selectedProject.data.projectServices);
      } else {
        // Если у проекта нет услуг, оставляем пустой список
        setSelectedServices([]);
      }
      
      // Загружаем данные шаблона если это шаблонная конфигурация
      if (selectedProject.data?.templateFields && typeof selectedProject.data.templateFields === 'object') {
        setTemplateFields(selectedProject.data.templateFields);
      } else {
        setTemplateFields({});
      }
      
      if (selectedProject.data?.templateGlasses && typeof selectedProject.data.templateGlasses === 'object') {
        setTemplateGlasses(selectedProject.data.templateGlasses);
      } else {
        setTemplateGlasses({});
      }
      
      // Загружаем шаблон если конфигурация шаблонная
      if (selectedProject.data?.config && selectedProject.data.config.startsWith('template-')) {
        const templateId = selectedProject.data.config.replace('template-', '');
        fetchWithAuth(`${BASE_API_URL}/templates/${templateId}`)
          .then(res => res.json())
          .then(template => {
            setSelectedTemplate(template);
            
            // Устанавливаем дефолтные значения если они еще не установлены
            if (template.defaultGlassColor && !selectedProject.data?.glassColor) {
              setGlassColor(template.defaultGlassColor);
            }
            if (template.defaultGlassThickness && !selectedProject.data?.glassThickness) {
              setGlassThickness(template.defaultGlassThickness);
            }
            if (template.exactHeightOption && selectedProject.data?.exactHeight === undefined) {
              setExactHeight(false); // Дефолтное значение для опции
            }
          })
          .catch(() => {
            console.error('Ошибка загрузки шаблона при редактировании проекта');
            setSelectedTemplate(null);
          });
      } else {
        setSelectedTemplate(null);
      }
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
  }, [selectedProject, serviceList]);

  // Используем переданные данные вместо загрузки
  useEffect(() => {
    if (propsSettings) {
      console.log('CalculatorForm: используем переданные данные', propsSettings);
      console.log('📊 Status list from settings:', propsSettings.statusList);
      
      // ОТЛАДКА: проверяем структуру glassList
      console.log('🔍 ОТЛАДКА glassList:', propsSettings.glassList);
      console.log('🔍 ОТЛАДКА glassList Array?:', Array.isArray(propsSettings.glassList));
      if (Array.isArray(propsSettings.glassList)) {
        console.log('🔍 ОТЛАДКА glassList.length:', propsSettings.glassList.length);
        propsSettings.glassList.forEach((glass, index) => {
          console.log(`🔍 ОТЛАДКА glass[${index}]:`, glass);
        });
      }
      
      // Преобразуем данные hardwareList чтобы добавить _id если его нет
      const hardwareData = Array.isArray(propsSettings.hardwareList) 
        ? propsSettings.hardwareList.map((item, index) => ({
            _id: item._id || `temp-${index}`,
            name: item.name,
            price: item.price,
            companyId: item.companyId
          }))
        : [];
      setHardwareList(hardwareData);
      
      // Собираем уникальные цвета стекла для выпадающего списка - ИСПРАВЛЕННАЯ ВЕРСИЯ
      let uniqueColors: string[] = [];
      if (Array.isArray(propsSettings.glassList) && propsSettings.glassList.length > 0) {
        const colors = propsSettings.glassList
          .map((glass: { color: string; thickness?: string; thickness_mm?: number; price: number; companyId: string }) => {
            console.log('🔍 Обрабатываем glass:', glass, 'color:', glass?.color);
            return glass?.color;
          })
          .filter((color: string | undefined) => {
            const isValid = color && typeof color === 'string' && color.trim() !== '';
            console.log('🔍 Color valid?', color, '→', isValid);
            return isValid;
          }) as string[];
        
        uniqueColors = Array.from(new Set(colors));
        console.log('🔍 Все цвета после фильтрации:', colors);
        console.log('🔍 Уникальные цвета:', uniqueColors);
      } else {
        console.log('🔍 glassList пустой или не массив');
      }
      
      console.log('🔍 ФИНАЛЬНЫЕ uniqueColors:', uniqueColors);
      setGlassColors(uniqueColors);
      
      if (uniqueColors.length > 0) {
        setGlassColor(uniqueColors[0]);
        console.log('🔍 Установлен первый цвет:', uniqueColors[0]);
      } else {
        setGlassColor('');
        console.log('🔍 НЕТ ЦВЕТОВ - устанавливаем пустую строку');
      }
    } else {
      console.log('CalculatorForm: данные еще не загружены');
      setHardwareList([]);
      setGlassColors([]);
      setGlassColor('');
    }
  }, [propsSettings]);

  // Получение списка услуг для компании
  useEffect(() => {
    if (!effectiveCompanyId) return;
    fetchWithAuth(`${BASE_API_URL}/services?companyId=${effectiveCompanyId}`)
      .then(res => res.json())
      .then(data => {
        const list: DialogServiceItem[] = (Array.isArray(data) ? data : []).map((s: { serviceId?: string; name: string; price: number }) => ({
          serviceId: s.serviceId || s.name,
          name: s.name,
          price: s.price
        }));
        setServiceList(list);
        
        // При загрузке списка услуг НЕ добавляем автоматически никакие услуги
        // Пользователь должен выбрать их сам через кнопку "Добавить услугу"
      })
      .catch(() => setServiceList([]));
  }, [effectiveCompanyId, selectedProject]);

  // Загрузка шаблонов конфигураций
  useEffect(() => {
    if (!effectiveCompanyId) return;
    fetchWithAuth(`${BASE_API_URL}/templates/active?companyId=${effectiveCompanyId}`)
      .then(res => res.json())
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => setTemplates([]));
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
        projectServices: selectedServices,
        customColor,
        selectedTemplate: draftConfig.startsWith('template-') ? selectedTemplate : undefined,
        templateFields: draftConfig.startsWith('template-') ? templateFields : undefined,
        templateGlasses: draftConfig.startsWith('template-') ? templateGlasses : undefined,
      });
    }
  }, [onChangeDraft, draftConfig, projectName, glassColor, glassThickness, hardwareColor, width, height, length, comment, delivery, installation, dismantling, projectHardware, showGlassSizes, stationarySize, doorSize, stationaryWidth, doorWidth, exactHeight, uniqueGlasses, selectedServices, customColor, selectedTemplate, templateFields, templateGlasses]);

  // useEffect для синхронизации draft
  React.useEffect(() => {
    updateDraft();
  }, [updateDraft]);

  useEffect(() => {
    if (!selectedProject) return;
    const fields = [
      ['name', projectName, selectedProject.name || ''],
      ['customer', customer, selectedProject.customer || ''],
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
      ['status', status, selectedProject.statusId?.name || selectedProject.status || 'Рассчет'],
      ['manualPrice', manualPrice, selectedProject.price],
    ];
    const changed = new Set<string>();
    fields.forEach(([key, val, orig]) => {
      if (val !== orig) changed.add(key as string);
    });
    setChangedFields(changed);
  }, [projectName, customer, config, glassColor, glassThickness, hardwareColor, width, height, length, comment, delivery, installation, dismantling, status, manualPrice, selectedProject]);

  // 1. Универсальный сброс всех полей к дефолтным значениям
  const resetAllFields = (preserveName = false) => {
    if (!preserveName) setProjectName('');
    setCustomer('');
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
      { name: 'Стекло 1', color: 'прозрачный', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
    ]);
    setUniqueGlassErrors({});
    setDismantling(false);
    setSelectedServices([]); // Сбрасываем услуги полностью
    setCustomColor(false);
    setSelectedTemplate(null); // Сбрасываем выбранный шаблон
    setTemplateFields({}); // Очищаем поля шаблона
    setTemplateGlasses({}); // Очищаем данные стекол
  };

  // 2. При смене конфигурации — сброс всех полей, кроме projectName
  // Функция загрузки дефолтов из системного шаблона
  const loadSystemTemplateDefaults = async (configType: string) => {
    // Сопоставляем типы конфигураций с типами шаблонов
    const configTypeMapping: { [key: string]: string } = {
      'glass': 'glass',
      'straight': 'straight',
      'straight-glass': 'straight',
      'straight-opening': 'straight',
      'corner': 'corner',
      'unique': 'unique',
      'partition': 'partition'
    };

    const templateType = configTypeMapping[configType];
    if (!templateType || !effectiveCompanyId) {
      // Если нет соответствующего типа шаблона, очищаем фурнитуру и услуги
      setProjectHardware([]);
      setSelectedServices([]);
      return;
    }

    try {
      // Получаем системные шаблоны для компании
      const res = await fetchWithAuth(`${BASE_API_URL}/templates/system?companyId=${effectiveCompanyId}`);
      if (!res.ok) {
        console.warn('Не удалось загрузить системные шаблоны');
        setProjectHardware([]);
        setSelectedServices([]);
        return;
      }

      const systemTemplates = await res.json();
      const systemTemplate = Array.isArray(systemTemplates) ? systemTemplates.find((t: { type: string }) => t.type === templateType) : null;

      if (systemTemplate) {
        // Устанавливаем дефолтную фурнитуру
        if (systemTemplate.defaultHardware && systemTemplate.defaultHardware.length > 0) {
          const defaultHw = systemTemplate.defaultHardware.map((name: string) => ({
            hardwareId: '',
            name,
            quantity: 1
          }));
          setProjectHardware(defaultHw);
        } else {
          setProjectHardware([]);
        }

        // Устанавливаем дефолтные услуги
        if (systemTemplate.defaultServices && systemTemplate.defaultServices.length > 0) {
          const defaultServices = systemTemplate.defaultServices.map((serviceName: string) => {
            const foundService = Array.isArray(serviceList) ? serviceList.find(s => s.name === serviceName) : null;
            return foundService || {
              serviceId: serviceName,
              name: serviceName,
              price: 0
            };
          });
          setSelectedServices(defaultServices);
        } else {
          setSelectedServices([]);
        }

        // Устанавливаем дефолтные значения стекла
        if (systemTemplate.defaultGlassColor) {
          setGlassColor(systemTemplate.defaultGlassColor);
        }
        if (systemTemplate.defaultGlassThickness) {
          setGlassThickness(systemTemplate.defaultGlassThickness);
        }

        // Устанавливаем опции
        if (systemTemplate.customColorOption) {
          setCustomColor(false); // Опция доступна, но не включена по умолчанию
        }
        if (systemTemplate.exactHeightOption) {
          setExactHeight(false); // Опция доступна, но не включена по умолчанию
        }
      } else {
        // Если системный шаблон не найден, используем дефолтные значения
        // (для обратной совместимости)
        const fallbackDefaults = getFallbackDefaults(configType);
        setProjectHardware(fallbackDefaults.hardware);
        setSelectedServices(fallbackDefaults.services);
      }
    } catch (error) {
      console.error('Ошибка загрузки системного шаблона:', error);
      // В случае ошибки используем дефолтные значения
      const fallbackDefaults = getFallbackDefaults(configType);
      setProjectHardware(fallbackDefaults.hardware);
      setSelectedServices(fallbackDefaults.services);
    }
  };

  // Фолбэк значения для обратной совместимости
  const getFallbackDefaults = (configType: string) => {
    const defaults = {
      hardware: [] as Array<{ hardwareId: string; name: string; quantity: number }>,
      services: [] as Array<{ serviceId: string; name: string; price: number }>
    };

    if (configType === 'glass') {
      defaults.hardware = [
        { hardwareId: '', name: 'Профиль', quantity: 1 },
        { hardwareId: '', name: 'Палка стена-стекло прямоугольная', quantity: 1 }
      ];
    } else if (["straight", "straight-glass", "straight-opening"].includes(configType)) {
      defaults.hardware = [
        { hardwareId: '', name: 'Профиль', quantity: 1 },
        { hardwareId: '', name: 'Раздвижная система', quantity: 1 },
        { hardwareId: '', name: 'Профильная труба (рельса)', quantity: 1 },
        { hardwareId: '', name: 'Уплотнитель F', quantity: 2 },
        { hardwareId: '', name: 'Уплотнитель A', quantity: 1 }
      ];
    } else if (configType === 'corner') {
      defaults.hardware = [
        { hardwareId: '', name: 'Профиль', quantity: 2 },
        { hardwareId: '', name: 'Раздвижная система', quantity: 2 },
        { hardwareId: '', name: 'Профильная труба (рельса)', quantity: 1 },
        { hardwareId: '', name: 'уголок турба-труба прямоугольное', quantity: 1 },
        { hardwareId: '', name: 'Уплотнитель F', quantity: 4 }
      ];
    } else if (configType === 'unique') {
      defaults.hardware = [
        { hardwareId: '', name: 'Профиль', quantity: 1 },
        { hardwareId: '', name: 'Крепеж', quantity: 1 }
      ];
    }

    return defaults;
  };

  const handleConfigChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setConfig(value);
    setDraftConfig(value);
    setChangedFields(fields => new Set(fields).add('config'));
    
    // Проверяем, выбран ли пользовательский шаблон
    if (value.startsWith('template-')) {
      const templateId = value.replace('template-', '');
      const template = Array.isArray(templates) ? templates.find(t => t._id === templateId) : null;
      
      if (template) {
        setSelectedTemplate(template);
        
        // Загружаем полную информацию о шаблоне
        fetchWithAuth(`${BASE_API_URL}/templates/${templateId}`)
          .then(res => res.json())
          .then(fullTemplate => {
            setSelectedTemplate(fullTemplate);
            
            // Устанавливаем дефолтные значения
            if (fullTemplate.customColorOption) {
              setCustomColor(false); // Пользователь может выбрать сам
            }
            if (fullTemplate.exactHeightOption) {
              setExactHeight(false); // Пользователь может выбрать сам
            }
            
            // Устанавливаем дефолтный цвет и толщину стекла
            if (fullTemplate.defaultGlassColor) {
              setGlassColor(fullTemplate.defaultGlassColor);
            }
            if (fullTemplate.defaultGlassThickness) {
              setGlassThickness(fullTemplate.defaultGlassThickness);
            }
            
            // Инициализируем поля шаблона
            const initialFields: { [key: string]: string } = {};
            fullTemplate.fields.forEach((field: { name: string }) => {
              initialFields[field.name] = '';
            });
            setTemplateFields(initialFields);
            
            // Инициализируем данные стекол
            const initialGlasses: {[glassIndex: number]: {width: string, height: string, hasThreshold?: boolean}} = {};
            if (fullTemplate.glassConfig && Array.isArray(fullTemplate.glassConfig)) {
              for (let index = 0; index < fullTemplate.glassConfig.length; index++) {
                initialGlasses[index] = { width: '', height: '', hasThreshold: false };
              }
            }
            setTemplateGlasses(initialGlasses);
            
            // Устанавливаем дефолтную фурнитуру если есть
            if (fullTemplate.defaultHardware && fullTemplate.defaultHardware.length > 0) {
              const defaultHw = fullTemplate.defaultHardware.map((name: string) => ({
                hardwareId: '',
                name,
                quantity: 1
              }));
              setProjectHardware(defaultHw);
            } else {
              setProjectHardware([]);
            }
            
            // Устанавливаем дефолтные услуги если есть
            if (fullTemplate.defaultServices && fullTemplate.defaultServices.length > 0) {
              const defaultServices = fullTemplate.defaultServices.map((serviceName: string) => {
                // Ищем услугу в списке serviceList по имени
                const foundService = Array.isArray(serviceList) ? serviceList.find(s => s.name === serviceName) : null;
                return foundService || {
                  serviceId: serviceName,
                  name: serviceName,
                  price: 0 // Если не найдена, устанавливаем цену 0
                };
              });
              setSelectedServices(defaultServices);
            } else {
              setSelectedServices([]);
            }
          })
          .catch(() => {
            console.error('Ошибка загрузки шаблона');
            setSelectedTemplate(null);
          });
      }
      return;
    } else {
      // Обычная конфигурация - сбрасываем шаблон
      setSelectedTemplate(null);
      setTemplateFields({});
    }
    
    // Установить дефолтные значения для конфигурации "Перегородка"
    if (value === 'partition') {
      setGlassColor('прозрачный');
      setGlassThickness('10');
    }
    
    // При смене конфигурации НЕ добавляем автоматически услуги
    // Пользователь должен выбрать их сам
    
    // Загружаем дефолтную фурнитуру и услуги из системного шаблона
    loadSystemTemplateDefaults(value);
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



  // Валидация формы
  const validateForm = () => {
          const newErrors: { [key: string]: string } = {};
      if (!projectName.trim()) newErrors.projectName = 'Укажите имя проекта';
      if (!customer.trim()) newErrors.customer = 'Укажите заказчика';
      if (!config) newErrors.config = 'Выберите конфигурацию';
    if (!glassColor) newErrors.glassColor = 'Выберите цвет стекла';
    if (!glassThickness) newErrors.glassThickness = 'Выберите толщину стекла';
    // Размеры
    if (config === 'glass' || config === 'unique' || config === 'corner' || config === 'partition') {
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
    
    // Валидация полей шаблона
    if (selectedTemplate && config.startsWith('template-')) {
      selectedTemplate.fields?.forEach((field: TemplateField) => {
        if (field.required && !templateFields[field.name]?.trim()) {
          newErrors[`templateField_${field.name}`] = `${field.label} обязательно для заполнения`;
        }
      });
      
      // Валидация стекол шаблона
      if (selectedTemplate.glassConfig && Array.isArray(selectedTemplate.glassConfig)) {
        selectedTemplate.glassConfig.forEach((glassConf: GlassConfig, glassIndex: number) => {
          const glassData = templateGlasses[glassIndex];
          if (!glassData?.width?.trim()) {
            newErrors[`templateGlass_${glassIndex}_width`] = `Ширина для ${glassConf.name} обязательна`;
          }
          if (!glassData?.height?.trim()) {
            newErrors[`templateGlass_${glassIndex}_height`] = `Высота для ${glassConf.name} обязательна`;
          }
        });
      }
    }
    
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
    setIsSubmitted(true);
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
    
    // Находим statusId по названию статуса
    const selectedStatus = propsSettings?.statusList?.find(s => s.name === status);
    const statusId = selectedStatus?._id;
    
    console.log('🎯 Status data:', { 
      status, 
      statusId, 
      selectedStatus, 
      statusList: propsSettings?.statusList?.map(s => ({ _id: s._id, name: s.name })),
      statusListLength: propsSettings?.statusList?.length || 0,
      currentProjectStatus: selectedProject?.status,
      currentProjectStatusId: selectedProject?.statusId,
      isValidObjectId: statusId ? /^[0-9a-fA-F]{24}$/.test(statusId) : 'N/A'
    });
    
    // Проверяем, что статус найден для редактирования проекта
    if (selectedProject && !statusId && status) {
      console.error('❌ Status not found in statusList:', status);
      setErrors({ global: `Статус "${status}" не найден. Пожалуйста, выберите действительный статус.` });
      setSaveStatus('error');
      return;
    }
    
    // Для новых проектов - если нет statusId, используем только status
    // Сервер сам найдет соответствующий statusId
    
    // Собираем данные проекта
    const projectData = {
      name: projectName,
      customer,
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
        projectServices: selectedServices,
        customColor,
        selectedTemplate: selectedTemplate,
        templateFields: templateFields,
        templateGlasses: templateGlasses,
      },
      companyId: effectiveCompanyId,
      status,
      // Передаем statusId только если он найден и валиден
      ...(statusId ? { statusId } : {}),
      price: finalPrice,
      priceHistory: [
        { price: finalPrice, date: now }
      ],
    };

    console.log('📤 Sending project data:', JSON.stringify(projectData, null, 2));

    let savedProject;
    try {
      if (selectedProject && selectedProject._id) {
        // Проверяем, изменился ли только статус
        const onlyStatusChanged = changedFields.size === 1 && changedFields.has('status') && statusId;
        
        if (onlyStatusChanged) {
          console.log('🎯 Updating only status using special endpoint');
          // Используем специальный эндпоинт для обновления только статуса
          savedProject = await updateProjectStatus(selectedProject._id, statusId);
        } else {
          console.log('🔄 Updating full project data');
          // Используем обычное обновление проекта
          savedProject = await updateProject(selectedProject._id, projectData);
        }
        console.log('📞 Calling onNewProject with saved project:', savedProject?.name, savedProject?._id);
        if (typeof onNewProject === 'function') onNewProject(savedProject);
        if (savedProject) {
          setProjectName(savedProject.name || '');
          setCustomer(savedProject.customer || '');
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
              { name: 'Стекло 1', color: 'прозрачный', thickness: GLASS_THICKNESS[0]?.value || '', width: '', height: '' }
            ]);
          }
          setUniqueGlassErrors({});
          setCustomColor(savedProject.data?.customColor || false);
          
          // Восстановление полей шаблона
          if (savedProject.data?.selectedTemplate) {
            setSelectedTemplate(savedProject.data.selectedTemplate);
          } else {
            setSelectedTemplate(null);
          }
          
          if (savedProject.data?.templateFields && typeof savedProject.data.templateFields === 'object') {
            setTemplateFields(savedProject.data.templateFields);
          } else {
            setTemplateFields({});
          }
          
          // Восстановление выбранных услуг
          if (Array.isArray(savedProject.data?.projectServices)) {
            setSelectedServices(savedProject.data.projectServices);
          } else {
            setSelectedServices([]);
          }
          
          // Восстановление данных стекол шаблона
          if (savedProject.data?.templateGlasses && typeof savedProject.data.templateGlasses === 'object') {
            setTemplateGlasses(savedProject.data.templateGlasses);
          } else {
            setTemplateGlasses({});
          }
        }
      } else {
        // Новый проект: POST
        console.log('➕ Creating new project');
        const res = await fetchWithAuth(`${BASE_API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        if (!res.ok) throw new Error('Ошибка при сохранении проекта');
        savedProject = await res.json();
        console.log('📞 Calling onNewProject with new project:', savedProject?.name, savedProject?._id);
        if (typeof onNewProject === 'function') onNewProject(savedProject);
        resetAllFields();
        setSaveStatus('success');
      }
    } catch (e) {
      setSaveStatus('error');
      const errMsg = e instanceof Error ? e.message : 'Ошибка сохранения';
      setErrors({ global: errMsg });
      console.error('❌ Error saving project:', e);
    }
    
    // Устанавливаем финальные состояния только при успехе
    if (savedProject) {
      setSaveStatus('success');
      setChangedFields(new Set());
    }
  };

  const handleAddGlass = () => {
    if (uniqueGlasses.length < 10) {
      setUniqueGlasses(list => [...list, {
        name: `Стекло ${list.length + 1}`,
        color: 'прозрачный',
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

  // Обработчик изменения цвета фурнитуры
  const handleHardwareColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newColor = e.target.value;
    setHardwareColor(newColor);
    
    // Автоматически включаем чекбокс для золотого и крашеного цвета
    if (newColor === 'gold' || newColor === 'painted') {
      setCustomColor(true);
    }
    
    const rest = { ...errors };
    delete rest.hardwareColor;
    setErrors(rest);
  };

  // Показываем индикатор загрузки если данные еще не загружены
  if (isLoadingData) {
    return (
      <div className="calculator-form-root" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, width: '100%', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
          <div>Загрузка данных...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="calculator-form-root" style={{ padding: 24, width: '100%', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 16, color: '#000' }}>
        {selectedProject ? `Редактирование ${selectedProject.name || ''}` : 'Новый проект'}
      </h2>
      
      {/* Глобальная ошибка */}
      {errors.global && (
        <div style={{
          background: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          color: '#d32f2f',
          fontSize: 14
        }}>
          ⚠️ {errors.global}
        </div>
      )}
      
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
                {(propsSettings?.statusList || []).map(status => (
                  <option key={status._id} value={status.name}>{status.name}</option>
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
        {/* Заказчик */}
        <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
          <input
            type="text"
            id="customer"
            autoComplete="off"
            placeholder=" "
            value={customer}
            onChange={e => {
              setCustomer(e.target.value);
              const rest = { ...errors };
              delete rest.customer;
              setErrors(rest);
            }}
            style={{ width: '100%', paddingRight: 12, background: changedFields.has('customer') ? '#fffbe6' : undefined }}
          />
          <label htmlFor="customer" style={{ left: 12 }}>Заказчик</label>
          {errors.customer && <div style={{ color: 'red', fontSize: 13 }}>{errors.customer}</div>}
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
            <option value="glass">Стационарное стекло</option>
            <option value="straight">Прямая раздвижная</option>
            <option value="corner">Угловая раздвижная</option>
            <option value="unique">Уникальная конфигурация</option>
            <option value="partition">Перегородка</option>
            {templates.filter(template => !template.isSystem).length > 0 && (
              <optgroup label="Пользовательские шаблоны">
                {templates.filter(template => !template.isSystem).map(template => (
                  <option key={template._id} value={`template-${template._id}`}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )}
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
          {/* Цвет фурнитуры и чекбокс нестандартного цвета */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={handleHardwareColorChange}
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
              {/* Чекбокс нестандартного цвета */}
              <div style={{ display: 'flex', gap: 16, minWidth: 'fit-content', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={customColor}
                    onChange={e => setCustomColor(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span>Нестандартный цвет</span>
                </label>
              </div>
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
          {/* Цвет фурнитуры и чекбоксы нестандартного цвета и высоты */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={handleHardwareColorChange}
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
              {/* Чекбоксы нестандартного цвета и высоты в одной строке */}
              <div style={{ display: 'flex', gap: 16, minWidth: 'fit-content', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={customColor}
                    onChange={e => setCustomColor(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span>Нестандартный цвет</span>
                </label>
              </div>
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
          {/* Цвет фурнитуры и чекбоксы нестандартного цвета и высоты */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={handleHardwareColorChange}
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
              {/* Чекбокс нестандартного цвета */}
              <div style={{ display: 'flex', gap: 16, minWidth: 'fit-content', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={customColor}
                    onChange={e => setCustomColor(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span>Нестандартный цвет</span>
                </label>
              </div>
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
              {isSubmitted && uniqueGlassErrors[idx]?.name && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].name}</div>}
              {isSubmitted && uniqueGlassErrors[idx]?.color && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].color}</div>}
              {isSubmitted && uniqueGlassErrors[idx]?.thickness && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].thickness}</div>}
              {isSubmitted && uniqueGlassErrors[idx]?.width && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].width}</div>}
              {isSubmitted && uniqueGlassErrors[idx]?.height && <div style={{ color: 'red', fontSize: 13 }}>{uniqueGlassErrors[idx].height}</div>}
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
          
          {/* Цвет фурнитуры и чекбоксы нестандартного цвета и высоты */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={handleHardwareColorChange}
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
              {/* Чекбокс нестандартного цвета */}
              <div style={{ display: 'flex', gap: 16, minWidth: 'fit-content', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={customColor}
                    onChange={e => setCustomColor(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span>Нестандартный цвет</span>
                </label>
              </div>
            </div>
            <div style={{ marginTop: 0, marginBottom: 0 }}>
              <AddHardwareButton
                onClick={() => setShowAddHardwareDialog(true)}
                disabled={false}
              />
            </div>
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
        </>
      )}
      {config === 'partition' && (
        <>
          {/* Цвет стекла и толщина стекла */}
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
          
          {/* Цвет фурнитуры и чекбоксы нестандартного цвета и высоты */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <select
                  id="hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={handleHardwareColorChange}
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
              {/* Чекбокс нестандартного цвета */}
              <div style={{ display: 'flex', gap: 16, minWidth: 'fit-content', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={customColor}
                    onChange={e => setCustomColor(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  <span>Нестандартный цвет</span>
                </label>
              </div>
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
      {/* Пользовательский шаблон */}
      {selectedTemplate && config.startsWith('template-') && (
        <>
          {/* Цвет стекла и толщина для шаблона */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <select
                id="template-glass-color"
                className={glassColor ? 'filled' : ''}
                value={glassColor}
                onChange={e => {
                  setGlassColor(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassColor;
                  setErrors(rest);
                }}
                required
                style={{ width: '100%' }}
              >
                {glassColors.length > 0 && glassColors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
              <label htmlFor="template-glass-color">Цвет стекла *</label>
              {errors.glassColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassColor}</div>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <select
                id="template-glass-thickness"
                className={glassThickness ? 'filled' : ''}
                value={glassThickness}
                onChange={e => {
                  setGlassThickness(e.target.value);
                  const rest = { ...errors };
                  delete rest.glassThickness;
                  setErrors(rest);
                }}
                required
                style={{ width: '100%' }}
              >
                {GLASS_THICKNESS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <label htmlFor="template-glass-thickness">Толщина стекла *</label>
              {errors.glassThickness && <div style={{ color: 'red', fontSize: 13 }}>{errors.glassThickness}</div>}
            </div>
          </div>
          
          {/* Поля шаблона, сгруппированные по стеклам */}
          {selectedTemplate.fields && selectedTemplate.glassConfig && (() => {
            // Группируем поля по стеклам
            const glassesByIndex: { [key: number]: { width?: TemplateField; height?: TemplateField; glass?: GlassConfig } } = {};
            
            selectedTemplate.fields.forEach((field: TemplateField) => {
              const match = field.name.match(/^(width|height)_(\d+)$/);
              if (match) {
                const [, type, indexStr] = match;
                const index = parseInt(indexStr) - 1; // Преобразуем в 0-based индекс
                if (!glassesByIndex[index]) glassesByIndex[index] = {};
                glassesByIndex[index][type as 'width' | 'height'] = field;
                glassesByIndex[index].glass = selectedTemplate.glassConfig?.[index];
              }
            });

            return Object.entries(glassesByIndex).map(([indexStr, { width, height, glass }]) => {
              const index = parseInt(indexStr);
              if (!glass) return null;
              
              return (
                <div key={index} style={{ 
                  border: '2px solid #e1e7f0', 
                  borderRadius: 8, 
                  padding: 16, 
                  marginBottom: 12,
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {/* Заголовок стекла */}
                  <div style={{ marginBottom: 12 }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#333' }}>
                      {glass.name}
                    </h5>
                    <div style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {glass.type === 'stationary' && (
                        <>
                          <span style={{ color: '#2196f3', fontWeight: 600 }}>🔷</span>
                          <span>Стационарное стекло</span>
                        </>
                      )}
                      {glass.type === 'swing_door' && (
                        <>
                          <span style={{ color: '#ff9800', fontWeight: 600 }}>🔹</span>
                          <span>Дверь распашная</span>
                          <span style={{ color: '#888', marginLeft: 8 }}>
                            (-{selectedTemplate.sizeAdjustments?.doorHeightReduction || 8}мм по высоте)
                          </span>
                        </>
                      )}
                      {glass.type === 'sliding_door' && (
                        <>
                          <span style={{ color: '#4caf50', fontWeight: 600 }}>🔹</span>
                          <span>Дверь раздвижная</span>
                          <span style={{ color: '#888', marginLeft: 8 }}>
                            (-{selectedTemplate.sizeAdjustments?.doorHeightReduction || 8}мм по высоте)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Поля ширины и высоты */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    {width && (
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <input
                          type="number"
                          id={`template-field-${width.name}`}
                          className={templateGlasses[index]?.width ? 'filled' : ''}
                          placeholder=" "
                          value={templateGlasses[index]?.width || ''}
                          onChange={e => {
                            setTemplateGlasses(prev => ({
                              ...prev,
                              [index]: { ...(prev[index] || { width: '', height: '' }), width: e.target.value }
                            }));
                            const rest = { ...errors };
                            delete rest[`templateField_${width.name}`];
                            setErrors(rest);
                          }}
                          required={width.required}
                          style={{ fontSize: 15, fontWeight: 500 }}
                        />
                        <label htmlFor={`template-field-${width.name}`} style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>
                          {width.label}{width.required ? ' *' : ''}
                        </label>
                        {errors[`templateField_${width.name}`] && (
                          <div style={{ color: 'red', fontSize: 13 }}>
                            {errors[`templateField_${width.name}`]}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {height && (
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <input
                          type="number"
                          id={`template-field-${height.name}`}
                          className={templateGlasses[index]?.height ? 'filled' : ''}
                          placeholder=" "
                          value={templateGlasses[index]?.height || ''}
                          onChange={e => {
                            setTemplateGlasses(prev => ({
                              ...prev,
                              [index]: { ...(prev[index] || { width: '', height: '' }), height: e.target.value }
                            }));
                            const rest = { ...errors };
                            delete rest[`templateField_${height.name}`];
                            setErrors(rest);
                          }}
                          required={height.required}
                          style={{ fontSize: 15, fontWeight: 500 }}
                        />
                        <label htmlFor={`template-field-${height.name}`} style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>
                          {height.label}{height.required ? ' *' : ''}
                        </label>
                        {errors[`templateField_${height.name}`] && (
                          <div style={{ color: 'red', fontSize: 13 }}>
                            {errors[`templateField_${height.name}`]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Опция порожка только для распашной двери */}
                  {glass.type === 'swing_door' && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, marginBottom: 4, color: '#333' }}>Порожек:</div>
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                          <input
                            type="radio"
                            name={`threshold-${index}`}
                            checked={!(templateGlasses[index]?.hasThreshold || false)}
                            onChange={() => {
                              setTemplateGlasses(prev => ({
                                ...prev,
                                [index]: { ...(prev[index] || { width: '', height: '' }), hasThreshold: false }
                              }));
                            }}
                          />
                          Без порожка
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                          <input
                            type="radio"
                            name={`threshold-${index}`}
                            checked={templateGlasses[index]?.hasThreshold || false}
                            onChange={() => {
                              setTemplateGlasses(prev => ({
                                ...prev,
                                [index]: { ...(prev[index] || { width: '', height: '' }), hasThreshold: true }
                              }));
                            }}
                          />
                          С порожком
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Информация об автоматических корректировках */}
                  {glass.type === 'swing_door' && (
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 11, 
                      color: '#666', 
                      fontStyle: 'italic',
                      padding: '4px 8px',
                      background: '#f8f9fa',
                      borderRadius: 4,
                      border: '1px solid #e5e7eb'
                    }}>
                      Автоматически: высота уменьшена на {selectedTemplate.sizeAdjustments?.doorHeightReduction || 8}мм
                      {templateGlasses[index]?.hasThreshold && 
                        ` + ${selectedTemplate.sizeAdjustments?.thresholdReduction || 15}мм для порожка`
                      }
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean);
          })()}





          {/* Цвет фурнитуры и чекбокс нестандартного цвета */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <select
                  id="template-hardware-color"
                  className={hardwareColor ? 'filled' : ''}
                  value={hardwareColor}
                  onChange={handleHardwareColorChange}
                  required
                  style={{ width: '100%' }}
                >
                  {HARDWARE_COLORS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label htmlFor="template-hardware-color">Цвет фурнитуры *</label>
                {errors.hardwareColor && <div style={{ color: 'red', fontSize: 13 }}>{errors.hardwareColor}</div>}
              </div>
              {/* Чекбокс нестандартного цвета */}
              <div style={{ display: 'flex', gap: 16, minWidth: 'fit-content', marginBottom: '16px' }}>
                {/* Чекбокс нестандартного цвета если включено в шаблоне */}
                {selectedTemplate.customColorOption && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={customColor}
                      onChange={e => setCustomColor(e.target.checked)}
                      style={{ width: 14, height: 14 }}
                    />
                    <span>Нестандартный цвет</span>
                  </label>
                )}

              </div>
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
      {config && (
        <button
          type="button"
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fff',
            color: '#646cff',
            border: '2px solid #646cff',
            fontWeight: 600,
            fontSize: 16,
            cursor: showAddServiceDialog ? 'not-allowed' : 'pointer',
            marginTop: 12,
            width: '100%',
            opacity: showAddServiceDialog ? 0.5 : 1,
          }}
          onClick={() => setShowAddServiceDialog(true)}
          disabled={showAddServiceDialog}
        >
          ДОБАВИТЬ УСЛУГУ
        </button>
      )}
      {showAddServiceDialog && (
        <AddServiceDialog
          serviceList={serviceList}
          projectServices={selectedServices}
          onSave={selected => { setSelectedServices(selected); setShowAddServiceDialog(false); }}
          onClose={() => setShowAddServiceDialog(false)}
        />
      )}
      {selectedServices.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          {selectedServices.map((service, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
              <span style={{ flex: 1, minWidth: 0 }}>{service.name}</span>
              <button
                onClick={() => setSelectedServices(list => list.filter((_, i) => i !== idx))}
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
          ))}
        </div>
      )}
      {/* Комментарий */}
      <div className="form-group" style={{ width: '100%', marginLeft: 0, marginRight: 0 }}>
        <textarea
          id="comment"
          placeholder="Комментарий"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ width: '105%', minHeight: 60, resize: 'vertical', borderRadius: 8, border: '1px solid #ccc', padding: 8, fontSize: 15, marginTop: 8 }}
        />
      </div>

      {/* Кнопка сохранения */}
      <div className="form-actions" style={{ margin: '12px 0 0 0' }}>
        <button
          style={{
            width: '100%',
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
      <style>{`
        .calculator-form-root {
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
        @media (max-width: 768px) {
          .calculator-form-root {
            width: 100vw !important;
            max-width: 100vw !important;
            margin: 0 !important;
            position: relative !important;
            padding: 16px !important;
            min-height: auto !important;
            height: auto !important;
            box-sizing: border-box !important;
            left: 0 !important;
            right: 0 !important;
          }
          .form-actions {
            margin-top: 16px !important;
            margin-bottom: 0 !important;
          }
          .form-group {
            max-width: none !important;
          }
        }
        .form-group { position: relative; margin: 12px 0; width: 100%; max-width: 480px; }
        @media (max-width: 768px) {
          .form-group { max-width: none !important; }
        }
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
          color: #222 !important;
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
          color: #888 !important;
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
