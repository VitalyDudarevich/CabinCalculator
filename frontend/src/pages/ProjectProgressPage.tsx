import React, { useState, useEffect } from 'react';
import type { User } from '../types/User';
import KanbanBoard from '../components/KanbanBoard';
import CalculatorForm from '../components/CalculatorForm';
import CalculationDetails from '../components/CalculationDetails';
import type { Project } from '../components/ProjectHistory';
import type { DraftProjectData } from '../components/CalculationDetails';
import { API_URL } from '../utils/api';
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
          fetch(`${API_URL}/settings?companyId=${effectiveCompanyId}`),
          fetch(`${API_URL}/glass?companyId=${effectiveCompanyId}`),
          fetch(`${API_URL}/hardware?companyId=${effectiveCompanyId}`),
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
      position: 'fixed',
      top: 56,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Заголовок страницы */}
      <div style={{ 
        background: '#ffffff',
        flexShrink: 0,
        zIndex: 50,
        padding: '8px 24px 8px 24px'
      }}>
        {/* Заголовок слева, поиск и фильтры справа */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
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
          
          {/* Поиск и фильтры справа */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Фильтр по дате */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month' | 'custom')}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 14,
                minWidth: '120px'
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
                    fontSize: 14
                  }}
                />
                <span style={{ color: '#666' }}>—</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: 14
                  }}
                />
              </>
            )}
            
            {/* Поиск с иконкой лупы */}
            <div style={{ position: 'relative' }}>
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
                  width: '280px',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Канбан-доска напрямую без белой подложки */}
      <div style={{
        flex: 1, // Занимаем всё оставшееся место
        overflowX: 'auto', // РАЗРЕШАЕМ горизонтальный скролл
        overflowY: 'hidden', // ЗАПРЕЩАЕМ вертикальный скролл
        position: 'relative'
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
      {isEditModalOpen && selectedProject && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '95vw',
            height: '90vh',
            position: 'relative',
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* Кнопка закрытия */}
            <button
              onClick={closeEditModal}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #ddd',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: 18,
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
            
            {/* Основной контент в две колонки */}
            <div style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              gap: 24,
              padding: 24
            }}>
              {/* Левая колонка - Детали расчета */}
              <div style={{
                flex: 1,
                height: '100%',
                overflow: 'auto'
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
                flex: '0 0 480px',
                height: '100%',
                overflow: 'auto'
              }}>
                <CalculatorForm
                  companyId={effectiveCompanyId}
                  user={user}
                  selectedCompanyId={effectiveCompanyId}
                  settings={settings}
                  isLoadingData={isLoadingData}
                  onChangeDraft={setDraftProjectData}
                  selectedProject={selectedProject}
                  onNewProject={handleProjectUpdate}
                  totalPrice={totalPrice}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProgressPage; 