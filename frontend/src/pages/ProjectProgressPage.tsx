import React, { useState, useEffect } from 'react';
import type { User } from '../types/User';
import KanbanBoard from '../components/KanbanBoard';
import CalculatorForm from '../components/CalculatorForm';
import CalculationDetails from '../components/CalculationDetails';
import type { Project } from '../components/ProjectHistory';
import type { DraftProjectData } from '../components/CalculationDetails';
import { API_URL } from '../utils/api';
import { fetchWithAuth } from '../utils/auth';
import { getStatuses, type Status } from '../utils/statusApi';

interface ProjectProgressPageProps {
  user: User | null;
  selectedCompanyId: string;
}

// Интерфейс для настроек (как в CalculatorPage)
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
  statusList?: Status[]; // Добавляем статусы
}

const ProjectProgressPage: React.FC<ProjectProgressPageProps> = ({ 
  user, 
  selectedCompanyId 
}) => {
  // Состояния для модального окна редактирования
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [draftProjectData, setDraftProjectData] = useState<DraftProjectData>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [kanbanKey, setKanbanKey] = useState(0); // Ключ для принудительного обновления канбан доски
  
  // Состояние для поиска и фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // Состояние для мобильного режима
  const [isMobile, setIsMobile] = useState(false);

  // Отслеживание изменения размера экрана
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Проверяем при монтировании
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Добавляем CSS стили для правильного скролла на мобильных устройствах
  useEffect(() => {
    if (isMobile) {
      // Добавляем стили для обеспечения скролла на iOS
      const style = document.createElement('style');
      style.textContent = `
        body {
          overflow: auto !important;
          -webkit-overflow-scrolling: touch !important;
          height: auto !important;
        }
        html {
          overflow: auto !important;
          -webkit-overflow-scrolling: touch !important;
          height: auto !important;
        }
        * {
          -webkit-overflow-scrolling: touch;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isMobile]);

  // Эффективные ID для админа/пользователя
  let effectiveCompanyId = selectedCompanyId;
  if (user && (user.role === 'admin' || user.role === 'user')) {
    const id = typeof user.companyId === 'string' ? user.companyId : 
               (user.companyId && typeof user.companyId === 'object' && '_id' in user.companyId ? user.companyId._id : '');
    effectiveCompanyId = id;
  }

  // Загрузка данных для калькулятора и статусов
  useEffect(() => {
    if (!effectiveCompanyId) {
      setSettings(null);
      return;
    }

    const loadCalculatorData = async () => {
      setIsLoadingData(true);
      try {
        const [settingsRes, glassRes, hardwareRes, statusesData] = await Promise.all([
          fetchWithAuth(`${API_URL}/settings?companyId=${effectiveCompanyId}`),
          fetchWithAuth(`${API_URL}/glass?companyId=${effectiveCompanyId}`),
          fetchWithAuth(`${API_URL}/hardware?companyId=${effectiveCompanyId}`),
          getStatuses(effectiveCompanyId),
        ]);
        
        const [settingsData, glassList, hardwareList] = await Promise.all([
          settingsRes.json(),
          glassRes.json(),
          hardwareRes.json(),
        ]);
        
        if (Array.isArray(settingsData) && settingsData.length > 0) {
          const combinedSettings: Settings = {
            ...settingsData[0],
            glassList,
            hardwareList,
            statusList: statusesData || [], // Добавляем статусы в settings
          };
          setSettings(combinedSettings);
        } else {
          setSettings(null);
        }
      } catch (e) {
        console.error('ProjectProgressPage: ошибка загрузки данных:', e);
        setSettings(null);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadCalculatorData();
  }, [effectiveCompanyId]);

  // Обработка редактирования проекта
  const handleProjectEdit = (project: Project) => {
    console.log('🔧 Opening edit modal for project:', project.name);
    setSelectedProject(project);
    const newDraftData = {
      ...project.data,
      projectName: project.name,
      customer: project.customer,
      priceHistory: project.priceHistory,
      statusHistory: project.statusHistory,
      createdAt: project.createdAt,
      _id: project._id,
      status: project.status,
      statusId: project.statusId,
    };
    setDraftProjectData(newDraftData);
    console.log('📝 Draft data set:', draftProjectData, '->', newDraftData);
    setIsEditModalOpen(true);
  };

  // Обработка обновления проекта
  const handleProjectUpdate = (updatedProject?: Project) => {
    console.log('🚨🚨🚨 handleProjectUpdate CALLED!', {
      projectName: updatedProject?.name,
      projectId: updatedProject?._id,
      currentKanbanKey: kanbanKey
    });
    
    // Принудительно обновляем канбан доску
    setKanbanKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 Updating kanban key:', prev, '->', newKey);
      return newKey;
    });
    
    setIsEditModalOpen(false);
    setSelectedProject(null);
    setDraftProjectData({});
  };

  // Закрытие модального окна
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProject(null);
    setDraftProjectData({});
  };
  return (
    // Основной контейнер страницы с учетом фиксированного Header'а
    <div style={{ 
      // Позиционирование с учетом фиксированного header'а высотой 56px
      position: isMobile ? 'relative' : 'fixed',
      top: isMobile ? 0 : 56,
      left: isMobile ? 0 : 0,
      right: isMobile ? 0 : 0,
      bottom: isMobile ? 0 : 0,
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: isMobile ? 'visible' : 'hidden',
      height: isMobile ? '100vh' : 'calc(100vh - 56px)',
      width: isMobile ? '100vw' : 'auto',
      paddingTop: isMobile ? '56px' : 0,
      boxSizing: 'border-box'
    }}>
      {/* Заголовок страницы */}
      <div style={{ 
        background: '#ffffff',
        flexShrink: 0,
        zIndex: 50,
        padding: isMobile ? '8px' : '8px 32px 8px 8px' // Добавляем 32px справа как в Header
      }}>
        {/* Заголовок слева, поиск и фильтры справа */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 12 : 0,
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between'
        }}>
          {/* Первая строка - заголовок и кнопка создания */}
          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            width: isMobile ? '100%' : 'auto', // На десктопе не растягиваем на всю ширину
            marginRight: isMobile ? 0 : 24 // Добавляем отступ между заголовком и фильтрами
          }}>
            {/* Заголовок слева */}
            <h1 style={{ 
              fontSize: 22,
              fontWeight: 700, 
              margin: 0,
              color: '#333',
              flexShrink: 0
            }}>
              Прогресс Проектов
            </h1>
            
            {/* Кнопка "Новый проект" - показываем только на мобайле в этом месте */}
            {isMobile && (
              <button
                onClick={() => {
                  // Открываем модальное окно для создания нового проекта
                  setSelectedProject(null);
                  setDraftProjectData({});
                  setIsEditModalOpen(true);
                }}
                style={{
                  padding: '0',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#646cff',
                  border: '2px solid #646cff',
                  fontWeight: 200,
                  fontSize: 24,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  lineHeight: 0.8,
                  textAlign: 'center',
                  marginTop: '0',
                  marginRight: '8px',
                  fontFamily: 'Arial, sans-serif'
                }}
                title="Новый проект"
              >
                +
              </button>
            )}
          </div>
          
          {/* Вторая строка (на мобайле) / Правая часть (на десктопе) - Поиск и фильтры */}
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            alignItems: 'center',
            flexWrap: 'wrap',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'flex-start' : 'flex-end' // На десктопе выравниваем по правому краю
          }}>
            {/* Кнопка "Новый проект" для десктопа */}
            {!isMobile && (
              <button
                onClick={() => {
                  // Открываем модальное окно для создания нового проекта
                  setSelectedProject(null);
                  setDraftProjectData({});
                  setIsEditModalOpen(true);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#fff',
                  color: '#646cff',
                  border: '2px solid #646cff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginRight: 16 // Отступ между кнопкой и фильтрами
                }}
              >
                Новый проект
              </button>
            )}
            {/* Фильтр по дате */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month' | 'custom')}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 14,
                minWidth: '120px',
                height: '36px',
                flex: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Все даты</option>
              <option value="today">Сегодня</option>
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
              <option value="custom">Период</option>
            </select>
            
            {/* Поля для произвольного периода */}
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: 14,
                    height: '36px',
                    flex: 'none',
                    width: '140px',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ color: '#666', lineHeight: '36px' }}>—</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: 14,
                    height: '36px',
                    flex: 'none',
                    width: '140px',
                    boxSizing: 'border-box'
                  }}
                />
              </>
            )}
            
            {/* Поиск с иконкой лупы */}
            <div style={{ 
              position: 'relative',
              flex: isMobile ? '1' : 'none',
              minWidth: isMobile ? '0' : 'auto',
              width: isMobile ? '100%' : 'auto'
            }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle 
                  cx="11" 
                  cy="11" 
                  r="8" 
                  stroke="#666" 
                  strokeWidth="2"
                  fill="none"
                />
                <path 
                  d="m21 21-4.35-4.35" 
                  stroke="#666" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  fontSize: 14,
                  height: '36px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Канбан-доска напрямую без белой подложки */}
      <div style={{
        flex: 1, // Занимаем все оставшееся место
        overflowX: 'auto', // РАЗРЕШАЕМ горизонтальный скролл
        overflowY: isMobile ? 'auto' : 'hidden', // На мобайле разрешаем вертикальный скролл
        position: 'relative',
        height: '100%', // Занимаем всю доступную высоту
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <KanbanBoard 
          key={kanbanKey} // Принудительно перерендерим компонент при изменении
          companyId={effectiveCompanyId}
          onProjectEdit={handleProjectEdit}
          onProjectDelete={(project) => {
            console.log('Удалить проект:', project);
            // TODO: Реализовать подтверждение удаления
          }}
          searchTerm={searchTerm}
          dateFilter={dateFilter}
          customDateFrom={customDateFrom}
          customDateTo={customDateTo}
        />
      </div>

      {/* Модальное окно редактирования проекта */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? '0' : '20px',
          overflow: 'auto'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: isMobile ? 0 : 12,
            width: isMobile ? '100vw' : '95vw',
            height: isMobile ? 'calc(100vh - 56px)' : 'calc(95vh - 56px)',
            position: 'relative',
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* Кнопка закрытия */}
            <button
              onClick={closeEditModal}
              style={{
                position: 'absolute',
                top: 18,
                right: -20,
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                outline: 'none',
                boxShadow: 'none',
                width: 48,
                height: 48,
                fontSize: 36,
                cursor: 'pointer',
                color: '#666',
                zIndex: 1001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Закрыть"
            >
              ×
            </button>
            
            {/* Заголовок модального окна */}
            <div style={{
              position: 'absolute',
              top: 24,
              left: 20,
              right: 72,
              zIndex: 1002
            }}>
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
                color: '#333'
              }}>
                {selectedProject ? `Редактирование проекта: ${selectedProject.name}` : 'Создание нового проекта'}
              </h2>
            </div>
            
            {/* Основной контент в две колонки */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              width: '100%',
              height: '100%',
              gap: isMobile ? 8 : 16,
              padding: isMobile ? '64px 0 0 0' : '64px 16px 16px 16px'
            }}>
              {/* Левая колонка - Детали расчета */}
              <div style={{
                flex: isMobile ? 'none' : 1,
                height: isMobile ? 'auto' : '100%',
                minHeight: isMobile ? '300px' : 'auto',
                overflow: 'auto',
                paddingBottom: isMobile ? '20px' : '0',
                paddingLeft: isMobile ? '20px' : '24px'
              }}>
                <CalculationDetails
                  draft={draftProjectData}
                  companyId={effectiveCompanyId}
                  settings={settings}
                  onTotalChange={(total) => {
                    console.log('💰 Total price calculated:', total);
                    setTotalPrice(total);
                  }}
                  exactHeight={draftProjectData?.exactHeight || false}
                />
              </div>
              
              {/* Правая колонка - Форма калькулятора */}
              <div style={{
                flex: isMobile ? 'none' : '0 0 480px',
                width: isMobile ? '100%' : 'auto',
                height: isMobile ? 'auto' : '100%',
                minHeight: isMobile ? '500px' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  paddingBottom: isMobile ? '20px' : '80px',
                  paddingLeft: isMobile ? '20px' : '24px'
                }}>
                  <CalculatorForm
                    companyId={effectiveCompanyId}
                    user={user}
                    selectedCompanyId={effectiveCompanyId}
                    settings={settings}
                    isLoadingData={isLoadingData}
                    onChangeDraft={setDraftProjectData}
                    selectedProject={selectedProject || undefined}
                    onNewProject={handleProjectUpdate}
                    totalPrice={totalPrice}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProgressPage; 