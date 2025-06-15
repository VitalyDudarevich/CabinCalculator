import React, { useState, useEffect } from 'react';
import CalculationDetails from '../components/CalculationDetails';
import CalculatorForm from '../components/CalculatorForm';
import ProjectHistory, { type Project } from '../components/ProjectHistory';
// import { useContext } from 'react';
import type { User } from '../types/User';
// import type { Company } from '../types/Company';
import type { DraftProjectData } from '../components/CalculationDetails';
import { fetchWithAuth } from '../utils/auth';
import { API_URL } from '../utils/api';

const CalculatorPage: React.FC<{
  companyId?: string;
  user?: User | null;
  selectedCompanyId?: string;
}> = ({ companyId, user, selectedCompanyId = '' }) => {
  const [draftProjectData, setDraftProjectData] = useState<DraftProjectData>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // --- ДОБАВЛЕНО: определяем companyId и selectedCompanyId для admin/user ---
  let effectiveCompanyId = companyId;
  let effectiveSelectedCompanyId = selectedCompanyId;
  if (user && (user.role === 'admin' || user.role === 'user')) {
    const id = typeof user.companyId === 'string' ? user.companyId : (user.companyId && typeof user.companyId === 'object' && '_id' in user.companyId ? user.companyId._id : '');
    effectiveCompanyId = id;
    effectiveSelectedCompanyId = id;
  }

  useEffect(() => {
    if (!effectiveSelectedCompanyId) {
      setProjects([]);
      return;
    }
    fetchWithAuth(`${API_URL}/api/projects?companyId=${effectiveSelectedCompanyId}`)
      .then(res => res.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, [effectiveSelectedCompanyId]);

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setDraftProjectData({
      ...project.data,
      projectName: project.name,
      priceHistory: project.priceHistory,
    });
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm('Удалить проект?')) return;
    await fetchWithAuth(`${API_URL}/api/projects/${project._id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p._id !== project._id));
    if (selectedProject && selectedProject._id === project._id) {
      setSelectedProject(null);
      setDraftProjectData({});
    }
  };

  return (
    <>
      <div
        className="main-layout"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 32,
          minHeight: 'calc(100vh - 56px)',
          background: '#f6f8fa',
          width: '100vw',
          boxSizing: 'border-box',
        }}
      >
        <div className="calculation-details" style={{ minWidth: 320, maxWidth: 380, flex: '0 0 340px', marginRight: 24 }}>
          <CalculationDetails
            draft={selectedProject ? { ...selectedProject.data, projectName: selectedProject.name, price: selectedProject.price, priceHistory: selectedProject.priceHistory } : draftProjectData}
            companyId={effectiveSelectedCompanyId}
            exactHeight={draftProjectData.exactHeight ?? false}
            onExactHeightChange={checked => {
              setDraftProjectData(draft => ({ ...draft, exactHeight: checked }));
            }}
            onTotalChange={setTotalPrice}
          />
        </div>
        <div className="calculator-form-wrapper" style={{ flex: 1, minWidth: 340, maxWidth: 700, margin: '0 24px' }}>
          <div className="calculator-form">
            <CalculatorForm
              companyId={effectiveCompanyId}
              user={user}
              selectedCompanyId={effectiveSelectedCompanyId}
              onChangeDraft={setDraftProjectData}
              selectedProject={selectedProject ?? undefined}
              onNewProject={project => {
                if (project) {
                  setProjects(prev => {
                    const idx = prev.findIndex(p => p._id === project._id);
                    if (idx !== -1) {
                      // Обновляем существующий проект
                      const updated = [...prev];
                      updated[idx] = project;
                      return updated;
                    } else {
                      // Новый проект — добавляем в начало
                      return [project, ...prev];
                    }
                  });
                }
                // Всегда сбрасываем selectedProject и draftProjectData при нажатии 'Новый проект'
                setSelectedProject(null);
                setDraftProjectData({});
              }}
              totalPrice={totalPrice}
            />
          </div>
        </div>
        <div className="project-history" style={{ minWidth: 320, maxWidth: 380, flex: '0 0 340px', marginLeft: 24 }}>
          <ProjectHistory
            user={user}
            projects={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .main-layout {
            flex-direction: column !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .calculator-form-wrapper {
            order: 1 !important;
            padding: 0 !important;
          }
          .calculation-details {
            order: 2 !important;
          }
          .project-history {
            order: 3 !important;
          }
          .calculator-form-wrapper,
          .calculation-details,
          .project-history {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 0 12px 0 !important;
            box-sizing: border-box !important;
          }
          .calculator-form {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 8px !important;
            box-sizing: border-box !important;
            background: #fff !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default CalculatorPage; 