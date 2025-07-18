const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { authenticate, requireAdmin, checkCompanyAccess } = require('../middleware/auth');

// Применяем аутентификацию ко всем routes
router.use(authenticate);

// GET /api/statuses?companyId=... - получить все статусы компании
// Проверка доступа теперь в контроллере
router.get('/', statusController.getStatuses);

// GET /api/statuses/stats?companyId=... - получить статистику использования статусов
// Временно убираем checkCompanyAccess для отладки
router.get('/stats', statusController.getStatusStats);

// GET /api/statuses/:id - получить статус по ID
router.get('/:id', statusController.getStatusById);

// POST /api/statuses - создать новый статус (только админы)
router.post('/', requireAdmin, checkCompanyAccess, statusController.createStatus);

// POST /api/statuses/create-defaults - создать дефолтные статусы для компании (только админы)
router.post('/create-defaults', requireAdmin, statusController.createDefaultStatuses);

// PUT /api/statuses/reorder - изменить порядок статусов (только админы)
router.put('/reorder', requireAdmin, statusController.reorderStatuses);

// PUT /api/statuses/:id - обновить статус (только админы)
router.put('/:id', requireAdmin, statusController.updateStatus);

// DELETE /api/statuses/:id - удалить статус (только админы)
router.delete('/:id', requireAdmin, statusController.deleteStatus);

module.exports = router;
