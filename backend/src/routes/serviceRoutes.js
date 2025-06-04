const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

router.get('/', serviceController.getServicesByCompany);
router.put('/', serviceController.updateServices);

module.exports = router;
