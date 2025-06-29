const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getActiveTemplates,
  getSystemTemplates,
  updateSystemTemplate,
} = require('../controllers/templateController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

// Маршруты для работы с шаблонами
router.get('/', getTemplates);
router.get('/active', getActiveTemplates);

// Маршруты для системных шаблонов (должны быть перед /:id)
router.get('/system', getSystemTemplates);
router.put('/system/:type', updateSystemTemplate);

router.get('/:id', getTemplate);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
