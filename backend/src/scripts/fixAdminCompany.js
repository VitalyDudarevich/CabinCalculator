const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

async function fixAdminCompany() {
  try {
    // Подключаемся к базе данных
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/glass-calculator';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Находим админа без companyId
    const adminUser = await User.findOne({
      _id: new mongoose.Types.ObjectId('6861c17f790eae9670a32e4d'),
      role: 'admin',
      companyId: null,
    });

    if (!adminUser) {
      console.log('❌ Admin user not found or already has companyId');
      return;
    }

    console.log('👤 Found admin user:', {
      id: adminUser._id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      companyId: adminUser.companyId,
    });

    // Находим первую доступную компанию
    const company = await Company.findOne({});

    if (!company) {
      console.log('❌ No companies found');
      return;
    }

    console.log('🏢 Found company:', {
      id: company._id,
      name: company.name,
    });

    // Назначаем компанию админу
    adminUser.companyId = company._id;
    await adminUser.save();

    console.log('✅ Successfully assigned company to admin user');
    console.log('🎯 Updated user data:', {
      id: adminUser._id,
      username: adminUser.username,
      role: adminUser.role,
      companyId: adminUser.companyId,
    });
  } catch (error) {
    console.error('❌ Error fixing admin company:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Запускаем скрипт
fixAdminCompany();
