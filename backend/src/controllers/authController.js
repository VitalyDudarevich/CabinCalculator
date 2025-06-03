const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { sendMail } = require('../utils/email');

exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Требуются email/username и пароль' });
    }
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Email не подтверждён. Проверьте почту.' });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    // Сохраняем refreshToken в БД
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
    });
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token обязателен' });
    }
    // Проверяем наличие токена в БД
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Refresh token не найден или отозван' });
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(401).json({ error: 'Невалидный refresh token' });
    }
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    // Генерируем токен для сброса пароля (JWT с коротким сроком)
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Заглушка: возвращаем ссылку в ответе (в реальности — отправить email)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    res.json({ message: 'Ссылка для сброса пароля сгенерирована (заглушка)', resetLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Требуются token и новый пароль' });
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Невалидный или просроченный токен' });
    }
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Пароль успешно изменён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Middleware для проверки accessToken
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет access token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидный access token' });
  }
};

// /me с использованием middleware
exports.me = [
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select('-passwordHash');
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
];

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token обязателен' });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: 'Выход выполнен, refresh token удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Middleware для проверки ролей
exports.requireRole = (...roles) => [
  (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Нет access token' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (!roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Невалидный access token' });
    }
  },
];

// Endpoint для подтверждения email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token обязателен' });
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Невалидный или просроченный токен' });
    }
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (user.isEmailVerified) {
      return res.json({ message: 'Email уже подтверждён' });
    }
    user.isEmailVerified = true;
    await user.save();
    res.json({ message: 'Email успешно подтверждён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Endpoint для повторной отправки письма подтверждения
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email уже подтверждён' });
    }
    const verifyToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
    await sendMail({
      to: email,
      subject: 'Подтверждение регистрации',
      html: `<p>Здравствуйте! Для подтверждения регистрации перейдите по ссылке:<br><a href="${verifyLink}">${verifyLink}</a></p>`,
    });
    res.json({ message: 'Письмо для подтверждения email отправлено повторно.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
