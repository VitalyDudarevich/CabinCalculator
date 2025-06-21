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

dotenv.config();

const app = express();

// Настройка CORS для работы с credentials
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174', // Добавляем порт 5174
      'http://127.0.0.1:5174',
      'http://localhost:5175', // Добавляем порт 5175
      'http://127.0.0.1:5175',
      'https://glass-calculator-bg.vercel.app', // Добавляем продакшен домен
    ], // Добавляем порт Vite
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  }),
);

// Дополнительная настройка headers для preflight requests
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174', // Добавляем порт 5174
    'http://127.0.0.1:5174',
    'http://localhost:5175', // Добавляем порт 5175
    'http://127.0.0.1:5175',
    'https://glass-calculator-bg.vercel.app', // Добавляем продакшен домен
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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
app.use(cookieParser()); // Добавляем middleware для работы с cookies

// Тестовый маршрут
app.get('/', (req, res) => {
  res.send('API is running!');
});

app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/glass', glassRoutes);

module.exports = app;
