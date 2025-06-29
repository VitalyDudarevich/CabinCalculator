const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getActiveTemplates,
  getSystemTemplates,
  updateSystemTemplate,
} = require('../controllers/templateController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authMiddleware.authenticate);

// Маршруты для работы с шаблонами
router.get('/', getTemplates);
router.get('/active', getActiveTemplates);

// Маршруты для системных шаблонов (должны быть перед /:id)
router.get('/system', getSystemTemplates);
router.put('/system/:type', updateSystemTemplate);

router.get('/:id', getTemplate);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

// НОВЫЙ ENDPOINT: Создать системные шаблоны для компании
router.post('/system/create', async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Не указан ID компании' });
    }

    const Template = require('../models/Template');

    // Проверяем, есть ли уже системные шаблоны для этой компании
    const existingSystemTemplates = await Template.find({
      companyId,
      isSystem: true,
      isActive: true,
    });

    if (existingSystemTemplates.length > 0) {
      return res.status(400).json({
        message: `У компании уже есть системные шаблоны (${existingSystemTemplates.length})`,
        count: existingSystemTemplates.length,
      });
    }

    // Функция создания системных шаблонов (копия из companyController.js)
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

    // Создаем системные шаблоны
    const systemTemplates = createSystemTemplatesForCompany(companyId);
    await Template.insertMany(systemTemplates, { ordered: false });

    res.json({
      message: `Системные шаблоны успешно созданы`,
      count: systemTemplates.length,
      templates: systemTemplates.map((t) => ({ name: t.name, type: t.type })),
    });
  } catch (error) {
    console.error('Ошибка создания системных шаблонов:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

module.exports = router;
