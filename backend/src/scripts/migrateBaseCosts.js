const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Загружаем переменные среды
dotenv.config();

// Подключаемся к базе данных
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/glass_calculator');
    console.log('✅ Подключение к MongoDB установлено');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Схемы моделей
const settingSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    currency: { type: String, enum: ['GEL', 'USD', 'RR'], default: 'GEL' },
    usdRate: { type: Number, default: 0 },
    rrRate: { type: Number, default: 0 },
    showUSD: { type: Boolean, default: false },
    showRR: { type: Boolean, default: false },
    baseCosts: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        value: { type: Number, required: true },
      },
    ],
    baseIsPercent: { type: Boolean, default: false },
    basePercentValue: { type: Number, default: 0 },
    customColorSurcharge: { type: Number, default: 0 },
    baseCostMode: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    baseCostPercentage: { type: Number, default: 0 },
  },
  { collection: 'settings' },
);

const baseCostSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true },
);

baseCostSchema.index({ name: 1, companyId: 1 }, { unique: true });

const Setting = mongoose.model('Setting', settingSchema);
const BaseCost = mongoose.model('BaseCost', baseCostSchema);

const migrateBaseCosts = async () => {
  try {
    console.log('🔄 Начинаем миграцию базовых стоимостей...');

    // Находим все настройки с базовыми стоимостями
    const settingsWithBaseCosts = await Setting.find({
      baseCosts: { $exists: true, $ne: [] },
    });

    console.log(`📊 Найдено ${settingsWithBaseCosts.length} записей с базовыми стоимостями`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const setting of settingsWithBaseCosts) {
      console.log(`\n🏢 Обрабатываем компанию: ${setting.companyId}`);
      console.log(`📝 Базовых стоимостей: ${setting.baseCosts.length}`);

      for (const oldBaseCost of setting.baseCosts) {
        try {
          // Проверяем, существует ли уже такая запись
          const existingBaseCost = await BaseCost.findOne({
            name: oldBaseCost.name,
            companyId: setting.companyId,
          });

          if (existingBaseCost) {
            console.log(`⚠️  Запись уже существует: "${oldBaseCost.name}"`);
            continue;
          }

          // Создаем новую запись
          const newBaseCost = new BaseCost({
            name: oldBaseCost.name,
            value: oldBaseCost.value || 0,
            companyId: setting.companyId,
          });

          await newBaseCost.save();
          console.log(`✅ Мигрировано: "${oldBaseCost.name}" = ${oldBaseCost.value}`);
          migratedCount++;
        } catch (error) {
          console.error(`❌ Ошибка миграции "${oldBaseCost.name}":`, error.message);
          errorCount++;
        }
      }
    }

    console.log(`\n📈 Миграция завершена:`);
    console.log(`✅ Успешно мигрировано: ${migratedCount} записей`);
    console.log(`❌ Ошибок: ${errorCount}`);

    // Опционально: удаляем baseCosts из settings
    if (migratedCount > 0) {
      console.log('\n🧹 Очищаем старые baseCosts из settings...');

      const updateResult = await Setting.updateMany(
        { baseCosts: { $exists: true } },
        { $unset: { baseCosts: '' } },
      );

      console.log(`✅ Очищено ${updateResult.modifiedCount} записей settings`);
    }

    console.log('\n🎉 Миграция полностью завершена!');
  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
  }
};

// Запуск миграции
const runMigration = async () => {
  await connectDB();
  await migrateBaseCosts();
  await mongoose.connection.close();
  console.log('🔌 Соединение с базой данных закрыто');
  process.exit(0);
};

runMigration();
