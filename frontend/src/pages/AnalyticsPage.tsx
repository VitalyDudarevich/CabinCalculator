import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/auth';
import { API_URL } from '../utils/api';
import type { User } from '../types/User';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface AnalyticsPageProps {
  user: User | null;
  selectedCompanyId: string;
}

interface SalesReport {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  totalRevenue: number;
  completedRevenue: number;
  inProgressRevenue: number;
  averageOrderValue: number;
  averageCompletedValue: number;
  averageInProgressValue: number;
  configurationStats: { [key: string]: { 
    count: number; 
    revenue: number;
    completedCount: number;
    completedRevenue: number;
    inProgressCount: number;
    inProgressRevenue: number;
  } };
  revenueByDate: { [key: string]: number };
  conversionRate: number;
  completionRate: number;
  inProgressRate: number;
  currency: string;
  currencyRates: {
    usdRate: number;
    rrRate: number;
  };
}

interface ConfigurationAnalysis {
  totalProjects: number;
  configurations: [string, number][];
  glassTypes: [string, number][];
  glassThickness: [string, number][];
  hardwareColors: [string, number][];
  popularCombinations: [string, number][];
  averageDimensions: {
    width: number;
    height: number;
    length: number;
  };
  averageDimensionsByConfiguration: {
    [key: string]: {
      width: number;
      height: number;
      length: number;
      count: number;
    };
  };
  currency: string;
  currencyRates: {
    usdRate: number;
    rrRate: number;
  };
}

interface FinancialAnalysis {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  averageMarginPercent: number;
  marginByConfiguration: { [key: string]: { 
    revenue: number; 
    cost: number; 
    margin: number; 
    count: number;
    marginPercent: number;
    averageRevenue: number;
    averageCost: number;
    averageMargin: number;
  } };
  totalProjects: number;
  averageProjectValue: number;
  currency: string;
  currencyRates: {
    usdRate: number;
    rrRate: number;
  };
}

interface ProductionLoad {
  projectsByStatus: { [key: string]: { 
    statusId: string | null;
    color: string;
    count: number;
    projects: {
      _id: string;
      name: string;
      customer: string;
      createdAt: string;
      price: number;
    }[];
  } };
  averageTimeInStatus: { [key: string]: { 
    totalTime: number; 
    count: number; 
    averageDays: number; 
  } };
  weeklyLoad: { [key: string]: number };
  totalProjects: number;
  statusDistribution: {
    name: string;
    count: number;
    color: string;
    percentage: number;
  }[];
  currency: string;
  currencyRates: {
    usdRate: number;
    rrRate: number;
  };
}

interface CustomerAnalysis {
  customers: [string, {
    totalOrders: number;
    totalRevenue: number;
    totalMargin: number;
    totalCost: number;
    configurations: {
      [key: string]: {
        count: number;
        revenue: number;
        margin: number;
      };
    };
    projects: {
      _id: string;
      name: string;
      config: string;
      price: number;
      margin: number;
      createdAt: string;
      status: string;
    }[];
    averageOrderValue: number;
    marginPercent: number;
  }][];
  topConfigurations: [string, { count: number; revenue: number }][];
  totalCustomers: number;
  totalProjects: number;
  totalRevenue: number;
  totalMargin: number;
  currency: string;
  currencyRates: {
    usdRate: number;
    rrRate: number;
  };
}

const COLORS = ['#646cff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#f368e0', '#3742fa', '#2f3640'];

const configLabels: Record<string, string> = {
  glass: 'Стационарное стекло',
  straight: 'Прямая раздвижная',
  corner: 'Угловая раздвижная', 
  unique: 'Уникальная конфигурация',
  partition: 'Перегородка',
  unknown: 'Не указана'
};



const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ user, selectedCompanyId }) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'configurations' | 'financial' | 'production' | 'customers'>('sales');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Фильтры
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [configurationFilter, setConfigurationFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Данные отчётов
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [configData, setConfigData] = useState<ConfigurationAnalysis | null>(null);
  const [financialData, setFinancialData] = useState<FinancialAnalysis | null>(null);
  const [productionData, setProductionData] = useState<ProductionLoad | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalysis | null>(null);

  // Получение эффективного ID компании
  let effectiveCompanyId = selectedCompanyId;
  if (user && (user.role === 'admin' || user.role === 'user')) {
    const id = typeof user.companyId === 'string' ? user.companyId : 
               (user.companyId && typeof user.companyId === 'object' && '_id' in user.companyId ? user.companyId._id : '');
    effectiveCompanyId = id;
  }

  // Загрузка данных
  const loadAnalyticsData = async () => {
    if (!effectiveCompanyId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        companyId: effectiveCompanyId,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(configurationFilter && { configuration: configurationFilter })
      });

      // Параметры для заказчиков с поиском
      const customerParams = new URLSearchParams({
        companyId: effectiveCompanyId,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(customerSearch && { search: customerSearch })
      });

      const endpoints = {
        sales: `/analytics/sales?${params}`,
        configurations: `/analytics/configurations?${params}`,
        financial: `/analytics/financial?${params}`,
        production: `/analytics/production-load?${params}`,
        customers: `/analytics/customers?${customerParams}`
      };

      const responses = await Promise.all([
        fetchWithAuth(`${API_URL}${endpoints.sales}`),
        fetchWithAuth(`${API_URL}${endpoints.configurations}`),
        fetchWithAuth(`${API_URL}${endpoints.financial}`),
        fetchWithAuth(`${API_URL}${endpoints.production}`),
        fetchWithAuth(`${API_URL}${endpoints.customers}`)
      ]);

      const [salesRes, configRes, financialRes, productionRes, customerRes] = responses;

      if (salesRes.ok) {
        setSalesData(await salesRes.json());
      }
      if (configRes.ok) {
        setConfigData(await configRes.json());
      }
      if (financialRes.ok) {
        setFinancialData(await financialRes.json());
      }
      if (productionRes.ok) {
        setProductionData(await productionRes.json());
      }
      if (customerRes.ok) {
        setCustomerData(await customerRes.json());
      }

    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
      setError('Ошибка загрузки данных аналитики');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при изменении фильтров
  useEffect(() => {
    loadAnalyticsData();
  }, [effectiveCompanyId, startDate, endDate, configurationFilter, customerSearch]);

  // Функция экспорта данных
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        companyId: effectiveCompanyId,
        reportType: activeTab,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await fetchWithAuth(`${API_URL}/analytics/export?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        // Простой экспорт в JSON (можно расширить для Excel/PDF)
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `analytics_${activeTab}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (err) {
      console.error('Ошибка экспорта:', err);
    }
  };

  // Форматирование чисел
  const formatCurrency = (value: number, currency?: string) => {
    const currentCurrency = currency || salesData?.currency || financialData?.currency || configData?.currency || productionData?.currency || 'GEL';
    
    const currencyMap: { [key: string]: string } = {
      'GEL': 'GEL',
      'USD': 'USD', 
      'RR': 'RUB'
    };
    
    const currencySymbolMap: { [key: string]: string } = {
      'GEL': '₾',
      'USD': '$',
      'RR': '₽'
    };

    const actualCurrency = currencyMap[currentCurrency] || currentCurrency;
    const symbol = currencySymbolMap[currentCurrency];
    
    if (symbol) {
      return `${Math.round(value).toLocaleString('ru-RU')} ${symbol}`;
    }
    
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: actualCurrency === 'GEL' ? 'USD' : actualCurrency, // Fallback для GEL
      minimumFractionDigits: 0
    }).format(value).replace(/\$|USD/, actualCurrency === 'GEL' ? '₾' : '$');
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 56,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#f5f5f5',
      overflow: 'auto'
    }}>
      {/* Заголовок и фильтры */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            color: '#333'
          }}>
            Аналитика
          </h1>
          
          {/* Фильтры */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 14
              }}
            />
            <span style={{ color: '#666' }}>—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 14
              }}
            />
            <select
              value={configurationFilter}
              onChange={(e) => setConfigurationFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 14,
                minWidth: '150px'
              }}
            >
              <option value="">Все конфигурации</option>
              <option value="glass">Стационарное стекло</option>
              <option value="straight">Прямая раздвижная</option>
              <option value="corner">Угловая раздвижная</option>
              <option value="unique">Уникальная</option>
              <option value="partition">Перегородка</option>
            </select>
            
            {/* Поиск по заказчикам для вкладки заказчиков */}
            {activeTab === 'customers' && (
              <input
                type="text"
                placeholder="Поиск по заказчику"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  fontSize: 14,
                  minWidth: '200px'
                }}
              />
            )}
            <button
              onClick={() => handleExport()}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: '#28a745',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Экспорт
            </button>
          </div>
        </div>

        {/* Вкладки */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginTop: '16px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          {[
            { key: 'sales', label: 'Продажи' },
            { key: 'configurations', label: 'Конфигурации' },
            { key: 'financial', label: 'Финансы' },
            { key: 'production', label: 'Нагрузка' },
            { key: 'customers', label: 'Заказчики' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'sales' | 'configurations' | 'financial' | 'production' | 'customers')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === tab.key ? '#646cff' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#666',
                borderRadius: '8px 8px 0 0',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Контент */}
      <div style={{ padding: '24px' }}>
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            fontSize: 16,
            color: '#666'
          }}>
            Загрузка данных...
          </div>
        )}

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '16px',
            borderRadius: 8,
            marginBottom: '24px',
            border: '1px solid #ffcdd2'
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Продажи */}
            {activeTab === 'sales' && salesData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Метрики */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Всего заказов</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#333' }}>
                      {formatNumber(salesData.totalOrders)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Завершено</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#28a745' }}>
                      {formatNumber(salesData.completedOrders)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                      {salesData.completionRate.toFixed(1)}% от общего
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>В работе</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#ffa500' }}>
                      {formatNumber(salesData.inProgressOrders)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                      {salesData.inProgressRate.toFixed(1)}% от общего
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Общая выручка</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#333' }}>
                      {formatCurrency(salesData.totalRevenue)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Выручка завершенных</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#28a745' }}>
                      {formatCurrency(salesData.completedRevenue)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Выручка в работе</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#ffa500' }}>
                      {formatCurrency(salesData.inProgressRevenue)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Средний чек</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#646cff' }}>
                      {formatCurrency(salesData.averageOrderValue)}
                    </p>
                  </div>
                </div>

                {/* График выручки по дням */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Выручка по дням
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={Object.entries(salesData.revenueByDate).map(([date, revenue]) => ({
                      date,
                      revenue
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Выручка']} />
                      <Line type="monotone" dataKey="revenue" stroke="#646cff" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Распределение выручки */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px'
                }}>
                  {/* Круговая диаграмма статуса проектов */}
                  <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                      Распределение выручки
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Завершенные проекты',
                              value: salesData.completedRevenue,
                              color: '#28a745'
                            },
                            {
                              name: 'Проекты в работе',
                              value: salesData.inProgressRevenue,
                              color: '#ffa500'
                            }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { color: '#28a745' },
                            { color: '#ffa500' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(value as number), '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Средние значения */}
                  <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                      Средние значения
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: 8
                      }}>
                        <span style={{ fontSize: 14, color: '#666' }}>Средний чек (все)</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
                          {formatCurrency(salesData.averageOrderValue)}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#e8f5e8',
                        borderRadius: 8
                      }}>
                        <span style={{ fontSize: 14, color: '#666' }}>Средний чек (завершенные)</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#28a745' }}>
                          {formatCurrency(salesData.averageCompletedValue)}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#fff3e0',
                        borderRadius: 8
                      }}>
                        <span style={{ fontSize: 14, color: '#666' }}>Средний чек (в работе)</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#ffa500' }}>
                          {formatCurrency(salesData.averageInProgressValue)}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#e3f2fd',
                        borderRadius: 8
                      }}>
                        <span style={{ fontSize: 14, color: '#666' }}>Конверсия завершения</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#646cff' }}>
                          {salesData.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Выручка по конфигурациям */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Выручка по конфигурациям
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(salesData.configurationStats).map(([config, data]) => ({
                      name: configLabels[config] || config,
                      completed: data.completedRevenue,
                      inProgress: data.inProgressRevenue,
                      completedCount: data.completedCount,
                      inProgressCount: data.inProgressCount,
                      totalRevenue: data.revenue,
                      totalCount: data.count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          formatCurrency(value as number),
                          name === 'completed' ? 'Завершенные проекты' : 'Проекты в работе'
                        ]}
                        labelFormatter={(label) => `Конфигурация: ${label}`}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{
                                background: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: 8,
                                padding: '12px',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }}>
                                <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#333' }}>
                                  {label}
                                </p>
                                <p style={{ margin: '0 0 4px 0', color: '#87ceeb' }}>
                                  В работе: {formatCurrency(data.inProgress)} ({data.inProgressCount} шт.)
                                </p>
                                <p style={{ margin: '0 0 4px 0', color: '#28a745' }}>
                                  Завершенные: {formatCurrency(data.completed)} ({data.completedCount} шт.)
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontWeight: 600, borderTop: '1px solid #eee', paddingTop: '4px' }}>
                                  Всего: {formatCurrency(data.totalRevenue)} ({data.totalCount} шт.)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="completed" stackId="a" fill="#28a745" name="completed" />
                      <Bar dataKey="inProgress" stackId="a" fill="#87ceeb" name="inProgress" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Легенда */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    marginTop: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        background: '#28a745',
                        borderRadius: 3
                      }}></div>
                      <span style={{ fontSize: 14, color: '#666' }}>Завершенные проекты</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        background: '#87ceeb',
                        borderRadius: 3
                      }}></div>
                      <span style={{ fontSize: 14, color: '#666' }}>Проекты в работе</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Конфигурации */}
            {activeTab === 'configurations' && configData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Популярные конфигурации */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Популярные конфигурации
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={configData.configurations.map(([name, count], index) => ({
                          name: configLabels[name] || name,
                          value: count,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({name, value}) => `${name}: ${value}`}
                      >
                        {configData.configurations.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Цвета стекла и фурнитуры */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px'
                }}>
                  {/* Популярные цвета стекла */}
                  <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                      Популярные цвета стекла
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={configData.glassTypes.map(([type, count]) => ({
                        name: type,
                        count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4ecdc4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Популярные цвета фурнитуры */}
                  <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                      Популярные цвета фурнитуры
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={configData.hardwareColors.map(([color, count]) => ({
                        name: color,
                        count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ff6b6b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Средние размеры по конфигурациям */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Средние размеры изделий по конфигурациям
                  </h3>
                  
                  {/* Общие средние размеры */}
                  <div style={{
                    background: '#f8f9fa',
                    padding: '16px',
                    borderRadius: 8,
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#333' }}>
                      Общие средние размеры
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '16px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#646cff' }}>
                          {Math.round(configData.averageDimensions.width)} мм
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>Ширина</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b' }}>
                          {Math.round(configData.averageDimensions.height)} мм
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>Высота</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#28a745' }}>
                          {Math.round(configData.averageDimensions.length)} мм
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>Длина</div>
                      </div>
                    </div>
                  </div>

                  {/* Размеры по конфигурациям */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px'
                  }}>
                    {Object.entries(configData.averageDimensionsByConfiguration).map(([config, dimensions]) => (
                      <div 
                        key={config}
                        style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: 8,
                          padding: '16px',
                          background: '#fff'
                        }}
                      >
                        <h5 style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: 14, 
                          fontWeight: 600, 
                          color: '#333',
                          textAlign: 'center' 
                        }}>
                          {configLabels[config] || config} ({dimensions.count} проектов)
                        </h5>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '12px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#646cff' }}>
                              {Math.round(dimensions.width)}
                            </div>
                            <div style={{ fontSize: 10, color: '#666' }}>Ширина, мм</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#ff6b6b' }}>
                              {Math.round(dimensions.height)}
                            </div>
                            <div style={{ fontSize: 10, color: '#666' }}>Высота, мм</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#28a745' }}>
                              {Math.round(dimensions.length)}
                            </div>
                            <div style={{ fontSize: 10, color: '#666' }}>Длина, мм</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Финансы */}
            {activeTab === 'financial' && financialData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Информация о расчетах */}
                <div style={{
                  background: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: 12,
                  padding: '16px',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: '#1976d2' }}>
                    📊 Методика расчёта финансовых показателей
                  </h4>
                  <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>Маржа</strong> = Базовая стоимость (фиксированная или процентная от проекта)
                    </p>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>Себестоимость</strong> = Общая стоимость проекта - Маржа
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Маржинальность</strong> = (Маржа ÷ Общая стоимость) × 100%
                    </p>
                  </div>
                </div>

                {/* Общие метрики */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Общая выручка</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#28a745' }}>
                      {formatCurrency(financialData.totalRevenue)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>
                      Себестоимость
                      <span style={{ fontSize: 10, color: '#999', display: 'block' }}>
                        (выручка - маржа)
                      </span>
                    </h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#ff6b6b' }}>
                      {formatCurrency(financialData.totalCost)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>
                      Маржа
                      <span style={{ fontSize: 10, color: '#999', display: 'block' }}>
                        (включает базовую стоимость)
                      </span>
                    </h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#646cff' }}>
                      {formatCurrency(financialData.totalMargin)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>
                      Маржинальность
                      <span style={{ fontSize: 10, color: '#999', display: 'block' }}>
                        (маржа / выручка × 100%)
                      </span>
                    </h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#feca57' }}>
                      {financialData.averageMarginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Маржа по конфигурациям */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Маржинальность по конфигурациям
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(financialData.marginByConfiguration).map(([config, data]) => ({
                      name: configLabels[config] || config,
                      marginPercent: data.marginPercent,
                      revenue: data.revenue,
                      margin: data.margin
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'marginPercent' ? `${(value as number).toFixed(1)}%` : 
                        formatCurrency(value as number),
                        name === 'marginPercent' ? 'Маржинальность' :
                        name === 'revenue' ? 'Выручка' : 'Маржа'
                      ]} />
                      <Bar dataKey="marginPercent" fill="#646cff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Производственная нагрузка */}
            {activeTab === 'production' && productionData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Распределение по статусам */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Проекты по статусам
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productionData.statusDistribution.map((item, index) => ({
                          name: item.name,
                          value: item.count,
                          fill: item.color || COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({name, value}) => `${name}: ${value}`}
                      >
                        {productionData.statusDistribution.map((item, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={item.color || COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Среднее время в статусах */}
                {Object.keys(productionData.averageTimeInStatus).length > 0 && (
                  <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                      Среднее время в статусах (дни)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(productionData.averageTimeInStatus).map(([status, data]) => ({
                        name: status,
                        days: Math.round(data.averageDays)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} дней`, 'Среднее время']} />
                        <Bar dataKey="days" fill="#4ecdc4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Недельная нагрузка */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Загрузка по неделям
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={Object.entries(productionData.weeklyLoad).map(([week, count]) => ({
                      week,
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} проектов`, 'Количество']} />
                      <Line type="monotone" dataKey="count" stroke="#ff6b6b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Заказчики */}
            {activeTab === 'customers' && customerData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Общие метрики */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Всего заказчиков</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#333' }}>
                      {formatNumber(customerData.totalCustomers)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Общая выручка</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#28a745' }}>
                      {formatCurrency(customerData.totalRevenue)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Общая маржа</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#646cff' }}>
                      {formatCurrency(customerData.totalMargin)}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#fff',
                    padding: '20px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>Всего проектов</h3>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#ffa500' }}>
                      {formatNumber(customerData.totalProjects)}
                    </p>
                  </div>
                </div>

                {/* Список заказчиков */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Топ заказчики
                  </h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 14
                    }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Заказчик</th>
                          <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600 }}>Заказов</th>
                          <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Выручка</th>
                          <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Маржа</th>
                          <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Маржинальность</th>
                          <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Средний чек</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Популярная конфигурация</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.customers.slice(0, 20).map(([customerName, data], index) => {
                          const topConfig = Object.entries(data.configurations)
                            .sort(([, a], [, b]) => b.count - a.count)[0];
                          
                          return (
                            <tr 
                              key={customerName}
                              style={{ 
                                borderBottom: '1px solid #f0f0f0',
                                backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
                              }}
                            >
                              <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                                {customerName}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                                {data.totalOrders}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 8px', color: '#28a745', fontWeight: 600 }}>
                                {formatCurrency(data.totalRevenue)}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 8px', color: '#646cff', fontWeight: 600 }}>
                                {formatCurrency(data.totalMargin)}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>
                                <span style={{
                                  color: data.marginPercent > 15 ? '#28a745' : 
                                         data.marginPercent > 10 ? '#ffa500' : '#ff6b6b'
                                }}>
                                  {data.marginPercent.toFixed(1)}%
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                                {formatCurrency(data.averageOrderValue)}
                              </td>
                              <td style={{ padding: '12px 8px', fontSize: 12, color: '#666' }}>
                                {topConfig ? 
                                  `${configLabels[topConfig[0]] || topConfig[0]} (${topConfig[1].count} раз)` :
                                  'Нет данных'
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {customerData.customers.length > 20 && (
                    <div style={{
                      textAlign: 'center',
                      marginTop: '16px',
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: 8,
                      color: '#666',
                      fontSize: 14
                    }}>
                      Показано топ-20 заказчиков из {customerData.customers.length}. 
                      Используйте поиск для нахождения конкретного заказчика.
                    </div>
                  )}
                </div>

                {/* Топ конфигурации среди заказчиков */}
                <div style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>
                    Популярные конфигурации среди заказчиков
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={customerData.topConfigurations.map(([config, data]) => ({
                      name: configLabels[config] || config,
                      count: data.count,
                      revenue: data.revenue
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'count' ? `${value} заказов` : formatCurrency(value as number),
                          name === 'count' ? 'Количество заказов' : 'Выручка'
                        ]}
                      />
                      <Bar dataKey="count" fill="#646cff" name="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
