import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
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
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

interface KanbanBoardProps {
  companyId: string;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  companyId, 
  onProjectEdit: _onProjectEdit, // eslint-disable-line @typescript-eslint/no-unused-vars
  onProjectDelete: _onProjectDelete // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

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

  // Группировка проектов по статусам
  const projectsByStatus = statuses.reduce((acc, status) => {
    acc[status._id] = projects.filter(project => 
      // Сравниваем по statusId._id если есть, иначе по названию статуса
      project.statusId?._id === status._id || 
      (project.status === status.name && !project.statusId)
    );
    return acc;
  }, {} as Record<string, Project[]>);

  // Обработка drag & drop
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Если проект остался в той же колонке
    if (source.droppableId === destination.droppableId) {
      return;
    }

    // Найти статус назначения
    const targetStatus = statuses.find(status => status._id === destination.droppableId);
    if (!targetStatus) return;

    const projectId = result.draggableId;
    
    try {
      // Обновляем локальное состояние сразу для лучшего UX
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project._id === projectId 
            ? { 
                ...project, 
                status: targetStatus.name,
                statusId: {
                  _id: targetStatus._id,
                  name: targetStatus.name,
                  color: targetStatus.color,
                  order: targetStatus.order
                }
              }
            : project
        )
      );

      // Отправляем обновление на сервер
      await updateProjectStatus(projectId, targetStatus._id);
      
      console.log(`✅ Проект ${projectId} перемещен в статус ${targetStatus.name}`);
    } catch (err) {
      console.error('Ошибка обновления статуса проекта:', err);
      
      // Откатываем изменения в случае ошибки
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project._id === projectId 
            ? { 
                ...project, 
                status: statuses.find(s => s._id === source.droppableId)?.name || project.status
              }
            : project
        )
      );
      
      // Показываем ошибку пользователю
      setError('Не удалось обновить статус проекта. Попробуйте еще раз.');
      
      // Автоматически скрываем ошибку через 3 секунды
      setTimeout(() => setError(null), 3000);
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
            // Динамически рассчитываем максимальную высоту, чтобы меню помещалось на экране
            maxHeight: Math.min(
              statuses.length * 48 + 16, // 48px на статус + отступы (16px)
              Math.max(
                window.innerHeight - 280, // Высота экрана минус header, кнопка, отступы
                200 // Минимальная высота
              )
            ),
            // Убираем overflowY, так как теперь все статусы должны помещаться
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <div style={{
            background: '#f8f9fa',
            borderRadius: 12,
            padding: 12,
            minHeight: 'calc(100vh - 320px)',
            maxHeight: 'calc(100vh - 320px)',
            overflowY: 'auto'
          }}>
            <Droppable droppableId={statuses[selectedStatusIndex]._id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: 'calc(100vh - 350px)',
                    background: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                    borderRadius: 8,
                    padding: 4,
                    transition: 'background 0.2s'
                  }}
                >
                  {projectsByStatus[statuses[selectedStatusIndex]._id]?.map((project, index) => (
                    <Draggable key={project._id} draggableId={project._id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            marginBottom: 8,
                            background: '#fff',
                            borderRadius: 8,
                            padding: 12,
                            border: '1px solid #e0e0e0',
                            boxShadow: snapshot.isDragging 
                              ? '0 4px 12px rgba(0,0,0,0.15)' 
                              : '0 1px 3px rgba(0,0,0,0.1)',
                            cursor: 'grab',
                            fontSize: 13
                          }}
                        >
                          <div style={{ marginBottom: 6 }}>
                            <h4 style={{ 
                              fontSize: 14, 
                              fontWeight: 600, 
                              margin: 0,
                              color: '#333',
                              lineHeight: 1.3
                            }}>
                              {project.name || 'Без названия'}
                            </h4>
                          </div>
                          
                          {project.customer && (
                            <div style={{ 
                              fontSize: 12, 
                              color: '#666',
                              marginBottom: 4
                            }}>
                              👤 {project.customer}
                            </div>
                          )}
                          
                          {project.price && (
                            <div style={{ 
                              fontSize: 12, 
                              color: '#666',
                              marginBottom: 4,
                              fontWeight: 500
                            }}>
                              💰 {project.price} ₾
                            </div>
                          )}
                          
                          <div style={{ 
                            fontSize: 11, 
                            color: '#999',
                            marginTop: 6
                          }}>
                            {new Date(project.createdAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}
    </div>
  );

  // Рендеринг десктопной версии
  const renderDesktopView = () => (
    <div style={{ padding: '0 8px', height: '100%', position: 'relative' }}>
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
      
      {/* Подсказка о горизонтальном скролле */}
      {statuses.length > 4 && (
        <div style={{
          background: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: 8,
          padding: 8,
          marginBottom: 16,
          color: '#1976d2',
          fontSize: 13,
          textAlign: 'center'
        }}>
          ← → Используйте горизонтальный скролл или колесо мыши для просмотра всех статусов
        </div>
      )}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div 
          className="kanban-board"
          style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: 8,
            paddingBottom: 16,
            paddingRight: 8, // Добавляем отступ справа для лучшего скролла
            minHeight: 'calc(100vh - 200px)',
            width: '100%', // Ограничиваем ширину viewport'ом
            maxWidth: '100vw', // Не даем расширяться больше экрана
            scrollbarWidth: 'thin',
            scrollbarColor: '#c1c1c1 #f1f1f1'
          }}
        >
          {statuses.map(status => (
            <div 
              key={status._id}
              className="kanban-column"
              style={{ 
                // Фиксированная ширина для обеспечения горизонтального скролла
                flex: '0 0 auto', // Не растягиваем колонки
                width: window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px',
                minWidth: window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px',
                background: '#f8f9fa',
                borderRadius: 12,
                padding: 8,
                height: 'calc(100vh - 250px)', // Фиксированная высота вместо min/max
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden', // Убираем скролл у самой колонки
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {/* Заголовок колонки */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '2px solid #e0e0e0',
                flexShrink: 0 // Заголовок не сжимается
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
                  {projectsByStatus[status._id]?.length || 0}
                </span>
              </div>

              {/* Дропзона для проектов */}
              <Droppable droppableId={status._id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1, // Занимает все оставшееся место
                      background: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                      borderRadius: 8,
                      padding: 4,
                      transition: 'background 0.2s',
                      overflowY: 'auto', // Скролл только здесь, при необходимости
                      minHeight: 0 // Позволяет flex контейнеру сжиматься
                    }}
                  >
                    {projectsByStatus[status._id]?.map((project, index) => (
                      <Draggable key={project._id} draggableId={project._id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              marginBottom: 8,
                              background: '#fff',
                              borderRadius: 8,
                              padding: 12,
                              border: '1px solid #e0e0e0',
                              boxShadow: snapshot.isDragging 
                                ? '0 4px 12px rgba(0,0,0,0.15)' 
                                : '0 1px 3px rgba(0,0,0,0.1)',
                              cursor: 'grab',
                              fontSize: 13
                            }}
                          >
                            {/* Карточка проекта */}
                            <div style={{ marginBottom: 6 }}>
                              <h4 style={{ 
                                fontSize: 13, 
                                fontWeight: 600, 
                                margin: 0,
                                color: '#333',
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {project.name || 'Без названия'}
                              </h4>
                            </div>
                            
                            {project.customer && (
                              <div style={{ 
                                fontSize: 11, 
                                color: '#666',
                                marginBottom: 4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                👤 {project.customer}
                              </div>
                            )}
                            
                            {project.price && (
                              <div style={{ 
                                fontSize: 11, 
                                color: '#666',
                                marginBottom: 4,
                                fontWeight: 500
                              }}>
                                💰 {project.price} ₾
                              </div>
                            )}
                            
                            <div style={{ 
                              fontSize: 10, 
                              color: '#999',
                              marginTop: 6
                            }}>
                              {new Date(project.createdAt).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
      
      {/* Индикатор горизонтального скролла */}
      {statuses.length > 4 && (
        <div 
          style={{
            position: 'absolute',
            top: 80,
            right: 8,
            bottom: 16,
            width: 20,
            background: 'linear-gradient(to left, rgba(255,255,255,0.8) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: '0 8px 8px 0'
          }}
        />
      )}
    </div>
  );

  // Возвращаем соответствующую версию в зависимости от размера экрана
  return (
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}
      {/* CSS стили для улучшения скроллбара */}
      <style>{`
        /* Стили горизонтального скроллбара */
        .kanban-board::-webkit-scrollbar {
          height: 8px;
          display: block;
        }
        .kanban-board::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .kanban-board::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .kanban-board::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        /* Обеспечиваем видимость горизонтального скролла на всех устройствах */
        .kanban-board {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
          overflow-x: auto;
        }
        
        /* Стили для вертикального скроллбара в колонках */
        .kanban-column div[data-rfd-droppable-id]::-webkit-scrollbar {
          width: 6px;
        }
        .kanban-column div[data-rfd-droppable-id]::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-column div[data-rfd-droppable-id]::-webkit-scrollbar-thumb {
          background: #d0d0d0;
          border-radius: 3px;
        }
        .kanban-column div[data-rfd-droppable-id]::-webkit-scrollbar-thumb:hover {
          background: #b0b0b0;
        }
        
        /* Для Firefox */
        .kanban-column div[data-rfd-droppable-id] {
          scrollbar-width: thin;
          scrollbar-color: #d0d0d0 transparent;
        }
      `}</style>
    </>
  );
};

export default KanbanBoard; 