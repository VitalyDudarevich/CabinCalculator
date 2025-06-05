const Company = require('../models/Company');
const Hardware = require('../models/Hardware');
const Service = require('../models/Service');
const Glass = require('../models/Glass');

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
function getDefaultHardwarePrices(currency = 'GEL') {
  return [
    { section: 'Профили', name: `Профиль 8 мм (${currency})`, price: null },
    { section: 'Профили', name: `Профиль 10 мм (${currency})`, price: null },
    { section: 'Крепления', name: `Стекло-стекло (${currency})`, price: null },
    { section: 'Крепления', name: `Стена-стекло (${currency})`, price: null },
    { section: 'Крепления', name: `Палка стена-стекло курглая (${currency})`, price: null },
    { section: 'Крепления', name: `Палка стена-стекло прямоугольная (${currency})`, price: null },
    { section: 'Крепления', name: `уголок турба-труба прямоугольное (${currency})`, price: null },
    { section: 'Крепления', name: `уголок труба-труба круглый (${currency})`, price: null },
    {
      section: 'Крепления',
      name: `Крепление труба-стекло прямоугольное (боковое) (${currency})`,
      price: null,
    },
    {
      section: 'Крепления',
      name: `Крепление труба-стекло прямоугольное (торцевое) (${currency})`,
      price: null,
    },
    { section: 'Крепления', name: `Крепление труба-стекло круглое (${currency})`, price: null },
    { section: 'Крепления', name: `Крепление стена-труба круглое (${currency})`, price: null },
    { section: 'Петли', name: `Петля 90 градусов (${currency})`, price: null },
    { section: 'Петли', name: `Петля 135 градусов (${currency})`, price: null },
    { section: 'Петли', name: `Петля 180 градусов (${currency})`, price: null },
    { section: 'Ручки', name: `Ручка кноб (${currency})`, price: null },
    { section: 'Ручки', name: `Ручка скоба маленькая (${currency})`, price: null },
    { section: 'Ручки', name: `Ручка скоба большая (${currency})`, price: null },
    {
      section: 'Раздвижная система и направляющие',
      name: `Раздвижная система (${currency})`,
      price: null,
    },
    {
      section: 'Раздвижная система и направляющие',
      name: `Профильная труба (рельса) (${currency})`,
      price: null,
    },
    { section: 'Уплотнительные резинки', name: `Магнит 90 (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Магнит 135 (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Магнит 180 (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Магнит к стене (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Уплотнитель F (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Уплотнитель Y (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Уплотнитель П (${currency})`, price: null },
    { section: 'Уплотнительные резинки', name: `Уплотнитель A (${currency})`, price: null },
    { section: 'Дополнительно', name: `Порожек (${currency})`, price: null },
  ];
}

function getDefaultServiceList(companyId) {
  return [
    { name: 'Доставка', type: 'доставка', price: 0, companyId },
    { name: 'Установка', type: 'установка', price: 0, companyId },
    { name: 'Демонтаж', type: 'демонтаж', price: 0, companyId },
  ];
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
    const defaultHardware = getDefaultHardwarePrices(company.currency || 'GEL').map((hw) => ({
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
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло ультра прозрачное 8 мм',
        thickness: '8 мм',
        color: 'ультра прозрачный',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло матовое пескоструй 8 мм',
        thickness: '8 мм',
        color: 'матовый пескоструй',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло тонированное 8 мм',
        thickness: '8 мм',
        color: 'тонированный',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло прозрачное 10 мм',
        thickness: '10 мм',
        color: 'прозрачный',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло ультра прозрачное 10 мм',
        thickness: '10 мм',
        color: 'ультра прозрачный',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло матовое пескоструй 10 мм',
        thickness: '10 мм',
        color: 'матовый пескоструй',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло матовое заводское 10 мм',
        thickness: '10 мм',
        color: 'матовый заводской',
        price: 0,
        companyId: company._id,
      },
      {
        name: 'Стекло тонированное 10 мм',
        thickness: '10 мм',
        color: 'тонированный',
        price: 0,
        companyId: company._id,
      },
    ];
    await Glass.insertMany(defaultGlass, { ordered: false });
    // 5. Возвращаем только компанию
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
