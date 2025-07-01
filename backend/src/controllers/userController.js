const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Получить всех пользователей
exports.getAllUsers = async (req, res) => {
  try {
    let filter = {};
    console.log('userController.getAllUsers - starting:', {
      userRole: req.user.role,
      userId: req.user._id,
      userCompanyId: req.user.companyId,
      queryCompanyId: req.query.companyId,
    });

    if (req.user.role === 'admin') {
      if (!req.user.companyId) {
        console.log('userController.getAllUsers - admin without companyId');
        return res.status(400).json({ error: 'У администратора не указан companyId' });
      }
      filter.companyId = req.user.companyId;
      console.log('userController.getAllUsers - admin filter:', filter);
    } else if (req.user.role === 'superadmin') {
      if (req.query.companyId) {
        filter.companyId = req.query.companyId;
        console.log('userController.getAllUsers - superadmin with companyId filter:', filter);
      } else {
        console.log('userController.getAllUsers - superadmin without companyId, loading ALL users');
      }
    } else {
      console.log('userController.getAllUsers - unauthorized role:', req.user.role);
      return res.status(403).json({ error: 'Нет доступа' });
    }

    console.log('userController.getAllUsers - final filter:', filter);
    const users = await User.find(filter).populate('companyId', 'name');
    console.log('userController.getAllUsers - found users:', {
      count: users.length,
      users: users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        companyId: u.companyId,
      })),
    });
    res.json(users);
  } catch (err) {
    console.error('userController.getAllUsers - error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Получить пользователя по ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Создать нового пользователя
exports.createUser = async (req, res) => {
  try {
    // Проверяем наличие пароля
    if (!req.body.password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }
    // Хэшируем пароль
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    // Формируем объект для создания пользователя
    const userData = { ...req.body, passwordHash, isEmailVerified: true };
    delete userData.password;
    const user = new User(userData);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Обновить пользователя
exports.updateUser = async (req, res) => {
  try {
    const update = { ...req.body };
    // Если передан новый пароль — захешировать и сохранить
    if (update.password) {
      update.passwordHash = await bcrypt.hash(update.password, 10);
      delete update.password;
    } else {
      // Не обновлять passwordHash, если пароль не передан
      delete update.password;
      delete update.passwordHash;
    }
    // Если companyId пустая строка — не обновлять это поле
    if (update.companyId === '') {
      delete update.companyId;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Удалить пользователя
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
