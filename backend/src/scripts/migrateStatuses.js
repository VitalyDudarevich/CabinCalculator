const mongoose = require('mongoose');
const Project = require('../models/Project');
const Status = require('../models/Status');
const Company = require('../models/Company');

const migrateStatuses = async () => {
  try {
    console.log('🚀 Начинаем миграцию статусов...');

    // Подключаемся к базе данных
    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        'База данных не подключена. Запустите скрипт из app.js или подключитесь к MongoDB',
      );
    }

    // Получаем все компании
    const companies = await Company.find({});
    console.log(`📊 Найдено компаний: ${companies.length}`);

    if (companies.length === 0) {
      console.log('⚠️ Компании не найдены. Создаем статусы для проектов без компании...');

      // Создаем "системную" компанию для проектов без companyId
      const systemCompany = await Company.create({
        name: 'Системная компания',
        city: 'Система',
        ownerName: 'Система',
        ownerContact: 'system@system.com',
      });
      companies.push(systemCompany);
    }

    // Создаем словарь статусов для каждой компании
    const statusMappings = {};

    for (const company of companies) {
      console.log(`📝 Создаем статусы для компании: ${company.name}`);

      // Проверяем, есть ли уже статусы для этой компании
      const existingStatuses = await Status.find({ companyId: company._id });

      if (existingStatuses.length === 0) {
        // Создаем статусы по умолчанию
        const statuses = await Status.createDefaultStatusesForCompany(company._id);

        // Создаем маппинг старых названий статусов к новым ID
        const mapping = {};
        statuses.forEach((status) => {
          mapping[status.name] = status._id;
        });
        statusMappings[company._id.toString()] = mapping;

        console.log(`✅ Создано ${statuses.length} статусов для компании ${company.name}`);
      } else {
        console.log(`⏭️ Статусы для компании ${company.name} уже существуют`);

        // Используем существующие статусы
        const mapping = {};
        existingStatuses.forEach((status) => {
          mapping[status.name] = status._id;
        });
        statusMappings[company._id.toString()] = mapping;
      }
    }

    // Получаем все проекты для миграции
    const projects = await Project.find({});
    console.log(`📦 Найдено проектов для миграции: ${projects.length}`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const project of projects) {
      try {
        // Определяем компанию проекта
        let projectCompanyId = project.companyId;

        // Если у проекта нет companyId, используем первую компанию
        if (!projectCompanyId) {
          projectCompanyId = companies[0]._id;
          console.log(
            `⚠️ Проект ${project._id} без companyId, назначаем компанию: ${companies[0].name}`,
          );
        }

        const companyMapping = statusMappings[projectCompanyId.toString()];

        if (!companyMapping) {
          console.error(`❌ Не найден маппинг статусов для компании ${projectCompanyId}`);
          skippedCount++;
          continue;
        }

        // Ищем соответствующий statusId
        let statusId = companyMapping[project.status];

        // Если статус не найден, используем "Рассчет" как значение по умолчанию
        if (!statusId) {
          statusId = companyMapping['Рассчет'];
          console.log(
            `⚠️ Статус "${project.status}" не найден, используем "Рассчет" для проекта ${project._id}`,
          );
        }

        // Обновляем проект
        await Project.findByIdAndUpdate(project._id, {
          statusId: statusId,
          companyId: projectCompanyId, // На всякий случай обновляем companyId
        });

        migratedCount++;

        if (migratedCount % 100 === 0) {
          console.log(`📈 Обработано проектов: ${migratedCount}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка при миграции проекта ${project._id}:`, error.message);
        skippedCount++;
      }
    }

    console.log('🎉 Миграция завершена!');
    console.log(`✅ Успешно мигрировано: ${migratedCount} проектов`);
    console.log(`⚠️ Пропущено: ${skippedCount} проектов`);

    // Показываем итоговую статистику
    for (const company of companies) {
      const statusCount = await Status.countDocuments({ companyId: company._id });
      const projectCount = await Project.countDocuments({ companyId: company._id });
      console.log(
        `📊 Компания "${company.name}": ${statusCount} статусов, ${projectCount} проектов`,
      );
    }
  } catch (error) {
    console.error('💥 Ошибка миграции:', error);
    throw error;
  }
};

// Запускаем миграцию, если файл вызван напрямую
if (require.main === module) {
  // Подключаемся к базе данных
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('🔌 Подключение к MongoDB установлено');
      return migrateStatuses();
    })
    .then(() => {
      console.log('✨ Миграция успешно завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Фатальная ошибка:', error);
      process.exit(1);
    });
}

module.exports = migrateStatuses;
