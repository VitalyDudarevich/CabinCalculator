const Template = require('../models/Template');

// Получить все шаблоны компании
const getTemplates = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Не указан ID компании' });
    }

    const templates = await Template.find({
      companyId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    console.error('Ошибка получения шаблонов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить шаблон по ID
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await Template.findById(id);

    if (!template || !template.isActive) {
      return res.status(404).json({ message: 'Шаблон не найден' });
    }

    res.json(template);
  } catch (error) {
    console.error('Ошибка получения шаблона:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создать новый шаблон
const createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      glassCount,
      glassConfig,
      sizeAdjustments,
      fields,
      defaultHardware,
      defaultServices,
      customColorOption,
      exactHeightOption,
      defaultGlassColor,
      defaultGlassThickness,
      companyId,
    } = req.body;

    // Валидация обязательных полей
    if (!name || !companyId) {
      return res.status(400).json({
        message: 'Название и ID компании обязательны',
      });
    }

    // Проверяем, что шаблон с таким именем не существует для этой компании
    const existingTemplate = await Template.findOne({
      name: name.trim(),
      companyId,
      isActive: true,
    });

    if (existingTemplate) {
      return res.status(400).json({
        message: 'Шаблон с таким названием уже существует',
      });
    }

    // Валидация полей
    if (fields && !Array.isArray(fields)) {
      return res.status(400).json({
        message: 'Поля должны быть массивом',
      });
    }

    const template = new Template({
      name: name.trim(),
      description: description?.trim() || '',
      type: type || 'custom',
      glassCount: Math.max(1, Math.min(10, glassCount || 1)),
      glassConfig: glassConfig || [],
      sizeAdjustments: sizeAdjustments || {
        doorHeightReduction: 8,
        thresholdReduction: 15,
      },
      fields: fields || [],
      defaultHardware: defaultHardware || [],
      defaultServices: defaultServices || [],
      customColorOption: Boolean(customColorOption),
      exactHeightOption: Boolean(exactHeightOption),
      defaultGlassColor: defaultGlassColor?.trim() || '',
      defaultGlassThickness: defaultGlassThickness?.trim() || '',
      companyId,
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    console.error('Ошибка создания шаблона:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить шаблон
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      glassCount,
      glassConfig,
      sizeAdjustments,
      fields,
      defaultHardware,
      defaultServices,
      customColorOption,
      exactHeightOption,
      defaultGlassColor,
      defaultGlassThickness,
    } = req.body;

    const template = await Template.findById(id);

    if (!template || !template.isActive) {
      return res.status(404).json({ message: 'Шаблон не найден' });
    }

    // Проверяем, что название уникально (исключая текущий шаблон)
    if (name && name.trim() !== template.name) {
      const existingTemplate = await Template.findOne({
        name: name.trim(),
        companyId: template.companyId,
        isActive: true,
        _id: { $ne: id },
      });

      if (existingTemplate) {
        return res.status(400).json({
          message: 'Шаблон с таким названием уже существует',
        });
      }
    }

    // Обновляем поля
    if (name !== undefined) template.name = name.trim();
    if (description !== undefined) template.description = description.trim();
    if (type !== undefined) template.type = type;
    if (glassCount !== undefined) template.glassCount = Math.max(1, Math.min(10, glassCount));
    if (glassConfig !== undefined) template.glassConfig = glassConfig;
    if (sizeAdjustments !== undefined) template.sizeAdjustments = sizeAdjustments;
    if (fields !== undefined) template.fields = fields;
    if (defaultHardware !== undefined) template.defaultHardware = defaultHardware;
    if (defaultServices !== undefined) template.defaultServices = defaultServices;
    if (customColorOption !== undefined) template.customColorOption = Boolean(customColorOption);
    if (exactHeightOption !== undefined) template.exactHeightOption = Boolean(exactHeightOption);
    if (defaultGlassColor !== undefined)
      template.defaultGlassColor = defaultGlassColor?.trim() || '';
    if (defaultGlassThickness !== undefined)
      template.defaultGlassThickness = defaultGlassThickness?.trim() || '';

    await template.save();
    res.json(template);
  } catch (error) {
    console.error('Ошибка обновления шаблона:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удалить шаблон (мягкое удаление)
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await Template.findById(id);

    if (!template || !template.isActive) {
      return res.status(404).json({ message: 'Шаблон не найден' });
    }

    // Мягкое удаление
    template.isActive = false;
    await template.save();

    res.json({ message: 'Шаблон удален' });
  } catch (error) {
    console.error('Ошибка удаления шаблона:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить активные шаблоны для селекта конфигураций
const getActiveTemplates = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Не указан ID компании' });
    }

    const templates = await Template.find(
      {
        companyId,
        isActive: true,
        isSystem: { $ne: true }, // Исключаем системные шаблоны
      },
      'name type description',
    ).sort({ name: 1 });

    res.json(templates);
  } catch (error) {
    console.error('Ошибка получения активных шаблонов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить системные шаблоны компании
const getSystemTemplates = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Не указан ID компании' });
    }

    const systemTemplates = await Template.find({
      companyId,
      isSystem: true,
      isActive: true,
    }).sort({ type: 1 });

    res.json(systemTemplates);
  } catch (error) {
    console.error('Ошибка получения системных шаблонов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить системный шаблон
const updateSystemTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const { companyId } = req.query;
    const {
      name,
      description,
      defaultHardware,
      defaultServices,
      customColorOption,
      exactHeightOption,
      defaultGlassColor,
      defaultGlassThickness,
      glassConfig,
      sizeAdjustments,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Не указан ID компании' });
    }

    // Ищем существующий системный шаблон
    let systemTemplate = await Template.findOne({
      companyId,
      type,
      isSystem: true,
      isActive: true,
    });

    if (systemTemplate) {
      // Обновляем существующий
      if (defaultHardware !== undefined) systemTemplate.defaultHardware = defaultHardware;
      if (defaultServices !== undefined) systemTemplate.defaultServices = defaultServices;
      if (customColorOption !== undefined)
        systemTemplate.customColorOption = Boolean(customColorOption);
      if (exactHeightOption !== undefined)
        systemTemplate.exactHeightOption = Boolean(exactHeightOption);
      if (defaultGlassColor !== undefined)
        systemTemplate.defaultGlassColor = defaultGlassColor?.trim() || '';
      if (defaultGlassThickness !== undefined)
        systemTemplate.defaultGlassThickness = defaultGlassThickness?.trim() || '';
      if (glassConfig !== undefined) systemTemplate.glassConfig = glassConfig;
      if (sizeAdjustments !== undefined) systemTemplate.sizeAdjustments = sizeAdjustments;

      await systemTemplate.save();
    } else {
      // Создаем новый системный шаблон
      systemTemplate = new Template({
        name: name || getSystemTemplateName(type),
        description: description || 'Системный шаблон для настройки фурнитуры и услуг по умолчанию',
        type,
        isSystem: true,
        glassConfig: glassConfig || getDefaultGlassConfig(type),
        sizeAdjustments: sizeAdjustments || {
          doorHeightReduction: 8,
          thresholdReduction: 15,
        },
        fields: [],
        defaultHardware: defaultHardware || [],
        defaultServices: defaultServices || [],
        customColorOption: Boolean(customColorOption),
        exactHeightOption: Boolean(exactHeightOption),
        defaultGlassColor: defaultGlassColor?.trim() || '',
        defaultGlassThickness: defaultGlassThickness?.trim() || '',
        companyId,
      });

      await systemTemplate.save();
    }

    res.json(systemTemplate);
  } catch (error) {
    console.error('Ошибка обновления системного шаблона:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Вспомогательные функции для системных шаблонов
const getSystemTemplateName = (type) => {
  const names = {
    glass: 'Стационарное стекло',
    straight: 'Прямая раздвижная',
    corner: 'Угловая раздвижная',
    unique: 'Уникальная конфигурация',
    partition: 'Перегородка',
  };
  return names[type] || 'Системный шаблон';
};

const getDefaultGlassConfig = (type) => {
  const configs = {
    glass: [{ name: 'Стекло', type: 'stationary' }],
    straight: [
      { name: 'Стационар', type: 'stationary' },
      { name: 'Дверь', type: 'sliding_door' },
    ],
    corner: [
      { name: 'Стационар 1', type: 'stationary' },
      { name: 'Дверь 1', type: 'sliding_door' },
      { name: 'Стационар 2', type: 'stationary' },
      { name: 'Дверь 2', type: 'sliding_door' },
    ],
    unique: [],
    partition: [{ name: 'Стекло', type: 'stationary' }],
  };
  return configs[type] || [];
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getActiveTemplates,
  getSystemTemplates,
  updateSystemTemplate,
};
