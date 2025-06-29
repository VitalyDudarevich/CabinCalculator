const express = require('express');
const router = express.Router();
const hardwareController = require('../controllers/hardwareController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

router.get('/', hardwareController.getHardwareByCompany);
router.get('/:id', hardwareController.getHardwareById);
router.post('/', hardwareController.createHardware);
router.put('/:id', hardwareController.updateHardware);
router.delete('/:id', hardwareController.deleteHardware);
router.put('/', hardwareController.bulkUpdateHardware);
router.delete('/delete-door-hinges', hardwareController.deleteAllDoorHinges);

module.exports = router;
