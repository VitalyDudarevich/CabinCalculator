const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');
const Company = require('../models/Company');

dotenv.config();

const templates = [
  {
    name: 'Трапеция',
    description: 'Трапециевидная душевая кабина с наклонными стенками',
    type: 'unique',
    glassCount: 3,
    fields: [
      { name: 'width_top', type: 'number', label: 'Ширина верх (мм)', required: true },
      { name: 'width_bottom', type: 'number', label: 'Ширина низ (мм)', required: true },
      { name: 'height', type: 'number', label: 'Высота (мм)', required: true },
      { name: 'depth', type: 'number', label: 'Глубина (мм)', required: true },
    ],
    glassConfig: [
      {
        name: 'Стекло боковое левое',
        type: 'stationary',
      },
      {
        name: 'Стекло боковое правое',
        type: 'stationary',
      },
      {
        name: 'Стекло фронтальное',
        type: 'swing_door',
      },
    ],
    sizeAdjustments: {
      doorHeightReduction: 8,
      thresholdReduction: 15,
    },
    defaultHardware: ['Профиль', 'Крепеж', 'Уплотнитель'],
    defaultServices: ['Замер', 'Доставка'],
    customColorOption: true,
  },
  {
    name: 'Г-образная кабина',
    description: 'Угловая душевая кабина Г-образной формы',
    type: 'corner',
    glassCount: 2,
    fields: [
      { name: 'side_a', type: 'number', label: 'Сторона A (мм)', required: true },
      { name: 'side_b', type: 'number', label: 'Сторона B (мм)', required: true },
      { name: 'height', type: 'number', label: 'Высота (мм)', required: true },
    ],
    glassConfig: [
      {
        name: 'Стекло сторона A',
        type: 'sliding_door',
      },
      {
        name: 'Стекло сторона B',
        type: 'sliding_door',
      },
    ],
    sizeAdjustments: {
      doorHeightReduction: 8,
      thresholdReduction: 15,
    },
    defaultHardware: ['Профиль угловой', 'Раздвижная система', 'Уплотнитель F'],
    defaultServices: ['Замер'],
    customColorOption: false,
  },
  {
    name: 'Ниша с полкой',
    description: 'Душевая ниша со встроенной стеклянной полкой',
    type: 'unique',
    glassCount: 4,
    fields: [
      { name: 'width', type: 'number', label: 'Ширина (мм)', required: true },
      { name: 'height', type: 'number', label: 'Высота (мм)', required: true },
      { name: 'depth', type: 'number', label: 'Глубина (мм)', required: true },
      { name: 'shelf_height', type: 'number', label: 'Высота полки (мм)', required: false },
      {
        name: 'shelf_count',
        type: 'select',
        label: 'Количество полок',
        required: true,
        options: ['1', '2', '3'],
      },
    ],
    glassConfig: [
      {
        name: 'Стекло фронтальное',
        type: 'stationary',
      },
      {
        name: 'Стекло левое',
        type: 'stationary',
      },
      {
        name: 'Стекло правое',
        type: 'stationary',
      },
      {
        name: 'Стекло полки',
        type: 'stationary',
      },
    ],
    sizeAdjustments: {
      doorHeightReduction: 8,
      thresholdReduction: 15,
    },
    defaultHardware: ['Профиль', 'Крепеж полки', 'Уплотнитель'],
    defaultServices: ['Установка'],
    customColorOption: true,
  },
  {
    name: 'Складная дверь',
    description: 'Душевая дверь складного типа',
    type: 'straight',
    glassCount: 2,
    fields: [
      { name: 'width_total', type: 'number', label: 'Общая ширина (мм)', required: true },
      { name: 'height', type: 'number', label: 'Высота (мм)', required: true },
      {
        name: 'fold_type',
        type: 'select',
        label: 'Тип складывания',
        required: true,
        options: ['Внутрь', 'Наружу', 'Двустороннее'],
      },
    ],
    glassConfig: [
      {
        name: 'Створка 1',
        type: 'swing_door',
      },
      {
        name: 'Створка 2',
        type: 'swing_door',
      },
    ],
    sizeAdjustments: {
      doorHeightReduction: 10,
      thresholdReduction: 15,
    },
    defaultHardware: ['Складная фурнитура', 'Профиль', 'Уплотнитель'],
    defaultServices: ['Замер', 'Установка'],
    customColorOption: false,
  },
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator');
    console.log('Подключение к MongoDB установлено');

    // Получаем первую компанию
    const company = await Company.findOne();
    if (!company) {
      console.log('Компания не найдена. Создайте компанию сначала.');
      process.exit(1);
    }

    console.log(`Создание шаблонов для компании: ${company.name}`);

    // Удаляем существующие шаблоны для этой компании
    await Template.deleteMany({ companyId: company._id });
    console.log('Существующие шаблоны удалены');

    // Создаем новые шаблоны
    const createdTemplates = [];
    for (const templateData of templates) {
      const template = new Template({
        ...templateData,
        companyId: company._id,
      });
      await template.save();
      createdTemplates.push(template);
      console.log(`✓ Создан шаблон: ${template.name}`);
    }

    console.log(`\nУспешно создано ${createdTemplates.length} шаблонов:`);
    createdTemplates.forEach((template) => {
      console.log(`- ${template.name} (${template.type}, ${template.glassCount} стекол)`);
    });
  } catch (error) {
    console.error('Ошибка при создании шаблонов:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nОтключение от MongoDB');
  }
}

// Запуск скрипта
if (require.main === module) {
  seedTemplates();
}

module.exports = seedTemplates;
