const Company = require('../models/Company');
const Hardware = require('../models/Hardware');
const Service = require('../models/Service');
const Glass = require('../models/Glass');
const Status = require('../models/Status');
const Template = require('../models/Template');

exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Функция для генерации дефолтного набора фурнитуры
function getDefaultHardwarePrices() {
  return [
    { section: 'Профили', name: 'Профиль', price: 1 },
    { section: 'Крепления', name: 'Стекло-стекло', price: 2 },
    { section: 'Крепления', name: 'Стена-стекло', price: 3 },
    { section: 'Крепления', name: 'Палка стена-стекло курглая', price: 4 },
    { section: 'Крепления', name: 'Палка стена-стекло прямоугольная', price: 5 },
    { section: 'Крепления', name: 'уголок турба-труба прямоугольное', price: 6 },
    { section: 'Крепления', name: 'уголок труба-труба круглый', price: 7 },
    { section: 'Крепления', name: 'Крепление труба-стекло прямоугольное (боковое)', price: 8 },
    { section: 'Крепления', name: 'Крепление труба-стекло прямоугольное (торцевое)', price: 9 },
    { section: 'Крепления', name: 'Крепление труба-стекло круглое', price: 1 },
    { section: 'Крепления', name: 'Крепление стена-труба круглое', price: 2 },
    { section: 'Петли', name: 'Петля 90 градусов', price: 3 },
    { section: 'Петли', name: 'Петля 135 градусов', price: 4 },
    { section: 'Петли', name: 'Петля 180 градусов', price: 5 },
    { section: 'Ручки', name: 'Ручка кноб', price: 6 },
    { section: 'Ручки', name: 'Ручка скоба маленькая', price: 7 },
    { section: 'Ручки', name: 'Ручка скоба большая', price: 8 },
    { section: 'Раздвижная система и направляющие', name: 'Раздвижная система', price: 9 },
    {
      section: 'Раздвижная система и направляющие',
      name: 'Профильная труба (рельса)',
      price: 1,
    },
    { section: 'Уплотнительные резинки', name: 'Магнит 90', price: 2 },
    { section: 'Уплотнительные резинки', name: 'Магнит 135', price: 3 },
    { section: 'Уплотнительные резинки', name: 'Магнит 180', price: 4 },
    { section: 'Уплотнительные резинки', name: 'Магнит к стене', price: 5 },
    { section: 'Уплотнительные резинки', name: 'Уплотнитель F', price: 6 },
    { section: 'Уплотнительные резинки', name: 'Уплотнитель Y', price: 7 },
    { section: 'Уплотнительные резинки', name: 'Уплотнитель П', price: 8 },
    { section: 'Уплотнительные резинки', name: 'Уплотнитель A', price: 9 },
    { section: 'Дополнительно', name: 'Порожек', price: 1 },
  ];
}

function getDefaultServiceList(companyId) {
  return [
    { name: 'Доставка', type: 'доставка', price: 1, companyId },
    { name: 'Установка', type: 'установка', price: 2, companyId },
    { name: 'Демонтаж', type: 'демонтаж', price: 3, companyId },
  ];
}

// Функция для создания системных шаблонов для новой компании
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

exports.createCompany = async (req, res) => {
  try {
    // Проверка уникальности имени (без учёта регистра)
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Имя компании обязательно' });
    const exists = await Company.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) return res.status(400).json({ error: 'Компания с таким именем уже существует' });

    // 1. Создаём компанию
    const company = new Company({ ...req.body, name });
    await company.save();
    // 2. Добавляем дефолтную фурнитуру
    const defaultHardware = getDefaultHardwarePrices().map((hw) => ({
      ...hw,
      companyId: company._id,
    }));
    await Hardware.insertMany(defaultHardware, { ordered: false });
    // 3. Добавляем дефолтные услуги
    const defaultServices = getDefaultServiceList(company._id);
    await Service.insertMany(defaultServices, { ordered: false });
    // 4. Добавляем дефолтные варианты стекла
    const defaultGlass = [
      {
        name: 'Стекло прозрачное 8 мм',
        thickness: '8 мм',
        color: 'прозрачный',
        price: 2,
        companyId: company._id,
      },
      {
        name: 'Стекло ультра прозрачное 8 мм',
        thickness: '8 мм',
        color: 'ультра прозрачный',
        price: 3,
        companyId: company._id,
      },
      {
        name: 'Стекло матовое пескоструй 8 мм',
        thickness: '8 мм',
        color: 'матовый пескоструй',
        price: 4,
        companyId: company._id,
      },
      {
        name: 'Стекло тонированное 8 мм',
        thickness: '8 мм',
        color: 'тонированный',
        price: 5,
        companyId: company._id,
      },
      {
        name: 'Стекло прозрачное 10 мм',
        thickness: '10 мм',
        color: 'прозрачный',
        price: 6,
        companyId: company._id,
      },
      {
        name: 'Стекло ультра прозрачное 10 мм',
        thickness: '10 мм',
        color: 'ультра прозрачный',
        price: 7,
        companyId: company._id,
      },
      {
        name: 'Стекло матовое пескоструй 10 мм',
        thickness: '10 мм',
        color: 'матовый пескоструй',
        price: 8,
        companyId: company._id,
      },
      {
        name: 'Стекло матовое заводское 10 мм',
        thickness: '10 мм',
        color: 'матовый заводской',
        price: 9,
        companyId: company._id,
      },
      {
        name: 'Стекло тонированное 10 мм',
        thickness: '10 мм',
        color: 'тонированный',
        price: 1,
        companyId: company._id,
      },
    ];
    await Glass.insertMany(defaultGlass, { ordered: false });

    // 5. Добавляем дефолтные статусы проектов
    try {
      await Status.createDefaultStatusesForCompany(company._id);
      console.log(`✅ Дефолтные статусы созданы для компании: ${company.name}`);
    } catch (statusError) {
      console.error(
        `❌ Ошибка создания дефолтных статусов для компании ${company.name}:`,
        statusError,
      );
      // Не прерываем создание компании, но логируем ошибку
    }

    // 6. Добавляем системные шаблоны
    try {
      const systemTemplates = createSystemTemplatesForCompany(company._id);
      await Template.insertMany(systemTemplates, { ordered: false });
      console.log(`✅ Системные шаблоны созданы для компании: ${company.name}`);
    } catch (templateError) {
      console.error(
        `❌ Ошибка создания системных шаблонов для компании ${company.name}:`,
        templateError,
      );
      // Не прерываем создание компании, но логируем ошибку
    }

    // 7. Возвращаем только компанию
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
