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

// Добавляем интерфейсы для данных
interface Settings {
  currency: string;
  usdRate: string;
  rrRate: string;
  showUSD: boolean;
  showRR: boolean;
  baseCosts: { id: string; name: string; value: number }[];
  baseIsPercent: boolean;
  basePercentValue: number;
  customColorSurcharge?: number;
  baseCostMode?: 'fixed' | 'percentage';
  baseCostPercentage?: number;
  glassList?: { color: string; thickness?: string; thickness_mm?: number; price: number; companyId: string }[];
  hardwareList?: { _id?: string; name: string; price: number; companyId?: string }[];
}

const CalculatorPage: React.FC<{
  companyId?: string;
  user?: User | null;
  selectedCompanyId?: string;
}> = ({ companyId, user, selectedCompanyId = '' }) => {
  const [draftProjectData, setDraftProjectData] = useState<DraftProjectData>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Добавляем состояния для данных
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- ДОБАВЛЕНО: определяем companyId и selectedCompanyId для admin/user ---
  let effectiveCompanyId = companyId;
  let effectiveSelectedCompanyId = selectedCompanyId;
  if (user && (user.role === 'admin' || user.role === 'user')) {
    const id = typeof user.companyId === 'string' ? user.companyId : (user.companyId && typeof user.companyId === 'object' && '_id' in user.companyId ? user.companyId._id : '');
    // Если у админа/пользователя нет companyId, используем переданные значения
    effectiveCompanyId = id || companyId;
    effectiveSelectedCompanyId = id || selectedCompanyId;
  }

  console.log('🔄 CalculatorPage RENDER:', {
    effectiveCompanyId,
    effectiveSelectedCompanyId,
    settingsState: settings ? 'LOADED' : 'NULL',
    isLoadingData,
    userRole: user?.role
  });

  // Загрузка проектов
  useEffect(() => {
    console.log('📋 Projects useEffect triggered, effectiveSelectedCompanyId:', effectiveSelectedCompanyId);
    if (!effectiveSelectedCompanyId) {
      setProjects([]);
      return;
    }
    fetchWithAuth(`${API_URL}/projects?companyId=${effectiveSelectedCompanyId}`)
      .then(res => res.json())
      .then(data => {
        console.log('📋 Projects loaded:', data);
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('📋 Projects load error:', err);
        setProjects([]);
      });
  }, [effectiveSelectedCompanyId]);

  // Загрузка данных для калькулятора (settings, glass, hardware)
  useEffect(() => {
    console.log('🔄 Calculator data useEffect triggered, effectiveSelectedCompanyId:', effectiveSelectedCompanyId);
    
    if (!effectiveSelectedCompanyId) {
      console.log('❌ No effectiveSelectedCompanyId, setting settings to null');
      setSettings(null);
      return;
    }

    const loadCalculatorData = async () => {
      console.log('🔄 Starting loadCalculatorData...');
      setIsLoadingData(true);
      try {
        console.log('🔄 Making API calls for companyId:', effectiveSelectedCompanyId);
        
        const settingsUrl = `${API_URL}/settings?companyId=${effectiveSelectedCompanyId}`;
        const glassUrl = `${API_URL}/glass?companyId=${effectiveSelectedCompanyId}`;
        const hardwareUrl = `${API_URL}/hardware?companyId=${effectiveSelectedCompanyId}`;
        
        console.log('🔄 API URLs:', { settingsUrl, glassUrl, hardwareUrl });
        
        const [settingsRes, glassRes, hardwareRes] = await Promise.all([
          fetchWithAuth(settingsUrl),
          fetchWithAuth(glassUrl),
          fetchWithAuth(hardwareUrl),
        ]);
        
        console.log('🔄 API responses status:', {
          settings: settingsRes.status,
          glass: glassRes.status,
          hardware: hardwareRes.status
        });
        
        const [settingsData, glassList, hardwareList] = await Promise.all([
          settingsRes.json(),
          glassRes.json(),
          hardwareRes.json(),
        ]);
        
        console.log('🔄 Raw API data received:');
        console.log('  📊 settingsData:', settingsData);
        console.log('  🪟 glassList:', glassList);
        console.log('  🔧 hardwareList:', hardwareList);
        
        // Проверяем структуру данных
        if (Array.isArray(glassList) && glassList.length > 0) {
          console.log('🔍 First glass item structure:', glassList[0]);
          console.log('🔍 Glass keys:', Object.keys(glassList[0]));
        } else {
          console.log('❌ Glass list is empty or not array');
        }
        
        if (Array.isArray(hardwareList) && hardwareList.length > 0) {
          console.log('🔍 First hardware item structure:', hardwareList[0]);
          console.log('🔍 Hardware keys:', Object.keys(hardwareList[0]));
        } else {
          console.log('❌ Hardware list is empty or not array');
        }
        
        if (Array.isArray(settingsData) && settingsData.length > 0) {
          const combinedSettings: Settings = {
            ...settingsData[0],
            glassList,
            hardwareList,
          };
          
          console.log('✅ Combined settings created:', combinedSettings);
          console.log('🔍 Combined settings glassList length:', combinedSettings.glassList?.length);
          console.log('🔍 Combined settings hardwareList length:', combinedSettings.hardwareList?.length);
          
          setSettings(combinedSettings);
        } else {
          console.log('❌ Settings data is empty or not array, creating default settings');
          // Создаем дефолтные настройки если их нет в базе
          const defaultSettings: Settings = {
            currency: 'GEL',
            usdRate: '2.7',
            rrRate: '1.0',
            showUSD: true,
            showRR: false,
            baseCosts: [],
            baseIsPercent: false,
            basePercentValue: 0,
            customColorSurcharge: 0,
            baseCostMode: 'fixed',
            baseCostPercentage: 0,
            glassList,
            hardwareList,
          };
          console.log('✅ Default settings created:', defaultSettings);
          setSettings(defaultSettings);
        }
      } catch (e) {
        console.error('❌ Calculator data load error:', e);
        setSettings(null);
      } finally {
        console.log('🔄 Setting isLoadingData to false');
        setIsLoadingData(false);
      }
    };

    loadCalculatorData();
  }, [effectiveSelectedCompanyId]);

  // Дополнительная отладка для settings
  useEffect(() => {
    console.log('📈 Settings state changed:', {
      isNull: settings === null,
      hasGlass: !!settings?.glassList,
      glassLength: settings?.glassList?.length,
      hasHardware: !!settings?.hardwareList,
      hardwareLength: settings?.hardwareList?.length
    });
  }, [settings]);

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
    await fetchWithAuth(`${API_URL}/projects/${project._id}`, { method: 'DELETE' });
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
            settings={settings} // Передаем загруженные данные
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
              settings={settings} // Передаем загруженные данные
              isLoadingData={isLoadingData} // Передаем состояние загрузки
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
        @media (max-width: 768px) {
          .main-layout {
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            gap: 0 !important;
            background: #f6f8fa !important;
            min-height: 100vh !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          
          .calculator-form-wrapper {
            order: 1 !important;
            display: block !important;
            visibility: visible !important;
            flex: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 300px !important;
            padding: 0 !important;
          }
          
          .calculator-form {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .calculation-details {
            order: 2 !important;
            display: block !important;
            visibility: visible !important;
            flex: none !important;
            margin: 0 !important;
            width: 100vw !important;
            min-height: 200px !important;
          }
          
          .project-history {
            order: 3 !important;
            display: block !important;
            visibility: visible !important;
            flex: none !important;
            margin: 0 !important;
            width: 100vw !important;
            min-height: 200px !important;
          }
          
          .calculator-form-wrapper,
          .calculation-details,
          .project-history {
            max-width: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            position: relative !important;
            z-index: 1 !important;
          }
          

        }
      `}</style>
    </>
  );
};

export default CalculatorPage; 