import React, { useState, useEffect } from 'react';
import CalculationDetails from '../components/CalculationDetails';
import CalculatorForm from '../components/CalculatorForm';
import ProjectHistory, { type Project } from '../components/ProjectHistory';
// import { useContext } from 'react';
import type { User } from '../types/User';
// import type { Company } from '../types/Company';
import type { DraftProjectData } from '../components/CalculationDetails';
import { fetchWithAuth } from '../utils/auth';

const CalculatorPage: React.FC<{
  companyId?: string;
  user?: User | null;
  selectedCompanyId?: string;
}> = ({ companyId, user, selectedCompanyId = '' }) => {
  const [draftProjectData, setDraftProjectData] = useState<DraftProjectData>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [exactHeight, setExactHeight] = useState(false);

  useEffect(() => {
    if (!selectedCompanyId) {
      setProjects([]);
      return;
    }
    fetchWithAuth(`http://localhost:5000/api/projects?companyId=${selectedCompanyId}`)
      .then(res => res.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, [selectedCompanyId]);

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
    await fetchWithAuth(`http://localhost:5000/api/projects/${project._id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p._id !== project._id));
    if (selectedProject && selectedProject._id === project._id) {
      setSelectedProject(null);
      setDraftProjectData({});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'flex-start', justifyContent: 'center', padding: 32, minHeight: 'calc(100vh - 56px)', background: '#f6f8fa' }}>
      <CalculationDetails
        draft={selectedProject ? { ...selectedProject.data, projectName: selectedProject.name, price: selectedProject.price, priceHistory: selectedProject.priceHistory } : draftProjectData}
        companyId={selectedCompanyId}
        exactHeight={exactHeight}
        onExactHeightChange={setExactHeight}
      />
      <CalculatorForm
        companyId={companyId}
        user={user}
        selectedCompanyId={selectedCompanyId}
        onChangeDraft={setDraftProjectData}
        selectedProject={selectedProject ?? undefined}
        onProjectSaved={() => {
          fetchWithAuth(`http://localhost:5000/api/projects?companyId=${selectedCompanyId}`)
            .then(res => res.json())
            .then(data => setProjects(Array.isArray(data) ? data : []))
            .catch(() => setProjects([]));
          setSelectedProject(null);
          setDraftProjectData({});
          setExactHeight(false);
        }}
        onNewProject={() => {
          setSelectedProject(null);
          setDraftProjectData({});
          setExactHeight(false);
        }}
        exactHeight={exactHeight}
        onExactHeightChange={setExactHeight}
      />
      <ProjectHistory user={user} projects={projects} onEdit={handleEditProject} onDelete={handleDeleteProject} />
    </div>
  );
};

export default CalculatorPage; 