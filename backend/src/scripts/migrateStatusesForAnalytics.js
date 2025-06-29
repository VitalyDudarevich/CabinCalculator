const mongoose = require('mongoose');
const Status = require('../models/Status');

// Подключение к базе данных
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard_calculator');

const migrateStatuses = async () => {
  try {
    console.log('Начинаем миграцию статусов...');

    // Получаем все статусы без поля isCompletedForAnalytics
    const statusesWithoutField = await Status.find({
      isCompletedForAnalytics: { $exists: false },
    });

    console.log(`Найдено ${statusesWithoutField.length} статусов для обновления`);

    for (const status of statusesWithoutField) {
      // Только статус "Оплачено" считается завершенным
      const isCompleted = status.name === 'Оплачено';

      await Status.findByIdAndUpdate(status._id, {
        isCompletedForAnalytics: isCompleted,
      });

      console.log(
        `Обновлен статус "${status.name}" (companyId: ${status.companyId}) -> завершенный: ${isCompleted}`,
      );
    }

    console.log('Миграция завершена успешно!');
  } catch (error) {
    console.error('Ошибка миграции:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Запускаем миграцию
migrateStatuses();
