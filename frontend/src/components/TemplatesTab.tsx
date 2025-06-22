import React, { useState, useEffect } from 'react';
import { API_URL as BASE_API_URL } from '../utils/api';
import AddHardwareButton from './AddHardwareButton';
import AddHardwareDialog, { type HardwareDialogItem } from './AddHardwareDialog';
import { QuantityControl } from './AddHardwareDialog';
import AddServiceDialog, { type ServiceItem } from './AddServiceDialog';
const API_URL = BASE_API_URL;

const GLASS_THICKNESS = [
  { value: '8', label: '8 мм' },
  { value: '10', label: '10 мм' },
];

// Дефолтные цвета стекла если в админке нет данных
const DEFAULT_GLASS_COLORS = [
  'прозрачный',
  'матовый',
  'бронза',
  'графит'
];

interface Company {
  _id: string;
  name: string;
}

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
  color?: string;
  thickness?: string;
}

interface SizeAdjustments {
  doorHeightReduction: number;
  thresholdReduction: number;
}

interface Template {
  _id?: string;
  name: string;
  description?: string;
  type: 'straight' | 'corner' | 'unique' | 'custom' | 'glass' | 'partition';
  glassConfig?: GlassConfig[];
  sizeAdjustments?: SizeAdjustments;
  fields: TemplateField[];
  defaultHardware: string[];
  defaultServices: string[];
  customColorOption: boolean;
  exactHeightOption?: boolean;
  defaultGlassColor?: string;
  defaultGlassThickness?: string;
  companyId: string;
  isSystem?: boolean; // Признак системного шаблона
}

interface TemplatesTabProps {
  companies: Company[];
  selectedCompanyId: string;
}

const TemplatesTab: React.FC<TemplatesTabProps> = ({ companies, selectedCompanyId }) => {
  const company = companies.find(c => c._id === selectedCompanyId);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const companyName = company?.name || '';

  useEffect(() => {
    if (!company) return setTemplates([]);
    loadTemplates();
  }, [selectedCompanyId, company?._id]);



  const loadTemplates = async () => {
    if (!company) return;
    setError('');
    setLoading(true);
    try {
      // Загружаем пользовательские шаблоны (исключаем системные)
      const res = await fetch(`${API_URL}/templates?companyId=${company._id}`);
      let userTemplates = await res.json();
      
      // Фильтруем только пользовательские шаблоны (не системные)
      userTemplates = (Array.isArray(userTemplates) ? userTemplates : [])
        .filter((t: { isSystem?: boolean }) => !t.isSystem);
      
      // Загружаем системные шаблоны из базы данных
      const systemRes = await fetch(`${API_URL}/templates/system?companyId=${company._id}`);
      const systemTemplates = systemRes.ok ? await systemRes.json() : [];
      
      // Помечаем системные шаблоны флагом isSystem
      const markedSystemTemplates = (Array.isArray(systemTemplates) ? systemTemplates : [])
        .map((t: { isSystem?: boolean }) => ({ ...t, isSystem: true }));
      
      // Объединяем системные и пользовательские шаблоны
      const allTemplates = [...markedSystemTemplates, ...userTemplates];
      setTemplates(allTemplates);
    } catch {
      setError('Ошибка загрузки шаблонов');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate({
      name: '',
      description: '',
      type: 'custom',
      glassConfig: [
        { name: 'Стекло 1', type: 'stationary' }
      ],
      fields: [],
      defaultHardware: [],
      defaultServices: [],
      customColorOption: false,
      companyId: company?._id || ''
    });
    setShowEditor(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate({ ...template });
    setShowEditor(true);
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!window.confirm(`Удалить шаблон "${template.name}"?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/templates/${template._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      
      if (!res.ok) throw new Error('Ошибка удаления');
      
      setTemplates(prev => prev.filter(t => t._id !== template._id));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError('Ошибка удаления шаблона');
    }
  };

  const handleSaveTemplate = async (template: Template) => {
    try {
      // Определяем endpoint и метод в зависимости от типа шаблона
      let method: string;
      let url: string;
      
      if (template.isSystem) {
        // Для системных шаблонов всегда используем PUT (обновление)
        method = 'PUT';
        url = `${API_URL}/templates/system/${template.type}?companyId=${template.companyId}`;
      } else {
        // Для пользовательских шаблонов - обычная логика
        method = template._id ? 'PUT' : 'POST';
        url = template._id ? `${API_URL}/templates/${template._id}` : `${API_URL}/templates`;
      }
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(template)
      });
      
      if (!res.ok) throw new Error('Ошибка сохранения');
      
      const savedTemplate = await res.json();
      
      if (template.isSystem) {
        // Обновляем системный шаблон в списке
        setTemplates(prev => prev.map(t => 
          t.isSystem && t.type === template.type 
            ? { ...savedTemplate, isSystem: true }
            : t
        ));
      } else {
        // Обычная логика для пользовательских шаблонов
        if (template._id) {
          setTemplates(prev => prev.map(t => t._id === template._id ? savedTemplate : t));
        } else {
          setTemplates(prev => [...prev, savedTemplate]);
        }
      }
      
      setShowEditor(false);
      setEditingTemplate(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError('Ошибка сохранения шаблона');
    }
  };

  if (!company) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  if (showEditor && editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setShowEditor(false);
          setEditingTemplate(null);
        }}
        companyId={company._id}
      />
    );
  }

  return (
    <div className="templates-tab-root" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, flex: 1 }}>Шаблоны конфигураций {companyName}</h2>
        <button
          onClick={handleAddTemplate}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: '#646cff',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'background 0.15s',
            lineHeight: 1.25,
            height: '40px',
          }}
          disabled={loading}
        >
          Добавить шаблон
        </button>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 12 }}>Операция выполнена успешно!</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>Загрузка...</div>
      ) : templates.length === 0 ? (
        <div style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>
          Нет шаблонов конфигураций
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Системные шаблоны */}
          {(() => {
            const systemTemplates = templates.filter(t => t.isSystem);
            return systemTemplates.length > 0 && (
              <div>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: 20, 
                  fontWeight: 600, 
                  color: '#646cff',
                  borderBottom: '2px solid #646cff',
                  paddingBottom: 8
                }}>
                  🔧 Системные конфигурации
                </h3>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 16, fontStyle: 'italic' }}>
                  Настройки фурнитуры и услуг по умолчанию для стандартных конфигураций
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {systemTemplates.map((template) => (
                    <TemplateCard key={template._id} template={template} onEdit={handleEditTemplate} onDelete={handleDeleteTemplate} />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Пользовательские шаблоны */}
          {(() => {
            const userTemplates = templates.filter(t => !t.isSystem);
            return userTemplates.length > 0 && (
              <div>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: 20, 
                  fontWeight: 600, 
                  color: '#28a745',
                  borderBottom: '2px solid #28a745',
                  paddingBottom: 8
                }}>
                  📐 Пользовательские шаблоны
                </h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {userTemplates.map((template) => (
                    <TemplateCard key={template._id} template={template} onEdit={handleEditTemplate} onDelete={handleDeleteTemplate} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// Компонент редактора шаблонов
const TemplateEditor: React.FC<{
  template: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
  companyId: string;
}> = ({ template, onSave, onCancel, companyId }) => {
  const [editedTemplate, setEditedTemplate] = useState<Template>({ ...template });
  const [hardwareList, setHardwareList] = useState<{ _id: string; name: string; price: number }[]>([]);
  const [servicesList, setServicesList] = useState<{ _id: string; name: string; price: number }[]>([]);  
  const [glassColors, setGlassColors] = useState<string[]>([]);
  const [showAddHardwareDialog, setShowAddHardwareDialog] = useState(false);
  const [selectedHardware, setSelectedHardware] = useState<HardwareDialogItem[]>([]);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    loadHardwareAndServices();
  }, [companyId]);

  useEffect(() => {
    // Инициализируем selectedHardware на основе defaultHardware при загрузке
    if (hardwareList.length > 0 && editedTemplate.defaultHardware.length > 0) {
      const initialSelected: HardwareDialogItem[] = editedTemplate.defaultHardware
        .map(hardwareName => {
          const hardware = hardwareList.find(h => h.name === hardwareName);
          if (hardware) {
            return {
              hardwareId: hardware._id,
              name: hardware.name,
              quantity: 1
            };
          }
          return null;
        })
        .filter(Boolean) as HardwareDialogItem[];
      setSelectedHardware(initialSelected);
    }
  }, [hardwareList, editedTemplate.defaultHardware]);

  useEffect(() => {
    // Инициализируем selectedServices на основе defaultServices при загрузке
    if (servicesList.length > 0 && editedTemplate.defaultServices.length > 0) {
      const initialSelected: ServiceItem[] = editedTemplate.defaultServices
        .map(serviceName => {
          const service = servicesList.find(s => s.name === serviceName);
          if (service) {
            return {
              serviceId: service._id,
              name: service.name,
              price: service.price
            };
          }
          return null;
        })
        .filter(Boolean) as ServiceItem[];
      setSelectedServices(initialSelected);
    }
  }, [servicesList, editedTemplate.defaultServices]);

  const loadHardwareAndServices = async () => {
    try {
      const [hardwareRes, servicesRes, glassRes] = await Promise.all([
        fetch(`${API_URL}/hardware?companyId=${companyId}`),
        fetch(`${API_URL}/services?companyId=${companyId}`),
        fetch(`${API_URL}/glass?companyId=${companyId}`)
      ]);
      
      const hardware = await hardwareRes.json();
      const services = await servicesRes.json();
      const glass = await glassRes.json();
      
      setHardwareList(Array.isArray(hardware) ? hardware : []);
      setServicesList(Array.isArray(services) ? services : []);
      
      console.log('TemplateEditor: glass data received:', glass);
      
      // Собираем уникальные цвета стекла как в калькуляторе
      const uniqueColors = Array.from(new Set((Array.isArray(glass) ? glass : [])
        .map((g: { color?: string }) => g.color)
        .filter((c: unknown): c is string => Boolean(c))
      ));
      
      console.log('TemplateEditor: unique colors:', uniqueColors);
      
      // Если нет цветов из админки, используем дефолтные
      const finalColors = uniqueColors.length > 0 ? uniqueColors : DEFAULT_GLASS_COLORS;
      console.log('TemplateEditor: final colors:', finalColors);
      setGlassColors(finalColors);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      // При ошибке также устанавливаем дефолтные цвета
      setGlassColors(DEFAULT_GLASS_COLORS);
    }
  };

  const handleSave = () => {
    // Валидация названия
    if (!editedTemplate.name.trim()) {
      alert('Название шаблона обязательно');
      return;
    }

    // Автоматически генерируем поля на основе конфигурации стекол
    const generatedFields: TemplateField[] = [];
    
    editedTemplate.glassConfig?.forEach((glass, index) => {
      // Поле ширины
      generatedFields.push({
        name: `width_${index + 1}`,
        type: 'number',
        label: `Ширина (мм)`,
        required: true,
      });

      // Поле высоты
      generatedFields.push({
        name: `height_${index + 1}`,
        type: 'number',
        label: `Высота (мм)`,
        required: true,
      });
    });

    const templateToSave = {
      ...editedTemplate,
      fields: generatedFields,
      defaultHardware: selectedHardware.map(hw => hw.name),
      defaultServices: selectedServices.map(service => service.name),
    };

    onSave(templateToSave);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24 }}>
      <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700 }}>
        {template._id ? 'Редактирование шаблона' : 'Создание шаблона'}
      </h2>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Основные настройки */}
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Название шаблона *</label>
          <input
            type="text"
            value={editedTemplate.name}
            onChange={e => setEditedTemplate(prev => ({ ...prev, name: e.target.value }))}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              border: '1px solid #ccc', 
              borderRadius: 6, 
              fontSize: 14,
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            placeholder="Например: Трапеция"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Описание</label>
          <textarea
            value={editedTemplate.description || ''}
            onChange={e => setEditedTemplate(prev => ({ ...prev, description: e.target.value }))}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              border: '1px solid #ccc', 
              borderRadius: 6, 
              fontSize: 14, 
              minHeight: 60,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder="Описание конфигурации..."
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Тип конфигурации</label>
          <select
            value={editedTemplate.type}
            onChange={e => setEditedTemplate(prev => ({ ...prev, type: e.target.value as 'straight' | 'corner' | 'unique' | 'custom' | 'glass' | 'partition' }))}
            style={{ 
              width: '100%', 
              padding: '8px 12px', 
              border: '1px solid #ccc', 
              borderRadius: 6, 
              fontSize: 14,
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          >
            <option value="custom">Пользовательский</option>
            <option value="glass">Стационарное стекло</option>
            <option value="straight">Прямая раздвижная</option>
            <option value="corner">Угловая раздвижная</option>
            <option value="unique">Уникальная конфигурация</option>
            <option value="partition">Перегородка</option>
          </select>
        </div>

        {/* Конфигурация стекол */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>Конфигурация стекол</h3>
          
          {/* Дефолтные значения стекла */}
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: 6, 
            padding: 12,
            background: '#f0f7ff',
            marginBottom: 16
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#1565c0' }}>Дефолтные значения стекла</h4>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minWidth: '200px' }}>
                Цвет стекла по умолчанию:
                <select
                  value={editedTemplate.defaultGlassColor || ''}
                  onChange={e => setEditedTemplate(prev => ({
                    ...prev,
                    defaultGlassColor: e.target.value
                  }))}
                  style={{ 
                    minWidth: '120px', 
                    padding: '4px 6px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 4, 
                    fontSize: 13 
                  }}
                >
                  <option value="">Выберите цвет</option>
                  {glassColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minWidth: '200px' }}>
                Толщина стекла по умолчанию:
                <select
                  value={editedTemplate.defaultGlassThickness || ''}
                  onChange={e => setEditedTemplate(prev => ({
                    ...prev,
                    defaultGlassThickness: e.target.value
                  }))}
                  style={{ 
                    minWidth: '80px', 
                    padding: '4px 6px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 4, 
                    fontSize: 13 
                  }}
                >
                  <option value="">Выберите толщину</option>
                  {GLASS_THICKNESS.map(thickness => (
                    <option key={thickness.value} value={thickness.value}>{thickness.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 6, fontStyle: 'italic' }}>
              Эти значения будут автоматически установлены в калькуляторе при выборе данного шаблона
            </div>
          </div>
          
          {/* Настройки корректировок размеров */}
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: 6, 
            padding: 12,
            background: '#f8f9fa',
            marginBottom: 16
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>Настройки корректировок размеров</h4>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                Уменьшение высоты двери:
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editedTemplate.sizeAdjustments?.doorHeightReduction || 8}
                  onChange={e => setEditedTemplate(prev => ({
                    ...prev,
                    sizeAdjustments: {
                      ...prev.sizeAdjustments,
                      doorHeightReduction: parseInt(e.target.value) || 8,
                      thresholdReduction: prev.sizeAdjustments?.thresholdReduction || 15
                    }
                  }))}
                  style={{ width: '60px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                />
                мм
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                Уменьшение для порожка:
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editedTemplate.sizeAdjustments?.thresholdReduction || 15}
                  onChange={e => setEditedTemplate(prev => ({
                    ...prev,
                    sizeAdjustments: {
                      ...prev.sizeAdjustments,
                      thresholdReduction: parseInt(e.target.value) || 15,
                      doorHeightReduction: prev.sizeAdjustments?.doorHeightReduction || 8
                    }
                  }))}
                  style={{ width: '60px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                />
                мм
              </label>
            </div>
          </div>

          {/* Список стекол */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(editedTemplate.glassConfig || []).map((glass, index) => (
              <div key={index} style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: 6, 
                padding: 16,
                background: '#fff',
                position: 'relative'
              }}>
                {/* Кнопка удаления выровнена по краю поля Тип */}
                <button
                  onClick={() => {
                    if ((editedTemplate.glassConfig?.length || 0) <= 1) {
                      alert('Должно быть минимум одно стекло');
                      return;
                    }
                    const newGlassConfig = editedTemplate.glassConfig?.filter((_, i) => i !== index) || [];
                    setEditedTemplate(prev => ({ ...prev, glassConfig: newGlassConfig }));
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: -4,
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
                  title="Удалить стекло"
                  onMouseOver={e => (e.currentTarget.style.color = '#b71c1c')}
                  onMouseOut={e => (e.currentTarget.style.color = '#e53935')}
                >
                  ×
                </button>

                <div style={{ display: 'flex', gap: 20 }}>
                  {/* Название стекла */}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                      Название
                    </label>
                    <input
                      type="text"
                      value={glass.name}
                      onChange={e => {
                        const newGlassConfig = [...(editedTemplate.glassConfig || [])];
                        newGlassConfig[index] = { ...glass, name: e.target.value };
                        setEditedTemplate(prev => ({ ...prev, glassConfig: newGlassConfig }));
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: 4,
                        fontSize: 13
                      }}
                    />
                  </div>

                  {/* Тип стекла */}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                      Тип
                    </label>
                    <select
                      value={glass.type}
                      onChange={e => {
                        const newGlassConfig = [...(editedTemplate.glassConfig || [])];
                        newGlassConfig[index] = { ...glass, type: e.target.value as 'stationary' | 'swing_door' | 'sliding_door' };
                        setEditedTemplate(prev => ({ ...prev, glassConfig: newGlassConfig }));
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: 4,
                        fontSize: 13
                      }}
                    >
                      <option value="stationary">Стационар</option>
                      <option value="swing_door">Дверь распашная</option>
                      <option value="sliding_door">Дверь раздвижная</option>
                    </select>
                  </div>
                </div>
                
                {/* Описание типа стекла */}
                <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                  {glass.type === 'stationary' && '🔷 Стационар'}
                  {glass.type === 'swing_door' && `🔹 Дверь распашная (-${editedTemplate.sizeAdjustments?.doorHeightReduction || 8}мм по высоте, опция порожка в калькуляторе)`}
                  {glass.type === 'sliding_door' && `🔹 Дверь раздвижная (-${editedTemplate.sizeAdjustments?.doorHeightReduction || 8}мм по высоте)`}
                </div>


              </div>
            ))}

            {/* Кнопка добавления стекла */}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => {
                  const newGlass: GlassConfig = {
                    name: `Стекло ${(editedTemplate.glassConfig?.length || 0) + 1}`,
                    type: 'stationary',
                    color: '',
                    thickness: ''
                  };
                  setEditedTemplate(prev => ({
                    ...prev,
                    glassConfig: [...(prev.glassConfig || []), newGlass]
                  }));
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Добавить стекло
              </button>
            </div>
          </div>
        </div>



        {/* Фурнитура по умолчанию */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>Фурнитура по умолчанию</h3>
          
          {/* Опции нестандартного цвета и высоты */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={editedTemplate.customColorOption}
                onChange={e => setEditedTemplate(prev => ({ ...prev, customColorOption: e.target.checked }))}
              />
              Включить опцию "Нестандартный цвет"
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={editedTemplate.exactHeightOption || false}
                onChange={e => setEditedTemplate(prev => ({ ...prev, exactHeightOption: e.target.checked }))}
              />
              Включить опцию "Нестандартная высота"
            </label>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <AddHardwareButton onClick={() => setShowAddHardwareDialog(true)} />
          </div>

          {selectedHardware.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {selectedHardware.map((hw, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', marginBottom: 6, height: 43 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{hw.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    <QuantityControl
                      value={hw.quantity}
                      onChange={v => setSelectedHardware(list => list.map((item, i) => i === idx ? { ...item, quantity: v } : item))}
                    />
                    <button
                      onClick={() => setSelectedHardware(list => list.filter((_, i) => i !== idx))}
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

          <div style={{ fontSize: 12, color: '#666' }}>
            Выбранные позиции будут автоматически добавлены при выборе этого шаблона
          </div>
        </div>

        {/* Услуги по умолчанию */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>Услуги по умолчанию</h3>
          
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setShowAddServiceDialog(true)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#fff',
                color: '#646cff',
                border: '2px solid #646cff',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              ДОБАВИТЬ УСЛУГУ
            </button>
          </div>

          {selectedServices.length > 0 && (
            <div style={{ marginBottom: 12 }}>
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

          <div style={{ fontSize: 12, color: '#666' }}>
            Выбранные услуги будут автоматически добавлены при выборе этого шаблона
          </div>
        </div>



        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: '#646cff',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              flex: 1
            }}
          >
            Сохранить
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              flex: 1
            }}
          >
            Отмена
          </button>
        </div>
      </div>

      {/* Модальное окно выбора фурнитуры */}
      {showAddHardwareDialog && (
        <AddHardwareDialog
          hardwareList={hardwareList}
          onSave={selected => {
            setSelectedHardware(list => [...list, ...selected]);
            setShowAddHardwareDialog(false);
          }}
          onClose={() => setShowAddHardwareDialog(false)}
          projectHardware={selectedHardware}
        />
      )}

      {/* Модальное окно выбора услуг */}
      {showAddServiceDialog && (
        <AddServiceDialog
          serviceList={servicesList.map(s => ({ serviceId: s._id, name: s.name, price: s.price }))}
          projectServices={selectedServices}
          onSave={selected => {
            setSelectedServices(selected);
            setShowAddServiceDialog(false);
          }}
          onClose={() => setShowAddServiceDialog(false)}
        />
      )}
    </div>
  );
};

// Компонент карточки шаблона
const TemplateCard: React.FC<{
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
}> = ({ template, onEdit, onDelete }) => {
  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: 8, 
      padding: 16, 
      background: template.isSystem ? '#f8f9ff' : '#fafbff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#000' }}>
          {template.name}
          {template.isSystem && (
            <span style={{ 
              marginLeft: 8, 
              fontSize: 12, 
              color: '#646cff', 
              backgroundColor: '#e8eaff', 
              padding: '2px 6px', 
              borderRadius: 4,
              fontWeight: 'normal'
            }}>
              Системный
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onEdit(template)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              background: template.isSystem ? '#646cff' : '#646cff',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            {template.isSystem ? 'Настроить' : 'Изменить'}
          </button>
          {!template.isSystem && (
            <button
              onClick={() => onDelete(template)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>
      
      {template.description && (
        <p style={{ margin: '8px 0', color: '#666', fontSize: 14 }}>{template.description}</p>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
        <div style={{ fontSize: 14 }}>
          <strong>Тип:</strong> {
            template.type === 'custom' ? 'Пользовательский' :
            template.type === 'glass' ? 'Стационарное стекло' :
            template.type === 'straight' ? 'Прямая раздвижная' :
            template.type === 'corner' ? 'Угловая раздвижная' :
            template.type === 'unique' ? 'Уникальная конфигурация' :
            template.type === 'partition' ? 'Перегородка' :
            template.type
          }
        </div>
        <div style={{ fontSize: 14 }}>
          <strong>Фурнитура:</strong> {template.defaultHardware.length} позиций
        </div>
        <div style={{ fontSize: 14 }}>
          <strong>Услуги:</strong> {template.defaultServices.length} позиций
        </div>
        <div style={{ fontSize: 14 }}>
          <strong>Опции:</strong> 
          {template.customColorOption && ' Цвет'}
          {template.exactHeightOption && ' Высота'}
          {!template.customColorOption && !template.exactHeightOption && ' Нет'}
        </div>
      </div>
    </div>
  );
};

export default TemplatesTab; 