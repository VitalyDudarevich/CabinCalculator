import React, { useState } from 'react';
import { FaUserEdit, FaRegTrashAlt } from 'react-icons/fa';
import type { DraftProjectData } from './CalculationDetails';

export interface Project {
  _id: string;
  name: string;
  customer?: string;
  createdAt: string;
  status?: string;
  statusId?: {
    _id: string;
    name: string;
    color: string;
    order: number;
  };
  price?: number;
  data?: DraftProjectData;
  priceHistory?: { price: number; date: string }[];
  statusHistory?: { status: string; statusId?: string; date: string }[];
  // ... другие поля
}

interface ProjectHistoryProps {
  user?: { username: string; role: string } | null;
  projects?: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const STATUS_LABELS: Record<string, string> = {
  'Рассчет': 'Рассчёт',
  'Согласован': 'Согласован',
  'Заказан': 'Заказан',
  'Стекло Доставлено': 'Стекло доставлено',
  'Установка': 'Установка',
  'Установлено': 'Установлено',
  'Оплачено': 'Оплачено',
};
const STATUS_COLORS: Record<string, string> = {
  'Рассчет': '#bdbdbd',
  'Согласован': '#1976d2',
  'Заказан': '#ffa000',
  'Стекло Доставлено': '#00bcd4',
  'Установка': '#7b1fa2',
  'Установлено': '#388e3c',
  'Оплачено': '#388e3c',
};

const configLabels: Record<string, string> = {
  glass: 'Стационарное стекло',
  straight: 'Прямая раздвижная',
  'straight-opening': 'Прямая раздвижная',
  'straight-glass': 'Прямая раздвижная',
  corner: 'Угловая раздвижная',
  unique: 'Уникальная конфигурация',
  partition: 'Перегородка',
};

const ProjectHistory: React.FC<ProjectHistoryProps> = ({ user, projects = [], onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  if (!user) {
    return (
      <div className="project-history-auth" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, minWidth: 260, minHeight: 120, width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 12, color: '#000' }}>История проектов</div>
        <input
          type="text"
          placeholder="Поиск по имени, заказчику или конфигурации..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="auth-search-input"
          style={{
            width: '100%',
            maxWidth: 260,
            marginBottom: 16,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            fontSize: 16,
            boxSizing: 'border-box',
          }}
        />
        <div className="auth-message-container" style={{ width: '100%', maxWidth: 260 }}>
          <div style={{ color: '#222', textAlign: 'center', marginTop: 24 }}>Авторизируйтесь, чтобы видеть историю проектов</div>
        </div>
        <style>{`
          @media (max-width: 768px) {
            .project-history-auth {
              display: block !important;
              visibility: visible !important;
              width: 100vw !important;
              max-width: 100vw !important;
              padding: 16px !important;
              margin: 0 !important;
              border-radius: 0 !important;
              background: #fff !important;
              box-shadow: none !important;
              min-height: 150px !important;
              position: relative !important;
              z-index: 1 !important;
              box-sizing: border-box !important;
              overflow-x: hidden !important;
              left: 0 !important;
              right: 0 !important;
              border-top: 1px solid #eee !important;
            }
            .auth-search-input {
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
            .auth-message-container {
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
          }
        `}</style>
      </div>
    );
  }

  const filtered = search.trim()
    ? projects.filter(p => {
        const searchTerm = search.trim().toLowerCase();
        const nameMatch = p.name && p.name.toLowerCase().includes(searchTerm);
        const customerMatch = p.customer && p.customer.toLowerCase().includes(searchTerm);
        const configMatch = p.data?.config && (
          p.data.config.toLowerCase().includes(searchTerm) ||
          (configLabels[p.data.config] && configLabels[p.data.config].toLowerCase().includes(searchTerm))
        );
        return nameMatch || customerMatch || configMatch;
      })
    : projects;

  return (
    <div className="project-history-container" style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 700, color: '#000' }}>История проектов</h2>
      <input
        type="text"
        placeholder="Поиск по имени, заказчику или конфигурации..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="project-search-input"
        style={{
          width: '100%',
          maxWidth: 260,
          marginBottom: 16,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #ccc',
          fontSize: 16,
          boxSizing: 'border-box',
        }}
      />
      <div className="project-list-container" style={{ width: '100%', maxWidth: 260 }}>
        {filtered.length === 0 ? (
          <div style={{ color: '#222', textAlign: 'center', marginTop: 24 }}>Нет проектов</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(project => (
              <div key={project._id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafbff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 15, color: '#000' }}>
                    <span style={{ display: 'inline-block', minWidth: 12, minHeight: 12, borderRadius: 6, background: project.statusId?.color || STATUS_COLORS[project.status || 'Рассчет'] || '#bdbdbd', marginRight: 8, verticalAlign: 'middle' }} />
                    {project.statusId?.name || STATUS_LABELS[project.status || 'Рассчет'] || project.status || 'Рассчёт'}
                  </span>
                  <span>
                    <span title="Редактировать" onClick={() => onEdit && onEdit(project)} style={{ display: 'inline-block', marginRight: 10, width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                      <FaUserEdit color="#888" size={16} />
                    </span>
                    <span title="Удалить" onClick={() => onDelete && onDelete(project)} style={{ display: 'inline-block', width: 16, height: 16, verticalAlign: 'middle', cursor: 'pointer' }}>
                      <FaRegTrashAlt color="#888" size={16} />
                    </span>
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, wordBreak: 'break-word', color: '#000' }}>
                  {project.name}
                  {project.data?.config && (
                    <span style={{ color: '#666', fontWeight: 400, fontSize: 16 }}>
                      {' '}({configLabels[project.data.config] || project.data.config})
                    </span>
                  )}
                </div>
                {project.customer && (
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 8, fontStyle: 'italic' }}>
                    <strong>Заказчик:</strong> {project.customer}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: '#222', fontWeight: 700, fontSize: 16 }}>Сумма:</span>
                  <span style={{ color: '#222', fontWeight: 700, fontSize: 16 }}>{typeof project.price === 'number' ? project.price.toLocaleString('ru-RU') : 0} GEL</span>
                </div>
                <div style={{ color: '#888', fontSize: 13 }}>{new Date(project.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .project-history-container {
            display: block !important;
            visibility: visible !important;
            width: 100vw !important;
            max-width: 100vw !important;
            padding: 16px !important;
            margin: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            min-height: 150px !important;
            position: relative !important;
            z-index: 1 !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
            left: 0 !important;
            right: 0 !important;
            border-top: 1px solid #eee !important;
          }
          .project-search-input {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .project-list-container {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectHistory; 