const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

router.get('/', projectController.getProjects); // ?companyId=...&userId=...
router.get('/:id', projectController.getProjectById);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.put('/:id/status', projectController.updateProjectStatus); // Быстрое обновление статуса для drag & drop
router.delete('/:id', projectController.deleteProject);

module.exports = router;
