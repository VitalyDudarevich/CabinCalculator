const Project = require('../models/Project');
const Status = require('../models/Status');
const User = require('../models/User');
const Setting = require('../models/Setting');
const BaseCost = require('../models/BaseCost');

// Получение отчёта по продажам и выручке
const getSalesReport = async (req, res) => {
  try {
    const { companyId, startDate, endDate, configuration } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Построение фильтра
    const filter = { companyId };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (configuration) {
      filter['data.config'] = configuration;
    }

    // Получаем все проекты, настройки и статусы компании
    const [projects, settings, statuses] = await Promise.all([
      Project.find(filter).populate('statusId'),
      Setting.findOne({ companyId }),
      Status.find({ companyId }),
    ]);

    // Получаем список завершенных статусов из базы данных
    const completedStatusNames = statuses
      .filter((status) => status.isCompletedForAnalytics)
      .map((status) => status.name);

    // Также поддерживаем старый способ для совместимости (текстовые статусы)
    const legacyCompletedStatuses = ['Оплачено', 'Завершено'];
    const allCompletedStatuses = [...completedStatusNames, ...legacyCompletedStatuses];

    const completedProjects = projects.filter(
      (p) =>
        allCompletedStatuses.includes(p.status) ||
        (p.statusId && p.statusId.isCompletedForAnalytics),
    );

    // Разделяем проекты на завершенные и незавершенные
    const inProgressProjects = projects.filter(
      (p) =>
        !allCompletedStatuses.includes(p.status) &&
        !(p.statusId && p.statusId.isCompletedForAnalytics),
    );

    // Расчёт метрик
    const totalOrders = projects.length;
    const completedOrders = completedProjects.length;
    const inProgressOrders = inProgressProjects.length;

    const totalRevenue = projects.reduce((sum, p) => sum + (p.price || 0), 0);
    const completedRevenue = completedProjects.reduce((sum, p) => sum + (p.price || 0), 0);
    const inProgressRevenue = inProgressProjects.reduce((sum, p) => sum + (p.price || 0), 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageCompletedValue = completedOrders > 0 ? completedRevenue / completedOrders : 0;
    const averageInProgressValue = inProgressOrders > 0 ? inProgressRevenue / inProgressOrders : 0;

    // Группировка по конфигурациям с разделением на завершенные и незавершенные
    const configurationStats = {};
    projects.forEach((project) => {
      const config = project.data?.config || 'unknown';
      const isCompleted =
        allCompletedStatuses.includes(project.status) ||
        (project.statusId && project.statusId.isCompletedForAnalytics);

      if (!configurationStats[config]) {
        configurationStats[config] = {
          count: 0,
          revenue: 0,
          completedCount: 0,
          completedRevenue: 0,
          inProgressCount: 0,
          inProgressRevenue: 0,
        };
      }

      configurationStats[config].count++;
      configurationStats[config].revenue += project.price || 0;

      if (isCompleted) {
        configurationStats[config].completedCount++;
        configurationStats[config].completedRevenue += project.price || 0;
      } else {
        configurationStats[config].inProgressCount++;
        configurationStats[config].inProgressRevenue += project.price || 0;
      }
    });

    // График выручки по дням
    const revenueByDate = {};
    projects.forEach((project) => {
      const date = project.createdAt.toISOString().split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      revenueByDate[date] += project.price || 0;
    });

    res.json({
      totalOrders,
      completedOrders,
      inProgressOrders,
      totalRevenue,
      completedRevenue,
      inProgressRevenue,
      averageOrderValue,
      averageCompletedValue,
      averageInProgressValue,
      configurationStats,
      revenueByDate,
      conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      inProgressRate: totalOrders > 0 ? (inProgressOrders / totalOrders) * 100 : 0,
      currency: settings?.currency || 'GEL',
      currencyRates: {
        usdRate: settings?.usdRate || 0,
        rrRate: settings?.rrRate || 0,
      },
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Анализ популярных конфигураций
const getConfigurationAnalysis = async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const filter = { companyId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Получаем проекты и настройки компании
    const [projects, settings] = await Promise.all([
      Project.find(filter),
      Setting.findOne({ companyId }),
    ]);

    // Анализ конфигураций
    const configurations = {};
    const glassTypes = {};
    const glassThickness = {};
    const hardwareColors = {};
    const combinations = {};

    let totalWidth = 0,
      totalHeight = 0,
      totalLength = 0;
    let dimensionCount = 0;

    // Средние размеры по конфигурациям
    const dimensionsByConfiguration = {};

    projects.forEach((project) => {
      const data = project.data || {};

      // Конфигурации
      const config = data.config || 'unknown';
      configurations[config] = (configurations[config] || 0) + 1;

      // Типы стекла
      const glassColor = data.glassColor || 'unknown';
      glassTypes[glassColor] = (glassTypes[glassColor] || 0) + 1;

      // Толщина стекла
      const thickness = data.glassThickness || 'unknown';
      glassThickness[thickness] = (glassThickness[thickness] || 0) + 1;

      // Цвета фурнитуры
      const hardwareColor = data.hardwareColor || 'unknown';
      hardwareColors[hardwareColor] = (hardwareColors[hardwareColor] || 0) + 1;

      // Популярные комбинации
      const combo = `${glassColor} + ${hardwareColor}`;
      combinations[combo] = (combinations[combo] || 0) + 1;

      // Средние размеры общие
      if (data.width) {
        totalWidth += parseFloat(data.width) || 0;
        dimensionCount++;
      }
      if (data.height) {
        totalHeight += parseFloat(data.height) || 0;
      }
      if (data.length) {
        totalLength += parseFloat(data.length) || 0;
      }

      // Средние размеры по конфигурациям
      if (!dimensionsByConfiguration[config]) {
        dimensionsByConfiguration[config] = {
          totalWidth: 0,
          totalHeight: 0,
          totalLength: 0,
          count: 0,
        };
      }

      if (data.width) {
        dimensionsByConfiguration[config].totalWidth += parseFloat(data.width) || 0;
        dimensionsByConfiguration[config].count++;
      }
      if (data.height) {
        dimensionsByConfiguration[config].totalHeight += parseFloat(data.height) || 0;
      }
      if (data.length) {
        dimensionsByConfiguration[config].totalLength += parseFloat(data.length) || 0;
      }
    });

    // Вычисляем средние размеры по конфигурациям
    const averageDimensionsByConfiguration = {};
    Object.keys(dimensionsByConfiguration).forEach((config) => {
      const data = dimensionsByConfiguration[config];
      averageDimensionsByConfiguration[config] = {
        width: data.count > 0 ? data.totalWidth / data.count : 0,
        height: data.count > 0 ? data.totalHeight / data.count : 0,
        length: data.count > 0 ? data.totalLength / data.count : 0,
        count: data.count,
      };
    });

    // Сортировка по популярности
    const sortedConfigurations = Object.entries(configurations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const sortedGlassTypes = Object.entries(glassTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const sortedHardwareColors = Object.entries(hardwareColors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const sortedCombinations = Object.entries(combinations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    res.json({
      totalProjects: projects.length,
      configurations: sortedConfigurations,
      glassTypes: sortedGlassTypes,
      glassThickness: Object.entries(glassThickness),
      hardwareColors: sortedHardwareColors,
      popularCombinations: sortedCombinations,
      averageDimensions: {
        width: dimensionCount > 0 ? totalWidth / dimensionCount : 0,
        height: dimensionCount > 0 ? totalHeight / dimensionCount : 0,
        length: dimensionCount > 0 ? totalLength / dimensionCount : 0,
      },
      averageDimensionsByConfiguration,
      currency: settings?.currency || 'GEL',
      currencyRates: {
        usdRate: settings?.usdRate || 0,
        rrRate: settings?.rrRate || 0,
      },
    });
  } catch (error) {
    console.error('Error generating configuration analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Финансовая аналитика
const getFinancialAnalysis = async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const filter = { companyId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Получаем проекты, настройки и базовые стоимости
    const [projects, settings, baseCosts] = await Promise.all([
      Project.find(filter),
      Setting.findOne({ companyId }),
      BaseCost.find({ companyId }),
    ]);

    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;
    const marginByConfiguration = {};

    projects.forEach((project) => {
      const revenue = project.price || 0;
      totalRevenue += revenue;

      const data = project.data || {};
      const config = data.config || 'unknown';

      // Расчёт маржи на основе настроек компании
      let margin = 0;

      if (settings) {
        const baseCostMode = settings.baseCostMode || 'fixed';

        if (baseCostMode === 'fixed') {
          // Ищем базовую стоимость для конфигурации
          const configBaseCost = baseCosts.find((bc) => {
            const bcName = bc.name.toLowerCase();
            return (
              (config === 'glass' &&
                (bcName.includes('стационарного стекла') || bcName.includes('стекло'))) ||
              (config === 'straight' &&
                (bcName.includes('прямой раздвижной') || bcName.includes('раздвижн'))) ||
              (config === 'corner' &&
                (bcName.includes('угловой раздвижной') || bcName.includes('углов'))) ||
              (config === 'unique' && (bcName.includes('уникальной') || bcName.includes('уник'))) ||
              (config === 'partition' &&
                (bcName.includes('перегородки') || bcName.includes('перегородк')))
            );
          });

          if (configBaseCost) {
            margin += configBaseCost.value || 0;
          }

          // Дополнительно ищем любую базовую стоимость, если специфичная не найдена
          if (!configBaseCost && baseCosts.length > 0) {
            const defaultBaseCost = baseCosts.find((bc) =>
              bc.name.toLowerCase().includes('базовая стоимость'),
            );
            if (defaultBaseCost) {
              margin += defaultBaseCost.value || 0;
            }
          }
        } else if (baseCostMode === 'percentage') {
          // Процентная базовая стоимость
          const percentage = settings.baseCostPercentage || 0;
          if (percentage > 0) {
            // Рассчитываем процент от выручки
            margin += revenue * (percentage / 100);
          }
        }

        // Добавляем кастомную надбавку за цвет, если она была применена
        if (data.customColor && settings.customColorSurcharge) {
          // Примерно рассчитываем надбавку (это приблизительно, т.к. точные данные не сохраняются)
          const hardwareTotal = revenue * 0.3; // Примерная доля фурнитуры
          margin += hardwareTotal * (settings.customColorSurcharge / 100);
        }
      }

      // Себестоимость = общая стоимость - маржа
      const cost = revenue - margin;

      totalCost += Math.max(0, cost);
      totalMargin += margin;

      // Маржа по конфигурациям
      if (!marginByConfiguration[config]) {
        marginByConfiguration[config] = { revenue: 0, cost: 0, margin: 0, count: 0 };
      }
      marginByConfiguration[config].revenue += revenue;
      marginByConfiguration[config].cost += Math.max(0, cost);
      marginByConfiguration[config].margin += margin;
      marginByConfiguration[config].count++;
    });

    const averageMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    // Маржа по конфигурациям с процентами
    Object.keys(marginByConfiguration).forEach((config) => {
      const data = marginByConfiguration[config];
      data.marginPercent = data.revenue > 0 ? (data.margin / data.revenue) * 100 : 0;
      data.averageRevenue = data.count > 0 ? data.revenue / data.count : 0;
      data.averageCost = data.count > 0 ? data.cost / data.count : 0;
      data.averageMargin = data.count > 0 ? data.margin / data.count : 0;
    });

    res.json({
      totalRevenue,
      totalCost,
      totalMargin,
      averageMarginPercent,
      marginByConfiguration,
      totalProjects: projects.length,
      averageProjectValue: projects.length > 0 ? totalRevenue / projects.length : 0,
      currency: settings?.currency || 'GEL',
      currencyRates: {
        usdRate: settings?.usdRate || 0,
        rrRate: settings?.rrRate || 0,
      },
    });
  } catch (error) {
    console.error('Error generating financial analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Анализ производственной нагрузки
const getProductionLoad = async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const filter = { companyId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [projects, statuses, settings] = await Promise.all([
      Project.find(filter).populate('statusId'),
      Status.find({ companyId }),
      Setting.findOne({ companyId }),
    ]);

    // Группировка по статусам
    const projectsByStatus = {};
    statuses.forEach((status) => {
      projectsByStatus[status.name] = {
        statusId: status._id,
        color: status.color,
        count: 0,
        projects: [],
      };
    });

    // Добавляем проекты к статусам
    projects.forEach((project) => {
      const statusName = project.statusId?.name || project.status || 'Unknown';
      if (!projectsByStatus[statusName]) {
        projectsByStatus[statusName] = {
          statusId: null,
          color: '#gray',
          count: 0,
          projects: [],
        };
      }
      projectsByStatus[statusName].count++;
      projectsByStatus[statusName].projects.push({
        _id: project._id,
        name: project.name,
        customer: project.customer,
        createdAt: project.createdAt,
        price: project.price,
      });
    });

    // Анализ времени в статусах
    const averageTimeInStatus = {};
    projects.forEach((project) => {
      if (project.statusHistory && project.statusHistory.length > 1) {
        for (let i = 1; i < project.statusHistory.length; i++) {
          const prevStatus = project.statusHistory[i - 1];
          const currentStatus = project.statusHistory[i];
          const timeInStatus = new Date(currentStatus.date) - new Date(prevStatus.date);
          const statusName = prevStatus.status || 'Unknown';

          if (!averageTimeInStatus[statusName]) {
            averageTimeInStatus[statusName] = { totalTime: 0, count: 0 };
          }
          averageTimeInStatus[statusName].totalTime += timeInStatus;
          averageTimeInStatus[statusName].count++;
        }
      }
    });

    // Преобразуем время в дни
    Object.keys(averageTimeInStatus).forEach((status) => {
      const data = averageTimeInStatus[status];
      data.averageDays = data.count > 0 ? data.totalTime / data.count / (1000 * 60 * 60 * 24) : 0;
    });

    // Загруженность по неделям
    const weeklyLoad = {};
    projects.forEach((project) => {
      const week = getWeekKey(project.createdAt);
      if (!weeklyLoad[week]) {
        weeklyLoad[week] = 0;
      }
      weeklyLoad[week]++;
    });

    res.json({
      projectsByStatus,
      averageTimeInStatus,
      weeklyLoad,
      totalProjects: projects.length,
      statusDistribution: Object.entries(projectsByStatus).map(([name, data]) => ({
        name,
        count: data.count,
        color: data.color,
        percentage: projects.length > 0 ? (data.count / projects.length) * 100 : 0,
      })),
      currency: settings?.currency || 'GEL',
      currencyRates: {
        usdRate: settings?.usdRate || 0,
        rrRate: settings?.rrRate || 0,
      },
    });
  } catch (error) {
    console.error('Error generating production load analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Анализ заказчиков
const getCustomerAnalysis = async (req, res) => {
  try {
    const { companyId, startDate, endDate, search } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const filter = { companyId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Добавляем поиск по заказчику
    if (search && search.trim()) {
      filter.customer = { $regex: search.trim(), $options: 'i' };
    }

    // Получаем проекты, настройки и базовые стоимости
    const [projects, settings, baseCosts] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }),
      Setting.findOne({ companyId }),
      BaseCost.find({ companyId }),
    ]);

    // Группируем по заказчикам
    const customerStats = {};

    projects.forEach((project) => {
      const customerName = project.customer || 'Без имени';
      const revenue = project.price || 0;
      const config = project.data?.config || 'unknown';
      const data = project.data || {};

      if (!customerStats[customerName]) {
        customerStats[customerName] = {
          totalOrders: 0,
          totalRevenue: 0,
          totalMargin: 0,
          configurations: {},
          projects: [],
          averageOrderValue: 0,
          marginPercent: 0,
        };
      }

      // Расчёт маржи для заказчика (аналогично финансовой аналитике)
      let margin = 0;

      if (settings) {
        const baseCostMode = settings.baseCostMode || 'fixed';

        if (baseCostMode === 'fixed') {
          const configBaseCost = baseCosts.find((bc) => {
            const bcName = bc.name.toLowerCase();
            return (
              (config === 'glass' &&
                (bcName.includes('стационарного стекла') || bcName.includes('стекло'))) ||
              (config === 'straight' &&
                (bcName.includes('прямой раздвижной') || bcName.includes('раздвижн'))) ||
              (config === 'corner' &&
                (bcName.includes('угловой раздвижной') || bcName.includes('углов'))) ||
              (config === 'unique' && (bcName.includes('уникальной') || bcName.includes('уник'))) ||
              (config === 'partition' &&
                (bcName.includes('перегородки') || bcName.includes('перегородк')))
            );
          });

          if (configBaseCost) {
            margin += configBaseCost.value || 0;
          }

          if (!configBaseCost && baseCosts.length > 0) {
            const defaultBaseCost = baseCosts.find((bc) =>
              bc.name.toLowerCase().includes('базовая стоимость'),
            );
            if (defaultBaseCost) {
              margin += defaultBaseCost.value || 0;
            }
          }
        } else if (baseCostMode === 'percentage') {
          const percentage = settings.baseCostPercentage || 0;
          if (percentage > 0) {
            margin += revenue * (percentage / 100);
          }
        }

        if (data.customColor && settings.customColorSurcharge) {
          const hardwareTotal = revenue * 0.3;
          margin += hardwareTotal * (settings.customColorSurcharge / 100);
        }
      }

      // Обновляем статистику заказчика
      customerStats[customerName].totalOrders++;
      customerStats[customerName].totalRevenue += revenue;
      customerStats[customerName].totalMargin += margin;

      // Конфигурации заказчика
      if (!customerStats[customerName].configurations[config]) {
        customerStats[customerName].configurations[config] = {
          count: 0,
          revenue: 0,
          margin: 0,
        };
      }
      customerStats[customerName].configurations[config].count++;
      customerStats[customerName].configurations[config].revenue += revenue;
      customerStats[customerName].configurations[config].margin += margin;

      // Добавляем проект в список
      customerStats[customerName].projects.push({
        _id: project._id,
        name: project.name,
        config: config,
        price: revenue,
        margin: margin,
        createdAt: project.createdAt,
        status: project.status || (project.statusId && project.statusId.name),
      });
    });

    // Вычисляем средние значения и проценты для каждого заказчика
    Object.keys(customerStats).forEach((customer) => {
      const stats = customerStats[customer];
      stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
      stats.marginPercent =
        stats.totalRevenue > 0 ? (stats.totalMargin / stats.totalRevenue) * 100 : 0;
      stats.totalCost = stats.totalRevenue - stats.totalMargin;
    });

    // Сортируем заказчиков по выручке
    const sortedCustomers = Object.entries(customerStats)
      .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)
      .slice(0, 100); // Ограничиваем топ-100 заказчиков

    // Топ конфигураций среди всех заказчиков
    const allConfigurations = {};
    Object.values(customerStats).forEach((customer) => {
      Object.entries(customer.configurations).forEach(([config, data]) => {
        if (!allConfigurations[config]) {
          allConfigurations[config] = { count: 0, revenue: 0 };
        }
        allConfigurations[config].count += data.count;
        allConfigurations[config].revenue += data.revenue;
      });
    });

    const topConfigurations = Object.entries(allConfigurations)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      customers: sortedCustomers,
      topConfigurations,
      totalCustomers: Object.keys(customerStats).length,
      totalProjects: projects.length,
      totalRevenue: Object.values(customerStats).reduce(
        (sum, customer) => sum + customer.totalRevenue,
        0,
      ),
      totalMargin: Object.values(customerStats).reduce(
        (sum, customer) => sum + customer.totalMargin,
        0,
      ),
      currency: settings?.currency || 'GEL',
      currencyRates: {
        usdRate: settings?.usdRate || 0,
        rrRate: settings?.rrRate || 0,
      },
    });
  } catch (error) {
    console.error('Error generating customer analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Получение данных для экспорта
const getExportData = async (req, res) => {
  try {
    const { companyId, startDate, endDate, reportType } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const filter = { companyId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const projects = await Project.find(filter).populate('statusId').populate('userId');

    // Подготавливаем данные для экспорта
    const exportData = projects.map((project) => ({
      id: project._id,
      name: project.name || 'Без названия',
      customer: project.customer || 'Не указан',
      configuration: project.data?.config || 'Не указана',
      glassColor: project.data?.glassColor || 'Не указан',
      glassThickness: project.data?.glassThickness || 'Не указана',
      hardwareColor: project.data?.hardwareColor || 'Не указан',
      width: project.data?.width || '',
      height: project.data?.height || '',
      length: project.data?.length || '',
      price: project.price || 0,
      status: project.statusId?.name || project.status || 'Не указан',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      manager: project.userId?.name || 'Не указан',
    }));

    res.json({
      data: exportData,
      count: exportData.length,
      reportType,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error generating export data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Вспомогательная функция для получения ключа недели
function getWeekKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const week = getWeekNumber(d);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = {
  getSalesReport,
  getConfigurationAnalysis,
  getFinancialAnalysis,
  getProductionLoad,
  getCustomerAnalysis,
  getExportData,
};
