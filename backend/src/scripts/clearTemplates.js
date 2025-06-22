const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');

dotenv.config();

async function clearTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator');
    console.log('Подключение к MongoDB установлено');

    // Удаляем все шаблоны
    const result = await Template.deleteMany({});
    console.log(`Удалено ${result.deletedCount} шаблонов`);
  } catch (error) {
    console.error('Ошибка при удалении шаблонов:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Отключение от MongoDB');
  }
}

// Запуск скрипта
if (require.main === module) {
  clearTemplates();
}

module.exports = clearTemplates;
