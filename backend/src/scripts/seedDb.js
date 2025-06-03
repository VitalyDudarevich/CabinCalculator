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

    // Очищаем коллекции
    await User.deleteMany({});
    await Company.deleteMany({});
    await Hardware.deleteMany({});
    await Glass.deleteMany({});
    await Service.deleteMany({});
    await Cutout.deleteMany({});
    await Setting.deleteMany({});

    // Компании
    const companies = await Company.insertMany([
      {
        name: 'Batumi Glass',
        city: 'Батуми',
        ownerName: 'Batumi Owner',
        ownerContact: '+9950000001',
      },
      {
        name: 'Стекло Буларусь',
        city: 'Минск',
        ownerName: 'Belarus Owner',
        ownerContact: '+3750000002',
      },
    ]);

    // Пароль
    const passwordHash = await bcrypt.hash('Test123!', 10);

    // Пользователи и админы
    await User.insertMany([
      {
        username: 'batumi_user',
        email: 'user@batumi.com',
        passwordHash,
        role: 'user',
        companyId: companies[0]._id,
      },
      {
        username: 'batumi_admin',
        email: 'admin@batumi.com',
        passwordHash,
        role: 'admin',
        companyId: companies[0]._id,
      },
      {
        username: 'belarus_user',
        email: 'user@belarus.com',
        passwordHash,
        role: 'user',
        companyId: companies[1]._id,
      },
      {
        username: 'belarus_admin',
        email: 'admin@belarus.com',
        passwordHash,
        role: 'admin',
        companyId: companies[1]._id,
      },
    ]);

    // Суперадмин
    await User.create({
      username: 'superadmin',
      email: 'superadmin@admin.com',
      passwordHash,
      role: 'superadmin',
    });

    // Фурнитура (пример)
    await Hardware.create({
      name: 'Петля дверная',
      section: 'фурнитура',
      price: 25,
      companyId: companies[0]._id,
      color: 'хром',
    });

    // Стекло
    const glass = await Glass.create({
      name: 'Стекло прозрачное',
      thickness: '8 мм',
      color: 'прозрачный',
      price: 100,
      companyId: companies[0]._id,
    });

    // Вырезы для стекла
    await Cutout.insertMany([
      {
        type: 'ручка',
        position: 'слева',
        width: 40,
        height: 80,
        distance: 100,
        glassId: glass._id,
      },
      {
        type: 'петля',
        quantity: 2,
        glassId: glass._id,
      },
      {
        type: 'нестандартный вырез',
        position: 'справа',
        width: 50,
        height: 120,
        description: 'Вырез под замок',
        glassId: glass._id,
      },
    ]);

    // Услуги
    await Service.insertMany([
      {
        name: 'Доставка',
        type: 'доставка',
        price: 50,
        description: 'Доставка до объекта',
        companyId: companies[0]._id,
      },
      {
        name: 'Установка',
        type: 'установка',
        price: 150,
        description: 'Монтаж стекла',
        companyId: companies[0]._id,
      },
      {
        name: 'Демонтаж',
        type: 'демонтаж',
        price: 80,
        description: 'Демонтаж старого стекла',
        companyId: companies[0]._id,
      },
    ]);

    // Настройки для компаний
    await Setting.insertMany([
      {
        companyId: companies[0]._id,
        currency: 'GEL',
        usdRate: 0,
        showUSD: false,
        exchangeRate: 0,
        basePrice: 0,
        deliveryPrice: 0,
        installationPrices: {},
      },
      {
        companyId: companies[1]._id,
        currency: 'BYN',
        usdRate: 0,
        showUSD: false,
        exchangeRate: 0,
        basePrice: 0,
        deliveryPrice: 0,
        installationPrices: {},
      },
    ]);

    console.log('Seed data inserted');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
}

seedDb();
