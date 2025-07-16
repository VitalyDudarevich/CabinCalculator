import React from 'react';

interface HardwareDraftItem {
  hardwareId: string;
  name: string;
  quantity: number;
  type?: string;
}

interface GlassConfig {
  name: string;
  type: 'stationary' | 'swing_door' | 'sliding_door';
}

interface TemplateData {
  exactHeightOption?: boolean;
  glassConfig?: GlassConfig[];
  sizeAdjustments?: {
    doorHeightReduction?: number;
    thresholdReduction?: number;
  };
}

interface DraftProjectData {
  projectName?: string;
  customer?: string;
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
  dismantling?: boolean;
  priceHistory?: { price: number; date: string }[];
  statusHistory?: { status: string; statusId?: string; date: string }[];
  price?: number;
  createdAt?: string;
  _id?: string;
  status?: string;
  statusId?: { _id: string; name: string; color: string; order: number };
  showGlassSizes?: boolean;
  exactHeight?: boolean;
  stationarySize?: string;
  doorSize?: string;
  stationaryWidth?: string;
  doorWidth?: string;
  uniqueGlasses?: Array<{ name: string; color: string; thickness: string; width: string; height: string }>;
  projectServices?: { serviceId: string; name: string; price: number }[];
  customColor?: boolean; // Флаг нестандартного цвета фурнитуры
  selectedTemplate?: TemplateData; // Данные выбранного шаблона
  templateFields?: { [key: string]: string }; // Поля шаблона
  templateGlasses?: { [glassIndex: number]: { width: string; height: string; hasThreshold?: boolean } }; // Данные стекол из шаблона
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
  customColorSurcharge?: number; // Надбавка за нестандартный цвет в процентах
  baseCostMode?: 'fixed' | 'percentage'; // Режим расчета базовой стоимости
  baseCostPercentage?: number; // Процент от стоимости стекла и фурнитуры
  glassList?: { color: string; thickness?: string; thickness_mm?: number; price: number; companyId: string }[];
  hardwareList?: { _id?: string; name: string; price: number; companyId?: string }[];
}

interface CalculationDetailsProps {
  draft: DraftProjectData;
  companyId?: string;
  settings?: Settings | null; // Добавляем проп для передачи данных
  onTotalChange?: (total: number, deliveryPrice: number, installPrice: number) => void;
  exactHeight?: boolean;
  onExactHeightChange?: (checked: boolean) => void;
  isEditing?: boolean; // Флаг режима редактирования
  isLoadingData?: boolean; // Флаг загрузки данных
}

const configLabels: Record<string, string> = {
      glass: 'Стационарное стекло',
  straight: 'Прямая раздвижная',
  'straight-opening': 'Прямая раздвижная',
  'straight-glass': 'Прямая раздвижная',
  corner: 'Угловая раздвижная',
  unique: 'Уникальная конфигурация',
  partition: 'Перегородка',
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



console.log('CalculationDetails: компонент монтируется');

const CalculationDetails: React.FC<CalculationDetailsProps> = ({ draft, companyId, settings: propsSettings, onTotalChange, exactHeight, onExactHeightChange, isEditing, isLoadingData }) => {
  console.log('CalculationDetails: companyId проп:', companyId);
  console.log('CalculationDetails: draft:', draft);
  console.log('CalculationDetails: propsSettings:', propsSettings);
  
  // Используем переданные данные вместо локального состояния
  const settings = propsSettings;



  // Логирование для диагностики companyId
  console.log('CalculationDetails companyId:', companyId);
  if (settings?.hardwareList) {
    settings.hardwareList.forEach(h => {
      console.log('hardwareList:', h.name, h.companyId, 'selected:', companyId);
    });
  }





  // Если settings еще не загружены, показываем индикатор загрузки
  if (!settings) {
    return (
      <div className="calculation-details-container" style={{ 
        padding: '24px 24px 80px 24px',
        minWidth: 320, 
        flex: 1,
        color: '#000',
        overflowX: 'hidden',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 16, color: '#000' }}>Детали расчёта</h2>
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          {isLoadingData ? 'Загрузка данных...' : 'Настройки не найдены. Обратитесь к администратору для создания настроек компании.'}
        </div>
      </div>
    );
  }

  // --- Расчёт стоимости ---
  const positions: { label: string; price: number; total: number; qty?: string }[] = [];
  let total = 0;
  const usdRate = settings?.usdRate ? parseFloat(settings.usdRate) : 0;

  if (settings && draft && draft.config) {
    if (draft.config === 'corner' && draft.width && draft.length && draft.height) {
      // Для угловой раздвижной: площадь = (ширина + длина) * высота
      const width = Number(draft.width);
      const length = Number(draft.length);
      const height = Number(draft.height);
      let area = 0;
      let glassPrice = 0;
      if (!isNaN(width) && !isNaN(length) && !isNaN(height)) {
        area = ((width + length) * height) / 1_000_000;
        area = +area.toFixed(2);
      }
      // Найти цену за м² для выбранного стекла (аналогично прямой раздвижной)
      if (settings.glassList && draft.glassColor && draft.glassThickness) {
        const normalizeThickness = (val: string) => val.replace(/[^\d]/g, '');
        const glassItem = settings.glassList.find((g) => {
          const colorMatch = g.color.trim().toLowerCase() === draft.glassColor!.trim().toLowerCase();
          const thicknessMatch = !g.thickness || normalizeThickness(g.thickness) === normalizeThickness(String(draft.glassThickness));
          const companyMatch = String(g.companyId) === String(companyId);
          return colorMatch && thicknessMatch && companyMatch;
        });
        if (glassItem) {
          glassPrice = glassItem.price;
        }
      }
      // 2. Стекло с ценой или сообщением об отсутствии цены
      if (glassPrice) {
        const glassTotal = +(glassPrice * area).toFixed(2);
        positions.push({
          label: `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`,
          price: glassPrice,
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
      // Дальнейшие позиции (фурнитура, доставка, монтаж, базовая стоимость) добавляются ниже по общему алгоритму
    } else if (draft.config === 'unique' && Array.isArray(draft.uniqueGlasses) && draft.uniqueGlasses.length > 0) {
      let totalArea = 0;
      let totalPrice = 0;
      draft.uniqueGlasses.forEach(glass => {
        const width = Number(glass.width);
        const height = Number(glass.height);
        const area = !isNaN(width) && !isNaN(height) ? +(width * height / 1000000).toFixed(2) : 0;
        totalArea += area;
        // ищем цену за м² для этого стекла
        let glassPrice = 0;
        if (settings.glassList) {
          const normalizeThickness = (val: string) => val.replace(/[^\d]/g, '');
          const glassItem = settings.glassList.find((g) => {
            const colorMatch = g.color.trim().toLowerCase() === String(glass.color).trim().toLowerCase();
            const thicknessMatch = !g.thickness || normalizeThickness(g.thickness) === normalizeThickness(String(glass.thickness));
            const companyMatch = String(g.companyId) === String(companyId);
            return colorMatch && thicknessMatch && companyMatch;
          });
          if (glassItem) glassPrice = glassItem.price;
        }
        totalPrice += +(glassPrice * area);
      });
      positions.push({
        label: `Общая площадь стекла: ${totalArea} м²`,
        price: 0,
        total: +totalPrice.toFixed(2),
      });
      total += +totalPrice.toFixed(2);
    } else if (draft.config && draft.config.startsWith('template-') && draft.selectedTemplate && draft.templateGlasses) {
      // Обработка стекол из шаблона
      let totalArea = 0;
      let totalPrice = 0;
      const normalizeThickness = (val: string) => val.replace(/[^\d]/g, '');
      
      // Получаем общий цвет и толщину стекла из полей формы
      const templateGlassColor = draft.glassColor;
      const templateGlassThickness = draft.glassThickness;
      
      // Проходим по каждому стеклу из конфигурации шаблона
      if (draft.selectedTemplate.glassConfig && Array.isArray(draft.selectedTemplate.glassConfig)) {
        draft.selectedTemplate.glassConfig.forEach((glassConf: GlassConfig, index: number) => {
          const glassData = draft.templateGlasses![index];
          if (glassData && glassData.width && glassData.height) {
            const width = Number(glassData.width);
            const height = Number(glassData.height);
            let area = !isNaN(width) && !isNaN(height) ? +(width * height / 1000000).toFixed(2) : 0;
            
            // Применяем корректировки размеров для распашных дверей
            if (glassConf.type === 'swing_door' && draft.selectedTemplate?.sizeAdjustments) {
              const doorHeightReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
              const thresholdReduction = draft.selectedTemplate.sizeAdjustments.thresholdReduction || 15;
              const exactHeightReduction = draft.exactHeight ? 3 : 0; // Вычитаем 3 мм при нестандартной высоте
              
              let correctedHeight = height - doorHeightReduction - exactHeightReduction;
              if (glassData.hasThreshold) {
                correctedHeight -= thresholdReduction;
              }
              area = +(width * correctedHeight / 1000000).toFixed(2);
            } else if (glassConf.type === 'sliding_door' && draft.selectedTemplate?.sizeAdjustments) {
              const doorHeightReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
              const exactHeightReduction = draft.exactHeight ? 3 : 0; // Вычитаем 3 мм при нестандартной высоте
              const correctedHeight = height - doorHeightReduction - exactHeightReduction;
              area = +(width * correctedHeight / 1000000).toFixed(2);
            } else {
              // Для стационарных стекол также вычитаем 3 мм при нестандартной высоте
              const exactHeightReduction = draft.exactHeight ? 3 : 0;
              const correctedHeight = height - exactHeightReduction;
              area = +(width * correctedHeight / 1000000).toFixed(2);
            }
            
            totalArea += area;
            
            // Ищем цену за м² для этого стекла
            let glassPrice = 0;
            if (settings.glassList && templateGlassColor && templateGlassThickness) {
              const glassItem = settings.glassList.find((g) => {
                const colorMatch = g.color.trim().toLowerCase() === templateGlassColor.trim().toLowerCase();
                const thicknessMatch = !g.thickness || normalizeThickness(g.thickness) === normalizeThickness(String(templateGlassThickness));
                const companyMatch = String(g.companyId) === String(companyId);
                return colorMatch && thicknessMatch && companyMatch;
              });
              if (glassItem) glassPrice = glassItem.price;
            }
            totalPrice += +(glassPrice * area);
          }
        });
      }
      
      positions.push({
        label: `Общая площадь стекла: ${totalArea.toFixed(2)} м²`,
        price: 0,
        total: +totalPrice.toFixed(2),
      });
      total += +totalPrice.toFixed(2);
    } else {
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
          // Стационарное стекло: всегда width × height
          widthM = Number(draft.width) / 1000;
          // Если нестандартная высота, вычитаем 3 мм
          const heightValue = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
          heightM = heightValue / 1000;
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
          // Остальные конфигурации — по width × height (включая partition)
          widthM = Number(draft.width) / 1000;
          heightM = Number(draft.height) / 1000;
          area = +(widthM * heightM).toFixed(2);
          label = `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`;
        }
        if (draft.config === 'corner') {
          // Пропускаем общий расчёт для угловой раздвижной, чтобы не было дубля
        } else if (label) {
          let glassPrice = 0;
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
            }
          }
          if (glassPrice) {
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
      } else if (draft.config === 'corner' && draft.width && draft.length && draft.height) {
        // Для угловой раздвижной: площадь = (ширина + длина) * высота
        const width = Number(draft.width);
        const length = Number(draft.length);
        const height = Number(draft.height);
        let area = 0;
        let glassPrice = 0;
        if (!isNaN(width) && !isNaN(length) && !isNaN(height)) {
          area = ((width + length) * height) / 1_000_000;
          area = +area.toFixed(2);
        }
        // Найти цену за м² для выбранного стекла
        if (settings.glassList && draft.glassColor && draft.glassThickness) {
          const normalizeThickness = (val: string) => val.replace(/[^\d]/g, '');
          const glassItem = settings.glassList.find((g) => {
            const colorMatch = g.color.trim().toLowerCase() === draft.glassColor!.trim().toLowerCase();
            const thicknessMatch = !g.thickness || normalizeThickness(g.thickness) === normalizeThickness(String(draft.glassThickness));
            const companyMatch = String(g.companyId) === String(companyId);
            return colorMatch && thicknessMatch && companyMatch;
          });
          if (glassItem) {
            glassPrice = glassItem.price;
          }
        }
        // 2. Стекло с ценой или сообщением об отсутствии цены
        if (glassPrice) {
          const glassTotal = +(glassPrice * area).toFixed(2);
          positions.push({
            label: `Стекло ${draft.glassColor} ${draft.glassThickness} мм (${area} м²)`,
            price: glassPrice,
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
        // Дальнейшие позиции (фурнитура, доставка, монтаж, базовая стоимость) добавляются ниже по общему алгоритму
      } else {
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
        // Доставка, монтаж и демонтаж теперь добавляются только через выбранные услуги (projectServices)
        // Старая логика с draft.delivery, draft.installation, draft.dismantling удалена
      }
    }

    // Добавляем фурнитуру для всех конфигураций, если есть projectHardware
    if (draft.projectHardware && Array.isArray(draft.projectHardware)) {
      const customColorSurcharge = settings.customColorSurcharge || 0;
      
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
        
        // Применяем надбавку за нестандартный цвет, если чекбокс включен
        if (draft.customColor && foundPrice && customColorSurcharge > 0) {
          price = price * (1 + customColorSurcharge / 100);
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

    // После расчёта позиций (positions) и total, добавляю:
    if (draft.projectServices && Array.isArray(draft.projectServices)) {
      const seen = new Set();
      draft.projectServices.forEach(service => {
        if (!service || typeof service.name !== 'string' || service.name.trim() === '') return;
        // Исключаем дубли по имени
        const key = service.name.trim().toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        // Корректная цена
        const price = typeof service.price === 'number' && !isNaN(service.price) ? +service.price : 0;
        positions.push({
          label: service.name,
          price: price,
          total: +price.toFixed(2),
        });
        total += price;
      });
    }

    // 5. Базовая стоимость - режим зависит от настроек
    const baseCostMode = settings.baseCostMode || 'fixed';
    
    console.log('💰 ДИАГНОСТИКА БАЗОВОЙ СТОИМОСТИ:', {
      baseCostMode,
      config: draft.config,
      hasBaseCosts: !!settings.baseCosts,
      baseCostsLength: settings.baseCosts?.length,
      baseCosts: settings.baseCosts,
      baseCostPercentage: settings.baseCostPercentage
    });
    
    if (baseCostMode === 'fixed') {
      // Режим фиксированной базовой стоимости (как раньше)
      let baseCost = settings.baseCosts?.find(b => b.id === draft.config);
      console.log('🔍 Поиск базовой стоимости по ID:', { 
        config: draft.config, 
        foundById: !!baseCost,
        baseCost: baseCost 
      });
      
      if (!baseCost && settings.baseCosts) {
        // Попробовать найти по name, если id не совпадает
        baseCost = settings.baseCosts.find(b =>
          normalizeName(b.name).includes('базовая стоимость') &&
          (
            (draft.config === 'glass' && normalizeName(b.name).includes('стационарного стекла')) ||
            (['straight', 'straight-glass', 'straight-opening'].includes(draft.config || '') && normalizeName(b.name).includes('раздвижн')) ||
            (draft.config === 'corner' && normalizeName(b.name).includes('углов')) ||
            (draft.config === 'unique' && normalizeName(b.name).includes('уник')) ||
            (draft.config === 'partition' && normalizeName(b.name).includes('перегородк'))
          )
        );
        console.log('🔍 Поиск базовой стоимости по name:', { 
          foundByName: !!baseCost,
          baseCost: baseCost,
          normalizedNames: settings.baseCosts.map(b => ({ original: b.name, normalized: normalizeName(b.name) }))
        });
      }
      
      if (baseCost) {
        console.log('✅ Базовая стоимость найдена и добавлена:', baseCost);
        positions.push({
          label: 'Базовая стоимость',
          qty: '',
          price: baseCost.value,
          total: baseCost.value,
        });
        total += baseCost.value;
      } else {
        console.log('❌ Базовая стоимость НЕ найдена для config:', draft.config);
      }
    } else if (baseCostMode === 'percentage') {
      // Режим процента от стоимости стекла и фурнитуры
      const percentage = settings.baseCostPercentage || 0;
      if (percentage > 0) {
        // Считаем стоимость стекла и фурнитуры (без услуг)
        let glassAndHardwareTotal = 0;
        
        positions.forEach(pos => {
          // Проверяем что это стекло или фурнитура (не услуга)
          if (pos.label.toLowerCase().includes('стекло') || 
              pos.label.toLowerCase().includes('шт.') ||
              pos.label.toLowerCase().includes('площадь')) {
            glassAndHardwareTotal += pos.total;
          }
        });
        
        const percentageAmount = +(glassAndHardwareTotal * percentage / 100).toFixed(2);
        
        positions.push({
          label: `Базовая стоимость ${percentage}%`,
          qty: '',
          price: 0,
          total: percentageAmount,
        });
        total += percentageAmount;
      }
    }
  }



  const configLabel = configLabels[String(draft.config ?? '')] || '';

  // Вызываем callback с рассчитанной ценой
  if (onTotalChange) {
    onTotalChange(total, 0, 0); // deliveryPrice и installPrice пока 0
  }

  // ВРЕМЕННАЯ ДИАГНОСТИКА
  console.log('projectHardware:', draft.projectHardware);
  console.log('hardwareList:', settings?.hardwareList);
  console.log('positions:', positions);
  console.log('Total calculated:', total);



  return (
    <div className="calculation-details-container" style={{ 
      padding: '24px 24px 80px 24px',
      minWidth: 320, 
      flex: 1,
      color: '#000',
      overflowX: 'hidden',
      maxWidth: '100%',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 16, color: '#000' }}>Детали расчёта</h2>
      {draft && Object.keys(draft).length > 0 ? (
        <div style={{ color: '#222', fontSize: 16 }}>
          {(draft.projectName || draft.config) && (
            <div>
              <b>Название:</b> {draft.projectName
                ? `${draft.projectName} (${configLabel})`
                : configLabel}
            </div>
          )}
          {draft.customer && (
            <div style={{ marginTop: 8 }}>
              <b>Заказчик:</b> {draft.customer}
            </div>
          )}
          {/* Для шаблонов показываем конфигурацию ПЕРЕД списком стекол */}
          {draft.config && draft.config.startsWith('template-') && draft.glassColor && (
            <div style={{ marginTop: 8 }}><b>Цвет стекла:</b> {draft.glassColor}</div>
          )}
          {draft.config && draft.config.startsWith('template-') && draft.glassThickness && (
            <div><b>Толщина стекла:</b> {draft.glassThickness} мм</div>
          )}
          {/* Чекбокс нестандартной высоты для шаблонов */}
          {draft.config && draft.config.startsWith('template-') && draft.selectedTemplate?.exactHeightOption && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Нестандартная высота
              </label>
            </div>
          )}
          {/* Для уникальной конфигурации — список стёкол без цены */}
          {draft.config === 'unique' && Array.isArray(draft.uniqueGlasses) && draft.uniqueGlasses.length > 0 && (
            <div style={{ margin: '8px 0 0 0' }}>
              <b>Стёкла:</b>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 24 }}>
                {draft.uniqueGlasses.map((glass, idx) => {
                  const heightValue = exactHeight ? Number(glass.height) - 3 : Number(glass.height);
                  const heightSuffix = exactHeight ? ' (нестандартная высота -3мм)' : '';
                  return (
                    <li key={idx}>
                      {glass.name}: {glass.color} {glass.thickness} мм: {glass.width} × {heightValue} мм{heightSuffix}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {/* Чекбокс нестандартной высоты для уникальной конфигурации */}
          {draft.config === 'unique' && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Нестандартная высота
              </label>
            </div>
          )}
          {/* Для шаблонов — список стёкол с размерами */}
          {draft.config && draft.config.startsWith('template-') && draft.selectedTemplate && draft.templateGlasses && (
            <div style={{ margin: '8px 0 0 0' }}>
              <b>Стёкла:</b>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 24 }}>
                {draft.selectedTemplate.glassConfig && Array.isArray(draft.selectedTemplate.glassConfig) && 
                  draft.selectedTemplate.glassConfig.map((glassConf: GlassConfig, idx: number) => {
                    const glassData = draft.templateGlasses![idx];
                    if (!glassData || !glassData.width || !glassData.height) return null;
                    
                    const typeLabels: { [key: string]: string } = {
                      'stationary': 'Стационар',
                      'swing_door': 'Распашная дверь',
                      'sliding_door': 'Раздвижная дверь'
                    };
                    
                    const typeLabel = typeLabels[glassConf.type] || glassConf.type;
                    let sizeInfo = `${glassData.width} × ${glassData.height}`;
                    
                    // Добавляем информацию о корректировках для дверей
                    if (glassConf.type === 'swing_door' && draft.selectedTemplate?.sizeAdjustments) {
                      const doorReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
                      const thresholdReduction = draft.selectedTemplate.sizeAdjustments.thresholdReduction || 15;
                      const exactHeightReduction = draft.exactHeight ? 3 : 0; // Вычитаем 3 мм при нестандартной высоте
                      const correctedHeight = Number(glassData.height) - doorReduction - (glassData.hasThreshold ? thresholdReduction : 0) - exactHeightReduction;
                      sizeInfo += ` → ${glassData.width} × ${correctedHeight} мм`;
                      if (glassData.hasThreshold) sizeInfo += ' (с порожком)';
                      if (draft.exactHeight) sizeInfo += ' (нестандартная высота -3мм)';
                    } else if (glassConf.type === 'sliding_door' && draft.selectedTemplate?.sizeAdjustments) {
                      const doorReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
                      const exactHeightReduction = draft.exactHeight ? 3 : 0; // Вычитаем 3 мм при нестандартной высоте
                      const correctedHeight = Number(glassData.height) - doorReduction - exactHeightReduction;
                      sizeInfo += ` → ${glassData.width} × ${correctedHeight} мм`;
                      if (draft.exactHeight) sizeInfo += ' (нестандартная высота -3мм)';
                    } else {
                      const exactHeightReduction = draft.exactHeight ? 3 : 0; // Вычитаем 3 мм при нестандартной высоте для стационара
                      if (exactHeightReduction > 0) {
                        const correctedHeight = Number(glassData.height) - exactHeightReduction;
                        sizeInfo += ` → ${glassData.width} × ${correctedHeight} мм (нестандартная высота -3мм)`;
                      } else {
                        sizeInfo += ' мм';
                      }
                    }
                    
                    return (
                      <li key={idx}>
                        {glassConf.name} ({typeLabel}): {sizeInfo}
                      </li>
                    );
                  })
                }
              </ul>
            </div>
          )}
          {/* Для остальных конфигураций — старый вывод */}
          {draft.config !== 'unique' && !draft.config?.startsWith('template-') && draft.glassColor && (
            <div><b>Цвет стекла:</b> {draft.glassColor}</div>
          )}
          {draft.config !== 'unique' && !draft.config?.startsWith('template-') && draft.glassThickness && (
            <div><b>Толщина стекла:</b> {draft.glassThickness} мм</div>
          )}
          {draft.hardwareColor && <div><b>Цвет фурнитуры:</b> {hardwareColorLabels[draft.hardwareColor] || draft.hardwareColor}</div>}
          {/* Для перегородки — размер стекла */}
          {draft.config === 'partition' && draft.width && draft.height && (
            <div><b>Размер стекла:</b> {draft.width} × {exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</div>
          )}
          {/* Чекбокс нестандартной высоты для перегородки */}
          {draft.config === 'partition' && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Нестандартная высота
              </label>
            </div>
          )}

          {/* Для стекляшки — общий размер стекла */}
          {draft.config === 'glass' && draft.width && draft.height && (
            <div><b>Размер стекла:</b> {draft.width} × {exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</div>
          )}
          {/* Чекбокс нестандартной высоты для стекляшки */}
          {draft.config === 'glass' && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Нестандартная высота
              </label>
            </div>
          )}
          {/* Размеры и формулы для обоих режимов */}
          {['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config)) ? (
            draft.showGlassSizes ? (
              draft.stationaryWidth && draft.doorWidth && draft.height ? (
                <div>
                  <b>Размеры проёма:</b> {draft.stationaryWidth} × {draft.height} мм
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 24, listStyle: 'disc' }}>
                    <li>Стационар: {Number(draft.stationaryWidth) - Number(draft.doorWidth) + 30} × {draft.exactHeight ? Number(draft.height) - 3 : Number(draft.height)} мм</li>
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
                Нестандартная высота
              </label>
            </div>
          )}
          {/* Чекбокс "Точная высота" для всех прямых раздвижных */}
          {['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config)) && (
            <div style={{ margin: '8px 0' }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exactHeight}
                  onChange={e => onExactHeightChange?.(e.target.checked)}
                />{' '}
                Нестандартная высота
              </label>
            </div>
          )}
          {/* Кнопка копирования для производства - только при редактировании */}
          {draft && (draft.glassColor || draft.width || draft.height) && isEditing && (
            <div style={{ margin: '18px 0 12px 0' }}>
              <button
                onClick={() => {
                                     // Собираем информацию для производства
                   const productionInfo = [];
                   
                   // Для уникальной конфигурации не добавляем общие параметры стекла
                   if (draft.config !== 'unique') {
                     if (draft.glassColor) {
                       productionInfo.push(`Цвет стекла: ${draft.glassColor}`);
                     }
                     
                     if (draft.glassThickness) {
                       productionInfo.push(`Толщина стекла: ${draft.glassThickness} мм`);
                     }
                   }
                  
                  // Размеры стекла в зависимости от конфигурации
                  if (draft.config === 'glass' && draft.width && draft.height) {
                    const height = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                    productionInfo.push(`Размеры стекла: ${draft.width} × ${height} мм`);
                  } else if (['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config))) {
                    if (draft.showGlassSizes && draft.stationaryWidth && draft.doorWidth && draft.height) {
                      const stationaryHeight = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                      const doorHeight = exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8;
                      const stationaryWidth = Number(draft.stationaryWidth) - Number(draft.doorWidth) + 30;
                      productionInfo.push(`Размеры стекла:`);
                      productionInfo.push(`- Стационар: ${stationaryWidth} × ${stationaryHeight} мм`);
                      productionInfo.push(`- Дверь: ${draft.doorWidth} × ${doorHeight} мм`);
                    } else if (!draft.showGlassSizes && draft.width && draft.height) {
                      const stationaryHeight = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                      const doorHeight = exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8;
                      const glassWidth = Math.round((Number(draft.width) + 30) / 2);
                      productionInfo.push(`Размеры стекла:`);
                      productionInfo.push(`- Стационар: ${glassWidth} × ${stationaryHeight} мм`);
                      productionInfo.push(`- Дверь: ${glassWidth} × ${doorHeight} мм`);
                    }
                  } else if (draft.config === 'corner' && draft.width && draft.length && draft.height) {
                    const stationaryHeight = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                    const doorHeight = exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8;
                    productionInfo.push(`Размеры стекла:`);
                    productionInfo.push(`- Стационар 1: ${Math.round(Number(draft.width) / 2)} × ${stationaryHeight} мм`);
                    productionInfo.push(`- Дверь 1: ${Math.round(Number(draft.width) / 2)} × ${doorHeight} мм`);
                    productionInfo.push(`- Стационар 2: ${Math.round(Number(draft.length) / 2)} × ${stationaryHeight} мм`);
                    productionInfo.push(`- Дверь 2: ${Math.round(Number(draft.length) / 2)} × ${doorHeight} мм`);
                  } else if (draft.config === 'partition' && draft.width && draft.height) {
                    const height = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                    const heightSuffix = exactHeight ? ' (нестандартная высота -3мм)' : '';
                    productionInfo.push(`Размеры стекла: ${draft.width} × ${height} мм${heightSuffix}`);
                                     } else if (draft.config === 'unique' && Array.isArray(draft.uniqueGlasses)) {
                     productionInfo.push(`Размеры стекла:`);
                     draft.uniqueGlasses.forEach((glass) => {
                       // Учитываем нестандартную высоту для уникальной конфигурации
                       const heightValue = exactHeight ? Number(glass.height) - 3 : Number(glass.height);
                       const heightSuffix = exactHeight ? ' (нестандартная высота -3мм)' : '';
                       productionInfo.push(`${glass.name}: ${glass.color} ${glass.thickness} мм: ${glass.width} × ${heightValue}${heightSuffix}`);
                     });
                  } else if (draft.config && draft.config.startsWith('template-') && draft.selectedTemplate && draft.templateGlasses) {
                    productionInfo.push(`Размеры стекла:`);
                    if (draft.selectedTemplate.glassConfig && Array.isArray(draft.selectedTemplate.glassConfig)) {
                      draft.selectedTemplate.glassConfig.forEach((glassConf: GlassConfig, idx: number) => {
                        const glassData = draft.templateGlasses![idx];
                        if (glassData && glassData.width && glassData.height) {
                          const typeLabels: { [key: string]: string } = {
                            'stationary': 'Стационар',
                            'swing_door': 'Распашная дверь',
                            'sliding_door': 'Раздвижная дверь'
                          };
                          const typeLabel = typeLabels[glassConf.type] || glassConf.type;
                          
                          if (glassConf.type === 'swing_door' && draft.selectedTemplate?.sizeAdjustments) {
                            const doorReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
                            const thresholdReduction = draft.selectedTemplate.sizeAdjustments.thresholdReduction || 15;
                            const exactHeightReduction = exactHeight ? 3 : 0;
                            const correctedHeight = Number(glassData.height) - doorReduction - (glassData.hasThreshold ? thresholdReduction : 0) - exactHeightReduction;
                            productionInfo.push(`- ${glassConf.name} (${typeLabel}): ${glassData.width} × ${correctedHeight} мм${glassData.hasThreshold ? ' (с порожком)' : ''}${exactHeight ? ' (нестандартная высота)' : ''}`);
                          } else if (glassConf.type === 'sliding_door' && draft.selectedTemplate?.sizeAdjustments) {
                            const doorReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
                            const exactHeightReduction = exactHeight ? 3 : 0;
                            const correctedHeight = Number(glassData.height) - doorReduction - exactHeightReduction;
                            productionInfo.push(`- ${glassConf.name} (${typeLabel}): ${glassData.width} × ${correctedHeight} мм${exactHeight ? ' (нестандартная высота)' : ''}`);
                          } else {
                            const exactHeightReduction = exactHeight ? 3 : 0;
                            const correctedHeight = exactHeightReduction > 0 ? Number(glassData.height) - exactHeightReduction : Number(glassData.height);
                            productionInfo.push(`- ${glassConf.name} (${typeLabel}): ${glassData.width} × ${correctedHeight} мм${exactHeight ? ' (нестандартная высота)' : ''}`);
                          }
                        }
                      });
                    }
                  }
                  
                  const textToCopy = productionInfo.join('\n');
                  
                  // Копируем в буфер обмена
                  navigator.clipboard.writeText(textToCopy).then(() => {
                    // Можно добавить уведомление об успешном копировании
                    console.log('Информация для производства скопирована в буфер обмена');
                  }).catch(err => {
                    console.error('Ошибка при копировании:', err);
                  });
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: '#fff',
                  color: '#28a745',
                  border: '2px solid #28a745',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginBottom: 12
                }}
              >
                Копировать для производства
              </button>
            </div>
          )}
          
          {/* Универсальная разбивка стоимости */}
          {positions && positions.length > 0 && (
            <div style={{ margin: '6px 0 0 0', color: '#000' }}>
              <b style={{ color: '#000' }}>Разбивка стоимости:</b>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 0, paddingRight: 0, listStyle: 'none', width: '100%', boxSizing: 'border-box' }}>
                {positions.map((pos, idx) => (
                  <li key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    padding: '2px 0',
                    color: '#000',
                    gap: '8px'
                  }}>
                                         <span style={{ 
                       color: '#000', 
                       flex: '1',
                       wordWrap: 'break-word',
                       overflowWrap: 'break-word',
                       paddingRight: '8px'
                     }}>{pos.label}</span>
                     <span style={{ 
                       flexShrink: '0',
                       minWidth: '90px',
                       textAlign: 'right',
                       whiteSpace: 'nowrap'
                     }}><b style={{ color: '#000' }}>{pos.total} GEL</b></span>
                  </li>
                ))}
              </ul>
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
                Цена: {total.toFixed(2)} {settings.currency}
              </div>
              {settings.showUSD && usdRate > 0 && (
                <div style={{ color: '#888', fontSize: 15, marginTop: 4 }}>
                  ~ {(total / usdRate).toFixed(2)} $
                </div>
              )}
              {settings.showRR && settings.rrRate && parseFloat(settings.rrRate) > 0 && (
                <div style={{ color: '#888', fontSize: 15, marginTop: 4 }}>
                  ~ {(total / parseFloat(settings.rrRate)).toFixed(2)} ₽
                </div>
              )}
              
              {/* Кнопка копирования для заказчика - только при редактировании */}
              {isEditing && (
              <div style={{ marginTop: 16 }}>
                <button
                                    onClick={() => {
                    const clientInfo = [];
                    
                    // Название проекта с конфигурацией
                    if (draft.projectName || draft.config) {
                      const configLabel = configLabels[String(draft.config ?? '')] || '';
                      if (draft.projectName && configLabel) {
                        clientInfo.push(`Проект: ${draft.projectName} (${configLabel})`);
                      } else if (draft.projectName) {
                        clientInfo.push(`Проект: ${draft.projectName}`);
                      } else if (configLabel) {
                        clientInfo.push(`Проект: ${configLabel}`);
                      }
                    }
                    
                    // Цвет стекла
                    if (draft.glassColor) {
                      clientInfo.push(`Цвет стекла: ${draft.glassColor}`);
                    }
                    
                    // Толщина стекла
                    if (draft.glassThickness) {
                      clientInfo.push(`Толщина стекла: ${draft.glassThickness} мм`);
                    }
                    
                    // Размеры стекла - в зависимости от конфигурации
                    if (draft.config === 'glass' && draft.width && draft.height) {
                      const height = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                      clientInfo.push(`Размеры стекла: ${draft.width} × ${height} мм`);
                    } else if (['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config))) {
                      if (draft.showGlassSizes && draft.stationaryWidth && draft.doorWidth && draft.height) {
                        clientInfo.push(`Размеры проёма: ${draft.stationaryWidth} × ${draft.height} мм`);
                      } else if (draft.width && draft.height) {
                        clientInfo.push(`Размеры проёма: ${draft.width} × ${draft.height} мм`);
                      }
                    } else if (draft.config === 'corner' && draft.width && draft.length && draft.height) {
                      clientInfo.push(`Размеры: ${draft.width} × ${draft.length} × ${draft.height} мм`);
                    } else if (draft.config === 'partition' && draft.width && draft.height) {
                      const height = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                      clientInfo.push(`Размеры стекла: ${draft.width} × ${height} мм`);
                    } else if (draft.config === 'unique' && Array.isArray(draft.uniqueGlasses) && draft.uniqueGlasses.length > 0) {
                      clientInfo.push('Размеры стекол:');
                      draft.uniqueGlasses.forEach((glass) => {
                        const heightValue = exactHeight ? Number(glass.height) - 3 : Number(glass.height);
                        clientInfo.push(`${glass.name}: ${glass.width} × ${heightValue} мм`);
                      });
                    }
                    
                    // Детальная информация о всех стеклах
                    if (draft.config && draft.width && draft.height) {
                      clientInfo.push(''); // Пустая строка для разделения
                      
                      if (draft.config === 'glass') {
                        // Стекляшка - одно стекло
                        const height = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                        clientInfo.push('Стекла:');
                        clientInfo.push(`Стекло: ${draft.width} × ${height} мм`);
                      } else if (['straight', 'straight-glass', 'straight-opening'].includes(String(draft.config))) {
                        // Прямые раздвижные
                        clientInfo.push('Стекла:');
                        if (draft.showGlassSizes && draft.stationaryWidth && draft.doorWidth && draft.height) {
                          const stationaryHeight = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                          const doorHeight = exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8;
                          const stationaryWidth = Number(draft.stationaryWidth) - Number(draft.doorWidth) + 30;
                          clientInfo.push(`Стационар: ${stationaryWidth} × ${stationaryHeight} мм`);
                          clientInfo.push(`Дверь: ${draft.doorWidth} × ${doorHeight} мм`);
                        } else if (draft.width && draft.height) {
                          const stationaryHeight = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                          const doorHeight = exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8;
                          const glassWidth = Math.round((Number(draft.width) + 30) / 2);
                          clientInfo.push(`Стационар: ${glassWidth} × ${stationaryHeight} мм`);
                          clientInfo.push(`Дверь: ${glassWidth} × ${doorHeight} мм`);
                        }
                      } else if (draft.config === 'corner' && draft.width && draft.length && draft.height) {
                        // Угловая раздвижная
                        const stationaryHeight = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                        const doorHeight = exactHeight ? Number(draft.height) - 11 : Number(draft.height) - 8;
                        clientInfo.push('Стекла:');
                        clientInfo.push(`Стационар 1: ${Math.round(Number(draft.width) / 2)} × ${stationaryHeight} мм`);
                        clientInfo.push(`Дверь 1: ${Math.round(Number(draft.width) / 2)} × ${doorHeight} мм`);
                        clientInfo.push(`Стационар 2: ${Math.round(Number(draft.length) / 2)} × ${stationaryHeight} мм`);
                        clientInfo.push(`Дверь 2: ${Math.round(Number(draft.length) / 2)} × ${doorHeight} мм`);
                      } else if (draft.config === 'partition') {
                        // Перегородка - одно стекло
                        const height = exactHeight ? Number(draft.height) - 3 : Number(draft.height);
                        clientInfo.push('Стекла:');
                        clientInfo.push(`Стекло: ${draft.width} × ${height} мм`);
                      } else if (draft.config === 'unique' && Array.isArray(draft.uniqueGlasses) && draft.uniqueGlasses.length > 0) {
                        // Уникальная конфигурация - уже обработана выше, ничего не добавляем
                      } else if (draft.config && draft.config.startsWith('template-') && draft.selectedTemplate && draft.templateGlasses) {
                        // Шаблоны
                        clientInfo.push('Стекла:');
                        if (draft.selectedTemplate.glassConfig && Array.isArray(draft.selectedTemplate.glassConfig)) {
                          draft.selectedTemplate.glassConfig.forEach((glassConf: GlassConfig, idx: number) => {
                            const glassData = draft.templateGlasses![idx];
                            if (glassData && glassData.width && glassData.height) {
                              const typeLabels: { [key: string]: string } = {
                                'stationary': 'Стационар',
                                'swing_door': 'Дверь',
                                'sliding_door': 'Дверь'
                              };
                              const typeLabel = typeLabels[glassConf.type] || 'Стекло';
                              
                              if (glassConf.type === 'swing_door' && draft.selectedTemplate?.sizeAdjustments) {
                                const doorReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
                                const thresholdReduction = draft.selectedTemplate.sizeAdjustments.thresholdReduction || 15;
                                const exactHeightReduction = exactHeight ? 3 : 0;
                                const correctedHeight = Number(glassData.height) - doorReduction - (glassData.hasThreshold ? thresholdReduction : 0) - exactHeightReduction;
                                clientInfo.push(`${typeLabel} ${idx + 1}: ${glassData.width} × ${correctedHeight} мм`);
                              } else if (glassConf.type === 'sliding_door' && draft.selectedTemplate?.sizeAdjustments) {
                                const doorReduction = draft.selectedTemplate.sizeAdjustments.doorHeightReduction || 8;
                                const exactHeightReduction = exactHeight ? 3 : 0;
                                const correctedHeight = Number(glassData.height) - doorReduction - exactHeightReduction;
                                clientInfo.push(`${typeLabel} ${idx + 1}: ${glassData.width} × ${correctedHeight} мм`);
                              } else {
                                const exactHeightReduction = exactHeight ? 3 : 0;
                                const correctedHeight = exactHeightReduction > 0 ? Number(glassData.height) - exactHeightReduction : Number(glassData.height);
                                clientInfo.push(`${typeLabel} ${idx + 1}: ${glassData.width} × ${correctedHeight} мм`);
                              }
                            }
                          });
                        }
                      }
                    }
                    
                    // Цвет фурнитуры
                    if (draft.hardwareColor) {
                      const hardwareColorLabels: { [key: string]: string } = {
                        'chrome': 'Хром',
                        'black': 'Черный',
                        'matte': 'Матовый',
                        'gold': 'Золотой',
                        'painted': 'Крашенный'
                      };
                      clientInfo.push(`Цвет фурнитуры: ${hardwareColorLabels[draft.hardwareColor] || draft.hardwareColor}`);
                    }
                    
                    // Вся необходимая фурнитура (словами) - сразу под цветом фурнитуры
                    clientInfo.push('Вся необходимая фурнитура для изделия включена в стоимость');
                    
                    // Выбранные услуги (без цен)
                    if (draft.projectServices && Array.isArray(draft.projectServices) && draft.projectServices.length > 0) {
                      clientInfo.push(''); // Пустая строка для разделения
                      clientInfo.push('Услуги:');
                      draft.projectServices.forEach(service => {
                        clientInfo.push(`- ${service.name}`);
                      });
                    }
                    
                    // Общая стоимость
                    clientInfo.push(`\nОбщая стоимость: ${total.toFixed(2)} ${settings.currency}`);
                    
                    const textToCopy = clientInfo.join('\n');
                    
                    // Копируем в буфер обмена
                    navigator.clipboard.writeText(textToCopy).then(() => {
                      console.log('Информация для заказчика скопирована в буфер обмена');
                    }).catch(err => {
                      console.error('Ошибка при копировании:', err);
                    });
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: '#fff',
                    color: '#28a745',
                    border: '2px solid #28a745',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    marginTop: 8
                  }}
                >
                  Копировать для заказчика
                </button>
              </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
      <div style={{ color: '#888', fontSize: 16 }}>
        Заполните данные проекта, чтобы увидеть детали расчёта.
      </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .calculation-details-container {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px 12px !important;
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
          
          /* Стили для списка разбивки стоимости на мобильных */
          .calculation-details-container ul {
            padding-left: 0 !important;
            padding-right: 0 !important;
            margin: 6px 0 0 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          .calculation-details-container li {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            padding: 4px 0 !important;
            font-size: 14px !important;
            line-height: 1.3 !important;
            gap: 8px !important;
          }
          
          .calculation-details-container li span:first-child {
            flex: 1 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            hyphens: auto !important;
            font-size: 14px !important;
            padding-right: 8px !important;
          }
          
          .calculation-details-container li span:last-child {
            flex-shrink: 0 !important;
            min-width: 90px !important;
            text-align: right !important;
            font-size: 14px !important;
            font-weight: bold !important;
            white-space: nowrap !important;
          }
        
        @media (max-width: 480px) {
          .calculation-details-container {
            padding: 12px 8px !important;
          }
          
          .calculation-details-container li {
            font-size: 13px !important;
            padding: 3px 0 !important;
            gap: 6px !important;
          }
          
          .calculation-details-container li span:first-child {
            font-size: 13px !important;
            padding-right: 6px !important;
          }
          
          .calculation-details-container li span:last-child {
            min-width: 85px !important;
            font-size: 13px !important;
            white-space: nowrap !important;
          }
          
          .calculation-details-container h2 {
            font-size: 18px !important;
            margin-bottom: 12px !important;
          }
          
          .calculation-details-container > div {
            font-size: 14px !important;
          }
        }
        
        @media (max-width: 380px) {
          .calculation-details-container {
            padding: 8px 4px !important;
          }
          
          .calculation-details-container li {
            font-size: 12px !important;
            gap: 4px !important;
          }
          
          .calculation-details-container li span:first-child {
            font-size: 12px !important;
            padding-right: 4px !important;
          }
          
          .calculation-details-container li span:last-child {
            min-width: 80px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CalculationDetails; 

export type { DraftProjectData }; 