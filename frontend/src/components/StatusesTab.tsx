import React, { useState, useEffect } from 'react';
import type { User } from '../types/User';

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
        setError(errorData.error || 'Ошибка создания статуса');
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
        setError(errorData.error || 'Ошибка обновления статуса');
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

  // Изменение порядка статусов
  const handleReorderStatuses = async (currentIndex: number, newIndex: number) => {
    if (currentIndex === newIndex) return;

    // Создаем копию массива для изменения порядка
    const reorderedStatuses = [...statuses];
    
    // Удаляем элемент из текущей позиции
    const [movedStatus] = reorderedStatuses.splice(currentIndex, 1);
    
    // Вставляем элемент в новую позицию
    reorderedStatuses.splice(newIndex, 0, movedStatus);

    // Создаем массив для отправки на сервер с новыми порядковыми номерами
    const statusOrder = reorderedStatuses.map((status, index) => ({
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
        // Обновляем локальное состояние сразу для отзывчивости
        setStatuses(reorderedStatuses.map((status, index) => ({
          ...status,
          order: index + 1
        })));
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
    <div style={{ padding: 16 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#000' }}>
          Управление статусами
        </h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: '#646cff',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Добавить статус
        </button>
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: '#ffebee',
          color: '#c62828',
          borderRadius: 6,
          marginBottom: 16,
          border: '1px solid #ffcdd2'
        }}>
          {error}
        </div>
      )}

      <div style={{
        border: '1px solid #eee',
        borderRadius: 8,
        background: '#fff',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', color: '#000' }}>
                Порядок
              </th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', color: '#000' }}>
                Статус
              </th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', color: '#000' }}>
                Цвет
              </th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', color: '#000' }}>
                Проектов
              </th>
              <th style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee', color: '#000' }}>
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {statuses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ 
                  padding: 24, 
                  textAlign: 'center', 
                  color: '#888',
                  fontStyle: 'italic'
                }}>
                  Нет статусов
                </td>
              </tr>
            ) : (
              statuses.map((status, index) => (
                <tr key={status._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12, color: '#000' }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ minWidth: 20, fontWeight: 500 }}>{status.order}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button
                          onClick={() => handleReorderStatuses(index, Math.max(0, index - 1))}
                          disabled={index === 0}
                          title={index === 0 ? 'Уже первый' : 'Переместить выше'}
                          style={{
                            width: 20,
                            height: 16,
                            padding: 0,
                            border: 'none',
                            background: index === 0 ? '#ccc' : '#646cff',
                            color: '#fff',
                            fontSize: 12,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleReorderStatuses(index, Math.min(statuses.length - 1, index + 1))}
                          disabled={index === statuses.length - 1}
                          title={index === statuses.length - 1 ? 'Уже последний' : 'Переместить ниже'}
                          style={{
                            width: 20,
                            height: 16,
                            padding: 0,
                            border: 'none',
                            background: index === statuses.length - 1 ? '#ccc' : '#646cff',
                            color: '#fff',
                            fontSize: 12,
                            cursor: index === statuses.length - 1 ? 'not-allowed' : 'pointer',
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 12, color: '#000' }}>
                    {editingStatus?._id === status._id ? (
                      <input
                        type="text"
                        value={editingStatus.name}
                        onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ccc',
                          borderRadius: 4,
                          fontSize: 14,
                          color: '#000',
                          background: '#fff'
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 500, color: '#000' }}>{status.name}</span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    {editingStatus?._id === status._id ? (
                      <input
                        type="color"
                        value={editingStatus.color}
                        onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                        style={{ width: 40, height: 30, border: 'none', borderRadius: 4 }}
                      />
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            background: status.color,
                            border: '1px solid #ccc'
                          }}
                        />
                        <span style={{ fontSize: 12, color: '#666' }}>{status.color}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: '2px 8px',
                      background: status.projectCount ? '#e3f2fd' : '#f5f5f5',
                      color: status.projectCount ? '#1976d2' : '#666',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      {status.projectCount || 0}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {editingStatus?._id === status._id ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={handleUpdateStatus}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 4,
                            background: '#4caf50',
                            color: '#fff',
                            border: 'none',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => {
                            setEditingStatus(null);
                            setError('');
                          }}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 4,
                            background: '#f44336',
                            color: '#fff',
                            border: 'none',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={() => setEditingStatus(status)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 4,
                            background: '#646cff',
                            color: '#fff',
                            border: 'none',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => handleDeleteStatus(status)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 4,
                            background: '#f44336',
                            color: '#fff',
                            border: 'none',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
            borderRadius: 8,
            padding: 24,
            width: 400,
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#000' }}>
              Добавить новый статус
            </h3>
            
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
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  color: '#000',
                  background: '#fff'
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
                  style={{ width: 60, height: 40, border: 'none', borderRadius: 4 }}
                />
                <input
                  type="text"
                  value={newStatus.color}
                  onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontSize: 14,
                    color: '#000',
                    background: '#fff'
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
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleCreateStatus}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#646cff',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Мобильные стили */}
      <style>{`
        @media (max-width: 768px) {
          table th,
          table td,
          table input,
          table button,
          table span,
          table div {
            color: #000 !important;
          }
          
          input[type="text"],
          input[type="color"] {
            background: #fff !important;
            color: #000 !important;
            border: 1px solid #ccc !important;
          }
          
          button:not([disabled]) {
            color: #fff !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StatusesTab; 