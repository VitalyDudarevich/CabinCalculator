// import type { User } from '../pages/AdminPanel';
import React, { useState, useEffect } from 'react';
// ... существующий код ...
// Здесь будет содержимое вкладки 'Настройки', вынесенное из AdminPanel.tsx 

interface Company {
  _id: string;
  name: string;
}

interface BaseCostItem {
  id: string;
  name: string;
  value: number;
}

interface Settings {
  currency: string;
  usdRate: string;
  rrRate: string;
  showUSD: boolean;
  showRR: boolean;
  baseCosts: BaseCostItem[];
  baseIsPercent: boolean;
  basePercentValue: number;
}

interface SettingsTabProps {
  currencyOptions: string[];
  company: Company | null;
  onAdd?: () => void;
}

const API_URL = 'http://localhost:5000/api';

const DEFAULT_BASE_COSTS: BaseCostItem[] = [
  { id: 'glass', name: 'Базовая стоимость стекляшки', value: 0 },
  { id: 'straight', name: 'Базовая стоимость прямой раздвижной', value: 0 },
  { id: 'corner', name: 'Базовая стоимость угловой раздвижной', value: 0 },
  { id: 'unique', name: 'Базовая стоимость уникальной конфигурации', value: 0 },
];

const SettingsTab: React.FC<SettingsTabProps> = ({
  currencyOptions,
  company,
  onAdd,
}) => {
  const [settings, setSettings] = useState<Settings>({
    currency: 'GEL',
    usdRate: '0',
    rrRate: '0',
    showUSD: true,
    showRR: false,
    baseCosts: DEFAULT_BASE_COSTS,
    baseIsPercent: false,
    basePercentValue: 0,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const companyName = company ? company.name : 'Все компании';

  useEffect(() => {
    if (!company?._id) return;
    setSettingsLoading(true);
    setSettingsError('');
    fetch(`${API_URL}/settings?companyId=${company._id}`)
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
            baseCosts: Array.isArray(s.baseCosts) && s.baseCosts.length > 0 ? s.baseCosts : DEFAULT_BASE_COSTS,
            baseIsPercent: s.baseIsPercent ?? false,
            basePercentValue: s.basePercentValue ?? 0,
          });
          setSettingsId(s._id);
        } else {
          setSettings({
            currency: 'GEL', usdRate: '0', rrRate: '0', showUSD: true, showRR: false,
            baseCosts: DEFAULT_BASE_COSTS,
            baseIsPercent: false,
            basePercentValue: 0,
          });
          setSettingsId(null);
        }
        setSettingsLoading(false);
      })
      .catch(() => {
        setSettingsError('Ошибка загрузки настроек');
        setSettingsLoading(false);
      });
  }, [company]);

  // --- Сохранение ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSettingsError('');
    try {
      const payload = {
        companyId: company?._id,
        currency: settings.currency,
        usdRate: settings.usdRate === '' ? 0 : Math.round(parseFloat(settings.usdRate) * 100) / 100,
        rrRate: settings.rrRate === '' ? 0 : Math.round(parseFloat(settings.rrRate) * 100) / 100,
        showUSD: settings.showUSD,
        showRR: settings.showRR,
        baseCosts: settings.baseCosts,
        baseIsPercent: settings.baseIsPercent,
        basePercentValue: settings.basePercentValue,
      };
      let res;
      if (settingsId) {
        res = await fetch(`${API_URL}/settings/${settingsId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
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
        baseCosts: Array.isArray(data.baseCosts) && data.baseCosts.length > 0 ? data.baseCosts : DEFAULT_BASE_COSTS,
        baseIsPercent: data.baseIsPercent ?? false,
        basePercentValue: data.basePercentValue ?? 0,
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

  if (!company) return <div style={{ color: '#888', margin: 32 }}>Выберите компанию</div>;

  return (
    <div style={{ padding: '0 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>
          Настройки {companyName}
        </h2>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', height: '40px', lineHeight: 1.25 }}
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
                  step="0.01"
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
                  step="0.01"
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
          {settingsError && <div style={{ color: 'crimson', fontSize: 14 }}>{settingsError}</div>}
          {saveSuccess && <div style={{ color: 'green', marginTop: 16, textAlign: 'right' }}>Сохранено!</div>}
        </form>
      )}
    </div>
  );
};

export default SettingsTab; 