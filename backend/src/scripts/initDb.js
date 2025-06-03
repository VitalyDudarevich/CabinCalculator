require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Hardware = require('../models/Hardware');
const Project = require('../models/Project');
const Setting = require('../models/Setting');

async function initDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');

    // Создаём индексы (это создаст коллекции, если их нет)
    await Promise.all([
      User.init(),
      Company.init(),
      Hardware.init(),
      Project.init(),
      Setting.init(),
    ]);
    console.log('Collections initialized (indexes created)');

    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing DB:', err);
    process.exit(1);
  }
}

initDb();
