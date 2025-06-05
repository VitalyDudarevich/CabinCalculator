const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Получить всех пользователей
exports.getAllUsers = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'admin') {
      if (!req.user.companyId) {
        return res.status(400).json({ error: 'У администратора не указан companyId' });
      }
      filter.companyId = req.user.companyId;
    } else if (req.user.role === 'superadmin') {
      if (req.query.companyId) {
        filter.companyId = req.query.companyId;
      }
    } else {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    console.log('userController.getAllUsers:', {
      user: req.user,
      filter,
    });
    const users = await User.find(filter).populate('companyId', 'name');
    console.log('userController.getAllUsers: found users', users);
    res.json(users);
  } catch (err) {
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
