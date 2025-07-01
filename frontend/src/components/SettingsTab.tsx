// import type { User } from '../pages/AdminPanel';
import React, { useState, useEffect } from 'react';
import { API_URL as BASE_API_URL } from '../utils/api';
import { fetchWithAuth } from '../utils/auth';
const API_URL = BASE_API_URL;
// ... существующий код ...
// Здесь будет содержимое вкладки 'Настройки', вынесенное из AdminPanel.tsx 

interface Company {
  _id: string;
  name: string;
}

interface Settings {
  currency: string;
  usdRate: string;
  rrRate: string;
  showUSD: boolean;
  showRR: boolean;
  baseIsPercent: boolean;
  basePercentValue: number;
  customColorSurcharge: number; // Надбавка за нестандартный цвет в процентах
  baseCostMode: 'fixed' | 'percentage'; // Режим расчета базовой стоимости
  baseCostPercentage: number; // Процент от стоимости стекла и фурнитуры
}

interface SettingsTabProps {
  currencyOptions: string[];
  company: Company | null;
  companies?: Company[]; // Добавляем список компаний
  selectedCompanyId?: string; // Добавляем ID выбранной компании
  onAdd?: () => void;
}



const SettingsTab: React.FC<SettingsTabProps> = ({
  currencyOptions,
  company,
  companies = [],
  selectedCompanyId,
  onAdd,
}) => {
  const [settings, setSettings] = useState<Settings>({
    currency: 'GEL',
    usdRate: '0',
    rrRate: '0',
    showUSD: true,
    showRR: false,
    baseIsPercent: false,
    basePercentValue: 0,
    customColorSurcharge: 0,
    baseCostMode: 'fixed',
    baseCostPercentage: 0,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Определяем целевую компанию для загрузки настроек
  const targetCompanyId = company?._id || selectedCompanyId || (companies.length > 0 ? companies[0]._id : null);
  const targetCompany = company || companies.find(c => c._id === targetCompanyId) || (companies.length > 0 ? companies[0] : null);
  const companyName = targetCompany ? targetCompany.name : 'Все компании';

  useEffect(() => {
    if (!targetCompanyId) return;
    setSettingsLoading(true);
    setSettingsError('');
    console.log('🔧 SettingsTab: Loading settings for company:', targetCompanyId);
    fetchWithAuth(`${API_URL}/settings?companyId=${targetCompanyId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const s = data[0];
          setSettings({
            currency: s.currency || 'GEL',
            usdRate: s.usdRate !== undefined && s.usdRate !== null ? String(s.usdRate) : '0',
            rrRate: s.rrRate !== undefined && s.rrRate !== null ? String(s.rrRate) : '0',
            showUSD: s.showUSD ?? true,
            showRR: s.showRR ?? false,
            baseIsPercent: s.baseIsPercent ?? false,
            basePercentValue: s.basePercentValue ?? 0,
            customColorSurcharge: s.customColorSurcharge ?? 0,
            baseCostMode: s.baseCostMode ?? 'fixed',
            baseCostPercentage: s.baseCostPercentage ?? 0,
          });
          setSettingsId(s._id);
        } else {
          setSettings({
            currency: 'GEL', usdRate: '0', rrRate: '0', showUSD: true, showRR: false,
            baseIsPercent: false,
            basePercentValue: 0,
            customColorSurcharge: 0,
            baseCostMode: 'fixed',
            baseCostPercentage: 0,
          });
          setSettingsId(null);
        }
        setSettingsLoading(false);
      })
      .catch(() => {
        setSettingsError('Ошибка загрузки настроек');
        setSettingsLoading(false);
      });
  }, [targetCompanyId, companies, selectedCompanyId]);

  // --- Сохранение ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSettingsError('');
    try {
      const payload = {
        companyId: targetCompanyId,
        currency: settings.currency,
        usdRate: settings.usdRate === '' ? 0 : Math.round(parseFloat(settings.usdRate) * 10000) / 10000,
        rrRate: settings.rrRate === '' ? 0 : Math.round(parseFloat(settings.rrRate) * 10000) / 10000,
        showUSD: settings.showUSD,
        showRR: settings.showRR,
        baseIsPercent: settings.baseIsPercent,
        basePercentValue: settings.basePercentValue,
        customColorSurcharge: settings.customColorSurcharge,
        baseCostMode: settings.baseCostMode,
        baseCostPercentage: settings.baseCostPercentage,
      };
      let res;
      if (settingsId) {
        res = await fetchWithAuth(`${API_URL}/settings/${settingsId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth(`${API_URL}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
      setSettingsId(data._id);
      setSettings({
        currency: data.currency,
        usdRate: data.usdRate !== undefined && data.usdRate !== null ? String(data.usdRate) : '0',
        rrRate: data.rrRate !== undefined && data.rrRate !== null ? String(data.rrRate) : '0',
        showUSD: data.showUSD,
        showRR: data.showRR,
        baseIsPercent: data.baseIsPercent ?? false,
        basePercentValue: data.basePercentValue ?? 0,
        customColorSurcharge: data.customColorSurcharge ?? 0,
        baseCostMode: data.baseCostMode ?? 'fixed',
        baseCostPercentage: data.baseCostPercentage ?? 0,
      });
      setSaveSuccess(true);
      setEditMode(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!targetCompany) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  return (
    <div className="settings-tab-root" style={{ 
      maxWidth: 540, 
      margin: '0 auto', 
      background: '#fff', 
      borderRadius: 12, 
      boxShadow: '0 1px 4px #0001', 
      padding: 24,
      minHeight: 400,
      width: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Настройки {companyName}
        </h2>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#fff', color: '#646cff', border: '2px solid #646cff', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}
          >
            Редактировать
          </button>
        )}
        {editMode && (
          <>
            <button
              form="settings-form"
              type="submit"
              style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25, marginRight: 8 }}
              disabled={saveLoading}
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => { setEditMode(false); setSaveSuccess(false); setSettingsError(''); }}
              style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#333', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}
              disabled={saveLoading}
            >
              Отмена
            </button>
          </>
        )}
        {onAdd && !editMode && (
          <button onClick={onAdd} style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}>
            Добавить
          </button>
        )}
      </div>
      {settingsLoading ? (
        <div style={{ color: '#888', margin: 24 }}>Загрузка...</div>
      ) : settingsError ? (
        <div style={{ color: 'crimson', margin: 24 }}>{settingsError}</div>
      ) : (
        <form id="settings-form" onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 540, marginTop: 0 }}>
          {/* Секция 1: Валюта и курсы */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, marginBottom: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Валюта и курсы</div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              Валюта:
              <select
                value={settings.currency ?? ''}
                onChange={e => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                style={{ width: 180, padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
                disabled={!editMode}
              >
                {currencyOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 0 }}>
                Курс USD:
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={settings.usdRate == null ? '' : settings.usdRate}
                  onChange={e => setSettings(prev => ({ ...prev, usdRate: e.target.value }))}
                  style={{ width: 180, padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
                  required
                  disabled={!editMode}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 22, width: 180 }}>
                <input
                  type="checkbox"
                  checked={settings.showUSD}
                  onChange={e => setSettings(prev => ({ ...prev, showUSD: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                  disabled={!editMode}
                />
                <span style={{ fontSize: 15 }}>Показывать USD</span>
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 0 }}>
                Курс RR:
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={settings.rrRate == null ? '' : settings.rrRate}
                  onChange={e => setSettings(prev => ({ ...prev, rrRate: e.target.value }))}
                  style={{ width: 180, padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
                  required
                  disabled={!editMode}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 22, width: 180 }}>
                <input
                  type="checkbox"
                  checked={settings.showRR}
                  onChange={e => setSettings(prev => ({ ...prev, showRR: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                  disabled={!editMode}
                />
                <span style={{ fontSize: 15 }}>Показывать RR</span>
              </label>
            </div>
          </div>

          {/* Секция 2: Нестандартный цвет */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, marginBottom: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Надбавки</div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              Нестандартный цвет (%):
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.customColorSurcharge || ''}
                onChange={e => setSettings(prev => ({ ...prev, customColorSurcharge: parseFloat(e.target.value) || 0 }))}
                style={{ width: 180, padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
                disabled={!editMode}
                placeholder="0"
              />
              <span style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                Надбавка к стоимости фурнитуры для нестандартных цветов (автоматически выбирается для золотой, крашеный)
              </span>
            </label>
          </div>

          {/* Секция 3: Дополнительная стоимость проекта */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, marginBottom: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Дополнительная стоимость проекта</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="baseCostMode"
                  value="fixed"
                  checked={settings.baseCostMode === 'fixed'}
                  onChange={e => setSettings(prev => ({ ...prev, baseCostMode: e.target.value as 'fixed' | 'percentage' }))}
                  style={{ width: 18, height: 18 }}
                  disabled={!editMode}
                />
                <span style={{ fontSize: 16 }}>Базовая стоимость</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="baseCostMode"
                  value="percentage"
                  checked={settings.baseCostMode === 'percentage'}
                  onChange={e => setSettings(prev => ({ ...prev, baseCostMode: e.target.value as 'fixed' | 'percentage' }))}
                  style={{ width: 18, height: 18 }}
                  disabled={!editMode}
                />
                <span style={{ fontSize: 16 }}>Процент от стоимости</span>
              </label>
              
              {settings.baseCostMode === 'percentage' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 26 }}>
                  Процент (%):
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.baseCostPercentage || ''}
                    onChange={e => setSettings(prev => ({ ...prev, baseCostPercentage: parseFloat(e.target.value) || 0 }))}
                    style={{ width: 180, padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16, marginTop: 4 }}
                    disabled={!editMode}
                    placeholder="0"
                  />
                  <span style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    Процент добавляется к стоимости стекла и фурнитуры (без услуг)
                  </span>
                </label>
              )}
            </div>
          </div>

          {settingsError && <div style={{ color: 'crimson', fontSize: 14 }}>{settingsError}</div>}
          {saveSuccess && <div style={{ color: 'green', marginTop: 16, textAlign: 'right' }}>Сохранено!</div>}
        </form>
      )}
      <style>{`
        @media (max-width: 600px) {
          .settings-tab-root {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            padding: 8px !important;
            color: #333 !important;
          }
          .settings-tab-root * {
            color: #333 !important;
          }
          .settings-tab-root h1, .settings-tab-root h2, .settings-tab-root h3 {
            color: #333 !important;
          }
          .settings-tab-root div, .settings-tab-root span, .settings-tab-root label {
            color: #333 !important;
          }
          .settings-tab-root input[type="number"] {
            width: 160px !important;
            padding: 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 15px !important;
            margin-top: 2px !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #333 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
          }
          .settings-tab-root input[type="number"]:disabled {
            background: #f5f5f5 !important;
            color: #888 !important;
          }
          .settings-tab-root select {
            width: 160px !important;
            padding: 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 15px !important;
            margin-top: 2px !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #333 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
          }
          .settings-tab-root select:disabled {
            background: #f5f5f5 !important;
            color: #888 !important;
          }
          .settings-tab-root input[type="checkbox"] {
            width: 16px !important;
            height: 16px !important;
            background: #fff !important;
            border: 1px solid #ccc !important;
            border-radius: 3px !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            accent-color: #646cff !important;
          }
          .settings-tab-root input[type="radio"] {
            width: 16px !important;
            height: 16px !important;
            background: #fff !important;
            border: 1px solid #ccc !important;
            border-radius: 50% !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            accent-color: #646cff !important;
          }
          .settings-tab-root input[type="checkbox"]:checked {
            background: #646cff !important;
            border-color: #646cff !important;
          }
          .settings-tab-root input[type="radio"]:checked {
            background: #646cff !important;
            border-color: #646cff !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsTab; 