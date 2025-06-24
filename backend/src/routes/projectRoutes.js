const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

router.get('/', projectController.getProjects); // ?companyId=...&userId=...
router.get('/:id', projectController.getProjectById);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.put('/:id/status', projectController.updateProjectStatus); // Быстрое обновление статуса для drag & drop
router.delete('/:id', projectController.deleteProject);

module.exports = router;
