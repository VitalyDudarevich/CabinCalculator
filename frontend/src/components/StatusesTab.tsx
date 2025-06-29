import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import { FaUserEdit, FaRegTrashAlt } from 'react-icons/fa';
// Типы уже определены в компоненте

interface Status {
  _id: string;
  name: string;
  color: string;
  order: number;
  companyId: string;
  isDefault: boolean;
  isActive: boolean;
  projectCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface StatusesTabProps {
  selectedCompanyId: string;
  fetchWithAuth: (url: string, options?: RequestInit, retry?: boolean) => Promise<Response>;
  onRefreshStatuses?: () => void;
}

// Компонент для сортируемой карточки статуса
interface SortableStatusCardProps {
  status: Status;
  editingStatus: Status | null;
  onEdit: (status: Status) => void;
  onUpdate: () => void;
  onCancel: () => void;
  onDelete: (status: Status) => void;
  setEditingStatus: (status: Status | null) => void;
  isOverlay?: boolean;
}

const SortableStatusCard: React.FC<SortableStatusCardProps> = ({
  status,
  editingStatus,
  onEdit,
  onUpdate,
  onCancel,
  onDelete,
  setEditingStatus,
  isOverlay = false
}) => {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: status._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const isEditing = editingStatus?._id === status._id;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={isOverlay ? 'drag-overlay' : ''}
      data-status-card={status._id}
    >
      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 12,
        marginBottom: 12,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        ...(isDragging ? {
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          borderColor: '#646cff'
        } : {})
      }}>
        {/* Область для drag & drop - вся карточка кроме кнопок */}
        <div 
          {...attributes}
          {...listeners}
          style={{
            padding: 16,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          {/* Заголовок с количеством проектов */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginBottom: 12
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ fontSize: 12, color: '#888' }}>Проектов:</span>
              <span style={{
                padding: '4px 12px',
                background: status.projectCount ? '#e3f2fd' : '#f5f5f5',
                color: status.projectCount ? '#1976d2' : '#666',
                borderRadius: 16,
                fontSize: 13,
                fontWeight: 600
              }}>
                {status.projectCount || 0}
              </span>
            </div>
          </div>

          {/* Основная информация о статусе */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            {/* Цвет статуса */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {isEditing ? (
                <input
                  type="color"
                  value={editingStatus.color}
                  onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    border: 'none', 
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: status.color,
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
              )}
            </div>

            {/* Название статуса и иконки действий */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div style={{ flex: 1 }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingStatus.name}
                    onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #646cff',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#000',
                      background: '#fff',
                      outline: 'none'
                    }}
                    placeholder="Название статуса"
                    autoFocus
                  />
                ) : (
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 18, 
                    fontWeight: 600, 
                    color: '#000' 
                  }}>
                    {status.name}
                  </h3>
                )}
              </div>

              {/* Иконки действий рядом с названием */}
              {!isEditing && (
                <div style={{
                  display: 'flex',
                  gap: 4,
                  marginLeft: 16
                }}>
                  <span 
                    title="Редактировать" 
                    onClick={() => onEdit(status)} 
                    style={{ 
                      display: 'inline-block', 
                      width: 16, 
                      height: 16, 
                      verticalAlign: 'middle', 
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 6,
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FaUserEdit color="#888" size={16} />
                  </span>
                  <span 
                    title="Удалить" 
                    onClick={() => onDelete(status)} 
                    style={{ 
                      display: 'inline-block', 
                      width: 16, 
                      height: 16, 
                      verticalAlign: 'middle', 
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 6,
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ffebee';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <FaRegTrashAlt color="#888" size={16} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Кнопки сохранения/отмены при редактировании */}
          {isEditing && (
            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              padding: '0 16px 16px 16px',
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12
            }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  background: '#f5f5f5',
                  color: '#666',
                  border: '1px solid #ddd',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
              >
                Отмена
              </button>
              <button
                onClick={onUpdate}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#45a049';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#4caf50';
                }}
              >
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusesTab: React.FC<StatusesTabProps> = ({
  selectedCompanyId,
  fetchWithAuth,
  onRefreshStatuses
}) => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: '',
    color: '#646cff'
  });
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedCardWidth, setDraggedCardWidth] = useState<number | null>(null);

  // Настройка сенсоров для drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Начинаем драг только после движения на 8px
      },
    }),
  );

  // Загрузка статусов
  const loadStatuses = async () => {
    if (!selectedCompanyId || selectedCompanyId === 'all') return;
    
    setLoading(true);
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/statuses/stats?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
      } else {
        console.error('Failed to load statuses');
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, [selectedCompanyId]);

  // Создание нового статуса
  const handleCreateStatus = async () => {
    if (!newStatus.name.trim()) {
      setError('Введите название статуса');
      return;
    }

    try {
      const res = await fetchWithAuth('http://localhost:5000/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStatus,
          companyId: selectedCompanyId
        })
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewStatus({ name: '', color: '#646cff' });
        setError('');
        loadStatuses();
        onRefreshStatuses?.();
      } else {
        const errorData = await res.json();
        let russianError = errorData.error || 'Ошибка создания статуса';
        
        // Переводим английские ошибки на русский
        if (russianError.includes('Status with this name already exists')) {
          russianError = 'Статус с таким названием уже существует для этой компании';
        }
        
        setError(russianError);
      }
    } catch (error) {
      console.error('Error creating status:', error);
      setError('Ошибка создания статуса');
    }
  };

  // Обновление статуса
  const handleUpdateStatus = async () => {
    if (!editingStatus || !editingStatus.name.trim()) {
      setError('Введите название статуса');
      return;
    }

    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/statuses/${editingStatus._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStatus.name,
          color: editingStatus.color,
          order: editingStatus.order
        })
      });

      if (res.ok) {
        setEditingStatus(null);
        setError('');
        loadStatuses();
        onRefreshStatuses?.();
      } else {
        const errorData = await res.json();
        let russianError = errorData.error || 'Ошибка обновления статуса';
        
        // Переводим английские ошибки на русский
        if (russianError.includes('Status with this name already exists')) {
          russianError = 'Статус с таким названием уже существует для этой компании';
        }
        
        setError(russianError);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Ошибка обновления статуса');
    }
  };

  // Удаление статуса
  const handleDeleteStatus = async (status: Status) => {
    if (status.projectCount && status.projectCount > 0) {
      alert(`Нельзя удалить статус "${status.name}" - в нём находится ${status.projectCount} проект(ов). Сначала переместите все проекты в другие статусы.`);
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить статус "${status.name}"?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/statuses/${status._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadStatuses();
        onRefreshStatuses?.();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Ошибка удаления статуса');
      }
    } catch (error) {
      console.error('Error deleting status:', error);
      alert('Ошибка удаления статуса');
    }
  };

  // Изменение порядка статусов через drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const status = statuses.find(s => s._id === active.id);
    setActiveStatus(status || null);
    
    // Вычисляем offset курсора относительно карточки и сохраняем ширину
    const activatorEvent = event.activatorEvent as PointerEvent;
    if (activatorEvent) {
      // Найдем элемент карточки по data-атрибуту
      const cardElement = document.querySelector(`[data-status-card="${active.id}"]`);
      
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const offsetX = activatorEvent.clientX - rect.left;
        const offsetY = activatorEvent.clientY - rect.top;
        setDragOffset({ x: offsetX, y: offsetY });
        
        // Сохраняем ширину карточки для точного соответствия в DragOverlay
        setDraggedCardWidth(rect.width);
      } else {
        // Fallback: курсор в центре карточки
        setDragOffset({ x: 200, y: 40 }); // примерные размеры карточки
        setDraggedCardWidth(null);
      }
    }
    
    // Устанавливаем курсор grabbing на документ
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.classList.add('dragging-active');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveStatus(null);
    setDragOffset(null);
    setDraggedCardWidth(null);
    
    // Сбрасываем курсор на документе
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.classList.remove('dragging-active');
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = statuses.findIndex(status => status._id === active.id);
    const newIndex = statuses.findIndex(status => status._id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Создаем копию массива для изменения порядка
    const reorderedStatuses = [...statuses];
    
    // Удаляем элемент из текущей позиции
    const [movedStatus] = reorderedStatuses.splice(oldIndex, 1);
    
    // Вставляем элемент в новую позицию
    reorderedStatuses.splice(newIndex, 0, movedStatus);

    // Обновляем локальное состояние сразу для отзывчивости
    const updatedStatuses = reorderedStatuses.map((status, index) => ({
      ...status,
      order: index + 1
    }));
    setStatuses(updatedStatuses);

    // Создаем массив для отправки на сервер с новыми порядковыми номерами
    const statusOrder = updatedStatuses.map((status, index) => ({
      id: status._id,
      order: index + 1
    }));

    try {
      const res = await fetchWithAuth('http://localhost:5000/api/statuses/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusOrder })
      });

      if (res.ok) {
        onRefreshStatuses?.();
      } else {
        console.error('Failed to reorder statuses');
        // В случае ошибки перезагружаем с сервера
        loadStatuses();
      }
    } catch (error) {
      console.error('Error reordering statuses:', error);
      // В случае ошибки перезагружаем с сервера
      loadStatuses();
    }
  };

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}>Загрузка статусов...</div>;
  }

  return (
    <>
      <div style={{
        minHeight: 500,
        width: '100%'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          gap: 16
        }}>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#000', flex: 1 }}>
            Управление статусами
          </h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              background: '#fff',
              color: '#646cff',
              border: '2px solid #646cff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f6f8ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            + Добавить статус
          </button>
        </div>

        {error && (
          <div style={{
            padding: 16,
            background: '#ffebee',
            color: '#c62828',
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #ffcdd2',
            fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
          {statuses.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#888',
            fontSize: 16,
            fontStyle: 'italic',
            background: '#f9f9f9',
            borderRadius: 12,
            border: '2px dashed #ddd'
          }}>
            Нет статусов. Добавьте первый статус для начала работы.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={statuses.map(s => s._id)} 
              strategy={verticalListSortingStrategy}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0
              }}>
                {statuses.map((status) => (
                  <SortableStatusCard
                    key={status._id}
                    status={status}
                    editingStatus={editingStatus}
                    onEdit={setEditingStatus}
                    onUpdate={handleUpdateStatus}
                    onCancel={() => {
                      setEditingStatus(null);
                      setError('');
                    }}
                    onDelete={handleDeleteStatus}
                    setEditingStatus={setEditingStatus}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeStatus ? (
                <div style={{
                  transform: 'rotate(3deg)',
                  opacity: 0.95,
                  width: draggedCardWidth ? `${draggedCardWidth}px` : '100%',
                  maxWidth: draggedCardWidth ? `${draggedCardWidth}px` : '800px',
                  ...(dragOffset ? {
                    marginLeft: -dragOffset.x,
                    marginTop: -dragOffset.y
                  } : {})
                }}>
                  <SortableStatusCard
                    status={activeStatus}
                    editingStatus={null}
                    onEdit={() => {}}
                    onUpdate={() => {}}
                    onCancel={() => {}}
                    onDelete={() => {}}
                    setEditingStatus={() => {}}
                    isOverlay={true}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Модальное окно добавления статуса */}
        {isAddModalOpen && (
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
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 450,
              maxWidth: '90vw',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 600, color: '#000' }}>
                Добавить новый статус
              </h3>
              
              {error && (
                <div style={{
                  padding: 12,
                  background: '#ffebee',
                  color: '#c62828',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid #ffcdd2',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#000' }}>
                  Название статуса
                </label>
                <input
                  type="text"
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                  placeholder="Введите название статуса"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 16,
                    color: '#000',
                    background: '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#646cff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#000' }}>
                  Цвет статуса
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    style={{ width: 60, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    placeholder="#646cff"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: 8,
                      fontSize: 16,
                      color: '#000',
                      background: '#fff',
                      fontFamily: 'monospace',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#646cff';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setNewStatus({ name: '', color: '#646cff' });
                    setError('');
                  }}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 8,
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateStatus}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 8,
                    background: '#646cff',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5a5fcf';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#646cff';
                  }}
                >
                  Создать статус
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* CSS стили для drag & drop */}
      <style>{`
        /* Принудительный курсор во время драга */
        body.dragging-active,
        body.dragging-active *,
        body.dragging-active *:hover {
          cursor: grabbing !important;
          user-select: none !important;
        }
        
        /* Стили для drag overlay */
        .drag-overlay {
          pointer-events: none;
        }
        
        /* Мобильные стили для видимости текста */
        @media (max-width: 768px) {
          .StatusesTab div,
          .StatusesTab h2,
          .StatusesTab h3,
          .StatusesTab span,
          .StatusesTab label {
            color: #000 !important;
          }
          
          .StatusesTab input {
            color: #000 !important;
            background: #fff !important;
          }
          
          .StatusesTab button {
            color: #fff !important;
          }
        }
      `}</style>
    </>
  );
};

export default StatusesTab; 