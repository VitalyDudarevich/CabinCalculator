const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');
const Company = require('../models/Company');

dotenv.config();

// Функция для создания системных шаблонов для компании (копия из companyController.js)
function createSystemTemplatesForCompany(companyId) {
  const systemTemplates = [
    {
      name: 'Стационарное стекло',
      description: 'Системный шаблон для стационарного стекла',
      type: 'glass',
      isSystem: true,
      glassConfig: [{ name: 'Стекло', type: 'stationary' }],
      sizeAdjustments: { doorHeightReduction: 8, thresholdReduction: 15 },
      fields: [],
      defaultHardware: ['Профиль', 'Стекло-стекло', 'Стена-стекло'],
      defaultServices: ['Доставка', 'Установка'],
      customColorOption: false,
      exactHeightOption: false,
      defaultGlassColor: 'прозрачный',
      defaultGlassThickness: '8',
      companyId,
      isActive: true,
    },
    {
      name: 'Прямая раздвижная',
      description: 'Системный шаблон для прямой раздвижной системы',
      type: 'straight',
      isSystem: true,
      glassConfig: [
        { name: 'Стационар', type: 'stationary' },
        { name: 'Дверь', type: 'sliding_door' },
      ],
      sizeAdjustments: { doorHeightReduction: 8, thresholdReduction: 15 },
      fields: [],
      defaultHardware: [
        'Профиль',
        'Раздвижная система',
        'Профильная труба (рельса)',
        'Стекло-стекло',
      ],
      defaultServices: ['Доставка', 'Установка'],
      customColorOption: true,
      exactHeightOption: true,
      defaultGlassColor: 'прозрачный',
      defaultGlassThickness: '8',
      companyId,
      isActive: true,
    },
    {
      name: 'Угловая раздвижная',
      description: 'Системный шаблон для угловой раздвижной системы',
      type: 'corner',
      isSystem: true,
      glassConfig: [
        { name: 'Стационар 1', type: 'stationary' },
        { name: 'Дверь 1', type: 'sliding_door' },
        { name: 'Стационар 2', type: 'stationary' },
        { name: 'Дверь 2', type: 'sliding_door' },
      ],
      sizeAdjustments: { doorHeightReduction: 8, thresholdReduction: 15 },
      fields: [],
      defaultHardware: [
        'Профиль',
        'Раздвижная система',
        'Профильная труба (рельса)',
        'уголок турба-труба прямоугольное',
      ],
      defaultServices: ['Доставка', 'Установка'],
      customColorOption: true,
      exactHeightOption: true,
      defaultGlassColor: 'прозрачный',
      defaultGlassThickness: '8',
      companyId,
      isActive: true,
    },
    {
      name: 'Уникальная конфигурация',
      description: 'Системный шаблон для уникальных конфигураций',
      type: 'unique',
      isSystem: true,
      glassConfig: [],
      sizeAdjustments: { doorHeightReduction: 8, thresholdReduction: 15 },
      fields: [],
      defaultHardware: ['Профиль', 'Стекло-стекло', 'Стена-стекло'],
      defaultServices: ['Доставка', 'Установка'],
      customColorOption: true,
      exactHeightOption: false,
      defaultGlassColor: 'прозрачный',
      defaultGlassThickness: '8',
      companyId,
      isActive: true,
    },
    {
      name: 'Перегородка',
      description: 'Системный шаблон для стеклянных перегородок',
      type: 'partition',
      isSystem: true,
      glassConfig: [{ name: 'Стекло', type: 'stationary' }],
      sizeAdjustments: { doorHeightReduction: 8, thresholdReduction: 15 },
      fields: [],
      defaultHardware: ['Профиль', 'Стекло-стекло', 'Стена-стекло'],
      defaultServices: ['Доставка', 'Установка'],
      customColorOption: false,
      exactHeightOption: false,
      defaultGlassColor: 'прозрачный',
      defaultGlassThickness: '10',
      companyId,
      isActive: true,
    },
  ];

  return systemTemplates;
}

async function addSystemTemplatesToExistingCompanies() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator');
    console.log('🔗 Подключение к MongoDB установлено');

    // Получаем все компании
    const companies = await Company.find();
    console.log(`📊 Найдено компаний: ${companies.length}`);

    if (companies.length === 0) {
      console.log('❌ Компании не найдены');
      process.exit(1);
    }

    let totalAdded = 0;
    let totalErrors = 0;

    for (const company of companies) {
      try {
        console.log(`\n🏢 Обрабатываем компанию: ${company.name} (ID: ${company._id})`);

        // Проверяем, есть ли уже системные шаблоны для этой компании
        const existingSystemTemplates = await Template.find({
          companyId: company._id,
          isSystem: true,
          isActive: true,
        });

        if (existingSystemTemplates.length > 0) {
          console.log(
            `⚠️  У компании ${company.name} уже есть системные шаблоны (${existingSystemTemplates.length}), пропускаем`,
          );
          continue;
        }

        // Создаем системные шаблоны для этой компании
        const systemTemplates = createSystemTemplatesForCompany(company._id);
        await Template.insertMany(systemTemplates, { ordered: false });

        console.log(
          `✅ Создано ${systemTemplates.length} системных шаблонов для компании: ${company.name}`,
        );
        totalAdded += systemTemplates.length;
      } catch (companyError) {
        console.error(`❌ Ошибка обработки компании ${company.name}:`, companyError.message);
        totalErrors++;
      }
    }

    console.log(`\n📈 ИТОГИ:`);
    console.log(`✅ Всего создано системных шаблонов: ${totalAdded}`);
    console.log(`❌ Ошибок при обработке: ${totalErrors}`);
    console.log(`🏢 Обработано компаний: ${companies.length}`);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Отключение от MongoDB');
  }
}

// Запуск скрипта
if (require.main === module) {
  addSystemTemplatesToExistingCompanies();
}

module.exports = addSystemTemplatesToExistingCompanies;
