const express = require('express');
const router = express.Router();
const glassController = require('../controllers/glassController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

// Получить все варианты стекла по companyId
router.get('/', glassController.getGlassByCompany);
// Добавить вариант стекла
router.post('/', glassController.createGlass);
// Удалить вариант стекла
router.delete('/:id', glassController.deleteGlass);
// Обновить вариант стекла
router.put('/:id', glassController.updateGlass);
// Массовое обновление вариантов стекла
router.put('/', glassController.updateGlassList);

module.exports = router;
