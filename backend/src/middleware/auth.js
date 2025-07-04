const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware для проверки аутентификации
exports.authenticate = async (req, res, next) => {
  try {
    console.log('🔐 authenticate middleware called for', req.method, req.url);

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ authenticate: No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log('🎫 authenticate: Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('companyId');

    if (!user) {
      console.log('❌ authenticate: User not found for token');
      return res.status(401).json({ error: 'Invalid token.' });
    }

    console.log('✅ authenticate: User authenticated:', {
      id: user._id,
      role: user.role,
      companyId: user.companyId?._id || user.companyId,
      email: user.email,
    });

    req.user = user;
    next();
  } catch (error) {
    console.log('❌ authenticate: Token verification failed:', error.message);
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
  console.log('🔍 checkCompanyAccess middleware called');
  console.log('📋 Request details:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body,
    params: req.params,
  });

  if (!req.user) {
    console.log('❌ checkCompanyAccess: No user in request');
    return res.status(401).json({ error: 'Authentication required.' });
  }

  console.log('👤 User details:', {
    id: req.user._id,
    role: req.user.role,
    companyId: req.user.companyId,
    companyIdType: typeof req.user.companyId,
  });

  const { companyId } = req.query || req.body || req.params;
  console.log('🏢 Requested companyId:', companyId);

  // Суперадмин имеет доступ ко всем компаниям
  if (req.user.role === 'superadmin') {
    console.log('✅ checkCompanyAccess: Superadmin access granted');
    return next();
  }

  // Для других ролей проверяем доступ к компании
  if (req.user.role === 'admin' || req.user.role === 'user') {
    const userCompanyId =
      typeof req.user.companyId === 'object'
        ? req.user.companyId._id.toString()
        : req.user.companyId?.toString();

    console.log('🔄 Company ID comparison:', {
      userCompanyId,
      requestedCompanyId: companyId,
      match: companyId === userCompanyId,
    });

    if (companyId && companyId !== userCompanyId) {
      console.log('❌ checkCompanyAccess: Access denied - company mismatch');
      return res
        .status(403)
        .json({ error: 'Access denied. You can only access your company data.' });
    }
  }

  console.log('✅ checkCompanyAccess: Access granted');
  next();
};
