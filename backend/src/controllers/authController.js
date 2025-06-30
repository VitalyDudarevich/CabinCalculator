const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { sendMail } = require('../utils/email');

exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password, rememberMe } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Требуются email/username и пароль' });
    }

    // Экранируем специальные символы регулярных выражений для безопасности
    const escapedInput = emailOrUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
        { username: { $regex: new RegExp(`^${escapedInput}$`, 'i') } },
      ],
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

    // Удаляем старые refresh токены для данного пользователя
    await RefreshToken.deleteMany({ userId: user._id });

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    // Если "Запомнить меня" включен - токен живет 30 дней, иначе - до закрытия браузера (1 день)
    const refreshTokenExpiry = rememberMe ? '30d' : '1d';
    const refreshTokenExpiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: refreshTokenExpiry,
    });

    // Сохраняем refreshToken в БД
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + refreshTokenExpiryMs),
    });

    // Устанавливаем httpOnly cookie с refresh токеном
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshTokenExpiryMs,
    });

    res.json({
      accessToken,
      refreshToken, // Также отправляем в response для localStorage если нужно
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    // Пытаемся получить refresh token из cookie или из body
    let refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token обязателен' });
    }

    // Проверяем наличие токена в БД
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Refresh token не найден или отозван' });
    }

    // Проверяем, не истек ли токен в БД
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(401).json({ error: 'Refresh token истек' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      // Если токен невалидный, удаляем его из БД
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(401).json({ error: 'Невалидный refresh token' });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Генерируем новый access token
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    res.json({
      accessToken,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    // Поиск по email нечувствительный к регистру
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
    });
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
    // Пытаемся получить refresh token из cookie или из body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      // Удаляем refresh token из БД
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // Очищаем cookie с refresh токеном
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ message: 'Выход выполнен успешно' });
  } catch (err) {
    console.error('Logout error:', err);
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
    // Поиск по email нечувствительный к регистру
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
    });
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
