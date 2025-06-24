const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware для проверки аутентификации
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('companyId');

    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Middleware для проверки роли администратора
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  next();
};

// Middleware для проверки роли суперадмина
exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. Super admin privileges required.' });
  }

  next();
};

// Middleware для проверки доступа к компании
exports.checkCompanyAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { companyId } = req.query || req.body || req.params;

  // Суперадмин имеет доступ ко всем компаниям
  if (req.user.role === 'superadmin') {
    return next();
  }

  // Для других ролей проверяем доступ к компании
  if (req.user.role === 'admin' || req.user.role === 'user') {
    const userCompanyId =
      typeof req.user.companyId === 'object'
        ? req.user.companyId._id.toString()
        : req.user.companyId?.toString();

    if (companyId && companyId !== userCompanyId) {
      return res
        .status(403)
        .json({ error: 'Access denied. You can only access your company data.' });
    }
  }

  next();
};
