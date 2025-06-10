import React, { useEffect, useState } from 'react';

interface HardwareDraftItem {
  hardwareId: string;
  name: string;
  quantity: number;
  type?: string;
}

interface DraftProjectData {
  projectName?: string;
  config?: string;
  glassColor?: string;
  glassThickness?: string;
  hardwareColor?: string;
  width?: string;
  height?: string;
  length?: string;
  comment?: string;
  projectHardware?: HardwareDraftItem[];
  delivery?: boolean;
  installation?: boolean;
  priceHistory?: { price: number; date: string }[];
  price?: number;
  createdAt?: string;
  showGlassSizes?: boolean;
  exactHeight?: boolean;
  stationarySize?: string;
  doorSize?: string;
  stationaryWidth?: string;
  doorWidth?: string;
}

interface Settings {
  currency: string;
  usdRate: string;
  rrRate: string;
  showUSD: boolean;
  showRR: boolean;
  baseCosts: { id: string; name: string; value: number }[];
  baseIsPercent: boolean;
  basePercentValue: number;
  glassList?: { color: string; thickness?: string; thickness_mm?: number; price: number; companyId: string }[];
  hardwareList?: { name: string; price: number; companyId?: string }[];
}

interface CalculationDetailsProps {
  draft: DraftProjectData;
  companyId?: string;
  onTotalChange?: (total: number, deliveryPrice: number, installPrice: number) => void;
  exactHeight?: boolean;
  onExactHeightChange?: (checked: boolean) => void;
}

const configLabels: Record<string, string> = {
  glass: 'Стекляшка',
  straight: 'Прямая раздвижная',
  'straight-opening': 'Прямая раздвижная',
  'straight-glass': 'Прямая раздвижная',
  corner: 'Угловая раздвижная',
  unique: 'Уникальная конфигурация',
};

const hardwareColorLabels: Record<string, string> = {
  chrome: 'Хром',
  black: 'Черный',
  matte: 'Матовый',
  gold: 'Золотой',
  painted: 'Крашенный',
};

// Функция для нормализации названия (убирает скобки, GEL, лишние пробелы, регистр)
const normalizeName = (name: string) =>
  name.replace(/\(.*?\)/g, '')
      .replace(/GEL/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

const CalculationDetails: React.FC<CalculationDetailsProps> = ({ draft, companyId, onTotalChange, exactHeight, onExactHeightChange }) => {
  console.log('draft:', draft);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [services, setServices] = useState<{ name: string; price: number }[]>([]);

  useEffect(() => {
    if (!companyId) return;

    const fetchAll = async () => {
      try {
        const [settingsRes, glassRes, hardwareRes, servicesRes] = await Promise.all([
          fetch(`http://localhost:5000/api/settings?companyId=${companyId}`),
          fetch(`http://localhost:5000/api/glass?companyId=${companyId}`),
          fetch(`http://localhost:5000/api/hardware?companyId=${companyId}`),
          fetch(`http://localhost:5000/api/services?companyId=${companyId}`),
        ]);

        const [settingsData, glassList, hardwareList, servicesList] = await Promise.all([
          settingsRes.json(),
          glassRes.json(),
          hardwareRes.json(),
          servicesRes.json(),
        ]);

        if (Array.isArray(settingsData) && settingsData.length > 0) {
          const combinedSettings: Settings = {
            ...settingsData[0],
            glassList,
            hardwareList,
          };
          setSettings(combinedSettings);
        } else {
          setSettings(null);
        }
        setServices(Array.isArray(servicesList) ? servicesList : []);
      } catch (e) {
        console.error('Ошибка загрузки настроек:', e);
        setSettings(null);
        setServices([]);
      }
    };

    fetchAll();
  }, [companyId]);

  // Логирование для диагностики companyId
  console.log('CalculationDetails companyId:', companyId);
  if (settings?.hardwareList) {
    settings.hardwareList.forEach(h => {
      console.log('hardwareList:', h.name, h.companyId, 'selected:', companyId);
    });
  }

  // --- Расчёт стоимости ---
  type Position = { label: string; price: number; total: number; qty?: string };
  const positions: Position[] = [];
  let total = 0;
  let deliveryPrice = 0;
  let installPrice = 0;
  const usdRate = settings?.usdRate ? parseFloat(settings.usdRate) : 0;

  if (settings && draft && draft.config) {
    // --- Расчёт и отображение стекла по конфигурации ---
    if (
      typeof draft.glassColor === 'string' &&
      typeof draft.glassThickness === 'string' &&
      companyId
    ) {
      let widthM = 0;
      let heightM = 0;
      let area = 0;
      let label = '';
      if (draft.config === 'glass' && draft.width && draft.height) {
        // Стекляшка: всегда width × height
        widthM = Number(draft.width) / 1000;
        heightM = Number(draft.height) / 1000;
        area = +(widthM * heightM).toFixed(2);
        label = `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`;
      } else if (["straight", "straight-glass", "straight-opening"].includes(String(draft.config))) {
        if (draft.showGlassSizes && draft.stationaryWidth != null && draft.doorWidth != null && draft.height != null) {
          const sw = Number(draft.stationaryWidth);
          const dw = Number(draft.doorWidth);
          const h = Number(draft.height);
          if (!isNaN(sw) && !isNaN(dw) && !isNaN(h)) {
            const widthSum = sw + 30 + dw;
            widthM = widthSum / 1000;
            heightM = h / 1000;
            area = +(widthM * heightM).toFixed(2);
            label = `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`;
            console.log('draft.showGlassSizes:', draft.showGlassSizes);
            console.log('stationaryWidth:', sw, 'doorWidth:', dw, 'height:', h);
            console.log('Итоговый label стекла:', label);
            console.log('Рассчитанная площадь (area):', area);
          }
        } else if (!draft.showGlassSizes && draft.width && draft.height) {
          // Прямая раздвижная, размеры проёма
          widthM = (Number(draft.width) + 30) / 1000;
          heightM = Number(draft.height) / 1000;
          area = +(widthM * heightM).toFixed(2);
          label = `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`;
        }
      } else if (draft.width && draft.height) {
        // Остальные конфигурации — по width × height
        widthM = Number(draft.width) / 1000;
        heightM = Number(draft.height) / 1000;
        area = +(widthM * heightM).toFixed(2);
        label = `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`;
      }
      if (label) {
        let glassPrice = 0;
        let glassFound = false;
        if (settings.glassList) {
          const normalizeThickness = (val: string) => val.replace(/[^\d]/g, '');
          console.log('glass search input:', draft.glassColor, draft.glassThickness);
          console.log('available glasses:', settings.glassList);
          const glassItem = settings.glassList.find((g) => {
            const colorMatch = g.color.trim().toLowerCase() === draft.glassColor!.trim().toLowerCase();
            const thicknessMatch = !g.thickness || normalizeThickness(g.thickness) === normalizeThickness(String(draft.glassThickness));
            const companyMatch = String(g.companyId) === String(companyId);
            return colorMatch && thicknessMatch && companyMatch;
          });
          if (glassItem) {
            glassPrice = glassItem.price;
            glassFound = true;
          }
        }
        if (glassFound) {
          const glassTotal = +(glassPrice * area).toFixed(2);
          positions.push({
            label,
            price: 0,
            total: glassTotal,
          });
          total += glassTotal;
        } else {
          positions.push({
            label: `Нет цены для выбранного стекла`,
            price: 0,
            total: 0,
          });
        }
      }
    }
    // 2. Фурнитура/профили/система/труба
    if (!draft.projectHardware || draft.projectHardware.length === 0) {
      console.warn('Нет фурнитуры в проекте');
    } else if (Array.isArray(draft.projectHardware)) {
      draft.projectHardware.forEach(hw => {
        let price = 0;
        let foundPrice = false;
        const labelBase = `${hw.name} (${hw.quantity} шт.)`;
        if (settings.hardwareList) {
          const found = settings.hardwareList.find(
            (h) =>
              h.name && normalizeName(h.name) === normalizeName(hw.name) &&
              String(h.companyId) === String(companyId)
          );
          if (found !== undefined) {
            price = found.price ?? 0;
            foundPrice = true;
          }
        }
        if (!foundPrice && settings.baseCosts) {
          const base = settings.baseCosts.find(
            (b) =>
              b.name && normalizeName(b.name) === normalizeName(hw.name)
          );
          if (base !== undefined) {
            price = base.value ?? 0;
            foundPrice = true;
          }
        }
        const totalHw = +(price * hw.quantity).toFixed(2);
        positions.push({
          label: foundPrice ? labelBase : `${labelBase} (нет цены)` ,
          price,
          total: foundPrice ? totalHw : 0,
        });
        if (foundPrice) total += totalHw;
      });
    }
    // 3. Доставка
    const deliveryService = services.find(s => s.name.toLowerCase().includes('доставка'));
    if (deliveryService) deliveryPrice = deliveryService.price;
    else if (settings?.baseCosts) {
      const deliveryCost = settings.baseCosts.find(b => b.id === 'delivery' || b.name.toLowerCase().includes('доставка'));
      if (deliveryCost) deliveryPrice = deliveryCost.value;
    }
    if (typeof draft.delivery === 'boolean' && draft.delivery && deliveryPrice) {
      positions.push({
        label: `Доставка:`,
        qty: '',
        price: deliveryPrice,
        total: deliveryPrice,
      });
      total += deliveryPrice;
    }
    // 4. Монтаж
    const installService = services.find(s => s.name.toLowerCase().includes('монтаж') || s.name.toLowerCase().includes('установка'));
    if (installService) installPrice = installService.price;
    else if (settings?.baseCosts) {
      const installCost = settings.baseCosts.find(b => b.id === 'installation' || b.name.toLowerCase().includes('монтаж'));
      if (installCost) installPrice = installCost.value;
    }
    if (typeof draft.installation === 'boolean' && draft.installation && installPrice) {
      positions.push({
        label: `Монтаж:`,
        qty: '',
        price: installPrice,
        total: installPrice,
      });
      total += installPrice;
    }
    // 5. Базовая стоимость
    let baseCost = settings.baseCosts.find(b => b.id === draft.config);
    if (!baseCost) {
      // Попробовать найти по name, если id не совпадает
      baseCost = settings.baseCosts.find(b =>
        normalizeName(b.name).includes('базовая стоимость') &&
        (
          (draft.config === 'glass' && normalizeName(b.name).includes('стекляшка')) ||
          (['straight', 'straight-glass', 'straight-opening'].includes(draft.config || '') && normalizeName(b.name).includes('раздвижн')) ||
          (draft.config === 'corner' && normalizeName(b.name).includes('углов')) ||
          (draft.config === 'unique' && normalizeName(b.name).includes('уник'))
        )
      );
    }
    if (baseCost) {
      positions.push({
        label: 'Базовая стоимость',
        qty: '',
        price: baseCost.value,
        total: baseCost.value,
      });
      total += baseCost.value;
    }
  }

  // --- Группировка позиций ---
  const hardwareNames = draft.projectHardware?.map(hw => hw.name) || [];
  const additionalPositions = positions.filter(
    pos =>
      pos.label.startsWith('Доставка') ||
      pos.label.startsWith('Монтаж') ||
      pos.label === 'Базовая стоимость'
  );
  // Основные позиции (стекло и прочее, кроме фурнитуры и "Дополнительно")
  const mainPositions = positions.filter(pos =>
    !hardwareNames.some(name => pos.label.includes(name)) &&
    !(
      pos.label.startsWith('Доставка') ||
      pos.label.startsWith('Монтаж') ||
      pos.label === 'Базовая стоимость'
    )
  );

  // --- Новый useEffect для передачи total наружу ---
  useEffect(() => {
    if (typeof onTotalChange === 'function') {
      onTotalChange(total, deliveryPrice, installPrice);
    }
  }, [total, deliveryPrice, installPrice, onTotalChange]);

  const configLabel = configLabels[String(draft.config ?? '')] || '';

  // ВРЕМЕННАЯ ДИАГНОСТИКА
  console.log('projectHardware:', draft.projectHardware);
  console.log('hardwareList:', settings?.hardwareList);
  console.log('positions:', positions);

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, minWidth: 320, flex: 1 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Детали расчёта</h2>
      {draft && Object.keys(draft).length > 0 ? (
        <div style={{ color: '#222', fontSize: 16 }}>
          {(draft.projectName || draft.config) && (
            <div>
              <b>Название:</b> {draft.projectName
                ? `${draft.projectName} (${configLabel})`
                : configLabel}
            </div>
          )}
          {draft.glassColor && (
            <div><b>Цвет стекла:</b> {draft.glassColor}</div>
          )}
          {draft.glassThickness && (
            <div><b>Толщина стекла:</b> {draft.glassThickness} мм</div>
          )}
          {/* Для стекляшки — общий размер стекла */}
          {draft.config === 'glass' && draft.width && draft.height && (
            <div><b>Размер стекла:</b> {draft.width} × {draft.height} мм</div>
          )}
          {/* Размеры и формулы для обоих режимов */}
          {['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config)) ? (
            draft.showGlassSizes ? (
              draft.stationaryWidth && draft.doorWidth && draft.height ? (
                <div>
                  <b>Размеры проёма:</b> {Number(draft.stationaryWidth) + Number(draft.doorWidth)} × {draft.height} мм
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 24, listStyle: 'disc' }}>
                    <li>Стационар: {Number(draft.stationaryWidth) + 30} × {draft.exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</li>
                    <li>Дверь: {Number(draft.doorWidth)} × {draft.exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8} мм</li>
                  </ul>
                </div>
              ) : null
            ) : (
              draft.width && draft.height ? (
                <div>
                  <b>Размеры проёма:</b> {draft.width} × {draft.height} мм
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 24, listStyle: 'disc' }}>
                    <li>Стационар: {Math.round((Number(draft.width) + 30) / 2)} × {draft.exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</li>
                    <li>Дверь: {Math.round((Number(draft.width) + 30) / 2)} × {draft.exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8} мм</li>
                  </ul>
                </div>
              ) : null
            )
          ) : null}
          {/* Для угловой раздвижной */}
          {draft.config === 'corner' && draft.width && draft.length && draft.height && (
            <div>
              <b>Размеры:</b> {draft.width} × {draft.length} × {draft.height} мм
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 24, listStyle: 'disc' }}>
                <li>Стационар 1: {Math.round(Number(draft.width) / 2)} × {draft.exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</li>
                <li>Дверь 1: {Math.round(Number(draft.width) / 2)} × {draft.exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8} мм</li>
                <li>Стационар 2: {Math.round(Number(draft.length) / 2)} × {draft.exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</li>
                <li>Дверь 2: {Math.round(Number(draft.length) / 2)} × {draft.exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8} мм</li>
              </ul>
            </div>
          )}
          {/* Чекбокс 'Точная высота' для угловой раздвижной */}
          {draft.config === 'corner' && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Точная высота
              </label>
            </div>
          )}
          {draft.hardwareColor && <div><b>Цвет фурнитуры:</b> {hardwareColorLabels[draft.hardwareColor] || draft.hardwareColor}</div>}
          {draft.comment && <div><b>Комментарий:</b> {draft.comment}</div>}
          {/* Чекбокс "Точная высота" для всех прямых раздвижных */}
          {['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config)) && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Точная высота
              </label>
            </div>
          )}
          {/* Визуальный разделитель */}
          <hr style={{ margin: '18px 0 18px 0', border: 0, borderTop: '1px solid #e0e0e0' }} />
          {/* Блок расчёта стоимости */}
          <div style={{ marginBottom: 16 }}>
            {/* Основные позиции (например, стекло) */}
            {mainPositions.map((pos, idx) => (
              <div key={idx} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{pos.label}:</span>
                <span><b>{pos.total} ₾</b></span>
              </div>
            ))}
            {/* Фурнитура */}
            {draft.projectHardware && draft.projectHardware.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <b>Фурнитура:</b>
                <ul style={{ margin: '6px 0 0 0', padding: 0, listStyle: 'none' }}>
                  {draft.projectHardware.map(hw => {
                    let price = 0;
                    let foundPrice = false;
                    if (settings && settings.hardwareList) {
                      const found = settings.hardwareList.find(
                        (h) =>
                          h.name && normalizeName(h.name) === normalizeName(hw.name) &&
                          String(h.companyId) === String(companyId)
                      );
                      if (found !== undefined) {
                        price = found.price ?? 0;
                        foundPrice = true;
                      }
                    }
                    if (!foundPrice && settings && settings.baseCosts) {
                      const base = settings.baseCosts.find(
                        (b) =>
                          b.name && normalizeName(b.name) === normalizeName(hw.name)
                      );
                      if (base !== undefined) {
                        price = base.value ?? 0;
                        foundPrice = true;
                      }
                    }
                    const totalHw = +(price * hw.quantity).toFixed(2);
                    return (
                      <li key={hw.hardwareId} style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{ maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}
                          title={`${hw.name} (${hw.quantity} шт)`}
                        >
                          {hw.name} ({hw.quantity} шт)
                        </span>
                        {foundPrice ? (
                          <b style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>{totalHw} {settings ? settings.currency : 'GEL'}</b>
                        ) : (
                          <span style={{ color: '#b71c1c', fontSize: 14, marginLeft: 8, whiteSpace: 'nowrap' }}>нет цены</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {/* Дополнительно */}
            {additionalPositions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <b>Дополнительно:</b>
                <ul style={{ margin: '6px 0 0 0', padding: 0, listStyle: 'none' }}>
                  {additionalPositions.map((pos, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                      <span>{pos.label}</span>
                      <b style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>{pos.total.toFixed(2)} {settings ? settings.currency : 'GEL'}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
      <div style={{ color: '#888', fontSize: 16 }}>
        Заполните данные проекта, чтобы увидеть детали расчёта.
      </div>
      )}
      {/* Итоговая цена и история цены — теперь внизу */}
      {settings && positions.length > 0 ? (
        <div style={{ color: '#222', fontSize: 16, marginTop: 24 }}>
          {/* История изменения цен — только для проектов с projectName и priceHistory */}
          {draft && draft.projectName && Array.isArray(draft.priceHistory) && draft.priceHistory.length > 0 && (
            <div style={{ marginTop: 0, background: '#f8f8f8', borderRadius: 8, padding: 12, border: '1px solid #e0e0e0' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>История изменения цен:</div>
              {/* Первая цена — дата создания проекта */}
              <div style={{ color: '#888', fontSize: 15, marginBottom: 2 }}>
                {draft.priceHistory[0].price} GEL <span style={{ fontSize: 13, marginLeft: 8 }}>{draft.createdAt ? new Date(draft.createdAt).toLocaleString() : new Date(draft.priceHistory[0].date).toLocaleString()}</span> <span style={{ color: '#aaa', fontSize: 13 }}>(первоначальная)</span>
              </div>
              {/* Промежуточные изменения */}
              {draft.priceHistory.length > 2 && draft.priceHistory.slice(1, -1).map((ph, idx) => (
                <div key={idx} style={{ color: '#888', fontSize: 15, marginBottom: 2 }}>
                  {ph.price} GEL <span style={{ fontSize: 13, marginLeft: 8 }}>{new Date(ph.date).toLocaleString()}</span>
                </div>
              ))}
              {/* Последняя цена — текущая */}
              {draft.priceHistory.length > 1 && (
                <div style={{ color: '#222', fontSize: 15, marginBottom: 2, fontWeight: 600 }}>
                  {draft.priceHistory[draft.priceHistory.length - 1].price} GEL <span style={{ fontSize: 13, marginLeft: 8 }}>{new Date(draft.priceHistory[draft.priceHistory.length - 1].date).toLocaleString()}</span> <span style={{ color: '#1976d2', fontSize: 13 }}>(текущая)</span>
                </div>
              )}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 16 }}>
            Итого: {draft && draft.projectName && Array.isArray(draft.priceHistory) && draft.priceHistory.length > 0
              ? draft.priceHistory[draft.priceHistory.length - 1].price.toFixed(2)
              : total.toFixed(2)} {settings.currency}
          </div>
          {usdRate > 0 && (
            <div style={{ color: '#888', fontSize: 15, marginTop: 4 }}>
              ~ {draft && draft.projectName && Array.isArray(draft.priceHistory) && draft.priceHistory.length > 0
                ? (draft.priceHistory[draft.priceHistory.length - 1].price / usdRate).toFixed(2)
                : (total / usdRate).toFixed(2)} $
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default CalculationDetails; 

export type { DraftProjectData }; 