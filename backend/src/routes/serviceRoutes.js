const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

router.get('/', serviceController.getServicesByCompany);
router.put('/', serviceController.updateServices);

module.exports = router;
