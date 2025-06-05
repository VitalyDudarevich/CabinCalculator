import React from 'react';

interface ProjectHistoryProps {
  user?: { username: string; role: string } | null;
}

const ProjectHistory: React.FC<ProjectHistoryProps> = ({ user }) => {
  if (!user) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, minWidth: 260, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#888', textAlign: 'center' }}>
        Авторизируйтесь, чтобы видеть историю проектов
      </div>
    );
  }
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, minWidth: 260, flex: 1, marginLeft: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>История проектов</h2>
      {/* Здесь будет список проектов */}
      <div style={{ color: '#888', fontSize: 15 }}>
        Нет сохранённых проектов.
      </div>
    </div>
  );
};

export default ProjectHistory; 