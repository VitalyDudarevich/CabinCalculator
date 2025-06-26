import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { getStatuses } from '../utils/statusApi';
import { getProjects, updateProjectStatus, type ProjectApiResponse } from '../utils/api';

// Интерфейсы
interface Status {
  _id: string;
  name: string;
  color: string;
  order: number;
  companyId: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Project {
  _id: string;
  name: string;
  customer?: string;
  status?: string;
  statusId?: {
    _id: string;
    name: string;
    color: string;
    order: number;
  };
  price?: number;
  priceHistory?: { price: number; date: string }[];
  statusHistory?: { status: string; statusId?: string; date: string }[];
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

interface KanbanBoardProps {
  companyId: string;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
}

// Конфигурационные лейблы как в ProjectHistory
const configLabels: Record<string, string> = {
  glass: 'Стационарное стекло',
  straight: 'Прямая раздвижная',
  'straight-opening': 'Прямая раздвижная',
  'straight-glass': 'Прямая раздвижная',
  corner: 'Угловая раздвижная',
  unique: 'Уникальная конфигурация',
  partition: 'Перегородка',
};

// Функция для получения лейбла конфигурации
const getConfigLabel = (config: string): string => {
  return configLabels[config] || config;
};

// Компонент для сортируемого элемента проекта
interface SortableProjectProps {
  project: Project;
  isOverlay?: boolean;
  onEdit?: (project: Project) => void;
  onProjectMove?: (projectId: string, targetStatusId: string, statusName: string) => Promise<void>;
}

const SortableProject: React.FC<SortableProjectProps> = ({ project, isOverlay = false, onEdit, onProjectMove }) => {
  console.log('🎯 SortableProject RENDERING for:', project.name, 'ID:', project._id);
  
  const [isHovered, setIsHovered] = React.useState(false);
  
  console.log('📞 Calling useSortable with ID:', project._id);
  const sortableResult = useSortable({
    id: project._id,
  });
  
  console.log('📦 useSortable returned:', {
    projectName: project.name,
    projectId: project._id,
    hasListeners: !!sortableResult.listeners,
    hasAttributes: !!sortableResult.attributes,
    hasSetNodeRef: !!sortableResult.setNodeRef,
    isDragging: sortableResult.isDragging,
    listeners: sortableResult.listeners,
    attributes: sortableResult.attributes
  });

  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortableResult;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // Делаем почти невидимым во время драга
    zIndex: isDragging ? -1 : 1, // Убираем на задний план
  };

  // Альтернативная реализация drag and drop
  const [isDraggingManual, setIsDraggingManual] = React.useState(false);


  
  const handleManualMouseDown = (e: React.MouseEvent) => {
    console.log('🎯 MOUSEDOWN TRIGGERED! Project:', project.name);
    e.preventDefault(); // Предотвращаем выделение текста
    e.stopPropagation(); // Предотвращаем всплытие события
    
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let dragElement: HTMLElement | null = null;
    
    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = Math.abs(event.clientX - startX);
      const deltaY = Math.abs(event.clientY - startY);
      
      if (!moved && (deltaX > 5 || deltaY > 5)) {
        moved = true;
        setIsDraggingManual(true);
        console.log('🔥 Manual drag started for:', project.name);
        
        // Создаем летающий элемент
        dragElement = document.createElement('div');
        dragElement.innerHTML = `
          <div style="
            background: #f0f8ff;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 8px 24px rgba(33, 150, 243, 0.4);
            opacity: 0.9;
            pointer-events: none;
            z-index: 9999;
            position: fixed;
            transform: rotate(3deg);
            min-width: 200px;
            max-width: 300px;
          ">
            <div style="font-weight: 600; font-size: 16px; color: #000; margin-bottom: 4px;">
              ${project.name}
            </div>
            <div style="color: #666; font-size: 12px;">
              Перетаскивание...
            </div>
          </div>
        `;
        dragElement.style.position = 'fixed';
        dragElement.style.left = event.clientX + 10 + 'px';
        dragElement.style.top = event.clientY + 10 + 'px';
        dragElement.style.zIndex = '9999';
        dragElement.style.pointerEvents = 'none';
        document.body.appendChild(dragElement);
      }
      
      if (moved && dragElement) {
        // Обновляем позицию летающего элемента
        dragElement.style.left = event.clientX + 10 + 'px';
        dragElement.style.top = event.clientY + 10 + 'px';
        
        // Определяем колонку под курсором для подсветки
        const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
        
        // Убираем все предыдущие подсветки
        document.querySelectorAll('.kanban-column').forEach(col => {
          const element = col as HTMLElement;
          element.style.background = '';
          element.style.border = '';
          element.style.transform = '';
        });
        
        // Ищем колонку под курсором
        let dropZone = elementUnderMouse;
        let attempts = 0;
        
        while (dropZone && attempts < 10) {
          if (dropZone.classList?.contains('kanban-column')) {
            // Подсвечиваем найденную колонку
            const columnElement = dropZone as HTMLElement;
            columnElement.style.background = '#e8f5e8 !important';
            columnElement.style.border = '3px dashed #4caf50 !important';
            columnElement.style.transform = 'scale(1.02)';
            columnElement.style.transition = 'all 0.2s ease';
            break;
          }
          dropZone = dropZone.parentElement;
          attempts++;
        }
      }
    };
    
    const handleMouseUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Убираем все подсветки колонок
      document.querySelectorAll('.kanban-column').forEach(col => {
        const element = col as HTMLElement;
        element.style.background = '';
        element.style.border = '';
        element.style.transform = '';
        element.style.transition = '';
      });
      
      if (dragElement) {
        document.body.removeChild(dragElement);
      }
      
      setIsDraggingManual(false);
      
      if (moved) {
        console.log('🎯 Manual drag ended for:', project.name);
        
        // Определяем колонку для drop
        const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
        let dropZone = elementUnderMouse;
        let attempts = 0;
        
        while (dropZone && attempts < 10) {
          const statusId = dropZone.getAttribute('data-status-id');
          const statusName = dropZone.getAttribute('data-status-name');
          
          if (statusId && statusName) {
            console.log('✅ Dropped on column:', statusName, 'ID:', statusId);
            
            // Проверяем что это другая колонка
            if (project.statusId?._id !== statusId) {
              console.log('🚀 Moving project to new status...');
              
              // Показываем уведомление о начале перемещения
              const loadingMessage = `⏳ Перемещаем проект "${project.name}"...`;
              const notification = document.createElement('div');
              notification.innerHTML = loadingMessage;
              notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196f3;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-weight: 600;
              `;
              document.body.appendChild(notification);
              
              // Реальное перемещение проекта
              if (onProjectMove) {
                try {
                  await onProjectMove(project._id, statusId, statusName);
                  
                  // Успешное перемещение
                  notification.innerHTML = `✅ Проект перемещен в "${statusName}"`;
                  notification.style.background = '#4caf50';
                  
                  setTimeout(() => {
                    if (notification.parentNode) {
                      document.body.removeChild(notification);
                    }
                  }, 3000);
                  
                } catch (err) {
                  // Ошибка перемещения
                  notification.innerHTML = `❌ Ошибка: ${err instanceof Error ? err.message : 'Не удалось переместить проект'}`;
                  notification.style.background = '#f44336';
                  
                  setTimeout(() => {
                    if (notification.parentNode) {
                      document.body.removeChild(notification);
                    }
                  }, 5000);
                }
              }
              
            } else {
              console.log('⚠️ Same column, no move needed');
            }
            return;
          }
          
          dropZone = dropZone.parentElement;
          attempts++;
        }
        
        console.log('❌ No valid drop zone found');
      } else {
        console.log('🖱️ Just a click on:', project.name);
        if (onEdit) onEdit(project);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Принудительно используем нашу реализацию вместо @dnd-kit
  const testHandlers = {
    onMouseDown: handleManualMouseDown
  };

  return (
    <div
      ref={setNodeRef}
      {...testHandlers}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...style,
        cursor: isDraggingManual ? 'grabbing' : isHovered ? 'grab' : 'pointer', // Всегда показываем что кликабельно
        transition: (isDragging || isDraggingManual) ? 'none' : 'all 0.2s ease',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Добавляем визуальную индикацию hover и drag
        backgroundColor: isDraggingManual ? '#e3f2fd' : isHovered ? '#f0f8ff' : 'transparent',
        // Добавляем border при hover или drag
        border: (isHovered || isDraggingManual) ? '3px solid #2196f3' : '3px solid transparent', // Более яркая рамка
        borderRadius: '8px',
        // Убеждаемся что pointer events работают
        pointerEvents: 'auto',
        // Добавляем тень при hover или drag
        boxShadow: isDraggingManual ? '0 8px 24px rgba(33, 150, 243, 0.4)' : isHovered ? '0 4px 12px rgba(33, 150, 243, 0.3)' : 'none',
        // Делаем элемент полупрозрачным во время drag
        opacity: isDraggingManual ? 0.7 : 1,
        // Добавляем минимальную высоту чтобы было проще кликать
        minHeight: '60px',
      }}
    >
      <ProjectCard 
        project={project} 
        isOverlay={isOverlay} 
        isHovered={isHovered}
        isDragging={isDragging}
      />
    </div>
  );
};

// Компонент карточки проекта
interface ProjectCardProps {
  project: Project;
  isOverlay?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  isOverlay = false, 
  isHovered = false, 
  isDragging = false 
}) => {
  return (
    <div
      style={{
        marginBottom: 8,
        background: isOverlay 
          ? '#f0f8ff' 
          : isHovered 
            ? '#f0f8ff' 
            : '#fafbff',
        borderRadius: 8,
        padding: 16,
        border: isOverlay || isHovered 
          ? '1px solid #2196f3' 
          : '1px solid #f0f0f0',
        boxShadow: isOverlay 
          ? '0 8px 24px rgba(0,0,0,0.3)' 
          : isHovered 
            ? '0 4px 12px rgba(0,0,0,0.15)' 
            : '0 1px 2px rgba(0,0,0,0.02)',
        userSelect: 'none',
        transition: isOverlay || isDragging ? 'none' : 'all 0.2s ease',
      }}
    >
      {/* Название проекта */}
      <div style={{ 
        fontWeight: 600, 
        fontSize: 18, 
        marginBottom: 8, 
        wordBreak: 'break-word', 
        color: '#000'
      }}>
        {project.name || 'Без названия'}
        {project.data && 
         typeof project.data === 'object' && 
         'config' in project.data && 
         typeof project.data.config === 'string' && (
          <span style={{ 
            color: '#666', 
            fontWeight: 400, 
            fontSize: 16 
          }}>
            {' '}({getConfigLabel(project.data.config)})
          </span>
        )}
      </div>
      
      {/* Заказчик */}
      {project.customer && (
        <div style={{ 
          color: '#666', 
          fontSize: 14, 
          marginBottom: 8, 
          fontStyle: 'italic'
        }}>
          <strong>Заказчик:</strong> {project.customer}
        </div>
      )}
      
      {/* Сумма */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 4
      }}>
        <span style={{ 
          color: '#222', 
          fontWeight: 700, 
          fontSize: 16 
        }}>
          Сумма:
        </span>
        <span style={{ 
          color: '#222', 
          fontWeight: 700, 
          fontSize: 16 
        }}>
          {typeof project.price === 'number' 
            ? project.price.toLocaleString('ru-RU') 
            : 0} ₾
        </span>
      </div>
      
      {/* Дата */}
      <div style={{ 
        color: '#888', 
        fontSize: 13
      }}>
        {new Date(project.createdAt).toLocaleString('ru-RU')}
      </div>
    </div>
  );
};

// Компонент дропзоны для статуса
interface DroppableStatusProps {
  status: Status;
  projects: Project[];
  onProjectEdit?: (project: Project) => void;
  onProjectMove?: (projectId: string, targetStatusId: string, statusName: string) => Promise<void>;
  isDesktop?: boolean;
}

const DroppableStatus: React.FC<DroppableStatusProps> = ({ 
  status, 
  projects, 
  onProjectEdit,
  onProjectMove,
  isDesktop = true 
}) => {
  const projectIds = projects.map(p => p._id);
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Используем useDroppable для создания дропзоны
  const { isOver, setNodeRef } = useDroppable({
    id: status._id,
  });

  const containerStyle = isDesktop ? {
    // Фиксированная ширина для горизонтального скролла
    flex: `0 0 ${window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px'}`,
    width: window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px',
    minWidth: window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px',
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    height: '100%',
    minHeight: '200px',
    maxHeight: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  } : {
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    minHeight: 'calc(100vh - 320px)',
    maxHeight: 'calc(100vh - 320px)',
    overflowY: 'auto' as const
  };

  console.log('🏗️ Creating DroppableStatus for:', status.name, 'with ID:', status._id);
  
  return (
    <div 
      ref={setNodeRef}
      className="kanban-column"
      data-status-id={status._id}
      data-status-name={status.name}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...containerStyle,
        background: isOver ? '#e3f2fd' : isHovered ? '#f8f9fa' : containerStyle.background,
        border: isOver ? '2px dashed #2196f3' : '2px dashed transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Заголовок колонки */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '2px solid #e0e0e0',
        flexShrink: 0
      }}>
        <div 
          style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            background: status.color,
            marginRight: 8 
          }} 
        />
        <h3 style={{ 
          fontSize: 16, 
          fontWeight: 600, 
          margin: 0,
          color: '#333'
        }}>
          {status.name}
        </h3>
        <span style={{ 
          marginLeft: 'auto',
          background: '#e0e0e0',
          borderRadius: 12,
          padding: '4px 8px',
          fontSize: 12,
          color: '#666'
        }}>
          {projects.length}
        </span>
      </div>

      {/* Список проектов */}
      <div style={{
        flex: 1,
        overflowY: isDesktop ? 'auto' : 'visible',
        minHeight: 0,
        padding: 4,
      }}>
        <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
          {(() => {
            console.log('🔍 SortableContext rendering:', {
              statusName: status.name,
              projectIds,
              projectCount: projects.length
            });
            return projects.map((project) => (
              <SortableProject
                key={project._id}
                project={project}
                onEdit={onProjectEdit}
                onProjectMove={onProjectMove}
              />
            ));
          })()}
        </SortableContext>
      </div>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  companyId, 
  onProjectEdit,
  onProjectDelete: _onProjectDelete // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  // ПРОСТАЯ ОТЛАДКА ДЛЯ ПРОВЕРКИ
  console.log('🔥 KanbanBoard RENDERING at:', new Date().toISOString());
  
  // Отладка монтирования компонента
  React.useEffect(() => {
    console.log('🏗️ KanbanBoard mounted/remounted at:', new Date().toISOString());
    return () => {
      console.log('💥 KanbanBoard unmounting at:', new Date().toISOString());
    };
  }, []);
  
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // Состояние для drag overlay
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Упрощенная настройка сенсоров
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Отслеживание изменения размера экрана
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Закрытие меню статусов при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusMenu && !(event.target as Element).closest('.status-menu')) {
        setShowStatusMenu(false);
      }
    };

    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusMenu]);

  // Загрузка данных с сервера
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Загружаем статусы и проекты параллельно
        const [statusesData, projectsData] = await Promise.all([
          getStatuses(companyId),
          getProjects({ companyId })
        ]);
        
        setStatuses(statusesData);
        
        // Преобразуем ProjectApiResponse в Project
        const mappedProjects: Project[] = projectsData.map((project: ProjectApiResponse) => ({
          _id: project._id,
          name: project.name,
          customer: project.customer,
          status: project.statusId?.name || project.status,
          statusId: project.statusId,
          price: project.price,
          priceHistory: project.priceHistory,
          statusHistory: project.statusHistory,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          data: project.data
        }));
        
        setProjects(mappedProjects);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };
    
    if (companyId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  // Упрощенная группировка проектов по ID статусов
  const projectsByStatus = React.useMemo(() => {
    const byStatus: Record<string, Project[]> = {};
    statuses.forEach(status => {
      byStatus[status._id] = projects.filter(project => 
        // Сравниваем по statusId._id если есть, иначе по названию статуса
        project.statusId?._id === status._id || 
        (project.status === status.name && !project.statusId)
      );
    });
    return byStatus;
  }, [projects, statuses]);

  // Функция для реального перемещения проекта
  const handleProjectMove = async (projectId: string, targetStatusId: string, statusName: string) => {
    try {
      // Находим целевой статус для получения полной информации
      const targetStatus = statuses.find(s => s._id === targetStatusId);
      if (!targetStatus) {
        throw new Error('Статус не найден');
      }

      // Находим проект для откатывания в случае ошибки
      const originalProject = projects.find(p => p._id === projectId);
      if (!originalProject) {
        throw new Error('Проект не найден');
      }

      // Сначала обновляем локальное состояние для мгновенной реакции
      setProjects(prev =>
        prev.map(p =>
          p._id === projectId 
            ? { 
                ...p, 
                status: targetStatus.name,
                statusId: {
                  _id: targetStatus._id,
                  name: targetStatus.name,
                  color: targetStatus.color,
                  order: targetStatus.order
                }
              } 
            : p
        )
      );

      // Отправляем обновление на сервер
      await updateProjectStatus(projectId, targetStatusId);
      console.log(`✅ Проект успешно перемещен в статус ${statusName}`);
      
    } catch (err) {
      console.error('❌ Ошибка обновления статуса:', err);
      
      // Находим оригинальный проект для отката
      const originalProject = projects.find(p => p._id === projectId);
      
      // Откатываем изменения в случае ошибки
      if (originalProject) {
        setProjects(prev =>
          prev.map(p =>
            p._id === projectId 
              ? originalProject
              : p
          )
        );
      }
      
      throw err; // Пробрасываем ошибку дальше для обработки в UI
    }
  };

  // Простая проверка что DndContext вообще работает
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎉 SUCCESS! DRAG STARTED!', event);
    const { active } = event;
    const project = projects.find(p => p._id === active.id);
    setActiveProject(project || null);
    console.log('Project found:', project?.name);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    console.log('🔄 Drag over:', {
      activeId: active.id,
      overId: over?.id,
      hasTarget: !!over
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🏁 Drag end:', {
      activeId: active.id,
      overId: over?.id,
      hasTarget: !!over
    });
    
    setActiveProject(null);
    
    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const projectId = active.id as string;
    const targetStatusId = over.id as string;
    
    // Найти целевой статус
    const targetStatus = statuses.find(status => String(status._id) === targetStatusId);
    if (!targetStatus) {
      console.error('❌ Target status not found:', targetStatusId);
      return;
    }

    // Найти проект
    const project = projects.find(p => p._id === projectId);
    if (!project) {
      console.error('❌ Project not found:', projectId);
      return;
    }

    // Проверить, изменился ли статус
    if (project.statusId?._id === targetStatusId) {
      console.log('❌ Same status, no change needed');
      return;
    }

    console.log('🔄 Moving project:', project.name, 'to status:', targetStatus.name);
    
    // Обновляем локальное состояние
    setProjects(prev =>
      prev.map(p =>
        p._id === projectId 
          ? { 
              ...p, 
              status: targetStatus.name,
              statusId: {
                _id: targetStatus._id,
                name: targetStatus.name,
                color: targetStatus.color,
                order: targetStatus.order
              }
            } 
          : p
      )
    );

    // Отправляем обновление на сервер
    try {
      await updateProjectStatus(projectId, targetStatusId);
      console.log(`✅ Проект успешно перемещен в статус ${targetStatus.name}`);
    } catch (err) {
      console.error('❌ Ошибка обновления статуса:', err);
      setError('Не удалось обновить статус проекта');
      setTimeout(() => setError(null), 3000);
      
      // Откатываем изменения в случае ошибки
      setProjects(prev =>
        prev.map(p =>
          p._id === projectId 
            ? { 
                ...p, 
                status: project.status,
                statusId: project.statusId
              } 
            : p
        )
      );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#666' }}>Загрузка проектов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#d32f2f' }}>Ошибка: {error}</div>
      </div>
    );
  }

  // Рендеринг мобильной версии
  const renderMobileView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ padding: '0 8px', height: '100%' }}>
        {/* Уведомление об ошибке */}
        {error && (
          <div style={{
            background: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#d32f2f',
            fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Выпадающее меню статусов для мобайла */}
        <div className="status-menu" style={{ marginBottom: 16, position: 'relative' }}>
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: 6, 
                  background: statuses[selectedStatusIndex]?.color || '#ccc',
                  marginRight: 8 
                }} 
              />
              {statuses[selectedStatusIndex]?.name || 'Выберите статус'}
              <span style={{ 
                marginLeft: 8,
                background: '#e0e0e0',
                borderRadius: 12,
                padding: '2px 6px',
                fontSize: 11
              }}>
                {projectsByStatus[statuses[selectedStatusIndex]?._id]?.length || 0}
              </span>
            </span>
            <span style={{ fontSize: 12 }}>{showStatusMenu ? '▲' : '▼'}</span>
          </button>

          {showStatusMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: Math.min(
                statuses.length * 48 + 16,
                Math.max(window.innerHeight - 280, 200)
              ),
              overflowY: statuses.length * 48 + 16 > window.innerHeight - 280 ? 'auto' : 'visible'
            }}>
              {statuses.map((status, index) => (
                <div
                  key={status._id}
                  onClick={() => {
                    setSelectedStatusIndex(index);
                    setShowStatusMenu(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: index === selectedStatusIndex ? '#f0f8ff' : 'transparent',
                    borderBottom: index < statuses.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: 6, 
                        background: status.color,
                        marginRight: 8 
                      }} 
                    />
                    {status.name}
                  </span>
                  <span style={{ 
                    background: '#e0e0e0',
                    borderRadius: 12,
                    padding: '2px 6px',
                    fontSize: 11
                  }}>
                    {projectsByStatus[status._id]?.length || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Одна колонка для выбранного статуса */}
        {statuses[selectedStatusIndex] && (
          <DroppableStatus 
            status={statuses[selectedStatusIndex]}
            projects={projectsByStatus[statuses[selectedStatusIndex]._id] || []}
            onProjectEdit={onProjectEdit}
            onProjectMove={handleProjectMove}
            isDesktop={false}
          />
        )}
      </div>
      
      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );

  // Рендеринг десктопной версии
  const renderDesktopView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ 
        padding: '16px', 
        height: '100%', 
        position: 'relative',
        minHeight: '100%'
      }}>
        {/* Уведомление об ошибке */}
        {error && (
          <div style={{
            background: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#d32f2f',
            fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <div 
          className="kanban-board"
          style={{ 
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: 8,
            paddingBottom: 16,
            paddingRight: 16,
            minHeight: '200px',
            height: '100%',
            minWidth: 'fit-content',
            scrollbarWidth: 'thin',
            scrollbarColor: '#c1c1c1 #f1f1f1'
          }}
        >
          {statuses.map(status => (
            <DroppableStatus 
              key={status._id}
              status={status}
              projects={projectsByStatus[status._id] || []}
              onProjectEdit={onProjectEdit}
              onProjectMove={handleProjectMove}
              isDesktop={true}
            />
          ))}
        </div>
      </div>
      
      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );

  // Возвращаем соответствующую версию в зависимости от размера экрана
  return (
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}
      {/* CSS стили для улучшения скроллбара */}
      <style>{`
        /* Минимальные стили скроллбара */
        .kanban-board::-webkit-scrollbar {
          height: 8px;
        }
        .kanban-board::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-board::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .kanban-board::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </>
  );
};

export default KanbanBoard; 