require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const Hardware = require('../models/Hardware');
const Glass = require('../models/Glass');
const Service = require('../models/Service');
const Cutout = require('../models/Cutout');
const Setting = require('../models/Setting');

async function seedDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');

    // Проверяем, есть ли уже суперадмин
    const existing = await User.findOne({
      email: 'vitaliy.dudarevich@gmail.com',
      role: 'superadmin',
    });
    if (existing) {
      console.log('Superadmin already exists');
    } else {
      const passwordHash = await bcrypt.hash('Prod123!', 10);
      await User.create({
        username: 'Superadmin',
        email: 'vitaliy.dudarevich@gmail.com',
        passwordHash,
        role: 'superadmin',
      });
      console.log('Superadmin created');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
}

seedDb();
