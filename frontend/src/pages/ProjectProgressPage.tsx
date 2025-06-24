import React from 'react';
import type { User } from '../types/User';
import KanbanBoard from '../components/KanbanBoard';

interface ProjectProgressPageProps {
  user: User | null;
  selectedCompanyId: string;
}

const ProjectProgressPage: React.FC<ProjectProgressPageProps> = ({ 
  user, 
  selectedCompanyId 
}) => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f5f5', 
      paddingTop: 56 // Отступ для хедера
    }}>
      <div style={{ 
        padding: '16px',
        maxWidth: '100%',
        margin: '0 auto',
        height: 'calc(100vh - 56px)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h1 style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            margin: 0,
            color: '#333' 
          }}>
            Прогресс Проектов
          </h1>
          
          {user && (
            <div style={{ color: '#666', fontSize: 13 }}>
              👤 {user.username}
            </div>
          )}
        </div>
        
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '16px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'calc(100vh - 140px)',
          overflow: 'hidden'
        }}>
          <KanbanBoard 
            companyId={selectedCompanyId}
            onProjectEdit={(project) => {
              console.log('Редактировать проект:', project);
              // TODO: Реализовать модальное окно редактирования
            }}
            onProjectDelete={(project) => {
              console.log('Удалить проект:', project);
              // TODO: Реализовать подтверждение удаления
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectProgressPage; 