const mongoose = require('mongoose');
const Company = require('../models/Company');
const Setting = require('../models/Setting');

// Подключение к базе данных
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator';

async function addDefaultSettingsToAllCompanies() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Получаем все компании
    const companies = await Company.find();
    console.log(`📋 Найдено компаний: ${companies.length}`);

    for (const company of companies) {
      console.log(`\n🔄 Обрабатываем компанию: ${company.name} (${company._id})`);

      // Проверяем, есть ли уже настройки для этой компании
      const existingSettings = await Setting.findOne({ companyId: company._id });

      if (existingSettings) {
        console.log(`  ⚠️  Настройки уже существуют, пропускаем`);
        continue;
      }

      // Создаем дефолтные настройки
      const defaultSettings = {
        currency: 'GEL',
        usdRate: '2.7',
        rrRate: '1.0',
        showUSD: true,
        showRR: false,
        baseCosts: [
          { id: 'glass', name: 'Базовая стоимость стационарного стекла', value: 0 },
          { id: 'straight', name: 'Базовая стоимость прямой раздвижной', value: 0 },
          { id: 'corner', name: 'Базовая стоимость угловой раздвижной', value: 0 },
          { id: 'unique', name: 'Базовая стоимость уникальной конфигурации', value: 0 },
          { id: 'partition', name: 'Базовая стоимость перегородки', value: 0 },
        ],
        baseIsPercent: false,
        basePercentValue: 0,
        customColorSurcharge: 0,
        baseCostMode: 'fixed',
        baseCostPercentage: 0,
        companyId: company._id,
      };

      try {
        await Setting.create(defaultSettings);
        console.log(`  ✅ Дефолтные настройки созданы`);
      } catch (error) {
        console.error(`  ❌ Ошибка создания настроек:`, error.message);
      }
    }

    console.log('\n🎉 Скрипт завершен успешно!');
  } catch (error) {
    console.error('❌ Ошибка выполнения скрипта:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Отключено от MongoDB');
    process.exit(0);
  }
}

// Запускаем скрипт
addDefaultSettingsToAllCompanies();
