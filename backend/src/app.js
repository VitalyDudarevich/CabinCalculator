const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
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

app.use(cors());
app.use(express.json());

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
