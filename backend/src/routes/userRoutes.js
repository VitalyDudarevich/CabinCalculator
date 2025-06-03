const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireRole } = require('../controllers/authController');

// Получить всех пользователей (только для admin/superadmin)
router.get('/', requireRole('admin', 'superadmin'), userController.getAllUsers);
// Получить пользователя по ID
router.get('/:id', requireRole('admin', 'superadmin'), userController.getUserById);
// Создать пользователя
router.post('/', requireRole('admin', 'superadmin'), userController.createUser);
// Обновить пользователя
router.put('/:id', requireRole('admin', 'superadmin'), userController.updateUser);
// Удалить пользователя
router.delete('/:id', requireRole('admin', 'superadmin'), userController.deleteUser);

module.exports = router;
