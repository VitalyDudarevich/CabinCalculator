const mongoose = require('mongoose');
const Company = require('../models/Company');
const Status = require('../models/Status');

// Подключение к базе данных
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

const addDefaultStatusesToExistingCompanies = async () => {
  try {
    console.log('Starting to add default statuses to existing companies...');

    // Получаем все компании
    const companies = await Company.find();
    console.log(`Found ${companies.length} companies`);

    for (const company of companies) {
      console.log(`\nProcessing company: ${company.name} (${company._id})`);

      // Проверяем, есть ли уже статусы у этой компании
      const existingStatuses = await Status.find({ companyId: company._id });

      if (existingStatuses.length > 0) {
        console.log(`  Company already has ${existingStatuses.length} statuses, skipping...`);
        continue;
      }

      // Создаем дефолтные статусы для компании
      try {
        const createdStatuses = await Status.createDefaultStatusesForCompany(company._id);
        console.log(`  ✅ Created ${createdStatuses.length} default statuses`);

        // Выводим список созданных статусов
        createdStatuses.forEach((status, index) => {
          console.log(`    ${index + 1}. ${status.name} (${status.color})`);
        });
      } catch (error) {
        console.error(`  ❌ Error creating statuses for ${company.name}:`, error.message);
      }
    }

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected');
  }
};

// Запускаем скрипт
const main = async () => {
  await connectDB();
  await addDefaultStatusesToExistingCompanies();
};

// Обработка ошибок
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Запуск
if (require.main === module) {
  main();
}

module.exports = { addDefaultStatusesToExistingCompanies };
