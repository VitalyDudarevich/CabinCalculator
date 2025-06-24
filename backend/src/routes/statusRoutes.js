const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { authenticate, requireAdmin, checkCompanyAccess } = require('../middleware/auth');

// Применяем аутентификацию ко всем routes
router.use(authenticate);

// GET /api/statuses?companyId=... - получить все статусы компании
router.get('/', checkCompanyAccess, statusController.getStatuses);

// GET /api/statuses/stats?companyId=... - получить статистику использования статусов
router.get('/stats', checkCompanyAccess, statusController.getStatusStats);

// GET /api/statuses/:id - получить статус по ID
router.get('/:id', statusController.getStatusById);

// POST /api/statuses - создать новый статус (только админы)
router.post('/', requireAdmin, checkCompanyAccess, statusController.createStatus);

// PUT /api/statuses/reorder - изменить порядок статусов (только админы)
router.put('/reorder', requireAdmin, statusController.reorderStatuses);

// PUT /api/statuses/:id - обновить статус (только админы)
router.put('/:id', requireAdmin, statusController.updateStatus);

// DELETE /api/statuses/:id - удалить статус (только админы)
router.delete('/:id', requireAdmin, statusController.deleteStatus);

module.exports = router;
