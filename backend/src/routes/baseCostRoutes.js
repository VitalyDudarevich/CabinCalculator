const express = require('express');
const router = express.Router();
const baseCostController = require('../controllers/baseCostController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

// GET /basecosts - получить все базовые стоимости для компании
router.get('/', baseCostController.getBaseCosts);

// PUT /basecosts - обновить все базовые стоимости для компании (замена)
router.put('/', baseCostController.updateBaseCosts);

// POST /basecosts - добавить одну базовую стоимость
router.post('/', baseCostController.addBaseCost);

// DELETE /basecosts/:id - удалить базовую стоимость
router.delete('/:id', baseCostController.deleteBaseCost);

module.exports = router;
