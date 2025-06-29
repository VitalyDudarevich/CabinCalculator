const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getConfigurationAnalysis,
  getFinancialAnalysis,
  getProductionLoad,
  getCustomerAnalysis,
  getExportData,
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authenticate);

// Отчёт по продажам и выручке
router.get('/sales', getSalesReport);

// Анализ популярных конфигураций
router.get('/configurations', getConfigurationAnalysis);

// Финансовая аналитика (себестоимость и маржа)
router.get('/financial', getFinancialAnalysis);

// Производственная нагрузка
router.get('/production-load', getProductionLoad);

// Анализ заказчиков
router.get('/customers', getCustomerAnalysis);

// Данные для экспорта
router.get('/export', getExportData);

module.exports = router;
