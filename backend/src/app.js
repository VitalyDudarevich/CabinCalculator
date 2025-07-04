const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const projectRoutes = require('./routes/projectRoutes');
const settingRoutes = require('./routes/settingRoutes');
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const glassRoutes = require('./routes/glassRoutes');
const templateRoutes = require('./routes/templateRoutes');
const baseCostRoutes = require('./routes/baseCostRoutes');
const statusRoutes = require('./routes/statusRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

dotenv.config();

const app = express();

// Получаем разрешенные origins из переменных окружения или используем дефолтные
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'https://glass-calculator-bg.vercel.app',
    'https://cabincalculator.onrender.com',
  ];

  if (envOrigins) {
    const customOrigins = envOrigins.split(',').map((origin) => origin.trim());
    return [...defaultOrigins, ...customOrigins];
  }

  return defaultOrigins;
};

const allowedOrigins = getAllowedOrigins();
console.log('🌐 Allowed origins:', allowedOrigins);

// Настройка CORS для работы с credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Добавляем диагностическое логирование для продакшена
      if (process.env.NODE_ENV === 'production') {
        console.log('🔍 CORS Debug - Origin:', origin);
        console.log('🔍 CORS Debug - Allowed Origins:', allowedOrigins);
      }

      // Разрешаем requests без origin (например, мобильные приложения)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn('❌ CORS: Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  }),
);

// Дополнительная настройка headers для preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Middleware для логирования запросов в продакшене
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.path} from ${req.get('origin') || 'unknown'}`,
    );
    next();
  });
}

// Тестовый маршрут для health check
app.get('/', (req, res) => {
  res.json({
    message: 'Glass Calculator API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/glass', glassRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/basecosts', baseCostRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     error: 'Endpoint not found',
//     path: req.originalUrl,
//     method: req.method,
//   });
// });

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

module.exports = app;
