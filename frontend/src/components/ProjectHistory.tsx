import React from 'react';
import { FaUserEdit, FaRegTrashAlt } from 'react-icons/fa';
import type { DraftProjectData } from './CalculationDetails';

export interface Project {
  _id: string;
  name: string;
  createdAt: string;
  status?: string;
  price?: number;
  data?: DraftProjectData;
  priceHistory?: { price: number; date: string }[];
  statusHistory?: { status: string; date: string }[];
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

const ProjectHistory: React.FC<ProjectHistoryProps> = ({ user, projects = [], onEdit, onDelete }) => {
  if (!user) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, minWidth: 260, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#888', textAlign: 'center' }}>
        Авторизируйтесь, чтобы видеть историю проектов
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 16 }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 700 }}>История проектов</h2>
      {projects.length === 0 ? (
        <div style={{ color: '#888' }}>Нет проектов</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {projects.map(project => (
            <div key={project._id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafbff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 15 }}>
                  <span style={{ display: 'inline-block', minWidth: 12, minHeight: 12, borderRadius: 6, background: STATUS_COLORS[project.status || 'Рассчет'] || '#bdbdbd', marginRight: 8, verticalAlign: 'middle' }} />
                  {STATUS_LABELS[project.status || 'Рассчет'] || project.status || 'Рассчёт'}
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
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, wordBreak: 'break-word' }}>{project.name}</div>
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
  );
};

export default ProjectHistory; 